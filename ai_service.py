import os
from typing import Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types

from schemas import ExpenseAuditResult

load_dotenv()

# Client cache
_client: Optional[genai.Client] = None

SYSTEM_INSTRUCTION = """
You are an expert corporate expense auditing AI assistant for Auditè.
Your responsibility is to analyze receipt images, extract structured transaction details, and audit them strictly against corporate expense policies.

### Corporate Expense Policies:
1. **Alcohol Policy (Zero Tolerance)**:
   - Absolutely NO alcohol or alcoholic beverages (beer, wine, spirits, liquor, cocktails, cider, sake, etc.) are allowed.
   - If ANY item on the receipt is an alcoholic drink or bar charge, the `ai_verdict` must be "reject", and `ai_reason` must clearly state that alcohol was detected.

2. **Meal Expense Limit**:
   - For dining, restaurant, food, and beverage expenses, the total must not exceed $50.00 USD.
   - If the total meal / food expenditure exceeds $50.00, the `ai_verdict` must be "reject", and `ai_reason` must state that the $50 meal cap was exceeded.

3. **Accommodation Expense Limit**:
   - For hotel, lodging, and accommodation expenses, the total must not exceed $200.00 USD.
   - If the accommodation total exceeds $200.00, the `ai_verdict` must be "reject", and `ai_reason` must state that the $200 accommodation cap was exceeded.

4. **Approval Criteria**:
   - If the receipt satisfies all corporate policies (no alcohol, meals <= $50, accommodation <= $200, valid business expense), `ai_verdict` must be "accept", and `ai_reason` must summarize policy compliance.
   - If the receipt image is blurry, truncated, illegible, or critical transaction figures are unreadable, `ai_verdict` must be "pending", and `ai_reason` must describe the illegibility requiring manual review.

### Extraction Instructions:
- `merchant`: Vendor, store, or establishment name.
- `expense_category`: Exactly one of "food", "travel", "accommodation", or "other".
- `receipt_date`: Date in YYYY-MM-DD format.
- `total_amount`: Total final transaction amount as a numeric float.
- `items`: Granular line items containing item description and price.
- `ai_verdict`: Must be strictly one of "accept", "reject", or "pending".
- `ai_reason`: Concise 1-2 sentence explanation justifying the verdict against company policies.
"""


def get_genai_client() -> genai.Client:
    """Initialize and return the Google GenAI Client."""
    global _client
    if _client is not None:
        return _client

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY is not set in environment variables. Please configure it in .env."
        )

    _client = genai.Client(api_key=api_key)
    return _client


def analyze_receipt(image_bytes: bytes, mime_type: str = "image/jpeg") -> ExpenseAuditResult:
    """
    Send receipt image to Gemini 2.5 Flash with structured output schema
    and policy enforcement prompt. Returns the parsed ExpenseAuditResult.
    """
    client = get_genai_client()

    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

    prompt_text = (
        "Please extract all transaction details from this receipt and audit it "
        "according to the corporate expense policies."
    )

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        response_mime_type="application/json",
        response_schema=ExpenseAuditResult,
        temperature=0.1,  # Low temperature for deterministic factual extraction
    )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[image_part, prompt_text],
        config=config,
    )

    if response.parsed is not None:
        if isinstance(response.parsed, ExpenseAuditResult):
            return response.parsed
        if isinstance(response.parsed, dict):
            return ExpenseAuditResult.model_validate(response.parsed)

    # Fallback to parsing text output if parsed is None
    if response.text:
        return ExpenseAuditResult.model_validate_json(response.text)

    raise RuntimeError("Gemini API returned an empty response or failed to parse receipt.")
