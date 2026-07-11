"""
Reasons about whether a role's requested access includes privileged/admin
scope, and drafts a justification for the Security track's review task.
Risk determination itself stays rule-based (deterministic, auditable) --
Ollama only writes the explanation, same pattern as risk_assessor.py.
"""
from app.ai_client import call_ollama_json, OllamaError

PROMPT_TEMPLATE = """An employee with role "{role}" has been granted these
security groups: {security_groups}. {admin_note} In one sentence, write a
justification for a security reviewer explaining whether this level of
access is appropriate for the role. Respond ONLY with JSON:
{{"reasoning": "<one sentence>"}}
"""


def review_privileged_access(role: str, security_groups: list[str]) -> dict:
    requires_review = "Admin Groups" in security_groups
    admin_note = (
        "This includes Admin Groups (privileged/admin access)."
        if requires_review else
        "This does not include any admin or privileged groups."
    )

    try:
        result = call_ollama_json(PROMPT_TEMPLATE.format(
            role=role, security_groups=", ".join(security_groups), admin_note=admin_note,
        ))
        reasoning = result.get("reasoning", "")
    except OllamaError:
        reasoning = (
            f"Role '{role}' includes Admin Groups membership -- privileged access, manual review required."
            if requires_review else
            f"Role '{role}' has standard (non-privileged) access -- no elevated review needed."
        )

    return {"requires_review": requires_review, "reasoning": reasoning}
