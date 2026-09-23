"""Notify references handler module."""

import logging

logger = logging.getLogger(__name__)


class NotifyReferenceHandler:
    """Handles extraction and normalization of notify references.

    Extracts notify references from interaction objects and metadata,
    handling various formats and deduplicating across multiple sources.
    """

    @classmethod
    def to_reference_list(cls, raw_value) -> list[str]:
        """Normalize notify reference values from strings/lists into a deduplicated list.

        Handles multiple input formats: comma-separated strings, lists, tuples,
        sets, and scalar values.

        Args:
            raw_value: Raw notify reference value (str, list, tuple, set, or scalar)

        Returns:
            list: Deduplicated list of normalized reference strings
        """
        if raw_value is None:
            return []
        if isinstance(raw_value, str):
            values = [v.strip() for v in raw_value.split(",") if v and v.strip()]
        elif isinstance(raw_value, (list, tuple, set)):
            values = [str(v).strip() for v in raw_value if str(v).strip()]
        else:
            values = [str(raw_value).strip()]

        deduped = []
        seen = set()
        for value in values:
            if value not in seen:
                seen.add(value)
                deduped.append(value)
        return deduped

    @classmethod
    def extract_from_interaction(cls, interaction) -> list[str]:
        """Extract all notify references from primary and metadata fields.

        Args:
            interaction: CustomerInteraction ORM object

        Returns:
            list: Deduplicated list of notify references
        """
        return cls.extract_from_parts(
            interaction.notify_reference,
            interaction.meta_data,
        )

    @classmethod
    def extract_from_parts(cls, notify_reference, meta_data: dict | None) -> list[str]:
        """Extract all notify references from primary and metadata fields.

        Aggregates references from:
        - Primary notify_reference field
        - metadata.notify_references (comma-separated)
        - metadata.notify_response.ids (list from API response)

        Args:
            notify_reference: Primary notify reference
            meta_data: Metadata dictionary from interaction

        Returns:
            list: Deduplicated list of all notify references
        """
        references = []
        references.extend(cls.to_reference_list(notify_reference))

        metadata = meta_data if isinstance(meta_data, dict) else {}
        references.extend(cls.to_reference_list(metadata.get("notify_references")))
        notify_response = metadata.get("notify_response")
        if isinstance(notify_response, dict):
            references.extend(cls.to_reference_list(notify_response.get("ids")))

        deduped = []
        seen = set()
        for ref in references:
            if ref not in seen:
                seen.add(ref)
                deduped.append(ref)
        return deduped
