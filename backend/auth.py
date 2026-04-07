import os
import jwt
from fastapi import Header, HTTPException


def get_current_user_id(authorization: str = Header(...)) -> str:
    """Extract and verify Supabase JWT, return user UUID."""
    secret = os.environ.get("SUPABASE_JWT_SECRET", "")
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
