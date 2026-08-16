"""Forms.

Forms are inspected structurally only. This suite never submits a form: a POST
to a live contact form would create a real enquiry, and the brief is explicit
that the live site must not be modified.
"""
from __future__ import annotations

import re
from typing import Iterable

from ..booking import is_booking_link
from ..models import Finding, Severity, Site
from . import check, finding

CONTACT_HINT = re.compile(r"(contact|enquir|inquir|book|subscribe|signup|sign-up|newsletter|waitlist)", re.IGNORECASE)


def _is_search(form) -> bool:
    return form.is_search or any(f.field_type == "search" for f in form.fields)


@check("forms.present", "Contact pages carry a form", "Forms")
def forms_present(site: Site) -> Iterable[Finding]:
    """A contact or booking page with no form and no booking link is a dead
    end for an enquiry."""
    for page in site.html_pages():
        if not CONTACT_HINT.search(page.path):
            continue
        real_forms = [f for f in page.forms if not _is_search(f)]
        booking_links = [
            link for link in page.links if link.element == "a" and is_booking_link(site.config, link.resolved_url)
        ]
        mailto = [link for link in page.links if link.raw_href.lower().startswith("mailto:")]
        if not real_forms and not booking_links and not mailto:
            yield finding(
                "forms.present",
                Severity.FAIL,
                "Contact/booking page has no form, booking link or email link",
                url=page.url,
            )


@check("forms.fields_labelled", "Form fields have labels", "Forms")
def fields_labelled(site: Site) -> Iterable[Finding]:
    for page in site.html_pages():
        for index, form in enumerate(page.forms):
            unlabelled = [f for f in form.fields if not f.has_label]
            if not unlabelled:
                continue
            placeholder_only = [f for f in unlabelled if f.label_source == "placeholder-only"]
            severity = Severity.FAIL if len(unlabelled) > len(placeholder_only) else Severity.WARNING
            yield finding(
                "forms.fields_labelled",
                severity,
                f"{len(unlabelled)} form field(s) without a programmatic label",
                url=page.url,
                detail=(
                    f"form #{index + 1} ({form.provider or form.resolved_action or 'self-posting'}): "
                    + "; ".join(f"{f.tag}[name={f.name or '?'}] via {f.label_source}" for f in unlabelled[:6])
                ),
            )


@check("forms.submittable", "Forms have a submit control", "Forms")
def forms_submittable(site: Site) -> Iterable[Finding]:
    for page in site.html_pages():
        for index, form in enumerate(page.forms):
            if _is_search(form) or not form.fields:
                continue
            if not form.has_submit:
                yield finding(
                    "forms.submittable",
                    Severity.FAIL,
                    "Form has no submit button",
                    url=page.url,
                    detail=f"form #{index + 1} action={form.action or '(self)'}",
                )


@check("forms.secure_action", "Form actions are secure and live", "Forms")
def secure_action(site: Site) -> Iterable[Finding]:
    for page in site.html_pages():
        for index, form in enumerate(page.forms):
            action = form.resolved_action or ""
            site_is_https = site.config.base_url.startswith("https://")
            if action.startswith("http://") and site_is_https:
                yield finding(
                    "forms.secure_action",
                    Severity.FAIL,
                    "Form posts to an insecure http:// endpoint",
                    url=page.url,
                    detail=f"form #{index + 1} -> {action}",
                )
            if _is_search(form):
                continue
            if form.method == "get" and form.fields:
                yield finding(
                    "forms.secure_action",
                    Severity.WARNING,
                    "Non-search form submits with GET (entered details end up in the URL)",
                    url=page.url,
                    detail=f"form #{index + 1} -> {action or '(self)'}",
                )
            fetch = site.fetches.get(action)
            if fetch and fetch.status is not None and fetch.status >= 400 and site.config.is_internal(action):
                yield finding(
                    "forms.secure_action",
                    Severity.FAIL,
                    f"Form action returns HTTP {fetch.status}",
                    url=page.url,
                    detail=f"form #{index + 1} -> {action}",
                )


@check("forms.consent", "Enquiry forms reference the privacy policy", "Forms")
def forms_consent(site: Site) -> Iterable[Finding]:
    """A form collecting personal details on a trauma-informed practice site
    should link to a privacy policy near the point of collection."""
    for page in site.html_pages():
        real_forms = [f for f in page.forms if not _is_search(f) and f.fields]
        if not real_forms:
            continue
        has_privacy_link = any(
            re.search(r"privacy|terms", link.resolved_url, re.IGNORECASE)
            or re.search(r"privacy", link.anchor_text, re.IGNORECASE)
            for link in page.links
            if link.element == "a"
        )
        if not has_privacy_link:
            yield finding(
                "forms.consent",
                Severity.WARNING,
                "Page collects details through a form but links to no privacy policy",
                url=page.url,
                detail=f"{len(real_forms)} form(s) on the page",
            )


@check("forms.no_side_effects", "Suite never submitted a form", "Forms")
def no_side_effects(site: Site) -> Iterable[Finding]:
    """Guard rail, asserted every run: the crawl issued GET/HEAD only, so no
    form on the live site was ever submitted."""
    unsafe = sorted(m for m in site.methods_used if m not in {"GET", "HEAD"})
    if unsafe:
        yield finding(
            "forms.no_side_effects",
            Severity.FAIL,
            "The crawl used a non-idempotent HTTP method",
            detail=f"methods used: {', '.join(sorted(site.methods_used))}",
        )
    elif not site.methods_used:
        yield finding(
            "forms.no_side_effects",
            Severity.INFO,
            "No HTTP methods recorded (analysis ran against a saved crawl)",
        )
