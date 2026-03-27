🛠️ STRR Shared Test Utilities
A centralized library of Pytest fixtures for the STRR Monorepo. This library provides "Zero-Config" Docker integration for Postgres (with Alembic migrations) and Redis.

🚀 Key Features
Smart Startup: Containers only start if a test actually requests session, db, or redis_client. If a test is pure logic, Docker never touches your CPU.

Automatic Migrations: Always runs the latest migrations from strr-api/migrations before tests start.

Isolated Transactions: Every test using session is wrapped in a transaction that rolls back automatically.

Agnostic: Works for both Flask-based jobs and "Lite" Python background jobs.

<details>
<summary>📋 <b>Click to view Prerequisites</b></summary>

Before using this library, ensure your environment meets the following requirements:
* **Directory Structure:** This library expects a Monorepo layout. The main API must be located at `/strr-api` of the repo root.
* **Alembic Config:** Ensure `strr-api/migrations/alembic.ini` exists, as it is used to drive the test database schema.
* **Docker:** You must have a Docker daemon running (Colima, Docker Desktop, Podman, or OrbStack) to support `testcontainers`.
</details>

📦 Setup a New Job
To use these utilities in a new job (e.g., jobs/my-new-job):

1. Add Dependency
Run this inside your job's devcontainer:

```bash
poetry add --group dev --editable ../../tests/python-test-utils
```

2. Configure Pytest
Create or update jobs/my-new-job/tests/conftest.py:

```python
pytest_plugins = [
    "strr_test_utils.utils_fixtures",
    "strr_test_utils.db_fixtures",
    "strr_test_utils.redis_fixtures",
]
```

3. Silence Warnings
Add this to your pyproject.toml to keep your test output clean:

```yaml
Ini, TOML
[tool.pytest.ini_options]
filterwarnings = [
    "ignore::DeprecationWarning:testcontainers.*:",
    "ignore::DeprecationWarning:docker.*:",
    "ignore::ResourceWarning:testcontainers.*:"
]
```

🧪 Usage Examples
Database Test (Flask or Lite)
```python
def test_user_creation(session):
    # 'session' triggers Postgres startup & Alembic migrations
    from strr_api.models import User
    user = User(lastname="Test")
    session.add(user)
    session.commit()
    assert session.query(User).count() == 1
```

Redis Test
```python
def test_cache_logic(redis_client):
    # 'redis_client' triggers Redis startup (Postgres stays OFF)
    redis_client.set("foo", "bar")
    assert redis_client.get("foo") == b"bar"
```

Pure Logic (Fast)
```python
def test_math():
    # No fixtures = No Docker = Instant execution
    assert 1 + 1 == 2
```

### Role-Based Testing
Use the `authed_g` factory to simulate different user permissions:

```python
def test_admin_access(client, authed_g):
    # Seed the 'g' object with specific roles
    authed_g(roles=['STRR_ADMIN'])
    response = client.get('/admin/settings')
    assert response.status_code == 200
```
