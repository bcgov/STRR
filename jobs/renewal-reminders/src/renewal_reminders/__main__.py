"""
This module serves as the entry point for running the renewal-reminders job.

It imports the `run` function from `renewal_reminders.job` and executes it when the script
is run directly. This script is responsible for starting the renewal-reminders process
for expiring registrations.
"""

from renewal_reminders.job import run

if __name__ == "__main__":
    run()
