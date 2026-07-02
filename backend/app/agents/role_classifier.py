"""
Classifies an employee into one of the predefined roles.
Falls back to a simple department/title keyword match if Ollama is unavailable.
"""
import json
from app.ai_client import call_ollama_json, OllamaError
from app.config import get_roles

PROMPT_TEMPLATE = """You are an HR role classification assistant.
Given this employee's department and title, classify them into exactly one
of these roles: {roles}.

Employee:
department: {department}
title: {title}
office: {office}

Respond ONLY with JSON in this exact shape, no other text:
{{"role": "<one of the roles above>", "confidence": <float 0-1>, "reasoning": "<one sentence>"}}
"""


def _rule_based_fallback(department: str, title: str, roles_config: dict) -> dict:
    department = (department or "").lower()
    title = (title or "").lower()
    for role, hints in roles_config.items():
        dept_hints = [h.lower() for h in hints.get("department_hints", [])]
        title_hints = [h.lower() for h in hints.get("title_hints", [])]
        if any(h in department for h in dept_hints) or any(h in title for h in title_hints):
            return {
                "role": role,
                "confidence": 0.6,
                "reasoning": f"Rule-based fallback match on department/title keywords (Ollama unavailable).",
            }
    return {"role": "Receptionist", "confidence": 0.3, "reasoning": "No match found; defaulted (Ollama unavailable)."}


def classify_role(department: str, title: str, office: str) -> dict:
    roles_config = get_roles()
    prompt = PROMPT_TEMPLATE.format(
        roles=", ".join(roles_config.keys()),
        department=department, title=title or "", office=office or "",
    )
    try:
        result = call_ollama_json(prompt)
        if result.get("role") not in roles_config:
            raise OllamaError("model returned a role outside the allowed list")
        return result
    except OllamaError:
        return _rule_based_fallback(department, title, roles_config)
