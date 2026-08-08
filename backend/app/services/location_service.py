"""
Location Service – GPS utilities, reverse geocoding, nearest-camera resolution,
and travel-time estimation.
"""
import math
import requests
from typing import Optional, Dict, Any
from app.services.camera_service import (
    get_all_cameras,
    get_nearest_camera,
    estimate_travel_time,
    _haversine,
)


def reverse_geocode(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Reverse geocode GPS coordinates using OpenStreetMap Nominatim API.
    Returns Country, State, City, District, Area, Road Name, Postal Code.
    """
    url = "https://nominatim.openstreetmap.org/reverse"
    headers = {"User-Agent": "SmartCityAI-UrbanTrafficAnalytics/1.0"}
    params = {
        "lat": latitude,
        "lon": longitude,
        "format": "json",
        "addressdetails": 1,
    }

    try:
        resp = requests.get(url, headers=headers, params=params, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            addr = data.get("address", {})

            road = addr.get("road") or addr.get("pedestrian") or addr.get("street") or addr.get("footway") or "Unknown Road"
            area = (
                addr.get("suburb")
                or addr.get("neighbourhood")
                or addr.get("residential")
                or addr.get("quarter")
                or addr.get("subdistrict")
                or addr.get("city_district")
                or "Unknown Area"
            )
            city = (
                addr.get("city")
                or addr.get("town")
                or addr.get("village")
                or addr.get("municipality")
                or addr.get("county")
                or "Unknown City"
            )
            district = addr.get("state_district") or addr.get("county") or addr.get("district") or city
            state = addr.get("state") or "Unknown State"
            country = addr.get("country") or "Unknown Country"
            postcode = addr.get("postcode") or "Unknown Postal Code"

            return {
                "country": country,
                "state": state,
                "city": city,
                "district": district,
                "area": area,
                "road_name": road,
                "postal_code": postcode,
                "latitude": round(latitude, 5),
                "longitude": round(longitude, 5),
            }
    except Exception as e:
        print(f"[WARN] Reverse geocode request failed: {e}")

    return {
        "country": "Unknown",
        "state": "Unknown",
        "city": "Unknown",
        "district": "Unknown",
        "area": "GPS Location Area",
        "road_name": "GPS Location Road",
        "postal_code": "Unknown",
        "latitude": round(latitude, 5),
        "longitude": round(longitude, 5),
    }


def resolve_nearest(latitude: float, longitude: float, max_distance_km: float = 50.0) -> Dict[str, Any]:
    """
    Given user GPS position, return nearest camera IF within max_distance_km radius.
    If no camera exists within max_distance_km, returns empty dict / no nearby camera.
    """
    cam = get_nearest_camera(latitude, longitude, online_only=True)
    if cam is None:
        cam = get_nearest_camera(latitude, longitude, online_only=False)

    if cam is None:
        return {"found": False, "message": "No nearby traffic cameras found."}

    dist = cam.get("distance_km", 0.0)
    if dist > max_distance_km:
        return {
            "found": False,
            "message": f"No traffic cameras found within {max_distance_km} km of your location.",
            "nearest_available_distance_km": dist,
        }

    travel_mins = estimate_travel_time(dist)
    return {
        "found": True,
        "camera": cam,
        "distance_km": dist,
        "estimated_travel_mins": travel_mins,
        "message": (
            f"Nearest Camera: {cam['id']} – {cam['name']} ({cam['road_name']}). "
            f"Distance: {dist} km, ~{travel_mins} min drive."
        ),
    }
