"""Small helpers shared by the test modules."""
from __future__ import annotations

import os
from typing import Set

import yaml

QA_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFECTS_PATH = os.path.join(QA_ROOT, "config", "known_defects.yaml")


def registry_ids() -> Set[str]:
    with open(DEFECTS_PATH, "r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    return {entry["id"] for entry in (data.get("defects") or []) if entry.get("id")}
