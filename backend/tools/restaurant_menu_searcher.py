"""
Tool: search_restaurant_menus
Searches for menu items at the given restaurant using Gemini with Google Search grounding.
"""

import json
import logging
import os
import re

logger = logging.getLogger(__name__)


def search_restaurant_menus(restaurant_name: str) -> dict:
    """
    Searches for menu items available at the given restaurant using web search.
    Uses Gemini with Google Search grounding to find real, up-to-date menu data.

    Args:
        restaurant_name: Name of the restaurant to look up

    Returns:
        dict with 'menus': list of menu item name strings
    """
    api_key = os.environ.get("GOOGLE_API_KEY", "")
    if not api_key or api_key == "PLACEHOLDER_SET_YOUR_KEY":
        return {"menus": []}

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        prompt = (
            f"Search the web and find the menu items available at '{restaurant_name}'. "
            "Return ONLY a JSON object with a 'menus' key containing an array of menu item name strings. "
            "Include as many real menu items as you can find — cover all categories: "
            "appetizers, mains, sides, desserts, drinks, specials, etc. Aim for 20-30 items. "
            "Do not include prices, descriptions, or any other text outside the JSON. "
            'Example format: {"menus": ["Tonkotsu Ramen", "Gyoza", "Chashu Bowl", "Green Tea", "Pudding"]}'
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
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

        # Try to extract JSON from the response
        for start_char, end_char in [("{", "}"), ("[", "]")]:
            start = text.find(start_char)
            end = text.rfind(end_char)
            if start != -1 and end != -1 and end > start:
                try:
                    parsed = json.loads(text[start : end + 1])
                    if isinstance(parsed, dict) and "menus" in parsed:
                        return parsed
                    if isinstance(parsed, list):
                        return {"menus": [item for item in parsed if isinstance(item, str)]}
                except json.JSONDecodeError:
                    continue

        return {"menus": []}

    except Exception as e:
        logger.warning("search_restaurant_menus failed: %s", e)
        return {"menus": []}
