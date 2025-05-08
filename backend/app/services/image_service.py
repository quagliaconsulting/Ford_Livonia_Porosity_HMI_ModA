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
import re # Import regex module
import posixpath # Import posixpath for FTP paths

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
        
        # Ensure base_path uses forward slashes and is clean
        cleaned_base_path = base_path.replace('\\\\', '/').strip('/')
        
        # Ensure image_path uses forward slashes and is clean (relative)
        cleaned_image_path = image_path.replace('\\\\', '/').strip('/')
        
        # Join using posixpath for guaranteed forward slashes
        remote_path = posixpath.join(cleaned_base_path, cleaned_image_path)
        
        logger.debug(f"Attempting to retrieve FTP file from remote path: {remote_path}")

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
    Get the local path for an image when running in 'local' protocol mode.
    Handles potentially incorrect absolute paths (e.g., Windows paths from DB when running on Linux)
    by prioritizing joining the relative part with FALLBACK_PATH.
    Returns None if the file cannot be found.
    """
    if not image_path:
        logger.warning("Received empty image_path string.")
        return None

    if not FALLBACK_PATH:
         logger.error("Local protocol selected, but image_access.fallback_path is not configured in config.yaml.")
         return None

    # Normalize slashes first for consistency from DB
    normalized_db_path = image_path.replace('\\\\', '/')

    # --- Strategy 1: Try to construct path using FALLBACK_PATH and relative part from DB ---
    # This regex tries to find a common root like 'images/' or a drive letter followed by 'images/'
    # and captures the path part *after* it.
    # Example DB paths:
    #   "images/2023/01/01/img.jpg" -> "2023/01/01/img.jpg"
    #   "E:/images/2023/01/01/img.jpg" -> "2023/01/01/img.jpg"
    #   "\\\\SERVER\\share\\images\\2023\\01\\01\\img.jpg" -> "2023/01/01/img.jpg"
    #   "05-08-2025/14/1/05-08-2025_14-24-10-609029_1-3_DM08617AAK00003_39MC_7ce65bfe6ca44c5197be746b01a3ecad_1_38A25126390768RFML3P 7006 MC.jpg"
    #      -> will be treated as relative if it doesn't match the explicit patterns below.

    relative_part_from_db = normalized_db_path # Default to using the whole path as relative

    # Try to strip known prefixes if they exist to get a cleaner relative path
    # Common prefixes to strip. Order might matter if paths are very unusual.
    # This specifically targets 'images' as a potential root folder name within the path.
    # If your DB paths are *always* relative from some point, you might not need this complex regex.
    # The goal is to isolate the part of the path that is truly relative to your FALLBACK_PATH or FTP base_path.

    # Attempt to find 'images/' (case-insensitive) and take everything after it
    match = re.search(r"(?:[a-zA-Z]:(?:/|\\\\))?.*?images(?:/|\\\\)(.*)", normalized_db_path, re.IGNORECASE)
    if match and match.group(1):
        relative_part_from_db = match.group(1)
    else:
        # If 'images/' is not found, and the path looks absolute (e.g. starts with / or drive letter),
        # it's unlikely to be simply joinable with FALLBACK_PATH unless FALLBACK_PATH is '/'.
        # For now, we'll still try joining it, but this might indicate a config mismatch.
        # If it's already relative (no leading / or drive letter), use it as is.
        if normalized_db_path.startswith('/') or re.match(r"^[a-zA-Z]:", normalized_db_path):
            # This is an absolute-looking path that didn't match the 'images/' pattern.
            # It's less likely to be correctly joinable with FALLBACK_PATH.
            # We will try, but also log a warning if it fails.
            pass # Keep relative_part_from_db as is.
    
    # Clean the extracted relative part
    cleaned_relative_part = relative_part_from_db.strip('/')


    potential_path_fallback_join = None
    if FALLBACK_PATH and cleaned_relative_part: # Ensure both are non-empty
        # os.path.join is usually robust, but normpath helps clean up ".." or "//"
        potential_path_fallback_join = os.path.normpath(os.path.join(FALLBACK_PATH, cleaned_relative_part))
        logger.debug(f"Attempting path via fallback + relative: {potential_path_fallback_join}")
        if os.path.isfile(potential_path_fallback_join):
            return potential_path_fallback_join
        else:
            logger.warning(f"Path via fallback+relative not found: {potential_path_fallback_join}")
            # Keep potential_path_fallback_join value for logging if all strategies fail


    # --- Strategy 2: Check if the normalized_db_path is an absolute path *on this OS* and exists ---
    # This covers cases where DB stores correct absolute paths for the *current* server OS
    # or if FALLBACK_PATH itself was the correct absolute path and joining was not needed.
    absolute_db_path_check = os.path.normpath(normalized_db_path) 
    if os.path.isabs(absolute_db_path_check):
        logger.debug(f"DB path '{absolute_db_path_check}' is absolute for this OS. Checking if it exists.")
        if os.path.isfile(absolute_db_path_check):
            logger.info(f"Using absolute path directly from DB (or it was already resolved): {absolute_db_path_check}")
            return absolute_db_path_check
        else:
            logger.warning(f"Absolute path from DB not found: {absolute_db_path_check}")
    
    # --- Final Logging if file not found by any strategy ---
    if potential_path_fallback_join and not os.path.isfile(potential_path_fallback_join):
         logger.error(f"File not found. Last fallback-join attempt was {potential_path_fallback_join}. Check FALLBACK_PATH ('{FALLBACK_PATH}') and DB image path ('{image_path}'). Ensure the relative part ('{cleaned_relative_part}') correctly maps.")
    elif os.path.isabs(absolute_db_path_check) and not os.path.isfile(absolute_db_path_check):
         logger.error(f"File not found. Absolute path from DB '{absolute_db_path_check}' does not exist on this server.")
    elif not os.path.isabs(normalized_db_path) and not potential_path_fallback_join : # Should not happen if FALLBACK_PATH is set
         logger.error(f"Could not resolve image path: '{image_path}'. It was not absolute and could not be combined with FALLBACK_PATH ('{FALLBACK_PATH}').")
    else: # Generic message if other conditions didn't pinpoint the issue
        logger.error(f"Could not resolve image path: '{image_path}' using current strategies. FALLBACK_PATH='{FALLBACK_PATH}', DB_PATH_NORMALIZED='{normalized_db_path}'")

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