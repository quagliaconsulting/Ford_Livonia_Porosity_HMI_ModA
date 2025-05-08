from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ...db.database import get_db
from ...db import crud
from ...schemas import region

router = APIRouter()


@router.get("/camera/{camera_id}", response_model=List[region.Region])
def read_regions_by_camera(
    camera_id: str,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """Get all regions for a specific camera."""
    # Verify camera exists
    db_camera = crud.get_camera(db, serial_number=camera_id)
    if db_camera is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    regions = crud.get_regions_by_camera(db, camera_id=camera_id, active_only=active_only)
    return regions


@router.get("/{region_id}", response_model=region.Region)
def read_region(region_id: int, db: Session = Depends(get_db)):
    """Get details for a specific region."""
    db_region = crud.get_region(db, region_id=region_id)
    if db_region is None:
        raise HTTPException(status_code=404, detail="Region not found")
    return db_region


@router.post("/", response_model=region.Region)
def create_region(
    region_in: region.RegionCreate,
    db: Session = Depends(get_db)
):
    """Create a new inspection region."""
    # Verify camera exists
    db_camera = crud.get_camera(db, serial_number=region_in.camera_id)
    if db_camera is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    # Check if region_id already exists for this camera
    existing_region = crud.get_region_by_name(
        db, 
        camera_id=region_in.camera_id, 
        region_id=region_in.region_id
    )
    
    if existing_region:
        raise HTTPException(
            status_code=400,
            detail=f"Region with ID '{region_in.region_id}' already exists for camera {region_in.camera_id}"
        )
    
    # Check if part number (now representing job_num) exists if provided
    if region_in.part_number:
        db_part = crud.get_part_information_by_job_num(db, job_num=region_in.part_number)
        if db_part is None:
            raise HTTPException(status_code=404, detail=f"Part type (job_num) '{region_in.part_number}' not found in Part_Information")
    
    # Create the region
    region_data = region_in.dict()
    new_region = crud.create_region(db, region_data=region_data)
    return new_region


@router.put("/{region_id}", response_model=region.Region)
def update_region(
    region_id: int,
    region_update: region.RegionUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing region."""
    # Check if region exists
    db_region = crud.get_region(db, region_id=region_id)
    if db_region is None:
        raise HTTPException(status_code=404, detail="Region not found")
    
    # Check if part number (now representing job_num) exists if provided and changed
    if region_update.part_number and region_update.part_number != db_region.part_number:
        db_part = crud.get_part_information_by_job_num(db, job_num=region_update.part_number)
        if db_part is None:
            raise HTTPException(status_code=404, detail=f"Part type (job_num) '{region_update.part_number}' not found in Part_Information")
    
    # Update the region
    region_data = region_update.dict(exclude_unset=True)
    updated_region = crud.update_region(db, region_id=region_id, region_data=region_data)
    return updated_region


@router.delete("/{region_id}", response_model=bool)
def delete_region(
    region_id: int,
    db: Session = Depends(get_db)
):
    """Delete a region."""
    # Check if region exists
    db_region = crud.get_region(db, region_id=region_id)
    if db_region is None:
        raise HTTPException(status_code=404, detail="Region not found")
    
    # Delete the region
    result = crud.delete_region(db, region_id=region_id)
    return result