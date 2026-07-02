from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json
from app.database import get_db
from app.models import AssetAllocation

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("/{employee_id}")
def get_assets(employee_id: str, db: Session = Depends(get_db)):
    record = (
        db.query(AssetAllocation)
        .filter(AssetAllocation.employee_id == employee_id)
        .order_by(AssetAllocation.created_at.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="No assets allocated yet")
    return {"asset_list": json.loads(record.asset_list or "[]"), "status": record.status}


@router.post("/{employee_id}/return")
def return_asset(employee_id: str, db: Session = Depends(get_db)):
    record = (
        db.query(AssetAllocation)
        .filter(AssetAllocation.employee_id == employee_id)
        .order_by(AssetAllocation.created_at.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="No assets found")
    record.status = "returned"
    db.commit()
    return {"employee_id": employee_id, "status": "returned"}
