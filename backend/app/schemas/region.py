from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class PolygonPoint(BaseModel):
    x: float
    y: float


class RegionBase(BaseModel):
    camera_id: str
    region_id: str
    size_threshold: float = Field(..., ge=0.1)
    density_threshold: int = Field(..., ge=1)
    proximity_threshold: float = Field(..., ge=0.1)
    polygon: List[Dict[str, float]] = Field(..., min_items=3)  # List of {x, y} points
    part_number: Optional[str] = None
    description: Optional[str] = None
    active: bool = True


class RegionCreate(RegionBase):
    pass


class RegionUpdate(BaseModel):
    size_threshold: Optional[float] = Field(None, ge=0.1)
    density_threshold: Optional[int] = Field(None, ge=1)
    proximity_threshold: Optional[float] = Field(None, ge=0.1)
    polygon: Optional[List[Dict[str, float]]] = Field(None, min_items=3)
    part_number: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None


class Region(RegionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True