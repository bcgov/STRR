# STRR Cloud SQL connector

The shared Python database connection utility for STRR jobs and queue services.
Consumers install this package from this repository using a Poetry path dependency;
no separately published package or shared-library PR is needed.

## Usage

```python
from cloud_sql_connector import sqlalchemy_settings_from_env

database_uri, engine_options = sqlalchemy_settings_from_env()
```

Pass the returned URI and engine options to SQLAlchemy (or Flask-SQLAlchemy).
The utility creates its Google Cloud SQL connector only when a database connection
is requested and uses lazy token refresh.

Cloud Run jobs (`CLOUD_RUN_JOB`) and services (`K_SERVICE`) always use IAM.
Setting `CLOUDSQL_INSTANCE_CONNECTION_NAME` also enables IAM locally. IAM requires:

- `CLOUDSQL_INSTANCE_CONNECTION_NAME`: `project:region:instance`.
- `DATABASE_NAME`: the target database.
- `DATABASE_USERNAME`: the IAM database username of the runtime identity.
- `CLOUDSQL_IP_TYPE`: optional `PUBLIC` (default) or `PRIVATE`.

Missing required IAM settings raise an error instead of falling back to a password.
IAM mode ignores legacy `DATABASE_PASSWORD`, `DATABASE_HOST`, `DATABASE_PORT`,
and `DATABASE_UNIX_SOCKET` values. The runtime identity still needs Cloud SQL IAM
access and the database privileges required by the application.

Outside IAM mode, local development and tests use the normal `DATABASE_*` password
settings. `database_uri_from_env()` also supports alternate variable names for test
databases. `sqlalchemy_settings_from_env(iam_username_env="...")` selects another
IAM username variable when needed.

## Development

From this directory:

```bash
poetry install
poetry run pytest
poetry build --format wheel
```

The unit tests require no Google credentials or live database.

## Building and deploying consumers

From the repository root, build a consumer with its shared source:

```bash
make -C jobs/auto-approval build
make -C queue_services/strr-email build
```

Each build stages the application and this package from the same checkout.
For custom Docker options, prepare a context first:

```bash
context=$(mktemp -d)
python3 scripts/prepare-python-build-context.py jobs/auto-approval "$context"
docker build "$context"
```

CI and CD use the same staging helper. A direct `docker build .` in an application
directory does not include the shared package. Changes here trigger all ten
database consumers' workflows.

The STRR deployment workflows add the instance connection name and IAM username
from each application's Cloud Deploy parameters. These non-secret values do not
require new 1Password fields. The database name and application secrets continue
to use their existing vault mappings.

Use a full deployment (`redeploy=false`) to deploy the IAM image and replace the
legacy password environment. The old environment-only redeploy path is rejected
because it can retain old credentials and a pre-IAM image. Existing protected
branches and deployment environment approvals still apply.

This code does not create database users, grant database roles, or apply
Terraform. Before rollout, verify that the attached `sa-job` identity (or
`sa-api` for the two database queue services) can log in through IAM and perform
the required database writes. A green build or a job that processes no records
does not establish those permissions.

## Attribution

Adapted from the BC Registries
[`sbc-connect-common` Cloud SQL connector](https://github.com/bcgov/sbc-connect-common/tree/395a3bdd402d918f2ba3df6d6cf26a629872a121/python/cloud-sql-connector).
The upstream source copyright and Apache 2.0 notices, package license notice below,
and repository license in `LICENSE` are retained. `LICENSE-APACHE` contains the
Apache 2.0 license text referenced by the source files.

## License

Copyright © 2025 Province of British Columbia

Licensed under the BSD 3 Clause License, (the "License"); you may not use this file except in compliance with the License. The template for the license can be found here https://opensource.org/license/bsd-3-clause/

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
