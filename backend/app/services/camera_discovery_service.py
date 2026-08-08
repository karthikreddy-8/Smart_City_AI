"""
Camera Discovery Service – handles spatial lookup, Haversine sorting, and nearest online camera resolution.
"""
from typing import Dict, Any, List, Optional
from app.services.camera_service import get_all_cameras, _haversine, estimate_travel_time


def resolve_nearest_camera(
    latitude: float,
    longitude: float,
    max_distance_km: float = 50.0,
    online_only: bool = True,
    db = None
) -> Dict[str, Any]:
    """
    Find the nearest camera to the user's GPS coordinates within max_distance_km.
    Returns structured result with found flag, camera details, distance_km, and travel estimate.
    """
    cameras = get_all_cameras(latitude=latitude, longitude=longitude, db=db)
    
    candidates = [c for c in cameras if (not online_only or c.get("status", "").upper() in ("ONLINE", "ACTIVE"))]

    if not candidates:
        return {
            "found": False,
            "camera": None,
            "distance_km": 0.0,
            "estimated_travel_mins": 0.0,
            "message": "No registered traffic cameras are available near your location.",
        }

    nearest = candidates[0]
    distance = nearest.get("distance_km", 0.0)

    if distance > max_distance_km:
        return {
            "found": False,
            "camera": None,
            "distance_km": distance,
            "estimated_travel_mins": estimate_travel_time(distance),
            "message": f"Nearest camera is {distance} km away, which exceeds the search radius of {max_distance_km} km.",
        }

    return {
        "found": True,
        "camera": nearest,
        "distance_km": distance,
        "estimated_travel_mins": estimate_travel_time(distance),
        "message": f"Successfully connected to nearest camera: {nearest.get('name')} ({distance} km away).",
    }
