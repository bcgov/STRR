"""
This module serves as the entry point for running the auto-approval job.

It imports the `run` function from `auto_approval.job` and executes it when the script
is run directly. This script is responsible for starting the auto-approval process
for submitted applications.
"""

from auto_approval.job import run

if __name__ == "__main__":
    run()
