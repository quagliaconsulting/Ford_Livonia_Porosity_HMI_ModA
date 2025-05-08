from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class DefectBase(BaseModel):
    image_id: Optional[int] = None
    x: Optional[int] = None
    y: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    confidence: Optional[float] = None
    type: Optional[str] = None
    hand: Optional[str] = None
    uss_reviewed: Optional[bool] = None
    system_generated: Optional[bool] = None
    disposition: Optional[str] = None
    dispositioned_at: Optional[datetime] = None
    supression_timestamp: Optional[datetime] = None
    mode: Optional[str] = None
    iv_updated: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None


class DefectCreate(DefectBase):
    pass


class Defect(DefectBase):
    id: int

    class Config:
        orm_mode = True


class DefectUpdate(BaseModel):
    disposition: str
    notes: Optional[str] = None


class DefectNormalized(BaseModel):
    """Schema representing a defect with normalized coordinates for frontend rendering"""
    id: int
    image_id: int
    normalized: Dict[str, float] = Field(
        ..., 
        description="Normalized coordinates (x_center, y_center, width, height) in range 0-1"
    )
    x: int
    y: int 
    width: int
    height: int
    confidence: Optional[float] = None
    type: Optional[str] = None
    disposition: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        orm_mode = True


class DefectStatistics(BaseModel):
    total_defects: int
    defects_by_type: Dict[str, int]
    defects_by_disposition: Dict[str, int]
    defects_by_camera: Dict[str, int]