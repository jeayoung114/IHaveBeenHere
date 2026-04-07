import os
import jwt
from jwt import PyJWKClient
from fastapi import Header, HTTPException

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")

# Cached JWKS client — fetches public keys from Supabase once and reuses
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


def get_current_user_id(authorization: str = Header(...)) -> str:
    """Extract and verify Supabase JWT (ES256 or HS256), return user UUID."""
    token = authorization.replace("Bearer ", "")

    # Try JWKS-based verification (ES256/RS256) if SUPABASE_URL is set
    if SUPABASE_URL:
        try:
            client = _get_jwks_client()
            signing_key = client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256", "RS256", "HS256"],
                audience="authenticated",
            )
            return payload["sub"]
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Token error: {e}")

    # Fallback: HS256 with raw JWT secret
    secret = os.environ.get("SUPABASE_JWT_SECRET", "")
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token error: {e}")
