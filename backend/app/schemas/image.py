from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ImageBase(BaseModel):
    trigger_id: int
    width: Optional[int] = None
    height: Optional[int] = None
    camera_id: str
    media_id: Optional[str] = None
    image: Optional[str] = None
    ether_checked: Optional[bool] = None


class Image(ImageBase):
    id: int
    
    class Config:
        orm_mode = True


class ImageDetail(Image):
    trigger_timestamp: Optional[datetime] = None
    camera_group: Optional[int] = None
    defect_count: int = 0
    trigger_part: Optional[str] = None
    
    class Config:
        orm_mode = True