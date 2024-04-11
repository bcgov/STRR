"""Validator functions for the str API."""


def validate_entity(entity: dict) -> list[str]:
    """
    Validate the entity based on its state and adminFreeze status to determine if the business can file a
    significant individual change

    Parameters:
    entity (dict): The entity data to validate

    Returns:
    list[str]: A list of errors, if any, found during validation
    """
    errors = []
    if entity['business']['state'] != 'ACTIVE':
        errors.append('The business is not active')
    if entity['business']['adminFreeze']:
        errors.append('The business is frozen')

    return errors
