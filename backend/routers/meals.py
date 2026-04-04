import json
import uuid
import os
from typing import Optional
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from database import get_db
from models import Meal, Restaurant
from schemas import (
    MealListResponse,
    MealResponse,
    MealUpdate,
    StatsResponse,
    DetectMenuResponse,
    GenerateReviewsRequest,
    GenerateReviewsResponse,
)
from services import ai_service

router = APIRouter(prefix="/meals", tags=["meals"])

UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)


async def _save_image(image: UploadFile) -> str:
    """Save uploaded image to uploads/ and return relative path."""
    ext = os.path.splitext(image.filename or "image.jpg")[1] or ".jpg"
    filename = f"meal_{uuid.uuid4().hex}{ext}"
    file_path = UPLOADS_DIR / filename
    content = await image.read()
    with open(file_path, "wb") as f:
        f.write(content)
    return str(file_path)


async def _get_or_create_restaurant(db: AsyncSession, name: str) -> Restaurant:
    """Return existing restaurant by name or create a new one."""
    result = await db.execute(
        select(Restaurant).where(Restaurant.name == name)
    )
    restaurant = result.scalars().first()
    if not restaurant:
        restaurant = Restaurant(name=name)
        db.add(restaurant)
        await db.flush()
    return restaurant


# --- POST /meals/detect-menu (must be defined before /{id} routes) ---

@router.post("/detect-menu", response_model=DetectMenuResponse)
async def detect_menu(
    image: UploadFile = File(...),
    restaurant_name: str = Form(...),
    session_id: Optional[str] = Form(None),
):
    """
    Stub: Accept an image and restaurant name, call ai_service.detect_menu().
    Returns candidate menu item names (currently empty list).
    """
    # Save image temporarily
    image_path = await _save_image(image)

    candidates = await ai_service.detect_menu(
        image_path=image_path,
        restaurant_name=restaurant_name,
        session_id=session_id,
    )

    return DetectMenuResponse(
        candidates=candidates,
        session_id=session_id,
        image_path=image_path,
    )


# --- POST /meals/generate-reviews (must be defined before /{id} routes) ---

@router.post("/generate-reviews", response_model=GenerateReviewsResponse)
async def generate_reviews(body: GenerateReviewsRequest):
    """
    Stub: Generate review suggestions for a meal.
    Returns 3 default placeholder reviews.
    """
    reviews = await ai_service.generate_reviews(
        menu_name=body.menu_name,
        restaurant_name=body.restaurant_name,
        rating=body.rating,
        image_path=body.image_path,
        session_id=body.session_id,
    )
    return GenerateReviewsResponse(reviews=reviews)


# --- POST /meals ---

@router.post("", response_model=MealResponse, status_code=status.HTTP_201_CREATED)
async def create_meal(
    image: UploadFile = File(...),
    data: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new meal record.
    Accepts multipart form: image file + data (JSON string).
    """
    try:
        meal_data = json.loads(data)
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="'data' field must be a valid JSON string.",
        )

    menu_name = meal_data.get("menu_name")
    restaurant_name = meal_data.get("restaurant_name")
    rating = meal_data.get("rating")
    review = meal_data.get("review")
    tags = meal_data.get("tags")  # list or None

    if not menu_name:
        raise HTTPException(status_code=422, detail="menu_name is required.")
    if not restaurant_name:
        raise HTTPException(status_code=422, detail="restaurant_name is required.")
    if rating is not None and not (1 <= int(rating) <= 5):
        raise HTTPException(status_code=422, detail="rating must be between 1 and 5.")

    # Save image
    image_path = await _save_image(image)

    # Get or create restaurant
    restaurant = await _get_or_create_restaurant(db, restaurant_name)

    # Serialize tags
    tags_json: Optional[str] = None
    if tags is not None:
        tags_json = json.dumps(tags, ensure_ascii=False)

    meal = Meal(
        restaurant_id=restaurant.id,
        menu_name=menu_name,
        rating=int(rating) if rating is not None else None,
        review=review,
        image_path=image_path,
        tags=tags_json,
    )
    db.add(meal)
    await db.commit()
    await db.refresh(meal)

    # Load relationship
    result = await db.execute(
        select(Meal).where(Meal.id == meal.id)
    )
    meal = result.scalars().first()
    # Eagerly load restaurant
    await db.refresh(meal, ["restaurant"])

    return MealResponse.from_orm_with_url(meal)


# --- GET /meals ---

@router.get("", response_model=MealListResponse)
async def list_meals(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """Return paginated list of meals (newest first) with aggregate stats."""
    # Fetch meals
    result = await db.execute(
        select(Meal).order_by(desc(Meal.created_at)).offset(skip).limit(limit)
    )
    meals = result.scalars().all()

    # Load restaurant for each meal
    for meal in meals:
        await db.refresh(meal, ["restaurant"])

    # Stats
    total_meals_result = await db.execute(select(func.count(Meal.id)))
    total_meals = total_meals_result.scalar() or 0

    total_restaurants_result = await db.execute(select(func.count(Restaurant.id)))
    total_restaurants = total_restaurants_result.scalar() or 0

    avg_rating_result = await db.execute(select(func.avg(Meal.rating)))
    avg_rating_raw = avg_rating_result.scalar()
    avg_rating = round(float(avg_rating_raw), 2) if avg_rating_raw is not None else None

    return MealListResponse(
        meals=[MealResponse.from_orm_with_url(m) for m in meals],
        stats=StatsResponse(
            total_meals=total_meals,
            total_restaurants=total_restaurants,
            avg_rating=avg_rating,
        ),
    )


# --- GET /meals/{id} ---

@router.get("/{meal_id}", response_model=MealResponse)
async def get_meal(meal_id: int, db: AsyncSession = Depends(get_db)):
    """Return a single meal by ID."""
    result = await db.execute(select(Meal).where(Meal.id == meal_id))
    meal = result.scalars().first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found.")
    await db.refresh(meal, ["restaurant"])
    return MealResponse.from_orm_with_url(meal)


# --- PUT /meals/{id} ---

@router.put("/{meal_id}", response_model=MealResponse)
async def update_meal(
    meal_id: int,
    body: MealUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update rating and/or review for a meal."""
    result = await db.execute(select(Meal).where(Meal.id == meal_id))
    meal = result.scalars().first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found.")

    if body.rating is not None:
        meal.rating = body.rating
    if body.review is not None:
        meal.review = body.review

    await db.commit()
    await db.refresh(meal, ["restaurant"])
    return MealResponse.from_orm_with_url(meal)


# --- DELETE /meals/{id} ---

@router.delete("/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meal(meal_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a meal by ID."""
    result = await db.execute(select(Meal).where(Meal.id == meal_id))
    meal = result.scalars().first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found.")
    await db.delete(meal)
    await db.commit()
