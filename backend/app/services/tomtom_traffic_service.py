"""
Location-based real-time traffic service using TomTom Traffic Flow.

This service intentionally does NOT use the device camera and does NOT use the
historical CSV dataset for current traffic. GPS identifies the area; TomTom
provides live road-segment speed/travel-time conditions.

Vehicle values returned by this service are ESTIMATED TRAFFIC VOLUME per hour,
not an exact vehicle count. The Traffic Flow API provides speed, travel time,
confidence and road closure, not a raw vehicle counter.
"""
import math
import os
from typing import Any, Dict, List, Optional

import requests

TOMTOM_BASE = "https://api.tomtom.com/traffic/services/4/flowSegmentData"
API_KEY = os.getenv("TOMTOM_API_KEY", "").strip()


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _traffic_level(congestion_pct: float, closed: bool = False) -> str:
    if closed:
        return "BLOCKED"
    if congestion_pct >= 75:
        return "VERY HIGH"
    if congestion_pct >= 50:
        return "HIGH"
    if congestion_pct >= 25:
        return "MODERATE"
    return "LOW"


def _baseline_volume_per_hour(frc: str) -> int:
    # Approximate road-segment throughput used only to turn live flow conditions
    # into an estimated volume indicator. It is NOT an observed vehicle count.
    return {
        "FRC0": 2200,
        "FRC1": 1600,
        "FRC2": 1200,
        "FRC3": 800,
        "FRC4": 500,
        "FRC5": 300,
        "FRC6": 180,
    }.get(frc, 500)


def _estimate_volume_per_hour(current_speed: float, free_flow_speed: float, frc: str) -> int:
    if free_flow_speed <= 0:
        return 0
    ratio = max(0.0, min(1.0, current_speed / free_flow_speed))
    congestion = 1.0 - ratio
    # More congestion generally means a higher traffic load, but this is only
    # an estimate and must never be presented as an exact vehicle count.
    multiplier = min(1.35, max(0.15, 0.55 + congestion * 0.85))
    return int(round(_baseline_volume_per_hour(frc) * multiplier))


def fetch_flow_segment(latitude: float, longitude: float, timeout: float = 8.0) -> Dict[str, Any]:
    if not API_KEY:
        return {
            "ok": False,
            "error": "TOMTOM_API_KEY is not configured.",
            "latitude": latitude,
            "longitude": longitude,
        }

    params = {
        "key": API_KEY,
        "point": f"{latitude},{longitude}",
        "unit": "kmph",
        "thickness": 10,
    }

    try:
        response = requests.get(
            f"{TOMTOM_BASE}/absolute/12/json",
            params=params,
            headers={"Accept": "application/json"},
            timeout=timeout,
        )
        if response.status_code != 200:
            try:
                detail = response.json()
            except Exception:
                detail = response.text[:300]
            return {
                "ok": False,
                "error": f"TomTom traffic API returned HTTP {response.status_code}.",
                "detail": detail,
                "latitude": latitude,
                "longitude": longitude,
            }

        root = response.json().get("flowSegmentData", {})
        current_speed = float(root.get("currentSpeed", 0) or 0)
        free_flow_speed = float(root.get("freeFlowSpeed", 0) or 0)
        current_time = float(root.get("currentTravelTime", 0) or 0)
        free_time = float(root.get("freeFlowTravelTime", 0) or 0)
        confidence = float(root.get("confidence", 0) or 0)
        closed = bool(root.get("roadClosure", False))
        frc = str(root.get("frc", "FRC6"))
        congestion = (
            max(0.0, min(100.0, (1.0 - current_speed / free_flow_speed) * 100.0))
            if free_flow_speed > 0 else 0.0
        )

        coords = root.get("coordinates", {}).get("coordinate", [])
        segment_points = [
            [float(p["latitude"]), float(p["longitude"])]
            for p in coords
            if "latitude" in p and "longitude" in p
        ]

        return {
            "ok": True,
            "latitude": latitude,
            "longitude": longitude,
            "current_speed_kmh": round(current_speed, 1),
            "free_flow_speed_kmh": round(free_flow_speed, 1),
            "current_travel_time_s": round(current_time, 1),
            "free_flow_travel_time_s": round(free_time, 1),
            "confidence": round(confidence, 3),
            "road_closure": closed,
            "frc": frc,
            "congestion_pct": round(congestion, 1),
            "traffic_level": _traffic_level(congestion, closed),
            "estimated_vehicles_per_hour": _estimate_volume_per_hour(
                current_speed, free_flow_speed, frc
            ),
            "segment_points": segment_points,
        }
    except requests.RequestException as exc:
        return {
            "ok": False,
            "error": "Unable to reach the live traffic provider.",
            "detail": str(exc),
            "latitude": latitude,
            "longitude": longitude,
        }


def _sample_points(latitude: float, longitude: float, radius_km: float) -> List[List[float]]:
    # Center + four nearby points. This gives an area-level view without
    # pretending that a single road represents the entire area.
    radius_km = max(0.25, min(float(radius_km), 3.0))
    dlat = radius_km / 111.0
    dlng = radius_km / max(111.0 * math.cos(math.radians(latitude)), 1.0)
    return [
        [latitude, longitude],
        [latitude + dlat, longitude],
        [latitude - dlat, longitude],
        [latitude, longitude + dlng],
        [latitude, longitude - dlng],
    ]


