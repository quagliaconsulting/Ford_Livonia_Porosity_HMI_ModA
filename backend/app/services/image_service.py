import os
import tempfile
import logging
from ftplib import FTP
import time
import hashlib
from pathlib import Path
from typing import Optional, Dict, Any, Tuple
import yaml
from sqlalchemy.orm import Session

# Load configuration
config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'config', 'config.yaml')
with open(config_path, 'r') as config_file:
    config = yaml.safe_load(config_file)

# Get image access config
IMAGE_ACCESS = config['image_access']
PROTOCOL = IMAGE_ACCESS['protocol']
FALLBACK_PATH = IMAGE_ACCESS['fallback_path']

# Configure cache
CACHE_DIR = os.path.join(tempfile.gettempdir(), 'ford_porosity_cache')
os.makedirs(CACHE_DIR, exist_ok=True)
CACHE_TTL = IMAGE_ACCESS.get('ftp', {}).get('cache_ttl_seconds', 3600)
CACHE_ENABLED = IMAGE_ACCESS.get('ftp', {}).get('cache_enabled', True)

# Configure logging
logger = logging.getLogger(__name__)


class ImageAccessError(Exception):
    """Exception raised for errors in image access."""
    pass


def get_ftp_connection() -> FTP:
    """
    Get an FTP connection based on configuration.
    Returns an FTP connection object.
    """
    try:
        if PROTOCOL != 'ftp':
            raise ImageAccessError(f"FTP connection requested but protocol is {PROTOCOL}")
        
        ftp_config = IMAGE_ACCESS.get('ftp', {})
        host = ftp_config.get('host')
        username = ftp_config.get('username')
        password = ftp_config.get('password')
        
        # Always use environment variable password if available
        password = os.environ.get('IMAGE_ACCESS_FTP_PASSWORD', password)
        
        if not host or not username or not password:
            raise ImageAccessError("Missing FTP configuration parameters")
        
        ftp = FTP(host)
        ftp.login(username, password)
        logger.debug(f"Connected to FTP server {host}")
        return ftp
    
    except Exception as e:
        logger.error(f"FTP connection error: {str(e)}")
        raise ImageAccessError(f"Failed to connect to FTP server: {str(e)}")


def generate_cache_key(image_path: str) -> str:
    """Generate a cache key from the image path."""
    return hashlib.md5(image_path.encode()).hexdigest()


def is_cache_valid(cache_path: str) -> bool:
    """Check if the cached image is still valid based on TTL."""
    if not os.path.exists(cache_path):
        return False
    
    if not CACHE_ENABLED:
        return False
    
    file_mtime = os.path.getmtime(cache_path)
    current_time = time.time()
    return (current_time - file_mtime) < CACHE_TTL


def get_cached_path(image_path: str) -> Optional[str]:
    """Get cached file path if it exists and is valid."""
    cache_key = generate_cache_key(image_path)
    cache_path = os.path.join(CACHE_DIR, cache_key)
    
    if is_cache_valid(cache_path):
        logger.debug(f"Using cached image for {image_path}")
        return cache_path
    
    return None


def fetch_ftp_image(image_path: str) -> str:
    """
    Fetch an image from FTP server and return the local path.
    Caches the image locally if caching is enabled.
    """
    # Check cache first
    cache_path = get_cached_path(image_path)
    if cache_path:
        return cache_path
    
    try:
        # Generate a cache path
        cache_key = generate_cache_key(image_path)
        local_path = os.path.join(CACHE_DIR, cache_key)
        
        # Connect to FTP
        ftp = get_ftp_connection()
        
        # Construct the remote path
        ftp_config = IMAGE_ACCESS.get('ftp', {})
        base_path = ftp_config.get('base_path', '')
        
        # Handle trailing/leading slashes
        if base_path and not base_path.endswith('/'):
            base_path += '/'
        
        if image_path.startswith('/'):
            image_path = image_path[1:]
        
        remote_path = f"{base_path}{image_path}"
        
        # Create parent directories if they don't exist
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        
        # Download the file
        with open(local_path, 'wb') as f:
            ftp.retrbinary(f'RETR {remote_path}', f.write)
        
        ftp.quit()
        logger.info(f"Downloaded image from FTP: {remote_path}")
        return local_path
    
    except Exception as e:
        logger.error(f"Error fetching image from FTP: {str(e)}")
        raise ImageAccessError(f"Failed to fetch image from FTP: {str(e)}")


