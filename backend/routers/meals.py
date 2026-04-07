import asyncio
import json
import uuid
import os
import httpx
from datetime import datetime
from typing import Optional
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from supabase import create_client, Client

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

STORAGE_BUCKET = "meal-images"

_supabase: Optional[Client] = None


def _get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_KEY", "")
        _supabase = create_client(url, key)
    return _supabase


async def _save_image(image: UploadFile) -> str:
    """Upload image to Supabase Storage and return public URL."""
    ext = os.path.splitext(image.filename or "image.jpg")[1] or ".jpg"
    filename = f"meal_{uuid.uuid4().hex}{ext}"
    content = await image.read()
    sb = _get_supabase()
    sb.storage.from_(STORAGE_BUCKET).upload(
        path=filename,
        file=content,
        file_options={"content-type": image.content_type or "image/jpeg"},
    )
    public_url = sb.storage.from_(STORAGE_BUCKET).get_public_url(filename)
    return public_url


async def _geocode(name: str) -> tuple[float, float] | None:
    """Look up lat/lng for a restaurant name via Nominatim (OpenStreetMap)."""
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {"q": name, "format": "json", "limit": 1}
        headers = {"User-Agent": "IHaveBeenHere/1.0"}
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(url, params=params, headers=headers)
            data = r.json()
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        pass
    return None


async def _get_or_create_restaurant(db: AsyncSession, name: str) -> Restaurant:
    """Return existing restaurant by name or create a new one."""
    result = await db.execute(
        select(Restaurant).where(Restaurant.name == name)
    )
    restaurant = result.scalars().first()
    if not restaurant:
        restaurant = Restaurant(name=name, latitude=None, longitude=None)
        db.add(restaurant)
        await db.flush()
        # Geocode in background — don't block the response
        asyncio.create_task(_geocode_and_update(restaurant.id, name))
    return restaurant


async def _geocode_and_update(restaurant_id: int, name: str) -> None:
    """Geocode in background and update the restaurant record."""
    coords = await _geocode(name)
    if not coords:
        return
    from database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Restaurant).where(Restaurant.id == restaurant_id))
        restaurant = result.scalars().first()
        if restaurant:
            restaurant.latitude = coords[0]
            restaurant.longitude = coords[1]
            await db.commit()


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
    data: str = Form(...),
    image: Optional[UploadFile] = File(None),
    existing_image_path: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new meal record.
    Accepts multipart form: data (JSON string) + either image file or existing_image_path.
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

    # Use existing image path or save uploaded image
    if existing_image_path:
        image_path = existing_image_path
    elif image is not None:
        image_path = await _save_image(image)
    else:
        raise HTTPException(status_code=422, detail="Either image or existing_image_path is required.")

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
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Return paginated list of meals (newest first) with aggregate stats."""
    query = select(Meal).order_by(desc(Meal.created_at)).offset(skip).limit(limit)
    if from_date:
        dt = datetime.fromisoformat(from_date).replace(hour=0, minute=0, second=0, microsecond=0)
        query = query.where(Meal.created_at >= dt)
    if to_date:
        dt = datetime.fromisoformat(to_date).replace(hour=23, minute=59, second=59, microsecond=999999)
        query = query.where(Meal.created_at <= dt)
    result = await db.execute(query)
    meals = result.scalars().all()

    # Load restaurant for each meal
    for meal in meals:
        await db.refresh(meal, ["restaurant"])

    # Stats
    total_meals_result = await db.execute(select(func.count(Meal.id)))
    total_meals = total_meals_result.scalar() or 0

    total_restaurants_result = await db.execute(
        select(func.count(func.distinct(Meal.restaurant_id)))
    )
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
