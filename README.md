# Auditè — AI Expense Auditor

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org/)
[![Google Gemini](https://img.shields.io/badge/AI-Gemini%203.1%20Flash--Lite-8E75B2?logo=google-gemini&logoColor=white)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## 📌 Overview

**Auditè** is an intelligent, automated corporate expense auditing platform engineered to replace error-prone, manual expense review workflows. In traditional corporate reimbursement pipelines, finance teams spend hundreds of hours deciphering crumpled receipts, checking itemized dining charges, and enforcing travel policies.

Auditè eliminates this operational overhead by uniting **direct multimodal document understanding**, **declarative corporate policy enforcement**, **cryptographically verified Role-Based Access Control (RBAC)**, and a **high-performance relational datastore**.

By leveraging Google's **Gemini 3.1 Flash-Lite** foundation model with structured schema outputs, Auditè extracts transaction line items and audits receipts against company spending rules in a **single pass**—completely bypassing legacy, brittle multi-stage OCR pipelines.

---

## 🛠️ Tech Stack

Auditè is built with a decoupled, modern architecture separating presentation, application compute, and AI intelligence:

| Layer | Technologies | Description |
| :--- | :--- | :--- |
| **Frontend** | **Vite 8**, **React 19**, **Tailwind CSS v4**, **shadcn/ui**, **Clerk** | High-performance Single Page Application (SPA) styled with Tailwind CSS v4 and shadcn/ui components, featuring `@clerk/clerk-react` authentication, client-side route protection, and responsive data tables. |
| **Backend** | **FastAPI**, **PostgreSQL**, **SQLAlchemy 2.0**, **Pydantic v2** | High-throughput asynchronous REST API built with FastAPI and Uvicorn. Validates payloads using Pydantic v2 and persists relational records via SQLAlchemy ORM with connection pooling. |
| **AI Pipeline** | **Google Gemini 3.1 Flash-Lite** (`google-genai` SDK v2) | Direct multimodal vision processing with strictly enforced JSON schemas (`ExpenseAuditResult`). Extracts metadata and line items while verifying policies at low temperature (`0.1`). |
| **Authentication** | **Clerk OIDC & RS256 JWKS** | Stateless JSON Web Token (JWT) verification via `PyJWKClient` with public key caching (300s TTL) and granular role resolution (`employee` vs. `admin`). |

---

## ✨ Core Features

### 1. Multimodal AI Extraction (Zero-OCR Vision Pipeline)
- **Direct Image-to-JSON**: Accepts receipt images (`image/jpeg`, `image/png`, `image/webp`) and streams them directly into Gemini 3.1 Flash-Lite without intermediate OCR text extractors.
- **Structured Schema Enforcement**: Guaranteed deterministic JSON extraction containing:
  - Merchant / vendor name
  - Expense category (`food`, `travel`, `accommodation`, `other`)
  - Transaction date (`YYYY-MM-DD`)
  - Total expense amount
  - Itemized line items (individual descriptions and item prices)
- **Automated Policy Enforcement**: Audits receipts against strict corporate rules during extraction:
  - 🚫 **Zero Alcohol Tolerance**: Immediate `reject` verdict if beer, wine, spirits, cocktails, or bar charges are detected.
  - 🍽️ **Meal Limit Cap**: Meals and dining capped at **$50.00 USD**.
  - 🏨 **Accommodation Limit Cap**: Lodging and hotels capped at **$200.00 USD**.
  - ⚠️ **Legibility Checks**: Unclear, cut-off, or illegible receipts return a `pending` verdict for human review.

### 2. Role-Based Access Control (RBAC)
- **Decentralized Cryptographic Verification**: Backend decodes and verifies RS256 JWT tokens issued by Clerk against Clerk's JSON Web Key Set (`/.well-known/jwks.json`).
- **Zero-Latency Auth Caching**: Public signing keys are cached in-memory for 300 seconds to prevent external network round-trips on every API call.
- **Role Enforcement**:
  - **Employees**: Can upload receipts, view instant AI audit results, and inspect their personal expense history.
  - **Admins**: Granted access to the company-wide audit portal, spend analytics, and manual override capabilities.

### 3. Admin Review Dashboard & Spend Intelligence
- **Company-Wide Expense Stream**: Real-time table of all employee submissions with vendor search and status filtering (`all`, `pending_review`, `approved`, `rejected`).
- **Side-by-Side Audit Panel**: Inspect uploaded receipt items, line-by-line pricing, and Gemini's natural-language policy justifications.
- **Manual Status Overrides**: Admins can approve or reject expenses with a single click (`PATCH /api/admin/bills/{id}/status`).
- **Aggregated Spend Analytics**:
  - **Net Spend Processed**: Total dollar amount of company-approved expenses.
  - **Bills Processed**: Total receipts evaluated with a definitive decision.
  - **AI Accuracy Metric**: Dynamically computed percentage of AI recommendations (`accept`/`reject`) matching final human admin actions.

### 4. Employee Self-Service Hub
- **Interactive File Uploader**: Drag-and-drop receipt uploader with immediate client-side image preview.
- **Instant Audit Feedback**: Visual badges for AI decisions (`accept`, `reject`, `pending`) with color-coded policy explanations.
- **My Bills History**: Collapsible cards displaying all historical claims, statuses, line items, and upload timestamps.

---

## 🏗️ Architecture & System Design

Auditè employs a decoupled client-server architecture with serverless persistence and foundation-model AI reasoning:

### Component Topology
1. **Client Tier (React 19 SPA)**:
   - Hosted on modern edge infrastructure (e.g., Vercel Global Edge Network).
   - Manages UI states, image preview buffers, and Clerk session tokens.
   - Communicates with the backend via authenticated HTTP requests (`Authorization: Bearer <token>`).

2. **Identity Provider (Clerk)**:
   - Manages user identities, multi-factor authentication, and user metadata roles.
   - Emits short-lived RS256 JWT session tokens (60-second TTL).

3. **Application Tier (FastAPI & Uvicorn)**:
   - ASGI service executing on Python 3.11+.
   - Intercepts requests using `HTTPBearer` security dependencies.
   - Uses `PyJWKClient` to verify token signatures locally against cached Clerk JWKS keys.
   - Handles multipart image uploads and validates data with Pydantic v2 schemas.

4. **AI Reasoning Engine (Google Gemini 3.1 Flash-Lite)**:
   - Receives receipt bytes alongside a system prompt encoding corporate rules.
   - Executes multimodal vision comprehension to extract transactions and determine policy verdicts in structured JSON.

5. **Relational Persistence Layer (PostgreSQL & SQLAlchemy 2.0)**:
   - Stores transactions across normalized relational tables (`bills` and `items`).
   - Configured with connection pooling (`pool_pre_ping=True`) for serverless databases like Neon.

### End-to-End Submission Lifecycle
1. **Selection & Token Acquisition**: An employee selects a receipt image in `NewBillPage`. The client requests a fresh RS256 session token from Clerk.
2. **Multipart Upload**: The client dispatches a `POST /api/bills/upload` request containing the image file and bearer credentials.
3. **Stateless Token Verification**: FastAPI decodes the token, verifies the cryptographic signature against the cached JWKS key, extracts the Clerk user ID (`sub`), and checks the user role.
4. **Multimodal Analysis**: FastAPI passes the raw image bytes to `ai_service.analyze_receipt()`. Gemini 3.1 Flash-Lite parses the image and applies policy constraints.
5. **Database Transaction**: FastAPI writes the parent `Bill` record and associated `Item` child records into PostgreSQL atomically.
6. **Instant Response**: The client receives the newly created bill with full line-item details and the AI verdict.
7. **Admin Review**: Finance admins review pending claims in the Admin Portal, where decisions update aggregate spend and AI accuracy statistics.

---

## 🗄️ Database Schema

Auditè utilizes a normalized PostgreSQL relational schema:

### `bills` Table
| Column | Type | Constraints / Details |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key (`uuid4`), indexed |
| `user_id` | `VARCHAR` | Foreign Key / Clerk User Subject ID (`sub`), indexed |
| `expense_category` | `VARCHAR` | Category: `food`, `travel`, `accommodation`, `other` |
| `merchant` | `VARCHAR` | Name of the vendor or establishment |
| `receipt_date` | `DATE` | Transaction date extracted from receipt |
| `uploaded_at` | `TIMESTAMP WITH TZ` | Server default `NOW()`, indexed |
| `total_amount` | `NUMERIC(10, 2)` | Total transaction amount |
| `ai_verdict` | `VARCHAR` | AI recommendation: `accept`, `reject`, `pending` |
| `ai_reason` | `TEXT` | Justification and policy compliance rationale from Gemini |
| `status` | `VARCHAR` | Review status: `pending_review`, `approved`, `rejected` |

### `items` Table
| Column | Type | Constraints / Details |
| :--- | :--- | :--- |
| `item_id` | `INTEGER` | Primary Key, auto-incrementing |
| `bill_id` | `UUID` | Foreign Key references `bills.id` (`ON DELETE CASCADE`), indexed |
| `description` | `VARCHAR` | Item name or line description |
| `price` | `NUMERIC(10, 2)` | Individual line item price |

---

## 🚀 Local Setup & Installation

Follow these instructions to run both the FastAPI backend and React frontend locally.

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.11 or higher
- **PostgreSQL**: Local instance or a cloud PostgreSQL database (e.g. [Neon](https://neon.tech/))
- **Clerk Account**: Free account at [clerk.com](https://clerk.com)
- **Google AI Studio Key**: API key from [Google AI Studio](https://aistudio.google.com/)

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/audite.git
cd audite
```

---

### 2. Backend Setup

1. **Create and activate a Python virtual environment**:

   **Windows (PowerShell)**:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

   **macOS / Linux**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **Install backend dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure the backend environment file**:
   Create a `.env` file in the project root by copying `.env.example`:
   ```bash
   cp .env.example .env
   ```

---

### 3. Frontend Setup

1. **Navigate to the `frontend/` directory**:
   ```bash
   cd frontend
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Configure the frontend environment file**:
   Create a `.env.local` file inside the `frontend/` directory:
   ```bash
   touch .env.local
   ```

---

### 4. Environment Variables Configuration

#### Root Backend Environment (`.env`)
Configure the following keys in `.env` in the repository root:

```env
# PostgreSQL Database Connection URL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/audite_db

# Clerk Authentication Configuration
CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key

# Optional: Explicit JWKS URL (auto-derived from CLERK_PUBLISHABLE_KEY if omitted)
# CLERK_JWKS_URL=https://<your-domain>.clerk.accounts.dev/.well-known/jwks.json

# Optional: Comma-separated Clerk User IDs granted immediate Admin role for testing
CLERK_ADMIN_USER_IDS=user_2xxxxxxxxxxxxxxxxxxxx

# Google Gemini API Key
GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere
```

#### Frontend Environment (`frontend/.env.local`)
Configure the following keys in `frontend/.env.local`:

```env
# Clerk Publishable Key (matches CLERK_PUBLISHABLE_KEY from backend)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key

# Backend API Base URL
VITE_API_URL=http://localhost:8000
```

---

### 5. Clerk & Role Setup Guide

1. Log in to the [Clerk Dashboard](https://dashboard.clerk.com/) and create an application.
2. In **API Keys**, copy your **Publishable Key** and **Secret Key**.
3. Set `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in your root `.env` file.
4. Set `VITE_CLERK_PUBLISHABLE_KEY` in `frontend/.env.local`.
5. **Assigning the Admin Role**:
   - **Method A (Clerk Public Metadata)**: In the Clerk Dashboard under **Users** > Select User > **Public Metadata**, set:
     ```json
     {
       "role": "admin"
     }
     ```
   - **Method B (Environment Variable)**: Copy your Clerk User ID (e.g. `user_2...`) from the Clerk Dashboard and add it to `CLERK_ADMIN_USER_IDS` in root `.env`:
     ```env
     CLERK_ADMIN_USER_IDS=user_2xxxxxxxxxxxxxxxxxxxx
     ```

---

### 6. Google Gemini API Setup Guide

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account and click **Get API Key**.
3. Create a new API key in an existing or new Google Cloud project.
4. Paste the key into your root `.env`:
   ```env
   GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere
   ```
5. Auditè uses `gemini-3.1-flash-lite` with structured output schemas for high-speed, cost-effective multimodal auditing.

---

### 7. Running the Application

1. **Start the FastAPI Backend**:
   From the repository root with your virtual environment activated:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   - REST API will be live at: `http://localhost:8000`
   - Interactive Swagger API Documentation: `http://localhost:8000/docs`
   - ReDoc Documentation: `http://localhost:8000/redoc`

2. **Start the Vite / React Frontend**:
   From a separate terminal in the `frontend/` directory:
   ```bash
   cd frontend
   npm run dev
   ```
   - Frontend application will be live at: `http://localhost:5173`

---

## 📡 API Reference Overview

All API endpoints (except `/ping`) require an `Authorization: Bearer <clerk_jwt>` header.

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/ping` | Public | Service health-check (`{"status": "ok", "message": "pong"}`). |
| `GET` | `/api/users/me` | Authenticated | Returns current user ID and resolved role (`employee` or `admin`). |
| `POST` | `/api/bills/upload` | Authenticated | Uploads receipt image (`multipart/form-data`), invokes Gemini AI, and persists records. |
| `GET` | `/api/bills` | Authenticated | Lists all bills submitted by the authenticated user. |
| `POST` | `/api/bills/mock` | Authenticated | Creates a mock bill for development/testing without an image. |
| `GET` | `/api/admin/bills` | Admin Only | Lists company-wide bills with query filters (`?status=` and `?merchant=`). |
| `PATCH` | `/api/admin/bills/{id}/status`| Admin Only | Updates bill review status (`{"status": "approved" \| "rejected"}`). |
| `GET` | `/api/admin/stats` | Admin Only | Retrieves aggregate metrics: net approved spend, processed bills count, and AI accuracy rate. |

---

## 📄 License

This project is licensed under the terms of the **MIT License**.
