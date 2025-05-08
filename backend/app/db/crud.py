from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, func
from typing import List, Optional, Dict, Any
from datetime import datetime
from . import models


# Camera operations
def get_camera(db: Session, serial_number: str):
    return db.query(models.Camera).filter(models.Camera.serial_number == serial_number).first()


def get_cameras(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Camera).offset(skip).limit(limit).all()


def get_cameras_by_group(db: Session, group_id: int):
    return db.query(models.Camera).filter(models.Camera.group_id == group_id).all()


# Image operations
def get_image(db: Session, image_id: int):
    return db.query(models.Image).filter(models.Image.id == image_id).first()


def get_latest_images(db: Session, limit_per_camera: int = 1):
    # This query gets the latest image for each camera
    subquery = (
        db.query(
            models.Image.camera_id,
            func.max(models.Image.id).label("max_id")
        )
        .group_by(models.Image.camera_id)
        .subquery()
    )
    
    return (
        db.query(models.Image)
        .join(
            subquery,
            and_(
                models.Image.camera_id == subquery.c.camera_id,
                models.Image.id == subquery.c.max_id
            )
        )
        .all()
    )


def get_images_by_trigger(db: Session, trigger_id: int):
    return (
        db.query(models.Image)
        .filter(models.Image.trigger_id == trigger_id)
        .all()
    )


def get_camera_latest_image(db: Session, camera_id: str):
    return (
        db.query(models.Image)
        .filter(models.Image.camera_id == camera_id)
        .order_by(desc(models.Image.id))
        .first()
    )


# Defect operations
def get_defect(db: Session, defect_id: int):
    return db.query(models.Defect).filter(models.Defect.id == defect_id).first()


def get_defects_by_image(db: Session, image_id: int):
    return (
        db.query(models.Defect)
        .filter(models.Defect.image_id == image_id)
        .all()
    )


def update_defect_disposition(
    db: Session, defect_id: int, disposition: str
):
    defect = db.query(models.Defect).filter(models.Defect.id == defect_id).first()
    if defect:
        defect.disposition = disposition
        defect.dispositioned_at = datetime.now()
        db.commit()
        db.refresh(defect)
    return defect


# Region operations
def get_region(db: Session, region_id: int):
    return db.query(models.Region).filter(models.Region.id == region_id).first()


def get_regions_by_camera(db: Session, camera_id: str, active_only: bool = True):
    query = db.query(models.Region).filter(models.Region.camera_id == camera_id)
    
    if active_only:
        query = query.filter(models.Region.active == True)
        
    return query.all()


def get_region_by_name(db: Session, camera_id: str, region_id: str):
    return (
        db.query(models.Region)
        .filter(
            models.Region.camera_id == camera_id,
            models.Region.region_id == region_id
        )
        .first()
    )


def create_region(db: Session, region_data: Dict[str, Any]):
    new_region = models.Region(**region_data)
    db.add(new_region)
    db.commit()
    db.refresh(new_region)
    return new_region


def update_region(db: Session, region_id: int, region_data: Dict[str, Any]):
    region = db.query(models.Region).filter(models.Region.id == region_id).first()
    if region:
        for key, value in region_data.items():
            setattr(region, key, value)
        region.updated_at = datetime.now()
        db.commit()
        db.refresh(region)
    return region


def delete_region(db: Session, region_id: int):
    region = db.query(models.Region).filter(models.Region.id == region_id).first()
    if region:
        db.delete(region)
        db.commit()
        return True
    return False


# Trigger operations
def get_latest_trigger(db: Session):
    return db.query(models.Trigger).order_by(desc(models.Trigger.id)).first()


def get_trigger(db: Session, trigger_id: int):
    return db.query(models.Trigger).filter(models.Trigger.id == trigger_id).first()


# Part Information operations - Renamed original get_part_information for clarity
def get_part_information_by_part_number(db: Session, part_number: str):
    """Gets part information using the original part_number column (e.g., vehicle code)."""
    return (
        db.query(models.PartInformation)
        .filter(models.PartInformation.part_number == part_number)
        .first()
    )

# New function to get part information by job_num (part type identifier)
def get_part_information_by_job_num(db: Session, job_num: str):
    """Gets part information using the job_num column (e.g., '39MC')."""
    return (
        db.query(models.PartInformation)
        .filter(models.PartInformation.job_num == job_num)
        .first()
    )


def get_all_parts(db: Session):
    return db.query(models.PartInformation).all()


# Current Part operations
def get_current_part(db: Session):
    return db.query(models.CurrentPart).order_by(desc(models.CurrentPart.id)).first()