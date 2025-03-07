"""
This module serves as the entry point for running the noc-expiry job.

It imports the `run` function from `noc_expiry.job` and executes it when the script
is run directly. This script is responsible for starting the noc-expiry process
for submitted applications.
"""

from noc_expiry.job import run

if __name__ == "__main__":
    run()
