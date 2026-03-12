# Stress Testing with k6

k6 is open-source, developer-centric load testing tool designed to test system performance, reliability, and scalability. It allows developers to simulate high traffic, identify bottlenecks, and automate tests within CI/CD pipelines.

It is used to stress-test STRR API endpoints and to verify that core application, registration, document upload, examiner review, and permit validation workflows remain correct, stable, and reliable under peak or extreme load on the platform.

## Prerequisites

- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) v0.52+

## Environment Variables

Fill in the required values into `.env`:

| Variable | Required | Description |
| --- | --- | --- |
| `STRR_API_URL` | Yes | Base URL of the STRR API (e.g. `https://strr-api-dev-...run.app/`) |
| `ACCOUNT_ID` | Yes | BC Registries account ID for the `Account-Id` header |
| `ACCESS_TOKEN` | Yes | Bearer token for the `Authorization` header |

## Running the Tests

**Using a `.env` file:**

```sh
set -a && source .env && set +a && k6 run <script>.js
```

Replace `<script>.js` with the name of the test script you want to run.

## Available Scripts

### `submit-applications.js`

#### Default Configuration

| Setting | Value |
| --- | --- |
| Virtual users | 1 |
| Iterations | 1 |
