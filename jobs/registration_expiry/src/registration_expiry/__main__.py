"""
This module serves as the entry point for running the registration-expiry job.

It imports the `run` function from `registration_expiry.job` and executes it when the script
is run directly. This script is responsible for starting the registration-expiry process
for submitted applications.
"""

from registration_expiry.job import run

if __name__ == "__main__":
    run()
