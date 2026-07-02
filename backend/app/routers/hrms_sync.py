from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.integrations.hrms_connector import pull_new_hires, pull_exits
from app.orchestrators.onboarding_orchestrator import run_onboarding
from app.orchestrators.offboarding_orchestrator import run_offboarding

router = APIRouter(prefix="/hrms", tags=["hrms-sync"])


@router.post("/sync/new-hires")
def sync_new_hires(db: Session = Depends(get_db)):
    """Pulls new hires from the mock HRMS, creates employee records,
    and kicks off onboarding for each one -- this is the 'Sync from HRMS'
    button on the Employee Directory screen."""
    new_employees = pull_new_hires(db)
    results = []
    for employee in new_employees:
        outcome = run_onboarding(db, employee.id)
        results.append({"employee_id": employee.id, "name": employee.name, "outcome": outcome})
    return {"synced_count": len(new_employees), "results": results}


@router.post("/sync/exits")
def sync_exits(db: Session = Depends(get_db)):
    """Pulls exit records from the mock HRMS and kicks off offboarding."""
    exits = pull_exits(db)
    results = []
    for exit_record in exits:
        outcome = run_offboarding(
            db, exit_record["employee_id"],
            last_working_day=exit_record["last_working_day"],
            exit_reason=exit_record["exit_reason"],
            sync_source="hrms",
        )
        results.append({"employee_id": exit_record["employee_id"], "outcome": outcome})
    return {"synced_count": len(exits), "results": results}
