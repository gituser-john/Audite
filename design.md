# Auditè - AI Expense Auditor (System Design Document)

## 1. System Overview
Auditè is an AI-powered expense auditing platform that automates the verification of employee receipts against company policies. The system uses Multimodal LLMs for direct image-to-JSON extraction, bypassing traditional OCR pipelines. It features Role-Based Access Control (RBAC) to separate employee submission workflows from admin verification workflows.

## 2. Tech Stack
*   **Frontend:** React (Next.js or Vite), Tailwind CSS, shadcn/ui.
*   **Backend:** FastAPI (Python), Pydantic for data validation.
*   **Database:** PostgreSQL (Relational), SQLAlchemy (ORM).
*   **Authentication:** Clerk (JWT-based Auth & RBAC).
*   **AI/Processing:** Google Gemini 1.5 Flash (Multimodal capabilities + Structured Outputs).

---

## 3. Database Schema

### Table: `bills`
Stores the core receipt data and the AI's preliminary verdict.

| Column Name | Data Type | Constraints / Details |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key, Default: `gen_random_uuid()` |
| `user_id` | VARCHAR | Foreign Key/Reference to Clerk User ID |
| `expense_category` | VARCHAR | e.g., 'travel', 'food', 'accommodation', 'other' |
| `merchant` | VARCHAR | Name of the vendor |
| `receipt_date` | DATE | Date printed on the receipt |
| `uploaded_at` | TIMESTAMP | Default: `NOW()` |
| `total_amount` | DECIMAL(10,2) | Total cost |
| `ai_verdict` | VARCHAR | Enum: `accept`, `reject`, `pending` |
| `ai_reason` | TEXT | 1-2 sentence explanation from Gemini |
| `status` | VARCHAR | Enum: `pending_review`, `approved`, `rejected` |

### Table: `items`
Stores individual line items extracted from the receipt for granular auditing.

| Column Name | Data Type | Constraints / Details |
| :--- | :--- | :--- |
| `item_id` | SERIAL | Primary Key (Auto-incrementing integer) |
| `bill_id` | UUID | Foreign Key -> `bills.id` (ON DELETE CASCADE) |
| `description` | VARCHAR | Name/Description of the purchased item |
| `price` | DECIMAL(10,2) | Price of the individual item |

---

## 4. API Endpoints (FastAPI)

All endpoints (except potential webhooks) require a valid Clerk JWT in the `Authorization: Bearer <token>` header.

### Authentication & Users
*   **`GET /api/users/me`**
    *   *Purpose:* Validate token and return current user role (employee or admin).

### Employee Endpoints
*   **`POST /api/bills/upload`**
    *   *Payload:* `multipart/form-data` (Image file + optional user notes).
    *   *Action:* 
        1. Validates image.
        2. Sends image + System Policy to Gemini API.
        3. Parses Gemini's structured JSON output.
        4. Inserts record into `bills` and `items` tables.
    *   *Returns:* Created bill object.
*   **`GET /api/bills`**
    *   *Purpose:* Fetch all bills uploaded by the currently authenticated employee.
*   **`GET /api/bills/{bill_id}`**
    *   *Purpose:* Fetch details and associated line items for a specific bill.

### Admin Endpoints (Requires Admin Role)
*   **`GET /api/admin/bills`**
    *   *Purpose:* Fetch all bills across the company. Supports query parameters for filtering (`?status=pending_review`, `?merchant=Hilton`) and sorting.
*   **`PATCH /api/admin/bills/{bill_id}/status`**
    *   *Payload:* `{ "status": "approved" | "rejected" }`
    *   *Purpose:* Admin performs the final manual override/acceptance of a bill.
*   **`GET /api/admin/stats`**
    *   *Purpose:* Returns aggregated data for the dashboard.
    *   *Returns:* `{ "net_amount_processed": 50000, "bills_processed": 150, "ai_accuracy": 94.5 }`

---

## 5. AI Pipeline & Structured Output Schema

The system relies on Gemini's Structured Outputs. The backend will enforce this Pydantic schema when calling the LLM:

```python
class BillItem(BaseModel):
    description: str
    price: float

class ExpenseAuditResult(BaseModel):
    merchant: str
    expense_category: str
    receipt_date: str # YYYY-MM-DD
    total_amount: float
    items: List[BillItem]
    ai_verdict: str  # Must be strictly: "accept", "reject", or "pending"
    ai_reason: str

System Prompt Injection:
Every AI call must include the base instruction set and the exact plain-text company policy regarding alcohol, meal limits, and accommodation limits to ensure the ai_verdict is calculated accurately.