from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AuditLog

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/{employee_id}")
def get_audit_trail(employee_id: str, db: Session = Depends(get_db)):
    rows = (
        db.query(AuditLog)
        .filter(AuditLog.employee_id == employee_id)
        .order_by(AuditLog.timestamp.asc())
        .all()
    )
    return [
        {"timestamp": r.timestamp, "agent": r.agent, "action": r.action, "detail": r.detail}
        for r in rows
    ]
