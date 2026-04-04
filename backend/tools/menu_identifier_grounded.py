"""
Tool: identify_menu_from_image_grounded
Identifies the menu item from a food photo by combining Gemini Vision
with Google Search grounding to match against the restaurant's real menu.
"""

import json
import logging
import os
import re
from pathlib import Path

logger = logging.getLogger(__name__)


def identify_menu_from_image_grounded(image_path: str, restaurant_name: str) -> dict:
    """
    Identifies the exact menu item name from a food photo using vision + web search.
    First visually analyzes the dish, then searches the restaurant's actual menu online
    to find the closest matching item name.

    Args:
        image_path: Absolute local path to the food image file
        restaurant_name: Name of the restaurant where the photo was taken

    Returns:
        dict with 'candidates': list of menu item name strings, ordered by likelihood
    """
    api_key = os.environ.get("GOOGLE_API_KEY", "")
    if not api_key or api_key == "PLACEHOLDER_SET_YOUR_KEY":
        return {"candidates": []}

    image_file = Path(image_path)
    if not image_file.exists():
        logger.warning("Image not found: %s", image_path)
        return {"candidates": []}

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        suffix = image_file.suffix.lower()
        mime_map = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".gif": "image/gif",
        }
        mime_type = mime_map.get(suffix, "image/jpeg")
        image_bytes = image_file.read_bytes()

        prompt = (
            f"Look at this food photo taken at '{restaurant_name}'. "
            f"Search the web for '{restaurant_name}' menu to find their actual menu items. "
            "Then identify which specific menu item(s) from their real menu this food photo shows. "
            "Return ONLY a JSON object with a 'candidates' key containing an array of the top 3 "
            "matching menu item name strings, ordered by likelihood. "
            'Example: {"candidates": ["Tonkotsu Ramen", "Spicy Miso Ramen", "Shoyu Ramen"]}'
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                prompt,
            ],
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
            ),
        )

        text = response.text.strip()

        # Strip markdown code blocks if present
        if "```" in text:
            text = re.sub(r"```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```", "", text)
            text = text.strip()

        # Extract JSON
        for start_char, end_char in [("{", "}"), ("[", "]")]:
            start = text.find(start_char)
            end = text.rfind(end_char)
            if start != -1 and end != -1 and end > start:
                try:
                    parsed = json.loads(text[start : end + 1])
                    if isinstance(parsed, dict) and "candidates" in parsed:
                        return parsed
                    if isinstance(parsed, list):
                        return {"candidates": [i for i in parsed if isinstance(i, str)]}
                except json.JSONDecodeError:
                    continue

        return {"candidates": []}

    except Exception as e:
        logger.warning("identify_menu_from_image_grounded failed: %s", e)
        return {"candidates": []}
