"""QA-only checks of real production dependencies, without live cloud/job work."""

import base64
import importlib
import io
import json
import os
import pathlib
import runpy
import subprocess
import sys
import time
import tomllib
import urllib.error
import urllib.request
from contextlib import redirect_stderr, redirect_stdout
from importlib.metadata import distribution, version
from unittest.mock import MagicMock, patch

component = os.environ["QA_COMPONENT"]
assert component in {"batch-job", "backfiller", "batch-listener"}
assert sys.version_info[:2] == (3, 12), sys.version
assert os.getuid() != 0, "Image must run as its configured non-root user"
assert 'VERSION_CODENAME=bookworm' in pathlib.Path('/etc/os-release').read_text()
assert not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
assert not os.environ.get("GCP_AUTH_KEY")
assert not os.environ.get("SENTRY_DSN")

lock = tomllib.loads(pathlib.Path('/code/poetry.lock').read_text())
packages = {item['name']: item for item in lock['package']}
checked_versions = {}
for name in ['flask', 'gunicorn', 'pg8000']:
    checked_versions[name] = version(name)
    assert checked_versions[name] == packages[name]['version']

checks = ['Python 3.12', 'Bookworm', 'non-root', 'installed versions match lock']

if component in {'batch-job', 'backfiller'}:
    installed = json.loads(distribution('strr-api').read_text('direct_url.json'))
    expected = packages['strr-api']['source']['resolved_reference']
    assert installed['vcs_info']['commit_id'] == expected
    module = 'batch_permit_validator' if component == 'batch-job' else 'backfiller'
    job = importlib.import_module(module + '.job')
    # Real app factory and real SQLAlchemy pg8000 engine initialization. No
    # connection/query is requested; this does not claim DB integration.
    app = job.create_app('production')
    assert not app.testing and not app.debug
    with app.app_context():
        assert job.db.engine.url.drivername == 'postgresql+pg8000'
        assert app.make_shell_context()['app'] is app
    checks += ['locked STRR API imports', 'production app factory', 'pg8000 engine setup']
    output = io.StringIO()
    with patch.object(sys, 'argv', [module]), redirect_stdout(output), redirect_stderr(output):
        if component == 'batch-job':
            with patch.object(job, '_process_file') as process_file:
                runpy.run_module(module, run_name='__main__')
                process_file.assert_not_called()
            assert 'Empty file name.' in output.getvalue()
            checks.append('actual module entry: missing-file guard')
            with patch.object(sys, 'argv', [module, 'synthetic-request.json']):
                with patch.object(job, '_process_file') as process_file:
                    runpy.run_module(module, run_name='__main__')
                    process_file.assert_called_once_with(file_name='synthetic-request.json')
            checks.append('actual entry/app factory: delegates one synthetic file (processing stubbed)')
        else:
            assert app.config['BACKFILL_REGISTRATION_SEARCH'] is False
            with patch.object(job, 'backfill_registration_search') as backfill:
                runpy.run_module(module, run_name='__main__')
                backfill.assert_not_called()
            checks.append('actual module entry: backfill disabled, no record processing')
    assert 'Unexpected error' not in output.getvalue(), output.getvalue()
else:
    from batch_permit_validator import create_app
    from batch_permit_validator.resources import batch_permit_validator as resource
    from simple_cloudevent import SimpleCloudEvent, to_queue_message

    app = create_app()
    assert not app.testing and not app.debug
    client = app.test_client()
    assert client.post('/').status_code == 200
    assert client.post('/', json={}).status_code == 400
    assert client.post('/bulk-validation-response').status_code == 200
    assert client.post('/test-response', json={'synthetic': True}).status_code == 200
    checks += ['production app factory', 'empty/malformed/test HTTP requests']
    jobs_client = MagicMock()
    with patch.object(resource.run_v2, 'JobsClient', return_value=jobs_client):
        response = client.post('/', json={'message': {'attributes': {'objectId': 'synthetic-request.json'}}})
        assert response.status_code == 200
        jobs_client.run_job.assert_called_once()
        request = jobs_client.run_job.call_args.kwargs['request']
        assert request.name == 'projects/synthetic-local-only/locations/synthetic-location/jobs/synthetic-job'
        assert list(request.overrides.container_overrides[0].args) == ['synthetic-request.json']
        assert request.overrides.task_count == 1
    checks.append('real event parsing and Cloud Run request (JobsClient stubbed)')
    event = SimpleCloudEvent(id='synthetic', source='qa-only', subject='qa',
        type='strr.batchPermitValidationResult',
        data={'callBackUrl': 'https://callback.invalid/qa', 'preSignedUrl': 'https://storage.invalid/qa'})
    envelope = {'subscription': 'projects/synthetic/subscriptions/qa', 'id': 1,
        'message': {'data': base64.b64encode(to_queue_message(event)).decode(), 'messageId': '1', 'attributes': {}}}
    with patch.object(resource.requests, 'post', return_value=MagicMock(status_code=200)) as post:
        assert client.post('/bulk-validation-response', json=envelope).status_code == 200
        post.assert_called_once_with('https://callback.invalid/qa', data={'fileUrl': 'https://storage.invalid/qa'}, timeout=10)
    checks.append('real wrapped event parser and callback arguments (HTTP send stubbed)')

    # Actual gunicorn/config/WSGI startup, in the network-disabled container.
    # Only empty or diagnostic requests are sent to its own loopback interface.
    process = subprocess.Popen(['gunicorn', '--bind', '127.0.0.1:8080',
        '--config', '/code/gunicorn_config.py', 'wsgi:app'], cwd='/code',
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    try:
        for attempt in range(50):
            if process.poll() is not None:
                raise AssertionError('gunicorn exited: ' + process.stdout.read())
            try:
                request = urllib.request.Request('http://127.0.0.1:8080/', data=b'', method='POST')
                with urllib.request.urlopen(request, timeout=1) as response:
                    assert response.status == 200 and json.load(response) == {}
                break
            except urllib.error.URLError:
                time.sleep(0.2)
        else:
            raise AssertionError('gunicorn did not serve the empty-request control')
        checks.append('real gunicorn/WSGI HTTP startup')
    finally:
        process.terminate()
        try:
            server_output, _ = process.communicate(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            server_output, _ = process.communicate()
        assert 'Worker failed to boot' not in server_output, server_output

print(json.dumps({'component': component, 'python': sys.version.split()[0],
    'uid': os.getuid(), 'versions': checked_versions, 'checks': checks,
    'externalNetwork': 'disabled by Docker', 'liveJobsOrCallbacks': 'none'}))
