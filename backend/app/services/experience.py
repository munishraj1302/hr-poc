"""
Derives fresher/experienced classification. Stored on Employee at
registration time (see architecture review: any future agent needs to
read one stable value, not recompute it from raw HRMS fields every time).

Priority: explicit HRMS value > years_of_experience > title heuristic > default.
"""

EXPERIENCED_TITLE_KEYWORDS = ["senior", "lead", "principal", "manager", "director", "head"]
FRESHER_TITLE_KEYWORDS = ["intern", "trainee", "graduate", "associate", "junior"]


def derive_experience_level(title: str = None, years_of_experience: int = None, explicit: str = None) -> str:
    if explicit in ("fresher", "experienced"):
        return explicit

    if years_of_experience is not None:
        return "experienced" if years_of_experience >= 2 else "fresher"

    if title:
        t = title.lower()
        if any(k in t for k in EXPERIENCED_TITLE_KEYWORDS):
            return "experienced"
        if any(k in t for k in FRESHER_TITLE_KEYWORDS):
            return "fresher"

    return "experienced"  # default fallback when nothing else is available
