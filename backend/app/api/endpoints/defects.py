from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict

from ...db.database import get_db
from ...db import crud, models
from ...schemas import defect
from ...services import image_service

router = APIRouter()


@router.get("/image/{image_id}", response_model=List[defect.DefectNormalized])
def read_defects_by_image(
    image_id: int, 
    db: Session = Depends(get_db)
):
    """Get all defects for a specific image with normalized coordinates for frontend rendering."""
    db_image = crud.get_image(db, image_id=image_id)
    if db_image is None:
        raise HTTPException(status_code=404, detail="Image not found")
    
    db_defects = crud.get_defects_by_image(db, image_id=image_id)
    
    # Convert to normalized coordinates for the frontend
    normalized_defects = []
    for db_defect in db_defects:
        # Calculate normalized coordinates
        img_width = db_image.width or 5120  # Fallback to 5120 if width is None
        img_height = db_image.height or 5120  # Fallback to 5120 if height is None
        
        # Center coordinates
        x_center = (db_defect.x + db_defect.width / 2) / img_width
        y_center = (db_defect.y + db_defect.height / 2) / img_height
        
        # Width and height
        width_norm = db_defect.width / img_width
        height_norm = db_defect.height / img_height
        
        # Create the normalized defect object
        normalized_defect = defect.DefectNormalized(
            id=db_defect.id,
            image_id=db_defect.image_id,
            normalized={
                "x_center": x_center,
                "y_center": y_center,
                "width": width_norm,
                "height": height_norm
            },
            x=db_defect.x,
            y=db_defect.y,
            width=db_defect.width,
            height=db_defect.height,
            confidence=db_defect.confidence,
            type=db_defect.type,
            disposition=db_defect.disposition
        )
        
        normalized_defects.append(normalized_defect)
    
    return normalized_defects


@router.get("/{defect_id}", response_model=defect.Defect)
def read_defect(defect_id: int, db: Session = Depends(get_db)):
    """Get details for a specific defect."""
    db_defect = crud.get_defect(db, defect_id=defect_id)
    if db_defect is None:
        raise HTTPException(status_code=404, detail="Defect not found")
    return db_defect


@router.patch("/{defect_id}", response_model=defect.Defect)
def update_defect_disposition(
    defect_id: int, 
    defect_update: defect.DefectUpdate,
    db: Session = Depends(get_db)
):
    """Update the disposition for a specific defect."""
    db_defect = crud.get_defect(db, defect_id=defect_id)
    if db_defect is None:
        raise HTTPException(status_code=404, detail="Defect not found")
    
    # Save the disposition to the defect
    updated_defect = crud.update_defect_disposition(
        db, 
        defect_id=defect_id, 
        disposition=defect_update.disposition
    )
    
    # If there are notes, store them in the _metadata field (mapped to 'metadata' column)
    if defect_update.notes and updated_defect:
        if not updated_defect._metadata:
            updated_defect._metadata = {}
        
        updated_defect._metadata["disposition_notes"] = defect_update.notes
        db.commit()
        db.refresh(updated_defect)
    
    return updated_defect


@router.get("/statistics/summary", response_model=defect.DefectStatistics)
def get_defect_statistics(db: Session = Depends(get_db)):
    """Get summary statistics for defects."""
    # Count total defects
    total_defects = db.query(models.Defect).count()
    
    # Count defects by type
    defects_by_type = {}
    defect_types = db.query(models.Defect.type, models.Defect.id.label("count")).group_by(models.Defect.type).all()
    for defect_type in defect_types:
        if defect_type.type:
            count = db.query(models.Defect).filter(models.Defect.type == defect_type.type).count()
            defects_by_type[defect_type.type] = count
    
    # Count defects by disposition
    defects_by_disposition = {}
    defect_dispositions = db.query(models.Defect.disposition, models.Defect.id.label("count")).group_by(models.Defect.disposition).all()
    for disposition in defect_dispositions:
        if disposition.disposition:
            count = db.query(models.Defect).filter(models.Defect.disposition == disposition.disposition).count()
            defects_by_disposition[disposition.disposition] = count
    
    # Count defects by camera
    defects_by_camera = {}
    camera_defects = (
        db.query(
            models.Image.camera_id,
            models.Defect.id.label("count")
        )
        .join(models.Defect, models.Defect.image_id == models.Image.id)
        .group_by(models.Image.camera_id)
        .all()
    )
    for camera_defect in camera_defects:
        if camera_defect.camera_id:
            count = (
                db.query(models.Defect)
                .join(models.Image, models.Defect.image_id == models.Image.id)
                .filter(models.Image.camera_id == camera_defect.camera_id)
                .count()
            )
            defects_by_camera[camera_defect.camera_id] = count
    
    return defect.DefectStatistics(
        total_defects=total_defects,
        defects_by_type=defects_by_type,
        defects_by_disposition=defects_by_disposition,
        defects_by_camera=defects_by_camera
    )