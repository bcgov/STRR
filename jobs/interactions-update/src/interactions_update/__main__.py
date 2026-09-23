"""Entry point for interactions-update GCP Cloud Run job."""

import logging
import os
import sys

from dotenv import find_dotenv
from dotenv import load_dotenv

from interactions_update.services.interaction_processor import InteractionProcessor

# 1. Setup Logging
# Format for Google Cloud Logs compatibility (JSON-like or clear text)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


def main():
    """Entry point for the Interactions Update Job.

    Initializes configuration from environment, sets up services with
    dependency injection, and executes the interaction processing workflow.
    """
    try:
        # 2. Load Environment Variables
        # This will look for a .env file if it exists (useful for local dev)
        env_file = find_dotenv()
        if env_file:
            logger.info(f"Loading environment from {env_file}")
            load_dotenv(env_file)

        logger.info("Starting Interactions Update Job...")

        # 3. Initialize and execute the processor
        # Uses dependency injection for testability and configuration management
        processor = InteractionProcessor()
        processor.run()

        logger.info("Job completed successfully.")
        sys.exit(0)

    except Exception as e:
        logger.error(f"Critical failure in main: {str(e)}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
