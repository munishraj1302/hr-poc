"""
Classifies offboarding risk level (High/Medium/Low) based on the access
the employee held. Uses Ollama for reasoning; risk level itself is
computed with simple rules so it stays deterministic and auditable.
"""
from app.ai_client import call_ollama_json, OllamaError

REASONING_PROMPT = """In one sentence, explain why an employee with these
access factors: {factors} was classified as "{risk_level}" risk during
offboarding. Respond ONLY with JSON: {{"reasoning": "<one sentence>"}}
"""


def assess_risk(has_admin_rights: bool, has_client_data_access: bool,
                 has_financial_access: bool, has_legal_matter_access: bool) -> dict:
    factors = []
    if has_admin_rights:
        factors.append("Admin Rights")
    if has_client_data_access:
        factors.append("Client Data Access")
    if has_financial_access:
        factors.append("Financial Access")
    if has_legal_matter_access:
        factors.append("Legal Matter Access")

    if has_admin_rights or has_legal_matter_access:
        risk_level = "High"
    elif has_client_data_access or has_financial_access:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    try:
        result = call_ollama_json(REASONING_PROMPT.format(factors=factors, risk_level=risk_level))
        reasoning = result.get("reasoning", "")
    except OllamaError:
        reasoning = f"Classified {risk_level} based on access factors: {', '.join(factors) or 'none'}."

    return {"risk_level": risk_level, "factors": factors, "reasoning": reasoning}
