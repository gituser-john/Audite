from datetime import date, datetime
from decimal import Decimal
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Database Record Response Schemas
# ---------------------------------------------------------------------------

class ItemResponse(BaseModel):
    item_id: int
    bill_id: UUID
    description: str
    price: Decimal

    model_config = ConfigDict(from_attributes=True)


class BillResponse(BaseModel):
    id: UUID
    user_id: str
    expense_category: Optional[str] = None
    merchant: Optional[str] = None
    receipt_date: Optional[date] = None
    uploaded_at: datetime
    total_amount: Optional[Decimal] = None
    ai_verdict: Optional[str] = None
    ai_reason: Optional[str] = None
    status: str
    items: List[ItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Creation / Mutation Schemas
# ---------------------------------------------------------------------------

class ItemCreate(BaseModel):
    description: str
    price: Decimal


class BillCreate(BaseModel):
    expense_category: Optional[str] = None
    merchant: Optional[str] = None
    receipt_date: Optional[date] = None
    total_amount: Optional[Decimal] = None
    ai_verdict: Optional[str] = None
    ai_reason: Optional[str] = None
    status: Optional[str] = "pending_review"
    items: Optional[List[ItemCreate]] = []


class BillStatusUpdate(BaseModel):
    status: str  # "approved" | "rejected"


class MockBillCreate(BaseModel):
    merchant: str
    total_amount: Decimal
    expense_category: str


# ---------------------------------------------------------------------------
# Admin & User Profile Schemas
# ---------------------------------------------------------------------------

class AdminStatsResponse(BaseModel):
    net_amount_processed: float
    bills_processed: int
    ai_accuracy: float


class UserProfileResponse(BaseModel):
    user_id: str
    role: str



# ---------------------------------------------------------------------------
# AI Pipeline Structured Output Schemas (design.md Section 5)
# ---------------------------------------------------------------------------

class BillItem(BaseModel):
    description: str = Field(description="Name or description of the purchased line item")
    price: float = Field(description="Price of the individual item")


class ExpenseAuditResult(BaseModel):
    merchant: str = Field(description="Name of the vendor or merchant")
    expense_category: str = Field(
        description="Expense category: 'food', 'travel', 'accommodation', or 'other'"
    )
    receipt_date: str = Field(description="Date printed on the receipt in YYYY-MM-DD format")
    total_amount: float = Field(description="Total cost of the transaction")
    items: List[BillItem] = Field(description="Granular line items purchased")
    ai_verdict: Literal["accept", "reject", "pending"] = Field(
        description="Policy compliance verdict strictly: 'accept', 'reject', or 'pending'"
    )
    ai_reason: str = Field(
        description="1-2 sentence policy audit explanation justifying the ai_verdict"
    )
