"""
FastAPI <-> ADK bridge.

Provides an async run_agent() function that sends a message to the
MealLoggingAgent via ADK's Runner and returns the final text response.
"""

import logging
import os
import uuid

logger = logging.getLogger(__name__)

# Track whether ADK is available and configured
_adk_available = False
_runner = None
_session_service = None

APP_NAME = "food-logging-app"
DEFAULT_USER_ID = "user"


def _init_adk():
    """Lazy-initialize ADK runner. Only called once."""
    global _adk_available, _runner, _session_service

    api_key = os.environ.get("GOOGLE_API_KEY", "")
    if not api_key or api_key == "PLACEHOLDER_SET_YOUR_KEY":
        logger.warning(
            "GOOGLE_API_KEY is not set or is a placeholder. "
            "AI features will return fallback responses."
        )
        _adk_available = False
        return

    try:
        from google.adk.runners import Runner
        from google.adk.sessions import InMemorySessionService
        from meal_agent.agent import root_agent

        _session_service = InMemorySessionService()
        _runner = Runner(
            agent=root_agent,
            app_name=APP_NAME,
            session_service=_session_service,
        )
        _adk_available = True
        logger.info("ADK runner initialized successfully.")
    except Exception as e:
        logger.error("Failed to initialize ADK runner: %s", e)
        _adk_available = False


_initialized = False


async def run_agent(message: str, session_id: str | None = None) -> str:
    """
    Send a message to the ADK agent and return the final text response.

    Args:
        message: The user message to send to the agent.
        session_id: Optional session ID for conversation continuity.
                    If None, a new session is created.

    Returns:
        The agent's final text response, or empty string on failure.
    """
    global _initialized

    if not _initialized:
        _init_adk()
        _initialized = True

    if not _adk_available or _runner is None or _session_service is None:
        return ""

    from google.genai import types

    sid = session_id or str(uuid.uuid4())

    try:
        # Create a new session (or re-create for the same sid)
        await _session_service.create_session(
            app_name=APP_NAME,
            user_id=DEFAULT_USER_ID,
            session_id=sid,
        )
    except Exception:
        # Session might already exist; that's fine
        pass

    try:
        async for event in _runner.run_async(
            user_id=DEFAULT_USER_ID,
            session_id=sid,
            new_message=types.Content(
                role="user",
                parts=[types.Part(text=message)],
            ),
        ):
            if event.is_final_response():
                if (
                    event.content
                    and event.content.parts
                    and event.content.parts[0].text
                ):
                    return event.content.parts[0].text
        return ""
    except Exception as e:
        logger.error("ADK agent run failed: %s", e)
        return ""
