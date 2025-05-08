from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Float, Text, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base
from sqlalchemy import UniqueConstraint


class Camera(Base):
    __tablename__ = "Cameras"

    serial_number = Column(String, primary_key=True)
    group_id = Column(Integer)
    sub_group = Column(Integer)
    ip = Column(String)
    
    # Relationships
    images = relationship("Image", back_populates="camera")
    regions = relationship("Region", back_populates="camera")


class Trigger(Base):
    __tablename__ = "Triggers"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True))
    label = Column(Integer)
    part_instance = Column(String)
    belt = Column(String)
    part = Column(String)
    
    # Relationships
    images = relationship("Image", back_populates="trigger")


class Image(Base):
    __tablename__ = "Images"

    id = Column(Integer, primary_key=True, index=True)
    trigger_id = Column(Integer, ForeignKey("Triggers.id"), name="trigger")
    width = Column(Integer)
    height = Column(Integer)
    camera_id = Column(String, ForeignKey("Cameras.serial_number"), name="camera")
    media_id = Column(String)
    image = Column(String)
    ether_checked = Column(Boolean)
    
    # Relationships
    camera = relationship("Camera", back_populates="images")
    trigger = relationship("Trigger", back_populates="images")
    defects = relationship("Defect", back_populates="image")


class Defect(Base):
    __tablename__ = "Defects"

    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("Images.id"), name="image")
    x = Column(Integer)
    y = Column(Integer)
    width = Column(Integer)
    height = Column(Integer)
    confidence = Column(Float)
    type = Column(String)
    hand = Column(String)
    uss_reviewed = Column(Boolean)
    system_generated = Column(Boolean)
    disposition = Column(String)
    dispositioned_at = Column(DateTime(timezone=True))
    supression_timestamp = Column(DateTime(timezone=True))
    mode = Column(String)
    iv_updated = Column(Boolean)
    _metadata = Column('metadata', JSONB)
    
    # Relationships
    image = relationship("Image", back_populates="defects")


class CurrentPart(Base):
    __tablename__ = "Current_Part"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True))
    belt = Column(String)
    part = Column(String)


class PartInformation(Base):
    __tablename__ = "Part_Information"

    id = Column(Integer, primary_key=True, index=True)
    model = Column(String)
    part_name = Column(String)
    part_number = Column(String)
    packout_amount = Column(Integer)
    length = Column(Float)
    job_num = Column(String)
    
    # Relationships
    regions = relationship("Region", back_populates="part")


class Outflow(Base):
    __tablename__ = "Outflow"

    id = Column(Integer, primary_key=True, index=True)
    job_num = Column(Integer)
    total_outflow = Column(Integer)
    job_start = Column(DateTime)
    job_end = Column(DateTime)
    created_at = Column(DateTime)


class HumanInspect(Base):
    __tablename__ = "HumanInspect"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(String)
    part_suffix = Column(String)
    serial_no = Column(String)
    julian_date = Column(String)
    cast_id_1 = Column(Integer)
    cast_id_2 = Column(Integer)
    cast_id_3 = Column(Integer)
    defect_area = Column(String)
    size = Column(String)
    impreg = Column(String)
    location_row = Column(Integer)
    location_column = Column(Integer)
    pass_fail = Column(String)
    scan_datetime = Column(DateTime)
    file_name = Column(String)
    created_at = Column(DateTime, default=datetime.now)


class SuppressedDefect(Base):
    __tablename__ = "Suppressed_Defects"

    id = Column(Integer, primary_key=True, index=True)
    defect = Column(Integer, ForeignKey("Defects.id"))
    suppressed_by = Column(Integer)
    similarity = Column(Float)


class ProcessedFile(Base):
    __tablename__ = "processed_files"

    filename = Column(String, primary_key=True)
    processed_at = Column(DateTime)


# New table for Region data
class Region(Base):
    __tablename__ = "Regions"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String, ForeignKey("Cameras.serial_number"))
    region_id = Column(String)  # User-defined identifier
    size_threshold = Column(Float, nullable=False)
    density_threshold = Column(Integer, nullable=False)
    proximity_threshold = Column(Float, nullable=False)
    polygon = Column(JSONB, nullable=False)
    part_number = Column(String, ForeignKey("Part_Information.job_num"))
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)
    active = Column(Boolean, default=True)
    description = Column(Text)
    
    # Relationships
    camera = relationship("Camera", back_populates="regions")
    part = relationship("PartInformation", foreign_keys=[part_number])
    
    __table_args__ = (
        # Unique constraint for camera_id and region_id combination
        UniqueConstraint('camera_id', 'region_id', name='regions_camera_region_unique'),
    )