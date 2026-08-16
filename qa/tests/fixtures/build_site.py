"""Builds the two fixture sites the suite is tested against.

clean/ - a site with none of the defects the suite looks for. Used to prove the
         checks do not cry wolf.
dirty/ - the same site with one known defect injected per area, each tagged in
         DEFECT_MAP below. Used to prove every check actually fires.

The fixtures are generated rather than checked in so the defect list stays
readable: each injected defect is one line of Python, next to the check id it
is meant to trip.
"""
from __future__ import annotations

import base64
import json
import os
from typing import Dict, List, Tuple

# Which check each injected defect is expected to trip. The test suite asserts
# every id in this map reports FAIL against dirty/.
DEFECT_MAP: Dict[str, Tuple[str, str]] = {
    "links.internal_broken": ("FAIL", "home links to /broken-page/ which 404s"),
    "links.page_http_error": ("FAIL", "/broken-page/ is crawled and returns 404"),
    "links.empty_or_placeholder": ("FAIL", "home links to http://localhost:9/staging"),
    "links.contact_scheme": ("FAIL", "contact page has mailto:bookings(at)example"),
    "redirect.chain": ("WARNING", "/old-service/ -> /temp-service/ -> /services/"),
    "redirect.temporary": ("WARNING", "/old-service/ uses a 302"),
    "redirect.internal_link_to_redirect": ("WARNING", "home links to /old-service/"),
    "seo.title_missing": ("FAIL", "/skin/ has no <title>"),
    "seo.title_duplicate": ("FAIL", "home and /services/ share a title"),
    "seo.meta_description_missing": ("FAIL", "/skin/ has no meta description"),
    "seo.meta_description_duplicate": ("FAIL", "home and /services/ share a description"),
    "seo.canonical_missing": ("FAIL", "/contact/ has no canonical"),
    "seo.canonical_self_reference": ("WARNING", "/services/ canonicalises to /skin/"),
    "seo.canonical_target_health": ("FAIL", "/skin/ canonical points at /broken-page/"),
    "seo.noindex_sitemap_conflict": ("FAIL", "/orphan/ is noindex and in the sitemap"),
    "seo.robots_txt": ("WARNING", "robots.txt declares no sitemap"),
    "sitemap.entry_health": ("FAIL", "sitemap lists /missing-page/ which 404s"),
    "headings.h1_missing": ("FAIL", "/contact/ has no H1"),
    "headings.h1_multiple": ("FAIL", "home has two H1s"),
    "headings.empty": ("FAIL", "home has an empty H2"),
    "headings.order": ("WARNING", "/skin/ jumps from H2 to H4"),
    "schema.parse_error": ("FAIL", "/contact/ has malformed JSON-LD"),
    "schema.required_properties": ("FAIL", "home LocalBusiness has no address"),
    "schema.stale_values": ("FAIL", "home schema still says Emjay Spa & Wellness"),
    "brand.banned_colour_static": ("FAIL", "#2EA3F2 in the stylesheet and inline"),
    "brand.banned_font": ("FAIL", "Open Sans declared in the stylesheet"),
    "brand.colour_near_miss": ("WARNING", "#2EA3F3 in the stylesheet"),
    "a11y.image_alt_missing": ("FAIL", "home hero image has no alt attribute"),
    "a11y.image_alt_quality": ("WARNING", "/services/ image alt is IMG_2043.jpg"),
    "a11y.link_text": ("FAIL", "home has an empty anchor"),
    "a11y.html_lang": ("FAIL", "/skin/ has no lang attribute"),
    "a11y.viewport": ("FAIL", "/services/ viewport sets user-scalable=no"),
    "forms.fields_labelled": ("WARNING", "contact form fields are placeholder-only"),
    "forms.submittable": ("FAIL", "contact form has no submit control"),
    "forms.consent": ("WARNING", "contact form page links to no privacy policy"),
    "content.retired_terms": ("FAIL", "gift certificates, Midweek Reset, Emjay Spa & Wellness"),
    "content.placeholder_copy": ("FAIL", "/skin/ contains Lorem ipsum"),
    "content.legacy_url_behaviour": ("FAIL", "/gift-certificates/ still returns 200"),
    "content.legacy_url_linked": ("FAIL", "home links to /gift-certificates/"),
    "content.booking_intent": ("FAIL", "/services/ only links to the generic /book/ page"),
    "content.thin_page": ("WARNING", "/orphan/ has almost no content"),
    "content.duplicate_page": ("FAIL", "/skin/ duplicates /services/"),
    "structure.orphan_page": ("FAIL", "/orphan/ is in the sitemap but linked from nowhere"),
    "structure.dead_end": ("FAIL", "/orphan/ has no internal links"),
    "regression.known_defect": ("FAIL", "the seeded registry entries are all present"),
}

