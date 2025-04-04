"""
This module serves as the entry point for running the provisional-approval job.

It imports the `run` function from `provisional_approval.job` and executes it when the script
is run directly. This script is responsible for starting the provisional-approval process
for submitted applications.
"""

from provisional_approval.job import run

if __name__ == "__main__":
    run()
