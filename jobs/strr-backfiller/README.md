![License](https://img.shields.io/badge/License-BSD%203%20Clause-blue.svg)](LICENSE)


# Application Name
STRR Backfiller Job


## Technology Stack Used
* Python, Flask

# setup
Fork the repo and submitted a PR with accompanying tests.

**Configuration:**
* `BACKFILL_REGISTRATION_SEARCH=true` - Enable registration search backfiller
* `BACKFILL_REGISTRATION_SEARCH_BATCH_SIZE=100` - Batch size (default: 100)

Set to use the local repo for the virtual environment
```bash
poetry config virtualenvs.in-project true
```
Install the dependencies
```bash
poetry install
```

Configure the .env file with the required environment variables:
```bash
# Example .env configuration
BACKFILL_REGISTRATION_SEARCH=true
BACKFILL_REGISTRATION_SEARCH_BATCH_SIZE=100
```

### Launch the shell
```bash
poetry shell
```

# Run the job
```bash
sh run.sh
```
