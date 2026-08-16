"""Configuration loading and URL normalisation.

All site-specific expectations live in config/site.yaml. Nothing in the check
modules should hard-code an Emjay fact.
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse

import yaml

from .models import Severity

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CONFIG_DIR = os.path.normpath(os.path.join(HERE, "..", "config"))


@dataclass
class Config:
    data: Dict[str, Any]
    defects: List[Dict[str, Any]] = field(default_factory=list)
    path: str = ""

    # ---------------------------------------------------------------- loading
    @classmethod
    def load(
        cls,
        config_path: Optional[str] = None,
        defects_path: Optional[str] = None,
        overrides: Optional[Dict[str, Any]] = None,
    ) -> "Config":
        config_path = config_path or os.path.join(DEFAULT_CONFIG_DIR, "site.yaml")
        with open(config_path, "r", encoding="utf-8") as handle:
            data = yaml.safe_load(handle) or {}

        defects: List[Dict[str, Any]] = []
        defects_path = defects_path or os.path.join(DEFAULT_CONFIG_DIR, "known_defects.yaml")
        if os.path.exists(defects_path):
            with open(defects_path, "r", encoding="utf-8") as handle:
                defects = (yaml.safe_load(handle) or {}).get("defects") or []

        cfg = cls(data=data, defects=defects, path=config_path)
        for key, value in (overrides or {}).items():
            cfg.set(key, value)
        return cfg

    # ------------------------------------------------------------- accessors
    def get(self, dotted: str, default: Any = None) -> Any:
        node: Any = self.data
        for part in dotted.split("."):
            if not isinstance(node, dict) or part not in node:
                return default
            node = node[part]
        return node

    def set(self, dotted: str, value: Any) -> None:
        parts = dotted.split(".")
        node = self.data
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = value

    @property
    def base_url(self) -> str:
        return str(self.get("site.base_url", "")).rstrip("/")

    @property
    def internal_hosts(self) -> List[str]:
        hosts = [h.lower() for h in self.get("site.internal_hosts", []) or []]
        base_host = urlparse(self.base_url).netloc.lower()
        if base_host and base_host not in hosts:
            hosts.append(base_host)
        return hosts

    def threshold(self, name: str, default: Any = None) -> Any:
        return self.get(f"thresholds.{name}", default)

    def severity_for(self, check_id: str, default: Severity) -> Optional[Severity]:
        """Apply severity_overrides. Returns None when the check is switched off."""
        overrides = self.get("severity_overrides", {}) or {}
        raw = overrides.get(check_id)
        if raw is None:
            return default
        if str(raw).strip().upper() == "OFF":
            return None
        try:
            return Severity.parse(raw)
        except ValueError:
            return default

    # ------------------------------------------------------------------ URLs
    def is_internal(self, url: str) -> bool:
        host = urlparse(url).netloc.lower()
        if not host:
            return True
        return host in self.internal_hosts

    def is_owned_external(self, url: str) -> bool:
        host = urlparse(url).netloc.lower()
        return any(host == h or host.endswith("." + h) for h in self.get("site.owned_external_hosts", []) or [])

    def normalise(self, url: str, base: Optional[str] = None) -> str:
        """Absolute, fragment-stripped, tracking-param-stripped, case-normalised
        host. Trailing-slash form is preserved: a mismatch between the linked
        form and the canonical form is itself a finding, so we must not hide it
        here. Only the *identity* comparison in the crawler folds the two."""
        if base:
            url = urljoin(base, url)
        parts = urlparse(url)
        scheme = parts.scheme.lower()
        netloc = parts.netloc.lower()
        if (scheme == "https" and netloc.endswith(":443")) or (scheme == "http" and netloc.endswith(":80")):
            netloc = netloc.rsplit(":", 1)[0]
        strip = set(self.get("crawl.strip_query_params", []) or [])
        query = urlencode([(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if k not in strip])
        return urlunparse((scheme, netloc, parts.path, parts.params, query, ""))

    def identity(self, url: str) -> str:
        """Key used to decide whether two URLs are 'the same page' for crawling.
        Folds the trailing slash and default index files."""
        norm = self.normalise(url)
        parts = urlparse(norm)
        path = re.sub(r"/(index|home)\.(html?|php)$", "/", parts.path or "/")
        if len(path) > 1:
            path = path.rstrip("/")
        return urlunparse((parts.scheme, parts.netloc, path or "/", "", parts.query, ""))

    def should_exclude(self, url: str) -> Optional[str]:
        for pattern in self.get("crawl.exclude_url_patterns", []) or []:
            if re.search(pattern, url, re.IGNORECASE):
                return pattern
        return None

    def path_of(self, url: str) -> str:
        return urlparse(url).path or "/"
