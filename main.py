from contextlib import asynccontextmanager
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from ai_service import analyze_receipt
from auth import get_admin_user, get_current_user, get_current_user_profile
import database
from database import get_db
import models
import schemas


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Attempt to auto-create tables on startup if database is connected
    try:
        models.Base.metadata.create_all(bind=database.engine)
    except Exception as e:
        print(f"[Warning] Database tables not auto-created on startup: {e}")
    yield


app = FastAPI(
    title="Auditè API",
    description="Backend API for Auditè - AI Expense Auditor",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend applications
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/ping", tags=["Health Check"])
def ping():
    """Health check endpoint to verify backend service status."""
    return {"status": "ok", "message": "pong"}


# ---------------------------------------------------------------------------
# User Authentication & Profile Endpoints
# ---------------------------------------------------------------------------

@app.get(
    "/api/users/me",
    response_model=schemas.UserProfileResponse,
    tags=["Users"],
    summary="Get current user profile and role",
)
def get_current_user_info(
    profile: dict = Depends(get_current_user_profile),
):
    """
    Validate token and return current user ID and role (employee or admin).
    """
    return schemas.UserProfileResponse(
        user_id=profile["user_id"],
        role=profile.get("role", "employee"),
    )


# ---------------------------------------------------------------------------
# Employee Bill Endpoints
# ---------------------------------------------------------------------------

@app.get(
    "/api/bills",
    response_model=List[schemas.BillResponse],
    tags=["Bills"],
    summary="Get employee bills",
)
def get_user_bills(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetch all bills submitted by the currently authenticated user.
    """
    bills = (
        db.query(models.Bill)
        .filter(models.Bill.user_id == user_id)
        .order_by(models.Bill.uploaded_at.desc())
        .all()
    )
    return bills


@app.post(
    "/api/bills/upload",
    response_model=schemas.BillResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Bills"],
    summary="Upload receipt image for AI analysis and audit",
)
async def upload_bill(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Accept receipt image upload, analyze with Gemini 2.5 Flash,
    extract line items, perform policy auditing, and persist to database.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be an image (e.g. image/jpeg, image/png, image/webp).",
        )

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    try:
        audit_result = analyze_receipt(image_bytes, mime_type=file.content_type)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini AI receipt analysis failed: {str(e)}",
        )

    # Parse date safely
    receipt_date_obj = None
    if audit_result.receipt_date:
        try:
            receipt_date_obj = datetime.strptime(audit_result.receipt_date, "%Y-%m-%d").date()
        except ValueError:
            pass

    # Convert total amount safely
    try:
        total_decimal = Decimal(str(audit_result.total_amount))
    except Exception:
        total_decimal = Decimal("0.00")

    # Insert main Bill record
    bill = models.Bill(
        user_id=user_id,
        merchant=audit_result.merchant,
        expense_category=audit_result.expense_category,
        receipt_date=receipt_date_obj,
        total_amount=total_decimal,
        ai_verdict=audit_result.ai_verdict,
        ai_reason=audit_result.ai_reason,
        status="pending_review",
    )
    db.add(bill)
    db.flush()  # Generates bill.id for child line items

    # Insert individual Item records
    for it in audit_result.items:
        try:
            item_price = Decimal(str(it.price))
        except Exception:
            item_price = Decimal("0.00")

        db_item = models.Item(
            bill_id=bill.id,
            description=it.description,
            price=item_price,
        )
        db.add(db_item)

    db.commit()
    db.refresh(bill)
    return bill


@app.post(
    "/api/bills/mock",
    response_model=schemas.BillResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Bills"],
    summary="Create a mock bill (Temporary for testing)",
)
def create_mock_bill(
    payload: schemas.MockBillCreate,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a temporary dummy bill record for the authenticated user.
    """
    bill = models.Bill(
        user_id=user_id,
        merchant=payload.merchant,
        total_amount=payload.total_amount,
        expense_category=payload.expense_category,
        status="pending_review",
        ai_verdict="pending",
        ai_reason="Mock bill created for testing (pending AI verification)",
    )
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return bill


# ---------------------------------------------------------------------------
# Admin Endpoints (Requires Admin Role)
# ---------------------------------------------------------------------------

@app.get(
    "/api/admin/bills",
    response_model=List[schemas.BillResponse],
    tags=["Admin"],
    summary="Fetch all bills company-wide (Admin)",
)
def get_all_bills_admin(
    status: Optional[str] = Query(None, description="Filter by status ('pending_review', 'approved', 'rejected')"),
    merchant: Optional[str] = Query(None, description="Search by vendor/merchant name"),
    admin_user: str = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """
    Fetch all expense submissions across the entire company.
    Supports filtering by review status and vendor. Requires Admin role.
    """
    query = db.query(models.Bill)

    if status and status.lower() != "all":
        query = query.filter(models.Bill.status == status.lower())

    if merchant:
        query = query.filter(models.Bill.merchant.ilike(f"%{merchant.strip()}%"))

    bills = query.order_by(models.Bill.uploaded_at.desc()).all()
    return bills


@app.patch(
    "/api/admin/bills/{bill_id}/status",
    response_model=schemas.BillResponse,
    tags=["Admin"],
    summary="Update bill review status (Admin)",
)
def update_bill_status(
    bill_id: UUID,
    payload: schemas.BillStatusUpdate,
    admin_user: str = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """
    Admin performs manual acceptance or rejection override on a submitted bill.
    """
    if payload.status not in ["approved", "rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be either 'approved' or 'rejected'.",
        )

    bill = db.query(models.Bill).filter(models.Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bill with ID '{bill_id}' was not found.",
        )

    bill.status = payload.status
    db.commit()
    db.refresh(bill)
    return bill


@app.get(
    "/api/admin/stats",
    response_model=schemas.AdminStatsResponse,
    tags=["Admin"],
    summary="Get aggregated expense and AI accuracy statistics",
)
def get_admin_stats(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns aggregated data for the dashboard:
    - net_amount_processed: Total sum of approved bill amounts
    - bills_processed: Total bills evaluated with final status (approved / rejected)
    - ai_accuracy: Percentage of AI recommendations that matched final admin review
    """
    # 1. Net approved spend
    approved_bills = db.query(models.Bill).filter(models.Bill.status == "approved").all()
    net_amount = float(sum(b.total_amount for b in approved_bills if b.total_amount is not None))

    # 2. Total reviewed bills
    reviewed_bills = (
        db.query(models.Bill)
        .filter(models.Bill.status.in_(["approved", "rejected"]))
        .all()
    )
    total_processed = len(reviewed_bills)

    # 3. AI accuracy calculation:
    # Match occurs if:
    # (ai_verdict == 'accept' and status == 'approved') or
    # (ai_verdict == 'reject' and status == 'rejected')
    if total_processed > 0:
        matches = sum(
            1
            for b in reviewed_bills
            if (b.ai_verdict == "accept" and b.status == "approved")
            or (b.ai_verdict == "reject" and b.status == "rejected")
        )
        ai_accuracy = round((matches / total_processed) * 100.0, 1)
    else:
        ai_accuracy = 100.0  # Default baseline when starting

    return schemas.AdminStatsResponse(
        net_amount_processed=round(net_amount, 2),
        bills_processed=total_processed,
        ai_accuracy=ai_accuracy,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
