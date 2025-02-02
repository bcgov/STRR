"""
This module serves as the entry point for running the batch-permit-validator job.

It imports the `run` function from `batch_permit_validator.job` and executes it when the script
is run directly. This script is responsible for starting the batch-permit-validation process
when a platoform submits the validation request.
"""

from batch_permit_validator.job import run

if __name__ == "__main__":
    run()
