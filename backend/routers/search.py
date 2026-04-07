from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, desc

from auth import get_current_user_id
from database import get_db
from models import Meal, Restaurant
from schemas import MealResponse

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=List[MealResponse])
async def search_meals(
    q: str = Query(..., min_length=1, description="Keyword to search across meals and restaurants"),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Search meals by keyword across:
    - meal.menu_name
    - meal.review
    - restaurant.name (via join)

    Results are filtered to the authenticated user's meals only.
    """
    pattern = f"%{q}%"

    result = await db.execute(
        select(Meal)
        .join(Restaurant, Meal.restaurant_id == Restaurant.id)
        .where(Meal.user_id == user_id)
        .where(
            or_(
                Meal.menu_name.ilike(pattern),
                Meal.review.ilike(pattern),
                Restaurant.name.ilike(pattern),
            )
        )
        .order_by(desc(Meal.created_at))
    )
    meals = result.scalars().all()

    # Load relationships
    for meal in meals:
        await db.refresh(meal, ["restaurant"])

    return [MealResponse.from_orm_with_url(m) for m in meals]
