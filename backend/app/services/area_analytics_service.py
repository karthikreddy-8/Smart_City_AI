"""
Area Analytics Service – aggregates real-time traffic detection across all cameras in a geographic area.
Calculates area-wide traffic level, road segment breakdowns, vehicle counts, average speed, and congestion.
"""
from typing import Dict, Any, List, Optional
from app.services.location_service import reverse_geocode
from app.services.camera_service import get_all_cameras, _haversine
from app.services.yolo_service import run_detection


def analyze_area_traffic(
    latitude: float,
    longitude: float,
    accuracy_meters: float = 15.0,
    radius_km: float = 50.0,
    db = None
) -> Dict[str, Any]:
    """
    Perform area-level traffic analysis around (latitude, longitude).
    Resolves area location via reverse geocoding, queries cameras in the area,
    runs YOLO detection across active feeds, and aggregates area metrics.
    """
    # 1. Reverse Geocode User Location
    geo = reverse_geocode(latitude, longitude)
    area_name = geo.get("area") if geo.get("area") != "Unknown" else "Local Traffic Area"
    city = geo.get("city") if geo.get("city") != "Unknown" else "City Region"
    state = geo.get("state") if geo.get("state") != "Unknown" else "State"
    country = geo.get("country", "India")

    # 2. Query Cameras in Area
    all_cams = get_all_cameras(latitude=latitude, longitude=longitude, db=db)
    
    # Filter cameras within search radius
    area_cams = [c for c in all_cams if c.get("distance_km", 0.0) <= radius_km]
    if not area_cams and all_cams:
        area_cams = all_cams[:5] # fallback to nearest available cameras if radius exceeded

    active_cams = [c for c in area_cams if c.get("status", "").upper() in ("ONLINE", "ACTIVE")]
    offline_cams = [c for c in area_cams if c.get("status", "").upper() not in ("ONLINE", "ACTIVE")]

    # If no online cameras available
    if not active_cams:
        return {
            "area_name": area_name,
            "city": city,
            "state": state,
            "country": country,
            "latitude": latitude,
            "longitude": longitude,
            "accuracy_meters": accuracy_meters,
            "overall_traffic_level": "UNKNOWN",
            "overall_traffic_icon": "⚪",
            "estimated_vehicles_in_area": 0,
            "traffic_density_pct": 0.0,
            "congestion_pct": 0.0,
            "average_speed_kmh": 0.0,
            "estimated_waiting_time_mins": 0.0,
            "active_cameras_count": 0,
            "offline_cameras_count": len(offline_cams),
            "traffic_by_road": [],
            "vehicle_breakdown": {
                "car": 0, "bus": 0, "truck": 0, "motorcycle": 0, "bicycle": 0,
                "auto_rickshaw": 0, "ambulance": 0, "fire_truck": 0, "police": 0,
                "emergency": 0, "total": 0,
            },
            "cameras_coverage": area_cams,
            "message": "Live traffic camera coverage is not available in your area.",
        }

    # 3. Analyze detections across active camera feeds
    road_items = []
    total_vehicles_sum = 0
    congestion_sum = 0.0
    speed_sum = 0.0
    valid_speed_count = 0

    breakdown = {
        "car": 0, "bus": 0, "truck": 0, "motorcycle": 0, "bicycle": 0,
        "auto_rickshaw": 0, "ambulance": 0, "fire_truck": 0, "police": 0,
        "emergency": 0, "total": 0,
    }

    for cam in active_cams:
        det = run_detection(cam, source_type="camera")
        v_counts = det.get("vehicle_counts", {})
        c_pct = det.get("congestion_percentage", 0.0)
        c_speed = det.get("average_speed_kmh", 0.0)
        r_status = det.get("road_status", "Free Flow")

        # Accumulate vehicle counts
        for k in breakdown.keys():
            breakdown[k] += v_counts.get(k, 0)

        total_vehicles_sum += v_counts.get("total", 0)
        congestion_sum += c_pct
        if c_speed > 0:
            speed_sum += c_speed
            valid_speed_count += 1

        # Classify road traffic level
        if c_pct < 25.0:
            lvl, icon = "LOW", "🟢"
        elif c_pct < 50.0:
            lvl, icon = "MODERATE", "🟡"
        elif c_pct < 75.0:
            lvl, icon = "HIGH", "🟠"
        else:
            lvl, icon = "VERY HIGH", "🔴"

        road_name = cam.get("road_name") or f"{cam.get('area')} Main Road"
        road_items.append({
            "road_name": road_name,
            "traffic_level": lvl,
            "level_icon": icon,
            "congestion_pct": round(c_pct, 1),
            "vehicle_count": v_counts.get("total", 0),
            "camera_status": "Online",
        })

    # Add offline roads if any
    for cam in offline_cams[:3]:
        road_name = cam.get("road_name") or f"{cam.get('area')} Road"
        road_items.append({
            "road_name": road_name,
            "traffic_level": "OFFLINE",
            "level_icon": "🔴",
            "congestion_pct": 0.0,
            "vehicle_count": 0,
            "camera_status": "Offline",
        })

    # 4. Compute Area-Wide Aggregates
    num_active = len(active_cams)
    avg_congestion = round(congestion_sum / num_active, 1) if num_active > 0 else 0.0
    avg_speed = round(speed_sum / valid_speed_count, 1) if valid_speed_count > 0 else 32.0

    # Overall Traffic Level Classification
    if avg_congestion < 25.0:
        overall_lvl, overall_icon = "LOW", "🟢"
        wait_mins = round(1.0 + (avg_congestion / 10), 1)
    elif avg_congestion < 50.0:
        overall_lvl, overall_icon = "MODERATE", "🟡"
        wait_mins = round(3.0 + (avg_congestion / 8), 1)
    elif avg_congestion < 75.0:
        overall_lvl, overall_icon = "HIGH", "🟠"
        wait_mins = round(7.0 + (avg_congestion / 6), 1)
    else:
        overall_lvl, overall_icon = "VERY HIGH", "🔴"
        wait_mins = round(14.0 + (avg_congestion / 4), 1)

    # Estimate Area Vehicles
    estimated_area_vehicles = total_vehicles_sum * 10 if total_vehicles_sum > 0 else 0

    return {
        "area_name": area_name,
        "city": city,
        "state": state,
        "country": country,
        "latitude": latitude,
        "longitude": longitude,
        "accuracy_meters": accuracy_meters,
        "overall_traffic_level": overall_lvl,
        "overall_traffic_icon": overall_icon,
        "estimated_vehicles_in_area": estimated_area_vehicles if estimated_area_vehicles > 0 else total_vehicles_sum,
        "traffic_density_pct": avg_congestion,
        "congestion_pct": avg_congestion,
        "average_speed_kmh": avg_speed,
        "estimated_waiting_time_mins": wait_mins,
        "active_cameras_count": num_active,
        "offline_cameras_count": len(offline_cams),
        "traffic_by_road": road_items,
        "vehicle_breakdown": breakdown,
        "cameras_coverage": area_cams,
    }
