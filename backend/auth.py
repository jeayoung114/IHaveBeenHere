import os
import jwt
from fastapi import Header, HTTPException


def get_current_user_id(authorization: str = Header(...)) -> str:
    """Extract and verify Supabase JWT, return user UUID."""
    secret = os.environ.get("SUPABASE_JWT_SECRET", "")
    token = authorization.replace("Bearer ", "")
    try:
        # Decode header without verification to inspect alg
        unverified_header = jwt.get_unverified_header(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Bad token header: {e}")
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=[unverified_header.get("alg", "HS256")],
            audience="authenticated",
        )
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidSignatureError:
        raise HTTPException(status_code=401, detail=f"Invalid signature (alg={unverified_header.get('alg')}, secret_len={len(secret)})")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token error (alg={unverified_header.get('alg')}): {e}")
