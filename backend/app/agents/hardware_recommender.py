"""Recommends asset/hardware allocation based on role. Config-driven, no Ollama needed."""
from app.config import get_asset_templates


def recommend_hardware(role: str) -> dict:
    assets = get_asset_templates().get(role, ["Laptop"])
    return {"asset_list": assets}
