"""Tool: Detect menu items from a food photo using Gemini Vision."""

import base64
import json
import logging
import re
from pathlib import Path

logger = logging.getLogger(__name__)


def detect_menu_from_image(image_path: str, restaurant_name: str) -> dict:
    """
    Analyzes a food photo and returns the most likely menu item candidates.
    Use the restaurant name as context to improve identification accuracy.

    Args:
        image_path: Absolute local path to the food image file
        restaurant_name: Name of the restaurant where the photo was taken

    Returns:
        dict with 'candidates': list of {"name": str, "confidence": float}
    """
    import google.generativeai as genai

    image_file = Path(image_path)
    if not image_file.exists():
        return {"candidates": []}

    image_data = image_file.read_bytes()

    # Determine MIME type from extension
    suffix = image_file.suffix.lower()
    mime_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
    }
    mime_type = mime_map.get(suffix, "image/jpeg")

    model = genai.GenerativeModel("gemini-2.5-flash")

    try:
        response = model.generate_content([
            f'This food was ordered at "{restaurant_name}". '
            "Identify the top 3 most likely menu item candidates. "
            'Return ONLY a JSON array: [{"name": "item name", "confidence": 0.85}]. '
            "Each item should have a name (string) and confidence score (float 0.0-1.0). "
            "Return only the JSON array, no markdown formatting.",
            {"mime_type": mime_type, "data": image_data},
        ])

        # Extract JSON from response, handling potential markdown code blocks
        text = response.text.strip()
        # Remove markdown code block if present
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)

        candidates = json.loads(text)
        if isinstance(candidates, list):
            return {"candidates": candidates}
        return {"candidates": []}

    except (json.JSONDecodeError, ValueError, AttributeError) as e:
        logger.warning("Failed to parse menu detection response: %s", e)
        return {"candidates": []}
    except Exception as e:
        logger.error("Menu detection failed: %s", e)
        return {"candidates": []}
