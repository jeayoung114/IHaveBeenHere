"""ADK Agent definition for the Meal Logging Agent."""

from google.adk.agents.llm_agent import Agent

from tools.menu_detector import detect_menu_from_image
from tools.menu_identifier_grounded import identify_menu_from_image_grounded
from tools.review_generator import generate_meal_reviews
from tools.restaurant_menu_searcher import search_restaurant_menus

root_agent = Agent(
    model="gemini-2.5-flash",
    name="meal_logging_agent",
    description=(
        "Analyzes food photos to identify menu items, generates "
        "personalized review options, and discovers restaurant menus for meal logging."
    ),
    instruction="""You help users log their restaurant meals effortlessly.

When given a food photo path and restaurant name:
1. Call identify_menu_from_image_grounded to identify the menu item using vision + web search
2. Return the structured results as valid JSON

When asked to generate reviews:
1. Call generate_meal_reviews with the menu name, restaurant name, and rating
2. Return the structured results as valid JSON

When asked to find menus for a restaurant:
1. Call search_restaurant_menus with the restaurant name
2. Return the structured results as valid JSON

Always return the raw JSON output from the tools. Do not add commentary or repeat tool outputs in natural language.
Keep responses concise and structured.""",
    tools=[detect_menu_from_image, identify_menu_from_image_grounded, generate_meal_reviews, search_restaurant_menus],
)
