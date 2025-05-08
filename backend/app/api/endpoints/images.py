from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from ...db.database import get_db
from ...db import crud
from ...schemas import image
from ...services import image_service

router = APIRouter()


@router.get("/", response_model=List[image.Image])
def read_images(
    skip: int = 0, 
    limit: int = 100, 
    trigger_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get a list of images, optionally filtered by trigger ID."""
    if trigger_id:
        images = crud.get_images_by_trigger(db, trigger_id=trigger_id)
    else:
        # Get some recent images
        latest_trigger = crud.get_latest_trigger(db)
        if latest_trigger:
            images = crud.get_images_by_trigger(db, trigger_id=latest_trigger.id)
        else:
            images = []
    
    return images


@router.get("/latest", response_model=List[image.ImageDetail])
def read_latest_images(db: Session = Depends(get_db)):
    """Get the latest image for each camera."""
    images = crud.get_latest_images(db)
    
    # Enhance the image objects with additional information
    result = []
    for img in images:
        # Count defects
        defects = crud.get_defects_by_image(db, image_id=img.id)
        
        # Create enhanced object
        image_detail = image.ImageDetail(
            id=img.id,
            trigger_id=img.trigger_id,
            width=img.width,
            height=img.height,
            camera_id=img.camera_id,
            media_id=img.media_id,
            image=img.image,
            ether_checked=img.ether_checked,
            defect_count=len(defects)
        )
        
        # Add trigger timestamp if available
        if img.trigger:
            image_detail.trigger_timestamp = img.trigger.timestamp
        
        # Add camera group if available
        if img.camera:
            image_detail.camera_group = img.camera.group_id
            
        result.append(image_detail)
    
    return result


@router.get("/{image_id}", response_model=image.ImageDetail)
def read_image(image_id: int, db: Session = Depends(get_db)):
    """Get details for a specific image."""
    db_image = crud.get_image(db, image_id=image_id)
    if db_image is None:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Count defects
    defects = crud.get_defects_by_image(db, image_id=image_id)
    
    # Create enhanced object
    image_detail = image.ImageDetail(
        id=db_image.id,
        trigger_id=db_image.trigger_id,
        width=db_image.width,
        height=db_image.height,
        camera_id=db_image.camera_id,
        media_id=db_image.media_id,
        image=db_image.image,
        ether_checked=db_image.ether_checked,
        defect_count=len(defects)
    )
    
    # Add trigger timestamp and part if available
    if db_image.trigger:
        image_detail.trigger_timestamp = db_image.trigger.timestamp
        image_detail.trigger_part = db_image.trigger.part
    
    # Add camera group if available
    if db_image.camera:
        image_detail.camera_group = db_image.camera.group_id
        
    return image_detail


@router.get("/{image_id}/file")
def read_image_file(image_id: int, db: Session = Depends(get_db)):
    """Get the actual image file for a specific image."""
    db_image = crud.get_image(db, image_id=image_id)
    if db_image is None:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Get the file path
    file_path = image_service.get_image_file_path(db_image)
    if file_path is None:
        raise HTTPException(status_code=404, detail="Image file not found")
    
    return FileResponse(file_path)