BROWSER_DEFECT_MAP: Dict[str, Tuple[str, str]] = {
    "runtime.console_errors": ("FAIL", "home throws a ReferenceError on load"),
    "runtime.mobile_overflow": ("FAIL", "home has a 900px fixed-width block"),
    "a11y.contrast": ("FAIL", "home body copy is #BBBBBB on #FFFFFF"),
    "brand.banned_colour_rendered": ("FAIL", "#2EA3F2 is applied to the home page banner"),
}

# 1x1 transparent PNG.
PIXEL = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)

TOPICS = {
    "home": [
        "Emjay Wellness supports women through nervous system recalibration in a calm clinical setting.",
        "Belinda works with clients who feel functional but frayed and want steadier days.",
        "Sessions combine somatic awareness, holistic counselling and practical steadiness work.",
        "Appointments run in person and online across Australia with generous unhurried timing.",
        "Every visit starts with a conversation about capacity rather than a checklist of symptoms.",
    ],
    "about": [
        "Belinda Evans has twenty years of practitioner experience across counselling and skin therapy.",
        "Her background spans operations management, workplace safety and people culture leadership.",
        "One practitioner holds the whole picture instead of passing clients between referral networks.",
        "Training continues each year through supervised practice and trauma aware professional development.",
        "Clients describe the room as quiet, uncluttered and free of pressure to perform.",
    ],
    "services": [
        "Session formats range from a single conversation through to a structured six week program.",
        "Each format is built around capacity, steadiness and the pace a client can sustain.",
        "Bookings are made directly against the session length that suits the person enquiring.",
        "Preparation notes are sent beforehand so nobody arrives wondering what will happen.",
        "Follow up support is optional and never sold as an upgrade during an appointment.",
    ],
    "skin": [
        "Skin therapy at the clinic is treated as clinical work rather than a beauty add on.",
        "Treatment planning considers stress load, hormonal change and the barrier condition of the skin.",
        "Products used in the room are chosen for tolerance rather than fragrance or novelty.",
        "A treatment plan is written after the first visit and reviewed at every appointment.",
        "Nothing is recommended that a client cannot maintain comfortably at home between visits.",
    ],
    "contact": [
        "Enquiries reach the practice by email, by phone or through the enquiry form below.",
        "Messages are answered within two business days, and weekends are kept for existing clients.",
        "Parking is available at the front of the building with step free access to the door.",
        "Let the practice know about access needs beforehand so the room can be prepared.",
        "Cancellations made with reasonable notice are rescheduled without any additional charge.",
    ],
}


def _body_text(topic: str, repeats: int = 6) -> str:
    """Roughly 300 unique-ish words per page, distinct enough between pages that
    the duplicate-content check stays quiet on the clean fixture."""
    sentences: List[str] = []
    for index in range(repeats):
        for sentence in TOPICS[topic]:
            sentences.append(f"{sentence} Note {topic} {index}.")
    return " ".join(f"<p>{s}</p>" for s in sentences)


CLEAN_CSS = """
:root { --ink:#1F2421; --paper:#FAF9F5; --accent:#5A6E5A; }
body { background:var(--paper); color:var(--ink); font-family:'Lora', Georgia, serif; margin:0; }
a { color:#3C5A46; }
.banner { background:#5A6E5A; color:#FFFFFF; padding:2rem 1rem; }
.wrap { max-width:900px; margin:0 auto; padding:1rem; box-sizing:border-box; }
img { max-width:100%; height:auto; }
"""

