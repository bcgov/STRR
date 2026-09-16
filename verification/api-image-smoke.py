"""QA-only production-image checks; not intended for an application PR."""

import json
import sys
from importlib.metadata import version

from flask import Flask
from flask_cors import CORS
from weasyprint import HTML

assert sys.version_info[:2] == (3, 12), sys.version
assert version("flask") == "3.0.3"
assert version("flask-cors").startswith("4.")
assert version("gunicorn").startswith("21.")
assert version("weasyprint").startswith("62.")

app = Flask(__name__)
CORS(app)


@app.get("/api/v1/check")
def check():
    return {"ok": True}


client = app.test_client()
origin = "https://dev.host.shorttermrental.registry.gov.bc.ca"
response = client.get("/api/v1/check", headers={"Origin": origin})
assert response.status_code == 200
assert response.json == {"ok": True}
assert response.headers["Access-Control-Allow-Origin"] == origin
preflight = client.options(
    "/api/v1/check",
    headers={
        "Origin": origin,
        "Access-Control-Request-Method": "PUT",
        "Access-Control-Request-Headers": "authorization,accountid,content-type",
    },
)
assert preflight.status_code == 200
assert preflight.headers["Access-Control-Allow-Origin"] == origin
assert "PUT" in preflight.headers["Access-Control-Allow-Methods"]
for header in ("authorization", "accountid", "content-type"):
    assert header in preflight.headers["Access-Control-Allow-Headers"].lower()

pdf = HTML(string="<h1>STRR synthetic PDF check</h1><p>Upgraded rendering library.</p>").write_pdf()
assert pdf.startswith(b"%PDF-") and len(pdf) > 1000
print(json.dumps({
    "python": sys.version.split()[0],
    "packages": {name: version(name) for name in ("flask", "flask-cors", "gunicorn", "weasyprint")},
    "cors_get": response.status_code,
    "cors_preflight": preflight.status_code,
    "pdf_bytes": len(pdf),
}))
