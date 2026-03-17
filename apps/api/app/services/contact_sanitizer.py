"""Utilities for sanitizing agent-generated contact data to prevent hallucinated names."""

from __future__ import annotations

# Role titles that should never appear as a person's name.
_ROLE_TITLE_WORDS = {
    "head", "lead", "manager", "director", "vp", "chief", "officer",
    "founder", "cofounder", "co-founder", "ceo", "cto", "cfo", "coo",
    "cmo", "cpo", "president", "partner", "owner", "growth", "marketing",
    "partnerships", "sales", "engineering", "product", "support", "team",
    "business", "development", "operations",
}


def name_looks_like_role(name: str | None) -> bool:
    """Return True if the 'name' is actually a job title, not a person's name."""
    raw = (name or "").strip().lower()
    if not raw:
        return False
    words = set(raw.replace("-", " ").split())
    # If every word in the name is a role keyword, it's a role title not a name.
    if words and words.issubset(_ROLE_TITLE_WORDS):
        return True
    # Common patterns like "Head of Growth", "Marketing Lead"
    if raw.startswith("head of ") or raw.startswith("director of ") or raw.startswith("vp of "):
        return True
    return False


def sanitize_contact_name(name: str | None, confidence: float | None) -> str | None:
    """Strip contact names that are likely hallucinated or are role titles."""
    raw = (name or "").strip()
    if not raw:
        return None
    # Role titles masquerading as names
    if name_looks_like_role(raw):
        return None
    # Low-confidence names from agents are likely hallucinated
    if isinstance(confidence, (int, float)) and confidence < 0.7:
        return None
    return raw
