from pydantic import BaseModel, Field
from typing import List, Optional

class PlaceRequest(BaseModel):
    latitude: float = Field(..., description="User's latitude")
    longitude: float = Field(..., description="User's longitude")
    mood: str = Field(..., description="Selected mood/vibe")
    radius_km: Optional[int] = Field(5, description="Search radius in kilometers")

class PlaceResponse(BaseModel):
    id: str
    name: str
    rating: float
    distance: float
    address: str
    openNow: bool
    types: List[str]
    images: List[str]
    lat: float
    lng: float

class APIResponse(BaseModel):
    status: str
    message: str
    results_count: int
    data: List[PlaceResponse]