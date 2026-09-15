[![License](https://img.shields.io/badge/License-BSD%203%20Clause-blue.svg)](LICENSE)
[![codecov](https://codecov.io/gh/bcgov/lear/branch/master/graph/badge.svg?flag=entityepay)](https://codecov.io/gh/bcgov/lear/tree/master/queue_services/entity-pay)

# Application Name

BC Registries  - strr-email

## Technology Stack Used
* Python, Flask
* Postgres -  SQLAlchemy, psycopg2-binary & alembic

## Third-Party Products/Libraries used and the the License they are covert by


## Documentation

GitHub Pages (https://guides.github.com/features/pages/) are a neat way to document you application/project.

## Security

Future - BCGov Keycloak

Current - JWT hack

## Files in this repository

```
docs/           - Project Documentation
└── images
└── icons

openshift/      - OpenShift-specific files
├── scripts     - helper scripts
└── templates   - application templates
```

## Local Development & Emulating Async Queue Pipeline

### Workflow 1: Single Command (All-in-One)
```bash
make run-with-emulator
```
*(Starts the emulator if not running, configures topics & push subscriptions, and launches the Flask listener on port 8081)*

Or run via VS Code: `Cmd+Shift+P` $\rightarrow$ **Tasks: Run Task** $\rightarrow$ **`Email Service: Run with Emulator`**.

---

### Workflow 2: Separate Terminals
1. **Terminal 1: Start and configure Pub/Sub Emulator**:
   ```bash
   make start-emulator
   ```
2. **Terminal 2: Start `strr-email`**:
   ```bash
   make run
   ```

3. **Configure `strr-api`**:
   In `strr-api/.env`, ensure:
   ```env
   PUBSUB_EMULATOR_HOST=localhost:8085
   GCP_EMAIL_TOPIC=projects/local-dev/topics/strr-email-topic
   ```
   Any email events triggered via `strr-api` (or examiner actions like suspend, approve, NOC) will automatically publish to the local emulator, push to `strr-email`, render the corresponding markdown template, and dispatch to Notify API.


## Getting Help or Reporting an Issue

To report bugs/issues/feature requests, please file an [issue](../../issues).

## How to Contribute

If you would like to contribute, please see our [CONTRIBUTING](./CONTRIBUTING.md) guidelines.

Please note that this project is released with a [Contributor Code of Conduct](./CODE_OF_CONDUCT.md).
By participating in this project you agree to abide by its terms.

## License

    Copyright 2018 Province of British Columbia

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.

