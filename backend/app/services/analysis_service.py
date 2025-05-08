import math
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from ..db import models, crud


def calculate_distance(defect1, defect2, pixel_density) -> float:
    """
    Calculate the distance between two defects in millimeters.
    
    pixel_density: pixels per millimeter
    """
    # Get center coordinates
    x1 = defect1.x + defect1.width / 2
    y1 = defect1.y + defect1.height / 2
    x2 = defect2.x + defect2.width / 2
    y2 = defect2.y + defect2.height / 2
    
    # Calculate Euclidean distance in pixels
    distance_pixels = math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
    
    # Convert to millimeters
    distance_mm = distance_pixels / pixel_density
    
    return distance_mm


def analyze_defects_with_region(
    defects: List[models.Defect], 
    region: models.Region, 
    pixel_density: float = 95 / 7.9375  # Default from frontend
) -> List[Dict[str, Any]]:
    """
    Analyze defects against a region's failure criteria.
    
    Returns a list of defects with added analysis data.
    """
    # Initialize result with basic analysis
    analyzed_defects = []
    
    for defect in defects:
        # Calculate size in millimeters
        width_mm = defect.width / pixel_density
        height_mm = defect.height / pixel_density
        
        # Check if defect size exceeds threshold
        max_dimension_mm = max(width_mm, height_mm)
        is_size_fail = max_dimension_mm >= region.size_threshold
        
        # Initialize analyzed defect
        analyzed_defect = {
            "id": defect.id,
            "x": defect.x,
            "y": defect.y,
            "width": defect.width,
            "height": defect.height,
            "width_mm": width_mm,
            "height_mm": height_mm,
            "area_mm": width_mm * height_mm,
            "is_true_fail": is_size_fail,
            "fail_reason": "Size" if is_size_fail else None,
            "cluster_members": []
        }
        
        analyzed_defects.append(analyzed_defect)
    
    # Check for density/proximity fails
    for i, defect in enumerate(analyzed_defects):
        if defect["is_true_fail"]:
            continue
        
        # Find nearby defects
        nearby_indices = []
        for j, other_defect in enumerate(analyzed_defects):
            if i == j:
                continue
                
            # Get center coordinates
            x1 = defects[i].x + defects[i].width / 2
            y1 = defects[i].y + defects[i].height / 2
            x2 = defects[j].x + defects[j].width / 2
            y2 = defects[j].y + defects[j].height / 2
            
            # Calculate distance in pixels
            distance_pixels = math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
            
            # Convert to millimeters
            distance_mm = distance_pixels / pixel_density
            
            if distance_mm <= region.proximity_threshold:
                nearby_indices.append(j)
        
        # Check if we have enough nearby defects for a density failure
        if len(nearby_indices) + 1 >= region.density_threshold:
            # Mark this defect as a fail
            analyzed_defects[i]["is_true_fail"] = True
            analyzed_defects[i]["fail_reason"] = "Density"
            analyzed_defects[i]["cluster_members"] = nearby_indices
            
            # Mark all nearby defects as fails
            for idx in nearby_indices:
                analyzed_defects[idx]["is_true_fail"] = True
                analyzed_defects[idx]["fail_reason"] = "Density"
                if i not in analyzed_defects[idx]["cluster_members"]:
                    analyzed_defects[idx]["cluster_members"].append(i)
    
    return analyzed_defects


def is_point_in_polygon(point, polygon) -> bool:
    """
    Check if a point is inside a polygon using the ray casting algorithm.
    
    point: (x, y) tuple
    polygon: List of (x, y) tuples representing polygon vertices
    """
    x, y = point
    n = len(polygon)
    inside = False
    
    p1x, p1y = polygon[0]
    for i in range(1, n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    
    return inside


def filter_defects_by_region(
    defects: List[models.Defect], 
    region: models.Region
) -> List[models.Defect]:
    """
    Filter defects to only include those inside the region's polygon.
    """
    # Extract polygon points from region
    polygon = [(point["x"], point["y"]) for point in region.polygon]
    
    # If polygon is empty, return all defects
    if not polygon:
        return defects
    
    # Filter defects by checking if their center is in the polygon
    filtered_defects = []
    for defect in defects:
        # Calculate center point
        center_x = defect.x + defect.width / 2
        center_y = defect.y + defect.height / 2
        
        # Check if center is in polygon
        if is_point_in_polygon((center_x, center_y), polygon):
            filtered_defects.append(defect)
    
    return filtered_defects


def analyze_image_defects_with_regions(
    db: Session,
    image_id: int,
    pixel_density: float = 95 / 7.9375
) -> Dict[str, Any]:
    """
    Perform a complete analysis of an image's defects using all regions.
    
    Returns a comprehensive analysis result.
    """
    # Get the image
    image = crud.get_image(db, image_id=image_id)
    if not image:
        return {"error": "Image not found"}
    
    # Get all defects for the image
    defects = crud.get_defects_by_image(db, image_id=image_id)
    
    # Get all regions for the camera
    regions = crud.get_regions_by_camera(db, camera_id=image.camera_id)
    
    # Initialize results
    results = {
        "image_id": image_id,
        "camera_id": image.camera_id,
        "defect_count": len(defects),
        "regions": [],
        "overall_analysis": {
            "has_failures": False,
            "total_defects": len(defects),
            "total_fails": 0,
            "fail_regions": []
        }
    }
    
    # Analyze each region
    for region in regions:
        # Filter defects to those in this region
        region_defects = filter_defects_by_region(defects, region)
        
        # Analyze the defects
        analyzed_defects = analyze_defects_with_region(
            region_defects, 
            region, 
            pixel_density
        )
        
        # Count failures
        failure_count = sum(1 for d in analyzed_defects if d["is_true_fail"])
        has_failures = failure_count > 0
        
        # Add to results
        region_result = {
            "region_id": region.id,
            "region_name": region.region_id,
            "defect_count": len(region_defects),
            "failure_count": failure_count,
            "has_failures": has_failures,
            "analyzed_defects": analyzed_defects
        }
        
        results["regions"].append(region_result)
        
        # Update overall analysis
        if has_failures:
            results["overall_analysis"]["has_failures"] = True
            results["overall_analysis"]["total_fails"] += failure_count
            results["overall_analysis"]["fail_regions"].append(region.region_id)
    
    return results