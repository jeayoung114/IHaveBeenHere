from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, field_validator
import json


# --- Restaurant schemas ---

class RestaurantBase(BaseModel):
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class RestaurantCreate(RestaurantBase):
    pass


class RestaurantResponse(RestaurantBase):
    id: int

    model_config = {"from_attributes": True}


# --- Meal schemas ---

class MealCreate(BaseModel):
    menu_name: str
    restaurant_name: str
    rating: Optional[int] = None
    review: Optional[str] = None
    tags: Optional[List[str]] = None

    @field_validator("rating")
    @classmethod
    def rating_range(cls, v):
        if v is not None and not (1 <= v <= 5):
            raise ValueError("rating must be between 1 and 5")
        return v


class MealUpdate(BaseModel):
    rating: Optional[int] = None
    review: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def rating_range(cls, v):
        if v is not None and not (1 <= v <= 5):
            raise ValueError("rating must be between 1 and 5")
        return v


class MealResponse(BaseModel):
    id: int
    menu_name: str
    restaurant: RestaurantResponse
    rating: Optional[int]
    review: Optional[str]
    tags: Optional[List[str]]
    image_url: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_url(cls, meal, base_url: str = "") -> "MealResponse":
        tags_list: Optional[List[str]] = None
        if meal.tags:
            try:
                tags_list = json.loads(meal.tags)
            except (ValueError, TypeError):
                tags_list = []

        image_url: Optional[str] = None
        if meal.image_path:
            image_url = f"/uploads/{meal.image_path.split('uploads/')[-1]}"

        return cls(
            id=meal.id,
            menu_name=meal.menu_name,
            restaurant=RestaurantResponse.model_validate(meal.restaurant),
            rating=meal.rating,
            review=meal.review,
            tags=tags_list,
            image_url=image_url,
            created_at=meal.created_at,
        )


# --- Stats schema ---

class StatsResponse(BaseModel):
    total_meals: int
    total_restaurants: int
    avg_rating: Optional[float]


class MealListResponse(BaseModel):
    meals: List[MealResponse]
    stats: StatsResponse


# --- AI stub schemas ---

class DetectMenuResponse(BaseModel):
    candidates: List[str]
    session_id: Optional[str]
    image_path: Optional[str] = None   # server-side path, passed to generate-reviews


class GenerateReviewsRequest(BaseModel):
    menu_name: str
    restaurant_name: str
    rating: Optional[int] = None   # 1–5 stars
    image_path: Optional[str] = None
    session_id: Optional[str] = None


class GenerateReviewsResponse(BaseModel):
    reviews: List[str]
