"""
Single point of contact with Ollama. Every agent goes through here.

Design rules (see architecture doc section 6):
- Always request JSON-mode output with a strict schema in the prompt.
- Always wrap in a timeout.
- Always have a rule-based fallback so a slow/down Ollama never blocks a demo.
"""
import os
import json
import requests

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gpt-oss:120b-cloud")
TIMEOUT_SECONDS = float(os.getenv("OLLAMA_TIMEOUT", "8"))


class OllamaError(Exception):
    pass


def call_ollama_json(prompt: str) -> dict:
    """
    Calls Ollama in JSON mode. Raises OllamaError on any failure
    (timeout, connection error, malformed JSON) so callers can
    fall back to rule-based logic instead of crashing the request.
    """
    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "format": "json",
                "stream": False,
            },
            timeout=TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        raw = response.json().get("response", "")
        return json.loads(raw)
    except (requests.RequestException, json.JSONDecodeError, KeyError) as e:
        raise OllamaError(str(e)) from e


def prewarm():
    """Call once at startup so the first real request isn't a cold start."""
    try:
        call_ollama_json('Respond with JSON: {"status": "ok"}')
    except OllamaError:
        pass  # non-fatal -- Ollama may not be up yet in dev
