"""Shared helpers for recognising booking links.

Kept out of the check modules so the forms checks and the booking-intent check
agree on what counts as a booking link.
"""
from __future__ import annotations

import re
from typing import Any


def is_generic_booking(config: Any, url: str) -> bool:
    """A booking front door with no service preselected."""
    return any(
        re.search(pattern, url, re.IGNORECASE)
        for pattern in (config.get("booking.generic_link_patterns", []) or [])
    )


def is_specific_booking(config: Any, url: str) -> bool:
    """A link that books one named service or variation."""
    return any(
        re.search(pattern, url, re.IGNORECASE)
        for pattern in (config.get("booking.specific_link_patterns", []) or [])
    )


def is_booking_link(config: Any, url: str) -> bool:
    return config.is_owned_external(url) or is_generic_booking(config, url) or is_specific_booking(config, url)
