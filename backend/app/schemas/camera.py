from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CameraBase(BaseModel):
    serial_number: str
    group_id: Optional[int] = None
    sub_group: Optional[int] = None
    ip: Optional[str] = None


class Camera(CameraBase):
    class Config:
        orm_mode = True


class CameraLatestStatus(BaseModel):
    serial_number: str
    latest_image_id: Optional[int] = None
    latest_image_url: Optional[str] = None
    has_defects: bool = False
    defect_count: int = 0
    timestamp: Optional[datetime] = None
    
    class Config:
        orm_mode = True