DIRTY_CSS = """
body { background:#FFFFFF; color:#BBBBBB; font-family:'Open Sans', sans-serif; margin:0; }
a { color:#2EA3F2; }
.banner { background:#2EA3F2; color:#FFFFFF; padding:2rem 1rem; }
.wide { width:900px; background:#2EA3F3; height:40px; }
.wrap { max-width:900px; margin:0 auto; padding:1rem; }
"""


def _page(
    title: str = "",
    description: str = "",
    canonical: str = "",
    body: str = "",
    lang: str = 'lang="en-AU"',
    robots: str = "",
    viewport: str = '<meta name="viewport" content="width=device-width, initial-scale=1">',
    schema: str = "",
    css: str = "/assets/site.css",
    extra_head: str = "",
) -> str:
    head = [
        '<meta charset="utf-8">',
        viewport,
        f"<title>{title}</title>" if title else "",
        f'<meta name="description" content="{description}">' if description else "",
        f'<link rel="canonical" href="{canonical}">' if canonical else "",
        f'<meta name="robots" content="{robots}">' if robots else "",
        f'<link rel="stylesheet" href="{css}">',
        f'<meta property="og:title" content="{title}">' if title else "",
        f'<meta property="og:description" content="{description}">' if description else "",
        '<meta property="og:image" content="/assets/pixel.png">',
        extra_head,
        f'<script type="application/ld+json">{schema}</script>' if schema else "",
    ]
    return (
        f"<!doctype html>\n<html {lang}>\n<head>\n"
        + "\n".join(h for h in head if h)
        + "\n</head>\n<body>\n"
        + body
        + "\n</body>\n</html>\n"
    )


def _write(root: str, path: str, content) -> None:
    full = os.path.join(root, path.lstrip("/"))
    os.makedirs(os.path.dirname(full), exist_ok=True)
    mode = "wb" if isinstance(content, bytes) else "w"
    with open(full, mode, **({} if isinstance(content, bytes) else {"encoding": "utf-8"})) as handle:
        handle.write(content)


def _nav(base: str, extra: str = "") -> str:
    return (
        '<header><nav><a href="/">Home</a> <a href="/about/">About</a> '
        '<a href="/services/">Sessions</a> <a href="/skin/">Skin therapy</a> '
        '<a href="/contact/">Contact</a></nav></header>'
    )


def _footer(privacy: bool = True) -> str:
    privacy_link = '<a href="/privacy/">Privacy policy</a>' if privacy else ""
    return f"<footer>{privacy_link} <span>Emjay Wellness</span></footer>"