def analyze_location(
    latitude: float,
    longitude: float,
    radius_km: float = 1.5,
    location: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    points = _sample_points(latitude, longitude, radius_km)
    raw_segments = [fetch_flow_segment(lat, lng) for lat, lng in points]

    # Deduplicate road segments by the nearest returned geometry point.
    unique = {}
    for item in raw_segments:
        if not item.get("ok"):
            continue
        pts = item.get("segment_points") or [[item["latitude"], item["longitude"]]]
        key_point = pts[len(pts) // 2]
        key = f"{round(key_point[0], 4)}:{round(key_point[1], 4)}"
        if key not in unique:
            unique[key] = item

    segments = list(unique.values())
    if not segments:
        errors = [s.get("error") for s in raw_segments if s.get("error")]
        return {
            "ok": False,
            "message": errors[0] if errors else "No live traffic flow is available for this location.",
            "latitude": latitude,
            "longitude": longitude,
        }

    avg_speed = round(sum(s["current_speed_kmh"] for s in segments) / len(segments), 1)
    avg_congestion = round(sum(s["congestion_pct"] for s in segments) / len(segments), 1)
    avg_confidence = round(sum(s["confidence"] for s in segments) / len(segments), 3)
    estimated_volume = sum(s["estimated_vehicles_per_hour"] for s in segments)
    closed_count = sum(1 for s in segments if s["road_closure"])
    level = _traffic_level(avg_congestion, closed_count == len(segments))

    if level == "LOW":
        wait = round(1 + avg_congestion / 20, 1)
    elif level == "MODERATE":
        wait = round(3 + avg_congestion / 12, 1)
    elif level == "HIGH":
        wait = round(7 + avg_congestion / 8, 1)
    else:
        wait = round(14 + avg_congestion / 6, 1)

    return {
        "ok": True,
        "data_source": "TomTom Traffic Flow",
        "vehicle_count_type": "estimated_vehicles_per_hour",
        "area_name": (location or {}).get("area") or "Current Area",
        "city": (location or {}).get("city") or "Current City",
        "state": (location or {}).get("state") or "Current State",
        "country": (location or {}).get("country") or "India",
        "road_name": (location or {}).get("road_name") or "Nearest Road",
        "latitude": latitude,
        "longitude": longitude,
        "accuracy_meters": (location or {}).get("accuracy_meters", 15),
        "overall_traffic_level": level,
        "overall_traffic_icon": {
            "LOW": "🟢", "MODERATE": "🟡", "HIGH": "🟠", "VERY HIGH": "🔴", "BLOCKED": "⛔"
        }.get(level, "⚪"),
        "estimated_vehicles_in_area": estimated_volume,
        "estimated_vehicles_per_hour": estimated_volume,
        "traffic_density_pct": avg_congestion,
        "congestion_pct": avg_congestion,
        "average_speed_kmh": avg_speed,
        "estimated_waiting_time_mins": wait,
        "active_cameras_count": 0,
        "offline_cameras_count": 0,
        "confidence_pct": round(avg_confidence * 100, 1),
        "road_closures": closed_count,
        "traffic_by_road": [
            {
                "road_name": f"Live road segment {i + 1}",
                "traffic_level": s["traffic_level"],
                "level_icon": {"LOW": "🟢", "MODERATE": "🟡", "HIGH": "🟠", "VERY HIGH": "🔴", "BLOCKED": "⛔"}.get(s["traffic_level"], "⚪"),
                "congestion_pct": s["congestion_pct"],
                "vehicle_count": s["estimated_vehicles_per_hour"],
                "camera_status": "Live Traffic Provider",
                "current_speed_kmh": s["current_speed_kmh"],
                "free_flow_speed_kmh": s["free_flow_speed_kmh"],
                "confidence_pct": round(s["confidence"] * 100, 1),
                "road_closure": s["road_closure"],
                "segment_points": s["segment_points"],
            }
            for i, s in enumerate(segments)
        ],
        "vehicle_breakdown": {
            "car": 0, "bus": 0, "truck": 0, "motorcycle": 0, "bicycle": 0,
            "auto_rickshaw": 0, "ambulance": 0, "fire_truck": 0, "police": 0,
            "emergency": 0, "total": estimated_volume,
        },
        "traffic_segments": [
            {
                "points": s["segment_points"],
                "traffic_level": s["traffic_level"],
                "congestion_pct": s["congestion_pct"],
                "current_speed_kmh": s["current_speed_kmh"],
                "confidence_pct": round(s["confidence"] * 100, 1),
                "road_closure": s["road_closure"],
            }
            for s in segments
        ],
        "cameras_coverage": [],
        "message": "Live traffic conditions loaded from location-based traffic flow data.",
    }


def geocode_area(area: Optional[str], city: Optional[str], state: Optional[str], country: Optional[str]) -> Optional[Dict[str, Any]]:
    parts = [p for p in [area, city, state, country] if p and p != "All"]
    if not parts:
        return None
    query = ", ".join(parts)
    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "json", "limit": 1, "addressdetails": 1},
            headers={"User-Agent": "SmartCityAI-LocationTraffic/1.0"},
            timeout=7,
        )
        if response.status_code != 200:
            return None
        rows = response.json()
        if not rows:
            return None
        row = rows[0]
        addr = row.get("address", {})
        return {
            "latitude": float(row["lat"]),
            "longitude": float(row["lon"]),
            "area": area if area and area != "All" else (
                addr.get("suburb") or addr.get("neighbourhood") or addr.get("quarter") or "Selected Area"
            ),
            "city": city if city and city != "All" else (
                addr.get("city") or addr.get("town") or addr.get("village") or "Selected City"
            ),
            "state": state if state and state != "All" else addr.get("state", "Selected State"),
            "country": country if country and country != "All" else addr.get("country", "India"),
            "road_name": addr.get("road") or "Nearest Road",
            "accuracy_meters": 1000.0,
        }
    except requests.RequestException:
        return None
