"""
AI Service — connects FastAPI endpoints to the ADK agent.

Replaces the original stub implementations with real ADK-powered logic.
Falls back to sensible defaults when the AI is unavailable (no API key, errors).
"""

import json
import logging
import re
from typing import List, Optional

from services import adk_runner

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Fallback defaults (used when ADK is unavailable or returns empty)
# ---------------------------------------------------------------------------

_DEFAULT_REVIEWS = [
    "Delicious and satisfying meal today.",
    "A memorable dining experience worth noting.",
    "Tried something new and it was great.",
]


def _extract_json_from_text(text: str) -> object:
    """Try to extract a JSON structure from text that may contain markdown."""
    text = text.strip()
    # Remove markdown code blocks
    if "```" in text:
        text = re.sub(r"```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```", "", text)
        text = text.strip()

    # Try to find JSON array or object in the text
    for start_char, end_char in [("[", "]"), ("{", "}")]:
        start = text.find(start_char)
        end = text.rfind(end_char)
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                continue

    # Last resort: try parsing the whole text
    return json.loads(text)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def detect_menu(
    image_path: str,
    restaurant_name: str,
    session_id: Optional[str] = None,
) -> List[str]:
    """
    Detect menu items from a food image using vision + grounded web search.
    Calls identify_menu_from_image_grounded directly for reliability.

    Returns a list of candidate menu item name strings.
    Falls back to an empty list on any failure.
    """
    import asyncio
    from tools.menu_identifier_grounded import identify_menu_from_image_grounded

    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            identify_menu_from_image_grounded,
            image_path,
            restaurant_name,
        )
        return [item for item in result.get("candidates", []) if isinstance(item, str)]

    except Exception as e:
        logger.warning("detect_menu failed: %s", e)
        return []


async def generate_reviews(
    menu_name: str,
    restaurant_name: str,
    rating: Optional[int] = None,
    image_path: Optional[str] = None,
    session_id: Optional[str] = None,
) -> List[str]:
    """
    Generate review suggestions using the review_generator tool directly.
    Passes image_path for visual context when available.
    rating is 1–5 stars.
    """
    import asyncio
    from tools.review_generator import generate_meal_reviews

    rating_val = rating if rating is not None else 3

    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            generate_meal_reviews,
            menu_name,
            restaurant_name,
            rating_val,
            image_path,
        )
        texts = [r for r in result.get("reviews", []) if isinstance(r, str)]
        return texts if texts else _fallback_reviews(menu_name, restaurant_name)

    except Exception as e:
        logger.warning("generate_reviews failed, returning fallback: %s", e)
        return _fallback_reviews(menu_name, restaurant_name)


async def get_restaurant_menus(
    restaurant_name: str,
    session_id: Optional[str] = None,
) -> List[str]:
    """
    Discover menu items for a restaurant via the ADK agent.

    Returns a list of menu item name strings.
    Falls back to empty list on any failure.
    """
    message = f"Find the menu items available at '{restaurant_name}'."

    try:
        result_str = await adk_runner.run_agent(message, session_id)
        if not result_str:
            return []

        parsed = _extract_json_from_text(result_str)

        if isinstance(parsed, dict) and "menus" in parsed:
            menus_raw = parsed["menus"]
        elif isinstance(parsed, list):
            menus_raw = parsed
        else:
            return []

        names: List[str] = []
        for item in menus_raw:
            if isinstance(item, str):
                names.append(item)
            elif isinstance(item, dict) and "name" in item:
                names.append(item["name"])
        return names

    except Exception as e:
        logger.warning("get_restaurant_menus failed, returning empty: %s", e)
        return []


def _fallback_reviews(menu_name: str, restaurant_name: str) -> List[str]:
    """Return default placeholder reviews when AI is unavailable."""
    return [
        f"The {menu_name} at {restaurant_name} was delicious and well-presented.",
        f"I really enjoyed the {menu_name}. The flavors were balanced and satisfying.",
        f"A solid choice -- the {menu_name} lived up to expectations at {restaurant_name}.",
    ]
