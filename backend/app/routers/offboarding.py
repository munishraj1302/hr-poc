from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import OffboardingTracker, Employee
from app.schemas.employee import ExitRequestCreate
from app.orchestrators.offboarding_orchestrator import run_offboarding

router = APIRouter(prefix="/offboarding", tags=["offboarding"])


@router.post("/{employee_id}/start")
def start_offboarding(employee_id: str, payload: ExitRequestCreate, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return run_offboarding(db, employee_id, payload.last_working_day, payload.exit_reason, "manual")


@router.get("/{employee_id}/status")
def offboarding_status(employee_id: str, db: Session = Depends(get_db)):
    rows = (
        db.query(OffboardingTracker)
        .filter(OffboardingTracker.employee_id == employee_id)
        .order_by(OffboardingTracker.timestamp.asc())
        .all()
    )
    return [{"step": r.step, "status": r.status, "timestamp": r.timestamp} for r in rows]
