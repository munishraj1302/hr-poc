"""
Drafts the "please send your missing documents" email. Simulated only --
this is never actually sent (see architecture note in orchestrator),
just generated and logged so the demo/tracker can show what would have
gone out. Ollama writes the body; falls back to a plain template if
Ollama is unavailable.
"""
from app.ai_client import call_ollama_json, OllamaError

PROMPT_TEMPLATE = """Write a short, polite HR onboarding email to {name}
requesting these missing documents: {missing_docs}. Keep it under 100 words,
professional but warm tone. Respond ONLY with JSON in this exact shape:
{{"subject": "<email subject line>", "body": "<email body text>"}}
"""


def _fallback_template(name: str, missing_docs: list[str]) -> dict:
    doc_list = "\n".join(f"- {d}" for d in missing_docs)
    return {
        "subject": "Action Required: Missing Onboarding Documents",
        "body": (
            f"Hi {name},\n\nTo complete your onboarding, we still need the following "
            f"document(s) from you:\n{doc_list}\n\nPlease share these at your earliest "
            f"convenience so we can proceed with your onboarding.\n\nThanks,\nHR Team"
        ),
    }


def draft_document_request_email(name: str, missing_docs: list[str]) -> dict:
    try:
        result = call_ollama_json(PROMPT_TEMPLATE.format(name=name, missing_docs=", ".join(missing_docs)))
        if "subject" not in result or "body" not in result:
            raise OllamaError("missing expected keys in model output")
        return result
    except OllamaError:
        return _fallback_template(name, missing_docs)
