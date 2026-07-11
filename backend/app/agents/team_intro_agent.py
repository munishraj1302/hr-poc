"""
Drafts a short "welcome to the team" intro blurb about the new hire, for
the Manager track's Team Introduction task. Simulated content only --
same pattern as the earlier document-request email: generated and shown,
never actually sent anywhere.
"""
from app.ai_client import call_ollama_json, OllamaError

PROMPT_TEMPLATE = """Write a short, warm team-introduction message (under
60 words) announcing that {name} is joining as {role} in the {department}
department, starting {joining_date}. Respond ONLY with JSON:
{{"intro_text": "<the message>"}}
"""


def _fallback_intro(name: str, role: str, department: str, joining_date: str) -> str:
    return (
        f"Please join us in welcoming {name} to the team! {name} is joining as "
        f"{role} in {department}, starting {joining_date}. Feel free to say hello!"
    )


def draft_team_intro(name: str, role: str, department: str, joining_date: str) -> dict:
    try:
        result = call_ollama_json(PROMPT_TEMPLATE.format(
            name=name, role=role, department=department, joining_date=joining_date or "soon",
        ))
        if "intro_text" not in result:
            raise OllamaError("missing expected key in model output")
        return result
    except OllamaError:
        return {"intro_text": _fallback_intro(name, role, department, joining_date or "soon")}
