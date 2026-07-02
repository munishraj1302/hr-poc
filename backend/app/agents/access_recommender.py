"""
Recommends applications, security groups, and (for legal roles) ethical
wall rules. Defaults come from config JSON, keyed by role -- Ollama is
used only to generate the human-readable reasoning, never to invent
access lists from scratch (keeps recommendations auditable/predictable).
"""
from app.ai_client import call_ollama_json, OllamaError
from app.config import get_applications, get_security_groups

LEGAL_ROLES = {"Attorney", "Partner", "Paralegal", "Legal Secretary"}

ETHICAL_WALL_TEMPLATE = {
    "allowed": ["Practice Group Access", "Matter Access"],
    "restricted": ["Litigation Matters", "M&A Matters", "Capital Markets", "Client Confidential Matters"],
}

REASONING_PROMPT = """In one sentence, explain why an employee with role
"{role}" should get these applications: {applications} and these security
groups: {security_groups}. Respond ONLY with JSON: {{"reasoning": "<one sentence>"}}
"""


def recommend_access(role: str) -> dict:
    apps = get_applications().get(role, [])
    groups = get_security_groups().get(role, [])
    ethical_wall = ETHICAL_WALL_TEMPLATE if role in LEGAL_ROLES else None

    try:
        result = call_ollama_json(
            REASONING_PROMPT.format(role=role, applications=apps, security_groups=groups)
        )
        reasoning = result.get("reasoning", "")
    except OllamaError:
        reasoning = f"Default access set for role '{role}' per configured role template."

    return {
        "applications": apps,
        "security_groups": groups,
        "ethical_wall_rules": ethical_wall,
        "reasoning": reasoning,
    }
