"""
Recommends 1-3 internal projects, ranked, with reasoning -- based on role,
department, and experience level. Config-driven catalog
(config_data/projects.json) + Ollama for ranking/reasoning; rule-based
fallback filters the catalog by role+experience match if Ollama is down.
"""
from app.ai_client import call_ollama_json, OllamaError
from app.config import get_projects

PROMPT_TEMPLATE = """An employee with role "{role}" in the {department}
department, experience level "{experience_level}", needs project
recommendations. Available projects: {projects}. Pick up to 3 best-fit
projects, ranked best first, each with a one-sentence reason. Respond
ONLY with JSON: {{"recommendations": [{{"project": "<name>", "reasoning": "<one sentence>"}}]}}
"""


def _fallback_recommendations(role: str, experience_level: str, projects: list) -> dict:
    matches = [
        p for p in projects
        if role in p.get("suited_roles", []) and experience_level in p.get("suited_experience", [])
    ]
    if not matches:
        matches = [p for p in projects if role in p.get("suited_roles", [])]
    if not matches:
        matches = projects[:2]
    return {
        "recommendations": [
            {"project": p["name"],
             "reasoning": f"Matches role '{role}' and experience level '{experience_level}' (Ollama unavailable)."}
            for p in matches[:3]
        ]
    }


def recommend_projects(role: str, department: str, experience_level: str) -> dict:
    projects = get_projects()
    experience_level = experience_level or "experienced"
    project_summaries = [
        {"name": p["name"], "suited_roles": p["suited_roles"], "suited_experience": p["suited_experience"]}
        for p in projects
    ]

    try:
        result = call_ollama_json(PROMPT_TEMPLATE.format(
            role=role, department=department, experience_level=experience_level,
            projects=project_summaries,
        ))
        if not result.get("recommendations"):
            raise OllamaError("empty recommendations from model")
        return result
    except OllamaError:
        return _fallback_recommendations(role, experience_level, projects)
