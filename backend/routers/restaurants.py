from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import Restaurant
from schemas import RestaurantResponse
from services import ai_service

router = APIRouter(prefix="/restaurants", tags=["restaurants"])


@router.get("", response_model=List[RestaurantResponse])
async def list_restaurants(
    name: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Return all restaurants. Optionally filter by partial name match.
    """
    query = select(Restaurant)
    if name:
        query = query.where(Restaurant.name.ilike(f"%{name}%"))
    query = query.order_by(Restaurant.name)

    result = await db.execute(query)
    restaurants = result.scalars().all()
    return [RestaurantResponse.model_validate(r) for r in restaurants]


@router.get("/menus", response_model=List[str])
async def get_restaurant_menus(
    name: str = Query(..., min_length=1, description="Restaurant name to look up menus for"),
    session_id: Optional[str] = Query(None),
):
    """
    Discover menu items for a restaurant using AI.
    Returns a list of menu item name strings.
    """
    return await ai_service.get_restaurant_menus(name, session_id)