def build_clean(root: str, base: str) -> None:
    schema = json.dumps(
        {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "Emjay Wellness",
            "url": base + "/",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "1 Test Street",
                "addressLocality": "Tinana",
                "addressRegion": "QLD",
                "postalCode": "4650",
            },
        }
    )

    _write(root, "assets/site.css", CLEAN_CSS)
    _write(root, "assets/pixel.png", PIXEL)

    pages = {
        "index.html": _page(
            title="Emjay Wellness: nervous system support for women",
            description=(
                "Trauma informed nervous system support and clinical skin therapy for women in midlife, "
                "in person and online across Australia."
            ),
            canonical=base + "/",
            schema=schema,
            body=(
                _nav(base)
                + '<main><h1>Nervous system support for women</h1>'
                + '<img src="/assets/pixel.png" alt="The treatment room at the Tinana clinic" width="1" height="1">'
                + "<h2>What a session looks like</h2>"
                + _body_text("home")
                + '<h2>Where to start</h2><p>Read more <a href="/about/">about the practitioner</a>, '
                'compare the <a href="/services/">session formats</a>, look at '
                '<a href="/skin/">skin therapy</a>, <a href="/book/">book an appointment</a> '
                'or <a href="/contact/">get in touch</a>.</p>'
                + "</main>"
                + _footer()
            ),
        ),
        "about/index.html": _page(
            title="About Belinda Evans, Emjay Wellness practitioner",
            description=(
                "Twenty years of practitioner experience across somatic therapy, holistic counselling and "
                "clinical skin therapy, held by one practitioner."
            ),
            canonical=base + "/about/",
            body=(
                _nav(base)
                + "<main><h1>About Belinda Evans</h1><h2>Background</h2>"
                + _body_text("about")
                + '<h2>Next steps</h2><p>See the <a href="/services/">session formats</a>, the '
                '<a href="/skin/">skin therapy work</a>, or <a href="/contact/">contact the practice</a>.</p>'
                + "</main>"
                + _footer()
            ),
        ),
        "services/index.html": _page(
            title="Session formats and bookings at Emjay Wellness",
            description=(
                "Session formats at Emjay Wellness, from a single conversation to a structured six week "
                "program, with direct booking for each length."
            ),
            canonical=base + "/services/",
            body=(
                _nav(base)
                + "<main><h1>Session formats</h1><h2>Choosing a format</h2>"
                + _body_text("services")
                + '<img src="/assets/pixel.png" alt="A quiet consulting room with two chairs" width="1" height="1">'
                + '<h2>Book a session</h2><p><a href="/book/sixty-minute/?serviceVariationId=limit-60">Book the 60 minute session</a>, '
                'read <a href="/about/">about the practitioner</a> or return to the <a href="/">home page</a>.</p>'
                + "</main>"
                + _footer()
            ),
        ),
        "skin/index.html": _page(
            title="Clinical skin therapy at Emjay Wellness",
            description=(
                "Clinical skin therapy planned around stress load, hormonal change and barrier condition, "
                "reviewed at every appointment."
            ),
            canonical=base + "/skin/",
            body=(
                _nav(base)
                + "<main><h1>Clinical skin therapy</h1><h2>How treatment is planned</h2>"
                + _body_text("skin")
                + '<h2>Book skin therapy</h2><p><a href="/book/skin-therapy/?serviceVariationId=skin-60">Book a skin appointment</a>, '
                'see the <a href="/services/">other session formats</a> or read <a href="/about/">about Belinda</a>.</p>'
                + "</main>"
                + _footer()
            ),
        ),
        "contact/index.html": _page(
            title="Contact Emjay Wellness in Tinana, Queensland",
            description=(
                "Contact Emjay Wellness by email, phone or enquiry form. Messages are answered within two "
                "business days."
            ),
            canonical=base + "/contact/",
            body=(
                _nav(base)
                + "<main><h1>Contact the practice</h1><h2>How to reach us</h2>"
                + _body_text("contact")
                + '<h2>Send an enquiry</h2>'
                + '<form action="/thanks/" method="post">'
                + '<label for="name">Your name</label><input id="name" name="name" type="text" required>'
                + '<label for="email">Email address</label><input id="email" name="email" type="email" required>'
                + '<label for="message">What would you like to ask</label><textarea id="message" name="message"></textarea>'
                + '<button type="submit">Send enquiry</button></form>'
                + '<p><a href="mailto:hello@example.com">Email the practice</a>, '
                '<a href="/services/">see session formats</a> or go back to the <a href="/">home page</a>.</p>'
                + "</main>"
                + _footer()
            ),
        ),
        "book/index.html": _page(
            title="Book an appointment with Emjay Wellness online",
            description=(
                "Choose a session length and book directly. Each format has its own booking link so the "
                "right time is reserved."
            ),
            canonical=base + "/book/",
            body=(
                _nav(base)
                + "<main><h1>Book an appointment</h1><h2>Choose a length</h2>"
                + _body_text("services")
                + '<p><a href="/book/sixty-minute/?serviceVariationId=limit-60">60 minute session</a>, '
                '<a href="/book/skin-therapy/?serviceVariationId=skin-60">skin therapy</a>, '
                'or <a href="/contact/">ask a question first</a>.</p>'
                + "</main>"
                + _footer()
            ),
        ),
        "book/sixty-minute/index.html": _page(
            title="Book the sixty minute session at Emjay Wellness",
            description=(
                "Reserve the sixty minute session directly. The booking holds the full hour so nothing "
                "is rushed at either end."
            ),
            canonical=base + "/book/sixty-minute/",
            body=(
                _nav(base)
                + "<main><h1>Book the sixty minute session</h1><h2>What is reserved</h2>"
                + _body_text("home")
                + '<p>Prefer skin therapy instead? <a href="/book/skin-therapy/?serviceVariationId=skin-60">Book skin '
                'therapy</a>, compare <a href="/services/">session formats</a> or <a href="/contact/">ask first</a>.</p>'
                + "</main>"
                + _footer()
            ),
        ),
        "book/skin-therapy/index.html": _page(
            title="Book a clinical skin therapy appointment online",
            description=(
                "Reserve a clinical skin therapy appointment. Treatment planning happens in the room, "
                "not before you arrive."
            ),
            canonical=base + "/book/skin-therapy/",
            body=(
                _nav(base)
                + "<main><h1>Book skin therapy</h1><h2>What is reserved</h2>"
                + _body_text("skin")
                + '<p>Prefer a conversation first? <a href="/book/sixty-minute/?serviceVariationId=limit-60">Book the '
                'sixty minute session</a>, read <a href="/skin/">about skin therapy</a> or '
                '<a href="/contact/">contact the practice</a>.</p>'
                + "</main>"
                + _footer()
            ),
        ),
        "privacy/index.html": _page(
            title="Privacy policy for Emjay Wellness clients",
            description=(
                "How enquiry details and client notes are collected, stored and destroyed at Emjay "
                "Wellness, and how to request a copy."
            ),
            canonical=base + "/privacy/",
            body=(
                _nav(base)
                + "<main><h1>Privacy policy</h1><h2>What is collected</h2>"
                + _body_text("contact")
                + '<p>Questions about this policy can go through the <a href="/contact/">contact page</a>, '
                'or see the <a href="/services/">session formats</a> and the <a href="/">home page</a>.</p>'
                + "</main>"
                + _footer()
            ),
        ),
        "thanks/index.html": _page(
            title="Thank you for contacting Emjay Wellness today",
            description=(
                "Your enquiry has been received. Messages are answered within two business days, usually "
                "sooner during the week."
            ),
            canonical=base + "/thanks/",
            robots="noindex, follow",
            body=(
                _nav(base)
                + "<main><h1>Thank you</h1><h2>What happens next</h2>"
                + _body_text("contact")
                + '<p>Meanwhile, read <a href="/about/">about the practitioner</a>, the '
                '<a href="/services/">session formats</a> or the <a href="/">home page</a>.</p>'
                + "</main>"
                + _footer()
            ),
        ),
    }
    for path, content in pages.items():
        _write(root, path, content)

    urls = [
        "/", "/about/", "/services/", "/skin/", "/contact/", "/book/",
        "/book/sixty-minute/", "/book/skin-therapy/", "/privacy/",
    ]
    _write(root, "sitemap.xml", _sitemap(base, urls))
    _write(root, "robots.txt", f"User-agent: *\nAllow: /\nSitemap: {base}/sitemap.xml\n")
    _write(root, "_rules.json", json.dumps({"redirects": {}, "gone": []}))


