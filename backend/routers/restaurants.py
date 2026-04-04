from typing import List, Optional

import httpx
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


@router.post("/geocode-all", response_model=dict)
async def geocode_all_restaurants(db: AsyncSession = Depends(get_db)):
    """Backfill latitude/longitude for all restaurants missing coordinates."""
    result = await db.execute(
        select(Restaurant).where(
            (Restaurant.latitude == None) | (Restaurant.longitude == None)  # noqa: E711
        )
    )
    restaurants = result.scalars().all()
    updated = 0
    for r in restaurants:
        try:
            url = "https://nominatim.openstreetmap.org/search"
            params = {"q": r.name, "format": "json", "limit": 1}
            headers = {"User-Agent": "IHaveBeenHere/1.0"}
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(url, params=params, headers=headers)
                data = resp.json()
                if data:
                    r.latitude = float(data[0]["lat"])
                    r.longitude = float(data[0]["lon"])
                    updated += 1
        except Exception:
            continue
    await db.commit()
    return {"updated": updated, "total": len(restaurants)}


@router.get("/search-nearby", response_model=List[dict])
async def search_nearby_restaurants(
    q: str = Query(..., min_length=1),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
):
    """Search real restaurants by name near a location via Nominatim."""
    params: dict = {
        "q": q,
        "format": "json",
        "limit": 8,
        "addressdetails": 1,
    }
    if lat is not None and lng is not None:
        params["viewbox"] = f"{lng-0.1},{lat+0.1},{lng+0.1},{lat-0.1}"
        params["bounded"] = 0
    headers = {"User-Agent": "IHaveBeenHere/1.0"}
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(
                "https://nominatim.openstreetmap.org/search", params=params, headers=headers
            )
            data = r.json()
        results = []
        for item in data:
            addr = item.get("address", {})
            parts = [
                addr.get("road") or addr.get("pedestrian"),
                addr.get("city") or addr.get("town") or addr.get("village"),
                addr.get("state"),
            ]
            address = ", ".join(p for p in parts if p)
            results.append({
                "name": item.get("display_name", "").split(",")[0],
                "display_name": item.get("display_name", ""),
                "address": address,
                "lat": float(item["lat"]),
                "lng": float(item["lon"]),
            })
        return results
    except Exception:
        return []


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
