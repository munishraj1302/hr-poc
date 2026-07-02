"""
Core SQLAlchemy models. Matches the schema in POC_Technical_Architecture.md section 4.
"""
import datetime
import uuid
from sqlalchemy import Column, String, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


def gen_id():
    return str(uuid.uuid4())


class Employee(Base):
    __tablename__ = "employees"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    employee_id = Column(String, unique=True, nullable=False)
    email = Column(String, nullable=False)
    department = Column(String, nullable=False)
    title = Column(String, nullable=True)
    role = Column(String, nullable=True)          # confirmed role, set after classification
    office = Column(String, nullable=True)
    manager = Column(String, nullable=True)
    joining_date = Column(String, nullable=True)
    sync_source = Column(String, default="manual")  # "manual" | "hrms"
    status = Column(String, default="registered")   # registered -> onboarding -> active -> offboarding -> exited
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class RoleClassification(Base):
    __tablename__ = "role_classifications"

    id = Column(String, primary_key=True, default=gen_id)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False)
    predicted_role = Column(String, nullable=False)
    confidence = Column(Float, default=0.0)
    reasoning = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class AccessRecommendation(Base):
    __tablename__ = "access_recommendations"

    id = Column(String, primary_key=True, default=gen_id)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False)
    applications = Column(Text, nullable=True)        # JSON-encoded list
    security_groups = Column(Text, nullable=True)      # JSON-encoded list
    ethical_wall_rules = Column(Text, nullable=True)   # JSON-encoded dict
    reasoning = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class AssetAllocation(Base):
    __tablename__ = "asset_allocations"

    id = Column(String, primary_key=True, default=gen_id)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False)
    asset_list = Column(Text, nullable=True)   # JSON-encoded list
    status = Column(String, default="pending")  # pending | allocated | returned | damaged
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class ComplianceTask(Base):
    __tablename__ = "compliance_tasks"

    id = Column(String, primary_key=True, default=gen_id)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False)
    task_name = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending | completed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class OnboardingTracker(Base):
    __tablename__ = "onboarding_tracker"

    id = Column(String, primary_key=True, default=gen_id)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False)
    step = Column(String, nullable=False)
    status = Column(String, default="waiting")  # waiting | running | completed | failed
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class OffboardingTracker(Base):
    __tablename__ = "offboarding_tracker"

    id = Column(String, primary_key=True, default=gen_id)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False)
    step = Column(String, nullable=False)
    status = Column(String, default="waiting")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class ExitRequest(Base):
    __tablename__ = "exit_requests"

    id = Column(String, primary_key=True, default=gen_id)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False)
    last_working_day = Column(String, nullable=True)
    exit_reason = Column(String, nullable=True)
    sync_source = Column(String, default="manual")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(String, primary_key=True, default=gen_id)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False)
    risk_level = Column(String, nullable=False)  # High | Medium | Low
    factors = Column(Text, nullable=True)          # JSON-encoded list
    reasoning = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Approval(Base):
    __tablename__ = "approvals"

    id = Column(String, primary_key=True, default=gen_id)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False)
    workflow_type = Column(String, nullable=False)   # onboarding | offboarding
    approver_role = Column(String, nullable=False)    # HR | Manager | IT | Security
    status = Column(String, default="pending")         # pending | approved | rejected
    decided_at = Column(DateTime, nullable=True)


class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=gen_id)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False)
    report_type = Column(String, nullable=False)  # onboarding | offboarding
    file_path = Column(String, nullable=False)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(String, primary_key=True, default=gen_id)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=True)
    agent = Column(String, nullable=False)
    action = Column(String, nullable=False)
    detail = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
