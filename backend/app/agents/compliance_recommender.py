"""Generates the compliance task checklist based on role. Config-driven, no Ollama needed."""
from app.config import get_compliance_templates


def recommend_compliance(role: str) -> list:
    templates = get_compliance_templates()
    return templates.get(role, templates["default"])
