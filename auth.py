import base64
import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import PyJWKClient

load_dotenv()

# Security scheme for Swagger UI & header extraction
security = HTTPBearer(auto_error=True)

# Cached JWK client instance
_jwks_client: Optional[PyJWKClient] = None


def get_jwks_url() -> tuple[Optional[str], Optional[dict]]:
    """
    Resolve the JWKS URL and any required headers based on Clerk configuration.
    Priority:
    1. Explicit CLERK_JWKS_URL
    2. Derived from CLERK_PUBLISHABLE_KEY (decodes frontend API domain)
    3. Official Clerk backend JWKS endpoint using CLERK_SECRET_KEY
    """
    explicit_url = os.getenv("CLERK_JWKS_URL")
    if explicit_url:
        return explicit_url, None

    publishable_key = os.getenv("CLERK_PUBLISHABLE_KEY")
    if publishable_key and (
        publishable_key.startswith("pk_test_") or publishable_key.startswith("pk_live_")
    ):
        try:
            raw_payload = publishable_key.split("_", 2)[2]
            # Add base64 padding if needed
            padded = raw_payload + "=" * (-len(raw_payload) % 4)
            frontend_domain = base64.b64decode(padded).decode("utf-8").rstrip("$")
            return f"https://{frontend_domain}/.well-known/jwks.json", None
        except Exception:
            pass

    secret_key = os.getenv("CLERK_SECRET_KEY")
    if secret_key:
        return "https://api.clerk.com/v1/jwks", {"Authorization": f"Bearer {secret_key}"}

    return None, None


def get_jwks_client() -> PyJWKClient:
    """Retrieve or initialize the PyJWKClient."""
    global _jwks_client
    if _jwks_client is not None:
        return _jwks_client

    jwks_url, headers = get_jwks_url()
    if not jwks_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Clerk authentication is not properly configured. Provide CLERK_PUBLISHABLE_KEY or CLERK_SECRET_KEY.",
        )

    _jwks_client = PyJWKClient(
        uri=jwks_url,
        headers=headers,
        cache_jwk_set=True,
        lifespan=300,
    )
    return _jwks_client


def verify_and_decode_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Decodes and validates the Clerk JWT, returning the decoded payload dict.
    """
    token = credentials.credentials
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    jwks_client = get_jwks_client()

    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            key=signing_key.key,
            algorithms=["RS256"],
            options={"verify_exp": True},
        )
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


def extract_user_role(payload: dict, user_id: str) -> str:
    """
    Extract role from token claims, metadata, or environment admin list.
    """
    # 1. Direct role claim in JWT
    if payload.get("role"):
        return str(payload["role"]).lower()

    # 2. Nested metadata claims (Clerk session token templates)
    metadata = payload.get("metadata") or payload.get("public_metadata") or {}
    if isinstance(metadata, dict) and metadata.get("role"):
        return str(metadata["role"]).lower()

    # 3. Organization role claim (e.g. org:admin)
    if payload.get("org_role"):
        org_role = str(payload["org_role"]).lower()
        if "admin" in org_role:
            return "admin"

    # 4. Optional environment admin IDs list for development/fallback
    admin_ids_env = os.getenv("CLERK_ADMIN_USER_IDS", "")
    admin_ids = [uid.strip() for uid in admin_ids_env.split(",") if uid.strip()]
    if user_id in admin_ids:
        return "admin"

    return "employee"


def get_current_user_profile(
    payload: dict = Depends(verify_and_decode_token),
) -> dict:
    """
    Returns authenticated user profile containing user_id and role.
    """
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing user subject identifier ('sub')",
            headers={"WWW-Authenticate": "Bearer"},
        )

    role = extract_user_role(payload, user_id)
    return {"user_id": user_id, "role": role}


def get_current_user(
    profile: dict = Depends(get_current_user_profile),
) -> str:
    """
    FastAPI dependency returning authenticated user's ID (sub claim).
    """
    return profile["user_id"]


def get_admin_user(
    profile: dict = Depends(get_current_user_profile),
) -> str:
    """
    FastAPI dependency that enforces admin role.
    Raises HTTP 403 Forbidden if user is not an admin.
    """
    if profile.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin privileges required to access this resource.",
        )
    return profile["user_id"]
