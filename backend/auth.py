import base64
import os
import jwt
from fastapi import Header, HTTPException


def get_current_user_id(authorization: str = Header(...)) -> str:
    """Extract and verify Supabase JWT, return user UUID."""
    secret_str = os.environ.get("SUPABASE_JWT_SECRET", "")
    try:
        # Supabase JWT secret is base64-encoded; decode to raw bytes
        secret = base64.b64decode(secret_str)
    except Exception:
        secret = secret_str.encode()
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
