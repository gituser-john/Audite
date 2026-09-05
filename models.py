import uuid
from sqlalchemy import (
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base


class Bill(Base):
    __tablename__ = "bills"

    # Primary Key UUID with uuid4 default
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    # Foreign key / reference to Clerk User ID
    user_id = Column(String, nullable=False, index=True)
    # Category e.g. 'travel', 'food', 'accommodation', 'other'
    expense_category = Column(String, nullable=True)
    # Vendor / merchant name
    merchant = Column(String, nullable=True)
    # Date printed on the receipt
    receipt_date = Column(Date, nullable=True)
    # Upload timestamp with server default NOW()
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    # Total cost
    total_amount = Column(Numeric(10, 2), nullable=True)
    # AI Verdict: 'accept', 'reject', 'pending'
    ai_verdict = Column(String, nullable=True)
    # Explanation from Gemini
    ai_reason = Column(Text, nullable=True)
    # Admin status: 'pending_review', 'approved', 'rejected'
    status = Column(String, default="pending_review", nullable=False)

    # 1-to-many relationship with items, cascade delete
    items = relationship(
        "Item",
        back_populates="bill",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Item(Base):
    __tablename__ = "items"

    # Auto-incrementing integer primary key
    item_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    # Foreign key referencing bills.id with ON DELETE CASCADE
    bill_id = Column(
        UUID(as_uuid=True),
        ForeignKey("bills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Description of purchased item
    description = Column(String, nullable=False)
    # Price of individual item
    price = Column(Numeric(10, 2), nullable=False)

    # Relationship back to parent bill
    bill = relationship("Bill", back_populates="items")
