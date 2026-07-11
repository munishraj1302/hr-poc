"""
Recommends an existing active employee as a buddy for a new hire --
same department, ideally same or adjacent role, currently active
(already fully onboarded). Needs DB access (unlike the other agents)
since it has to look at real existing employees, not just config.
"""
from sqlalchemy.orm import Session
from app.models import Employee
from app.ai_client import call_ollama_json, OllamaError

PROMPT_TEMPLATE = """A new employee, {new_name} ({new_role}, {department} department),
needs an onboarding buddy. Candidates in the same department who are already
active: {candidates}. Pick the single best candidate and explain why in one
sentence. Respond ONLY with JSON: {{"buddy_name": "<name from the list>", "reasoning": "<one sentence>"}}
"""


def recommend_buddy(db: Session, employee: Employee) -> dict:
    candidates = (
        db.query(Employee)
        .filter(
            Employee.department == employee.department,
            Employee.status == "active",
            Employee.id != employee.id,
        )
        .limit(5)
        .all()
    )
    if not candidates:
        return {"buddy_name": None, "reasoning": "No active employees in the same department yet to assign as a buddy."}

    candidate_names = [c.name for c in candidates]
    try:
        result = call_ollama_json(PROMPT_TEMPLATE.format(
            new_name=employee.name, new_role=employee.role, department=employee.department,
            candidates=", ".join(candidate_names),
        ))
        if result.get("buddy_name") not in candidate_names:
            raise OllamaError("model picked a name outside the candidate list")
        return result
    except OllamaError:
        # Fallback: first candidate with the same role, else just the first candidate
        same_role = next((c for c in candidates if c.role == employee.role), candidates[0])
        return {
            "buddy_name": same_role.name,
            "reasoning": f"Selected as buddy based on matching department (Ollama unavailable for reasoning).",
        }