def get_local_image_path(image_path: str) -> Optional[str]:
    """
    Get the local path for an image. Handles relative paths using fallback_path
    and absolute paths (including Windows drive letters).
    Returns None if the file doesn't exist.
    """
    if not image_path:
        logger.warning("Received empty image_path string.")
        return None
        
    # Clean up potential mixed slashes from DB string just in case
    # os.path functions generally handle mixed slashes, but explicit is safer
    cleaned_image_path = os.path.normpath(image_path)

    # Check if the path from the database is already absolute for the current OS
    if os.path.isabs(cleaned_image_path):
        file_path = cleaned_image_path
        # logger.debug(f"Using absolute path from database: {file_path}") # Optional debug
    else:
        # If relative, join with the fallback path from config
        if not FALLBACK_PATH:
             logger.error("Relative image path found in DB, but fallback_path is not configured.")
             return None
        file_path = os.path.join(FALLBACK_PATH, cleaned_image_path)
        # logger.debug(f"Using relative path from database joined with fallback: {file_path}") # Optional debug

    # Check if the final constructed file exists
    if os.path.isfile(file_path):
        # logger.debug(f"Confirmed image file exists: {file_path}") # Optional debug
        return file_path
    else:
        logger.warning(f"Image file not found at resolved path: {file_path}. Check path and permissions.")
        # Attempt using fallback_path directly if initial path was absolute but failed
        # This covers cases where DB has absolute path but it's wrong on current server
        if os.path.isabs(cleaned_image_path) and FALLBACK_PATH:
             alt_path = os.path.join(FALLBACK_PATH, os.path.basename(cleaned_image_path))
             logger.warning(f"Attempting alternative path using fallback base: {alt_path}")
             if os.path.isfile(alt_path):
                 return alt_path
             else:
                 logger.error(f"Alternative path also not found: {alt_path}")
                 
        return None


def get_image_file_path(image) -> Optional[str]:
    """
    Get the file path for an image from the database.
    Returns None if the file doesn't exist.
    """
    if not image.image:
        return None
    
    image_path = image.image
    
    # Handle protocol based on configuration
    if PROTOCOL == 'local':
        return get_local_image_path(image_path)
    elif PROTOCOL == 'ftp':
        try:
            return fetch_ftp_image(image_path)
        except ImageAccessError as e:
            logger.warning(f"FTP access failed, trying fallback: {str(e)}")
            return get_local_image_path(image_path)
    else:
        logger.error(f"Unsupported protocol: {PROTOCOL}")
        return get_local_image_path(image_path)  # Fallback to local


def get_image_url(image) -> Optional[str]:
    """
    Get the URL for an image that can be used by the frontend.
    """
    if not image or not image.id:
        return None
    
    # Return an API URL that the frontend can use to get the image
    return f"/api/images/{image.id}/file"


def normalize_defect_coordinates(defect, image_width, image_height) -> Dict[str, float]:
    """
    Normalize defect coordinates to the range 0-1 for frontend use.
    """
    # Calculate center coordinates
    x_center = (defect.x + defect.width / 2) / image_width
    y_center = (defect.y + defect.height / 2) / image_height
    
    # Calculate normalized width and height
    width_norm = defect.width / image_width
    height_norm = defect.height / image_height
    
    return {
        "x_center": x_center,
        "y_center": y_center,
        "width": width_norm,
        "height": height_norm
    }


def convert_defects_to_yolo_format(defects, image_width, image_height) -> str:
    """
    Convert defects to YOLO format text for frontend compatibility.
    """
    yolo_lines = []
    
    for defect in defects:
        # Calculate normalized center coordinates
        x_center = (defect.x + defect.width / 2) / image_width
        y_center = (defect.y + defect.height / 2) / image_height
        
        # Calculate normalized width and height
        width_norm = defect.width / image_width
        height_norm = defect.height / image_height
        
        # Use type as class or default to 0
        class_id = 0
        if defect.type and defect.type.isdigit():
            class_id = int(defect.type)
        
        # Format: class_id x_center y_center width height
        yolo_line = f"{class_id} {x_center} {y_center} {width_norm} {height_norm}"
        yolo_lines.append(yolo_line)
    
    return "\n".join(yolo_lines)