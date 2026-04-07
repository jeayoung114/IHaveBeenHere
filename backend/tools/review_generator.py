"""Tool: Generate short review options using Gemini Vision + star rating."""

import json
import logging
import os
import re
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


def generate_meal_reviews(
    menu_name: str,
    restaurant_name: str,
    rating: int,
    image_path: Optional[str] = None,
) -> dict:
    """
    Generates 4 short review options for a meal based on a 1-5 star rating.
    Optionally uses the food photo for visual context to make reviews more specific.

    Args:
        menu_name: The confirmed menu item name
        restaurant_name: Name of the restaurant
        rating: Star rating from 1 (worst) to 5 (best)
        image_path: Optional absolute path to the food image for visual context

    Returns:
        dict with 'reviews': list of review text strings
    """
    api_key = os.environ.get("GOOGLE_API_KEY", "")
    if not api_key or api_key == "PLACEHOLDER_SET_YOUR_KEY":
        return {"reviews": _fallback_reviews(menu_name, rating)}

    rating = max(1, min(5, rating))

    tone_map = {
        5: "enthusiastic — the user loved it",
        4: "positive — the user enjoyed it",
        3: "neutral — it was okay, nothing special",
        2: "mixed — slightly disappointing",
        1: "critical — the user did not enjoy it",
    }
    tone_guide = tone_map[rating]

    prompt = (
        f'Generate 4 short review options for "{menu_name}" at "{restaurant_name}". '
        f"Star rating: {rating}/5 ({tone_guide}).\n"
        "Requirements for each review:\n"
        "- 1-2 sentences, under 20 words total\n"
        "- First-person, casual diary-style (e.g. 'Rich broth, very satisfying')\n"
        "- Each option should vary slightly in wording/tone to give real choice\n"
        "- If a food photo is provided, reference visible qualities (texture, color, portion)\n\n"
        'Return ONLY a JSON object: {"reviews": ["review 1", "review 2", "review 3", "review 4"]}\n'
        "No markdown, no extra keys."
    )

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        contents = []

        # Include image if provided for visual context
        if image_path:
            try:
                if image_path.startswith("http://") or image_path.startswith("https://"):
                    import httpx
                    r = httpx.get(image_path, timeout=10, follow_redirects=True)
                    r.raise_for_status()
                    img_bytes = r.content
                    img_mime = r.headers.get("content-type", "image/jpeg").split(";")[0]
                else:
                    image_file = Path(image_path)
                    if image_file.exists():
                        suffix = image_file.suffix.lower()
                        mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
                        img_bytes = image_file.read_bytes()
                        img_mime = mime_map.get(suffix, "image/jpeg")
                    else:
                        img_bytes = None
                if img_bytes:
                    contents.append(types.Part.from_bytes(data=img_bytes, mime_type=img_mime))
            except Exception as img_err:
                logger.warning("Could not load image for review context: %s", img_err)

        contents.append(prompt)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
        )

        text = response.text.strip()
        if "```" in text:
            text = re.sub(r"```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```", "", text)
            text = text.strip()

        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            parsed = json.loads(text[start : end + 1])
            if isinstance(parsed, dict) and "reviews" in parsed:
                reviews = [r for r in parsed["reviews"] if isinstance(r, str)]
                if reviews:
                    return {"reviews": reviews}

        return {"reviews": _fallback_reviews(menu_name, rating)}

    except Exception as e:
        logger.warning("generate_meal_reviews failed: %s", e)
        return {"reviews": _fallback_reviews(menu_name, rating)}


def _fallback_reviews(menu_name: str, rating: int) -> list:
    if rating >= 4:
        return [
            f"The {menu_name} was delicious — absolutely worth it.",
            f"Really enjoyed the {menu_name}, would order again.",
            f"Solid choice. The {menu_name} hit the spot.",
            f"Great experience. The {menu_name} did not disappoint.",
        ]
    if rating <= 2:
        return [
            f"The {menu_name} was underwhelming, expected more.",
            f"Disappointed with the {menu_name} today.",
            f"The {menu_name} wasn't quite what I hoped for.",
            f"Would skip the {menu_name} next time.",
        ]
    return [
        f"The {menu_name} was decent, nothing special.",
        f"The {menu_name} was okay — not bad, not great.",
        f"Solid but forgettable. The {menu_name} was fine.",
        f"The {menu_name} met expectations, nothing more.",
    ]
