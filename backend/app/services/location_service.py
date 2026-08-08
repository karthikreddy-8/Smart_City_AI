"""
Location Service – GPS utilities, reverse geocoding, nearest-camera resolution,
and travel-time estimation.
"""
import math
import requests
import os
from typing import Optional, Dict, Any
from app.services.camera_service import (
    get_all_cameras,
    get_nearest_camera,
    estimate_travel_time,
    _haversine,
)


def _tomtom_reverse_geocode(latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
    """Use TomTom Orbis v2 first for consistent mobile GPS address resolution."""
    key = os.getenv("TOMTOM_API_KEY", "").strip()
    if not key:
        return None
    try:
        response = requests.get(
            "https://api.tomtom.com/maps/orbis/places/reverseGeocode",
            params={
                "position": f"{longitude},{latitude}",
                "radiusInMeters": 1000,
                "geopoliticalView": "IN",
            },
            headers={
                "TomTom-Api-Version": "2",
                "TomTom-Api-Key": key,
                "Accept": "application/json",
                "Attributes": "results(*,address(*))",
            },
            timeout=7,
        )
        if response.status_code != 200:
            print(f"[WARN] TomTom reverse geocode HTTP {response.status_code}")
            return None
        rows = response.json().get("results") or []
        if not rows:
            return None
        addr = rows[0].get("address") or {}
        return {
            "country": addr.get("country") or "Unknown Country",
            "state": addr.get("countrySubdivision") or "Unknown State",
            "city": addr.get("municipality") or "Unknown City",
            "district": addr.get("countrySecondarySubdivision") or addr.get("countryTertiarySubdivision") or addr.get("municipality") or "Unknown District",
            "area": addr.get("neighborhood") or addr.get("municipalitySubdivision") or addr.get("municipalitySecondarySubdivision") or addr.get("countryTertiarySubdivision") or addr.get("municipality") or "Unknown Area",
            "road_name": addr.get("street") or "Unknown Road",
            "postal_code": addr.get("postalCode") or "Unknown Postal Code",
            "latitude": round(latitude, 5),
            "longitude": round(longitude, 5),
        }
    except requests.RequestException as exc:
        print(f"[WARN] TomTom reverse geocode failed: {exc}")
        return None


def reverse_geocode(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Reverse geocode GPS coordinates using OpenStreetMap Nominatim API.
    Returns Country, State, City, District, Area, Road Name, Postal Code.
    """
    # Prefer TomTom when the project has a valid key; fall back to Nominatim
    # so GPS still works if the traffic provider is temporarily unavailable.
    tomtom_result = _tomtom_reverse_geocode(latitude, longitude)
    if tomtom_result:
        return tomtom_result

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
