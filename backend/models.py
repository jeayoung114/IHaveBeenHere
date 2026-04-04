from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base


class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    meals = relationship("Meal", back_populates="restaurant")


class Meal(Base):
    __tablename__ = "meals"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    menu_name = Column(String, nullable=False, index=True)
    rating = Column(Integer, nullable=True)   # 1-5
    review = Column(String, nullable=True)
    image_path = Column(String, nullable=True)
    tags = Column(String, nullable=True)       # JSON string, e.g. '["Japanese", "Ramen"]'
    created_at = Column(DateTime, default=datetime.utcnow)

    restaurant = relationship("Restaurant", back_populates="meals")