def build_dirty(root: str, base: str) -> None:
    schema_missing_address = json.dumps(
        {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "Emjay Spa & Wellness",
            "url": base + "/",
        }
    )

    _write(root, "assets/site.css", DIRTY_CSS)
    _write(root, "assets/pixel.png", PIXEL)

    _write(
        root,
        "index.html",
        _page(
            title="Emjay Wellness: nervous system support for women",
            description=(
                "Trauma informed nervous system support and clinical skin therapy for women in midlife, "
                "in person and online across Australia."
            ),
            canonical=base + "/",
            schema=schema_missing_address,
            extra_head='<script src="http://insecure.example.com/tracker.js"></script>',
            body=(
                _nav(base)
                + '<div class="banner" style="background:#2EA3F2">Emjay Spa &amp; Wellness</div>'
                + "<main><h1>Nervous system support for women</h1>"
                + "<h1>Emjay Spa &amp; Wellness</h1>"
                + "<h2></h2>"
                + '<img src="/assets/pixel.png" width="1" height="1">'
                + _body_text("home")
                + '<div class="wide">wide block</div>'
                + '<p>Gift certificates are available all year. Ask about the Midweek Reset when you book.</p>'
                + '<p><a href="/gift-certificates/">Buy a gift certificate</a>, '
                '<a href="/broken-page/">read the guide</a>, '
                '<a href="/old-service/">see the old service page</a>, '
                '<a href="http://localhost:9/staging">staging preview</a>, '
                '<a href="/services/"></a></p>'
                + '<script>window.addEventListener("load", function () { missingFunction(); });</script>'
                + "</main>"
                + _footer(privacy=False)
            ),
        ),
    )

    _write(
        root,
        "services/index.html",
        _page(
            title="Emjay Wellness: nervous system support for women",
            description=(
                "Trauma informed nervous system support and clinical skin therapy for women in midlife, "
                "in person and online across Australia."
            ),
            canonical=base + "/services/",
            viewport='<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">',
            body=(
                _nav(base)
                + "<main><h1>Session formats</h1><h2>Choosing a format</h2>"
                + _body_text("services", repeats=14)
                + '<img src="/assets/pixel.png" alt="IMG_2043.jpg" width="1" height="1">'
                + '<p><a href="/book/">Book now</a></p>'
                + "</main>"
                + _footer(privacy=False)
            ),
        ),
    )

    _write(
        root,
        "skin/index.html",
        _page(
            title="",
            description="",
            canonical=base + "/broken-page/",
            lang="",
            body=(
                _nav(base)
                + "<main><h2>Skin therapy</h2><h4>Lorem ipsum dolor sit amet</h4>"
                + _body_text("services", repeats=14)
                + "</main>"
                + _footer(privacy=False)
            ),
        ),
    )

    _write(
        root,
        "contact/index.html",
        _page(
            title="Contact Emjay Wellness in Tinana, Queensland",
            description=(
                "Contact Emjay Wellness by email, phone or enquiry form. Messages are answered within two "
                "business days."
            ),
            schema="{ this is not valid json ",
            body=(
                _nav(base)
                + "<main><h2>Contact the practice</h2>"
                + _body_text("contact")
                + '<form action="/thanks/" method="get">'
                + '<input name="name" type="text" placeholder="Your name">'
                + '<input name="email" type="email" placeholder="Email">'
                + "</form>"
                + '<p><a href="mailto:bookings(at)example">Email the practice</a></p>'
                + "</main>"
                + _footer(privacy=False)
            ),
        ),
    )

    _write(
        root,
        "orphan/index.html",
        _page(
            title="Orphan page nobody links to on this site",
            description=(
                "A page that exists in the sitemap but has no inbound internal links anywhere on the "
                "site at all."
            ),
            canonical=base + "/orphan/",
            robots="noindex",
            body="<main><h1>Orphan</h1><p>Very little here.</p></main>",
        ),
    )

    _write(
        root,
        "gift-certificates/index.html",
        _page(
            title="Gift certificates from Emjay Wellness for someone",
            description=(
                "A retired gift certificate page that should no longer resolve, kept here so the retired "
                "URL check has something to find."
            ),
            canonical=base + "/gift-certificates/",
            body="<main><h1>Gift certificates</h1><p>Gift certificates are available.</p></main>",
        ),
    )

    _write(
        root,
        "book/index.html",
        _page(
            title="Book an appointment with Emjay Wellness online",
            description=(
                "Generic booking front door with no service preselected, used to trip the booking intent "
                "check on service pages."
            ),
            canonical=base + "/book/",
            body=_nav(base) + "<main><h1>Book</h1>" + _body_text("services") + "</main>",
        ),
    )

    urls = ["/", "/services/", "/skin/", "/contact/", "/orphan/", "/missing-page/"]
    _write(root, "sitemap.xml", _sitemap(base, urls))
    _write(root, "robots.txt", "User-agent: *\nAllow: /\n")
    _write(
        root,
        "_rules.json",
        json.dumps({"redirects": {"/old-service/": ["/temp-service/", 302], "/temp-service/": ["/services/", 301]}, "gone": []}),
    )


def _sitemap(base: str, paths: List[str]) -> str:
    entries = "".join(f"<url><loc>{base}{p}</loc></url>" for p in paths)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{entries}</urlset>\n'


def build(root: str, base_clean: str, base_dirty: str) -> None:
    build_clean(os.path.join(root, "clean"), base_clean)
    build_dirty(os.path.join(root, "dirty"), base_dirty)
