from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json
from app.database import get_db
from app.models import AccessRecommendation

router = APIRouter(prefix="/access", tags=["access"])


@router.get("/{employee_id}/recommendation")
def get_access_recommendation(employee_id: str, db: Session = Depends(get_db)):
    record = (
        db.query(AccessRecommendation)
        .filter(AccessRecommendation.employee_id == employee_id)
        .order_by(AccessRecommendation.created_at.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="No access recommendation yet")
    return {
        "applications": json.loads(record.applications or "[]"),
        "security_groups": json.loads(record.security_groups or "[]"),
        "ethical_wall_rules": json.loads(record.ethical_wall_rules) if record.ethical_wall_rules else None,
        "reasoning": record.reasoning,
    }
