from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ...db.database import get_db
from ...db import crud
from ...schemas import camera, image, defect
from ...services import image_service

router = APIRouter()


@router.get("/", response_model=List[camera.Camera])
def read_cameras(
    skip: int = 0, 
    limit: int = 100, 
    group_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get a list of all cameras."""
    if group_id is not None:
        cameras = crud.get_cameras_by_group(db, group_id=group_id)
    else:
        cameras = crud.get_cameras(db, skip=skip, limit=limit)
    return cameras


@router.get("/{serial_number}", response_model=camera.Camera)
def read_camera(serial_number: str, db: Session = Depends(get_db)):
    """Get details for a specific camera."""
    db_camera = crud.get_camera(db, serial_number=serial_number)
    if db_camera is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    return db_camera


@router.get("/{serial_number}/latest", response_model=camera.CameraLatestStatus)
def read_camera_latest_status(serial_number: str, db: Session = Depends(get_db)):
    """Get the latest status for a specific camera, including its most recent image and defect count."""
    db_camera = crud.get_camera(db, serial_number=serial_number)
    if db_camera is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    latest_image = crud.get_camera_latest_image(db, camera_id=serial_number)
    
    # Initialize the response
    result = camera.CameraLatestStatus(
        serial_number=serial_number,
        has_defects=False,
        defect_count=0
    )
    
    # If we have an image, populate the response
    if latest_image:
        result.latest_image_id = latest_image.id
        result.latest_image_url = image_service.get_image_url(latest_image)
        
        # Get defects for the image
        defects = crud.get_defects_by_image(db, image_id=latest_image.id)
        result.has_defects = len(defects) > 0
        result.defect_count = len(defects)
        
        # Get timestamp from trigger
        if latest_image.trigger:
            result.timestamp = latest_image.trigger.timestamp
    
    return result