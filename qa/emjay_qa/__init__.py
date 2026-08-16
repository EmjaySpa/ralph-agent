"""Read-only QA suite for emjaywellness.com.au.

Layers: config -> crawl (the only network I/O) -> checks (pure functions over
the crawl result) -> report. Nothing here ever writes to the site under test.
"""

__version__ = "1.0.0"
