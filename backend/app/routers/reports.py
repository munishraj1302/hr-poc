"""
Generates the onboarding/offboarding summary report as PDF and stores it
under app/reports/. Uses reportlab -- lightweight, no external service needed.
"""
import os
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from app.database import get_db
from app.models import (
    Employee, AccessRecommendation, AssetAllocation, ComplianceTask, Approval, Report,
)

router = APIRouter(prefix="/reports", tags=["reports"])
REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)


def _generate_pdf(employee: Employee, access, assets, compliance_tasks, approvals, report_type: str) -> str:
    filename = f"{employee.employee_id}_{report_type}.pdf"
    filepath = os.path.join(REPORTS_DIR, filename)
    c = canvas.Canvas(filepath, pagesize=letter)
    y = 750

    def line(text, size=11, gap=18):
        nonlocal y
        c.setFont("Helvetica", size)
        c.drawString(50, y, text)
        y -= gap

    line(f"{report_type.title()} Summary Report", size=16, gap=30)
    line(f"Employee: {employee.name} ({employee.employee_id})")
    line(f"Department: {employee.department}   Role: {employee.role}")
    line(f"Office: {employee.office}   Manager: {employee.manager}")
    line(f"Source: {employee.sync_source}   Status: {employee.status}", gap=26)

    if access:
        line("Assigned Applications:", size=12)
        line(", ".join(json.loads(access.applications or "[]")), gap=22)
        line("Security Groups:", size=12)
        line(", ".join(json.loads(access.security_groups or "[]")), gap=22)

    if assets:
        line("Allocated Assets:", size=12)
        line(", ".join(json.loads(assets.asset_list or "[]")), gap=26)

    if compliance_tasks:
        line("Compliance Status:", size=12)
        for task in compliance_tasks:
            line(f"  - {task.task_name}: {task.status}", size=10, gap=14)
        y -= 8

    if approvals:
        line("Approvals:", size=12)
        for a in approvals:
            line(f"  - {a.approver_role}: {a.status}", size=10, gap=14)

    c.save()
    return filepath


@router.get("/{employee_id}")
def get_report_meta(employee_id: str, report_type: str = "onboarding", db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    access = db.query(AccessRecommendation).filter(AccessRecommendation.employee_id == employee_id).order_by(AccessRecommendation.created_at.desc()).first()
    assets = db.query(AssetAllocation).filter(AssetAllocation.employee_id == employee_id).order_by(AssetAllocation.created_at.desc()).first()
    compliance_tasks = db.query(ComplianceTask).filter(ComplianceTask.employee_id == employee_id).all()
    approvals = db.query(Approval).filter(Approval.employee_id == employee_id, Approval.workflow_type == report_type).all()

    filepath = _generate_pdf(employee, access, assets, compliance_tasks, approvals, report_type)
    db.add(Report(employee_id=employee_id, report_type=report_type, file_path=filepath))
    db.commit()

    return {"employee_id": employee_id, "report_type": report_type, "file_path": filepath}


@router.get("/{employee_id}/download")
def download_report(employee_id: str, report_type: str = "onboarding", db: Session = Depends(get_db)):
    record = (
        db.query(Report)
        .filter(Report.employee_id == employee_id, Report.report_type == report_type)
        .order_by(Report.generated_at.desc())
        .first()
    )
    if not record or not os.path.exists(record.file_path):
        raise HTTPException(status_code=404, detail="Report not generated yet -- call GET /reports/{employee_id} first")
    return FileResponse(record.file_path, media_type="application/pdf", filename=os.path.basename(record.file_path))
