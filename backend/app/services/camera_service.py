"""
Camera Service – manages the traffic camera registry.
Provides lookup, nearest-camera search, location hierarchy, and status helpers.
"""
import math
import time
from typing import List, Optional, Dict, Any

# ──────────────────────────────────────────────────────────────────────────────
# Full Multi-State, Multi-City Camera Registry
# ──────────────────────────────────────────────────────────────────────────────

CAMERA_REGISTRY: List[Dict[str, Any]] = [
    # ── Telangana – Hyderabad ──
    {
        "id": "CAM001",
        "camera_id": "CAM001",
        "name": "Madhapur Junction Camera",
        "camera_name": "Madhapur Junction Camera",
        "road_name": "Madhapur Main Road",
        "area": "Madhapur",
        "city": "Hyderabad",
        "district": "Rangareddy",
        "state": "Telangana",
        "country": "India",
        "latitude": 17.4486,
        "longitude": 78.3908,
        "camera_type": "RTSP",
        "stream_url": "rtsp://live.smartcity.ai/cam001",
        "status": "ONLINE",
        "camera_url": "https://www.youtube.com/watch?v=F5dEF7nSgis",
        "fps": 25,
        "ward": "Ward 17",
        "zone": "West Zone",
        "nearest_landmark": "Madhapur Metro Station",
        "last_updated": "2026-08-08 12:00:00",
        "distance_km": 0.0,
    },
    {
        "id": "CAM002",
        "camera_id": "CAM002",
        "name": "Hitech City Flyover Camera",
        "camera_name": "Hitech City Flyover Camera",
        "road_name": "HITEC City Main Road",
        "area": "HITEC City",
        "city": "Hyderabad",
        "district": "Rangareddy",
        "state": "Telangana",
        "country": "India",
        "latitude": 17.4435,
        "longitude": 78.3772,
        "camera_type": "HTTP",
        "stream_url": "http://live.smartcity.ai/cam002/mjpeg",
        "status": "ONLINE",
        "camera_url": "https://www.youtube.com/watch?v=pU4_bfBpEnc",
        "fps": 30,
        "ward": "Ward 15",
        "zone": "West Zone",
        "nearest_landmark": "HITEC City Flyover",
        "last_updated": "2026-08-08 12:00:00",
        "distance_km": 0.0,
    },
    {
        "id": "CAM003",
        "camera_id": "CAM003",
        "name": "Gachibowli Signal Camera",
        "camera_name": "Gachibowli Signal Camera",
        "road_name": "Gachibowli-Miyapur Road",
        "area": "Gachibowli",
        "city": "Hyderabad",
        "district": "Rangareddy",
        "state": "Telangana",
        "country": "India",
        "latitude": 17.4401,
        "longitude": 78.3489,
        "camera_type": "MJPEG",
        "stream_url": "http://live.smartcity.ai/cam003/stream.mjpg",
        "status": "ONLINE",
        "camera_url": "https://www.youtube.com/watch?v=Ugkx6lCFjZA",
        "fps": 25,
        "ward": "Ward 12",
        "zone": "West Zone",
        "nearest_landmark": "DLF Cyber City",
        "last_updated": "2026-08-08 12:00:00",
        "distance_km": 0.0,
    },
    {
        "id": "CAM004",
        "camera_id": "CAM004",
        "name": "Airport Road Camera",
        "camera_name": "Airport Road Camera",
        "road_name": "Rajiv Gandhi International Airport Road",
        "area": "Shamshabad",
        "city": "Hyderabad",
        "district": "Rangareddy",
        "state": "Telangana",
        "country": "India",
        "latitude": 17.2403,
        "longitude": 78.4294,
        "camera_type": "IP Camera",
        "stream_url": "http://192.168.1.104/live",
        "status": "ONLINE",
        "camera_url": "https://www.youtube.com/watch?v=F5dEF7nSgis",
        "fps": 30,
        "ward": "Ward 3",
        "zone": "South Zone",
        "nearest_landmark": "RGIA Terminal 1",
        "last_updated": "2026-08-08 12:00:00",
        "distance_km": 0.0,
    },
    {
        "id": "CAM005",
        "camera_id": "CAM005",
        "name": "Banjara Hills Junction Camera",
        "camera_name": "Banjara Hills Junction Camera",
        "road_name": "Road No. 12, Banjara Hills",
        "area": "Banjara Hills",
        "city": "Hyderabad",
        "district": "Hyderabad",
        "state": "Telangana",
        "country": "India",
        "latitude": 17.4156,
        "longitude": 78.4347,
        "camera_type": "RTSP",
        "stream_url": "rtsp://live.smartcity.ai/cam005",
        "status": "ONLINE",
        "camera_url": "https://www.youtube.com/watch?v=pU4_bfBpEnc",
        "fps": 25,
        "ward": "Ward 10",
        "zone": "Central Zone",
        "nearest_landmark": "GVK One Mall",
        "last_updated": "2026-08-08 12:00:00",
        "distance_km": 0.0,
    },
    {
        "id": "CAM006",
        "camera_id": "CAM006",
        "name": "LB Nagar Crossroads Camera",
        "camera_name": "LB Nagar Crossroads Camera",
        "road_name": "Hyderabad–Vijayawada Highway",
        "area": "LB Nagar",
        "city": "Hyderabad",
        "district": "Rangareddy",
        "state": "Telangana",
        "country": "India",
        "latitude": 17.3476,
        "longitude": 78.5497,
        "camera_type": "RTSP",
        "stream_url": "",
        "status": "OFFLINE",
        "camera_url": "",
        "fps": 0,
        "ward": "Ward 9",
        "zone": "East Zone",
        "nearest_landmark": "LB Nagar Metro Station",
        "last_updated": "2026-08-08 08:30:00",
        "distance_km": 0.0,
    },
    {
        "id": "CAM007",
        "camera_id": "CAM007",
        "name": "Secunderabad Railway Camera",
        "camera_name": "Secunderabad Railway Camera",
        "road_name": "Sardar Patel Road",
        "area": "Secunderabad",
        "city": "Hyderabad",
        "district": "Medchal",
        "state": "Telangana",
        "country": "India",
        "latitude": 17.4399,
        "longitude": 78.4983,
        "camera_type": "RTSP",
        "stream_url": "rtsp://live.smartcity.ai/cam007",
        "status": "ONLINE",
        "camera_url": "https://www.youtube.com/watch?v=Ugkx6lCFjZA",
        "fps": 30,
        "ward": "Ward 21",
        "zone": "North Zone",
        "nearest_landmark": "Secunderabad Railway Station",
        "last_updated": "2026-08-08 12:00:00",
        "distance_km": 0.0,
    },
    {
        "id": "CAM008",
        "camera_id": "CAM008",
        "name": "Kukatpally Y Junction Camera",
        "camera_name": "Kukatpally Y Junction Camera",
        "road_name": "JNTU Road, Kukatpally",
        "area": "Kukatpally",
        "city": "Hyderabad",
        "district": "Medchal",
        "state": "Telangana",
        "country": "India",
        "latitude": 17.4947,
        "longitude": 78.3996,
        "camera_type": "HTTP",
        "stream_url": "http://live.smartcity.ai/cam008/hls",
        "status": "ONLINE",
        "camera_url": "https://www.youtube.com/watch?v=F5dEF7nSgis",
        "fps": 25,
        "ward": "Ward 19",
        "zone": "North Zone",
        "nearest_landmark": "KPHB Metro Station",
        "last_updated": "2026-08-08 12:00:00",
        "distance_km": 0.0,
    },

    # ── Tamil Nadu – Chennai ──
    {
        "id": "CAM009",
        "camera_id": "CAM009",
        "name": "Anna Nagar Roundtana Camera",
        "camera_name": "Anna Nagar Roundtana Camera",
        "road_name": "Anna Nagar Main Road",
        "area": "Anna Nagar",
        "city": "Chennai",
        "district": "Chennai",
        "state": "Tamil Nadu",
        "country": "India",
        "latitude": 13.0850,
        "longitude": 80.2101,
        "camera_type": "RTSP",
        "stream_url": "rtsp://live.smartcity.ai/cam009",
        "status": "ONLINE",
        "camera_url": "https://www.youtube.com/watch?v=F5dEF7nSgis",
        "fps": 25,
        "ward": "Ward 102",
        "zone": "Anna Nagar Zone",
        "nearest_landmark": "Anna Nagar Tower Park",
        "last_updated": "2026-08-08 12:00:00",
        "distance_km": 0.0,
    },
    {
        "id": "CAM010",
        "camera_id": "CAM010",
        "name": "Anna Nagar 2nd Avenue Camera",
        "camera_name": "Anna Nagar 2nd Avenue Camera",
        "road_name": "2nd Avenue",
        "area": "Anna Nagar",
        "city": "Chennai",
        "district": "Chennai",
        "state": "Tamil Nadu",
        "country": "India",
        "latitude": 13.0885,
        "longitude": 80.2145,
        "camera_type": "RTSP",
        "stream_url": "rtsp://live.smartcity.ai/cam010",
        "status": "ONLINE",
        "camera_url": "https://www.youtube.com/watch?v=pU4_bfBpEnc",
        "fps": 30,
        "ward": "Ward 102",
        "zone": "Anna Nagar Zone",
        "nearest_landmark": "Blue Star Bus Stop",
        "last_updated": "2026-08-08 12:00:00",
        "distance_km": 0.0,
    },
    {
        "id": "CAM011",
        "camera_id": "CAM011",
        "name": "T Nagar Panagal Park Camera",
        "camera_name": "T Nagar Panagal Park Camera",
        "road_name": "Usman Road",
        "area": "T Nagar",
        "city": "Chennai",
        "district": "Chennai",
        "state": "Tamil Nadu",
        "country": "India",
        "latitude": 13.0405,
        "longitude": 80.2337,
        "camera_type": "HTTP",
        "stream_url": "http://live.smartcity.ai/cam011",
        "status": "ONLINE",
        "camera_url": "https://www.youtube.com/watch?v=Ugkx6lCFjZA",
        "fps": 25,
        "ward": "Ward 134",
        "zone": "Kodambakkam Zone",
        "nearest_landmark": "Panagal Park",
        "last_updated": "2026-08-08 12:00:00",
        "distance_km": 0.0,
    },
    {
        "id": "CAM012",
        "camera_id": "CAM012",
        "name": "Adyar Signal Camera",
        "camera_name": "Adyar Signal Camera",
        "road_name": "Sardar Patel Road, Adyar",
        "area": "Adyar",
        "city": "Chennai",
        "district": "Chennai",
        "state": "Tamil Nadu",
        "country": "India",
        "latitude": 13.0067,
        "longitude": 80.2570,
        "camera_type": "RTSP",
        "stream_url": "rtsp://live.smartcity.ai/cam012",
        "status": "ONLINE",
        "camera_url": "https://www.youtube.com/watch?v=F5dEF7nSgis",
        "fps": 30,
        "ward": "Ward 175",
        "zone": "Adyar Zone",
        "nearest_landmark": "Adyar Depot",
        "last_updated": "2026-08-08 12:00:00",
        "distance_km": 0.0,
    },

    # ── Karnataka – Bengaluru ──
    {
        "id": "CAM013",
        "camera_id": "CAM013",
        "name": "Whitefield ITPL Camera",
        "camera_name": "Whitefield ITPL Camera",
        "road_name": "Whitefield Main Road",
        "area": "Whitefield",
        "city": "Bengaluru",
        "district": "Bengaluru Urban",
        "state": "Karnataka",
        "country": "India",
        "latitude": 12.9698,
        "longitude": 77.7499,
        "camera_type": "RTSP",
        "stream_url": "rtsp://live.smartcity.ai/cam013",
        "status": "ONLINE",
        "camera_url": "https://www.youtube.com/watch?v=F5dEF7nSgis",
        "fps": 25,
        "ward": "Ward 84",
        "zone": "Mahadevapura Zone",
        "nearest_landmark": "ITPL Main Gate",
        "last_updated": "2026-08-08 12:00:00",
        "distance_km": 0.0,
    },
    {
        "id": "CAM014",
        "camera_id": "CAM014",
        "name": "Indiranagar 100ft Road Camera",
        "camera_name": "Indiranagar 100ft Road Camera",
        "road_name": "100 Feet Road",
        "area": "Indiranagar",
        "city": "Bengaluru",
        "district": "Bengaluru Urban",
        "state": "Karnataka",
        "country": "India",
        "latitude": 12.9784,
        "longitude": 77.6408,
        "camera_type": "RTSP",
        "stream_url": "rtsp://live.smartcity.ai/cam014",
        "status": "ONLINE",
        "camera_url": "https://www.youtube.com/watch?v=pU4_bfBpEnc",
        "fps": 30,
        "ward": "Ward 80",
        "zone": "East Zone",
        "nearest_landmark": "Indiranagar Metro Station",
        "last_updated": "2026-08-08 12:00:00",
        "distance_km": 0.0,
    },
    {
        "id": "CAM015",
        "camera_id": "CAM015",
        "name": "Koramangala Sony World Camera",
        "camera_name": "Koramangala Sony World Camera",
        "road_name": "80 Feet Road, Koramangala",
        "area": "Koramangala",
        "city": "Bengaluru",
        "district": "Bengaluru Urban",
        "state": "Karnataka",
        "country": "India",
        "latitude": 12.9352,
        "longitude": 77.6245,
        "camera_type": "HTTP",
        "stream_url": "http://live.smartcity.ai/cam015",
        "status": "ONLINE",
        "camera_url": "https://www.youtube.com/watch?v=Ugkx6lCFjZA",
        "fps": 25,
        "ward": "Ward 151",
        "zone": "South Zone",
        "nearest_landmark": "Sony World Junction",
        "last_updated": "2026-08-08 12:00:00",
        "distance_km": 0.0,
    },

    # ── Maharashtra – Mumbai ──
    {
        "id": "CAM016",
        "camera_id": "CAM016",
        "name": "Bandra Kurla Complex Camera",
        "camera_name": "Bandra Kurla Complex Camera",
        "road_name": "BKC Main Avenue",
        "area": "Bandra",
        "city": "Mumbai",
        "district": "Mumbai Suburban",
        "state": "Maharashtra",
        "country": "India",
        "latitude": 19.0600,
        "longitude": 72.8680,
        "camera_type": "RTSP",
        "stream_url": "rtsp://live.smartcity.ai/cam016",
        "status": "ONLINE",
        "camera_url": "https://www.youtube.com/watch?v=F5dEF7nSgis",
        "fps": 30,
        "ward": "H East",
        "zone": "Zone 3",
        "nearest_landmark": "NSE Building",
        "last_updated": "2026-08-08 12:00:00",
        "distance_km": 0.0,
    },
    {
        "id": "CAM017",
        "camera_id": "CAM017",
        "name": "Andheri WEH Junction Camera",
        "camera_name": "Andheri WEH Junction Camera",
        "road_name": "Western Express Highway",
        "area": "Andheri",
        "city": "Mumbai",
        "district": "Mumbai Suburban",
        "state": "Maharashtra",
        "country": "India",
        "latitude": 19.1197,
        "longitude": 72.8464,
        "camera_type": "HTTP",
        "stream_url": "http://live.smartcity.ai/cam017",
        "status": "ONLINE",
        "camera_url": "https://www.youtube.com/watch?v=pU4_bfBpEnc",
        "fps": 25,
        "ward": "K East",
        "zone": "Zone 4",
        "nearest_landmark": "WEH Metro Station",
        "last_updated": "2026-08-08 12:00:00",
        "distance_km": 0.0,
    },

    # ── Delhi – New Delhi ──
    {
        "id": "CAM018",
        "camera_id": "CAM018",
        "name": "Connaught Place Radial Camera",
        "camera_name": "Connaught Place Radial Camera",
        "road_name": "Janpath Road",
        "area": "Connaught Place",
        "city": "New Delhi",
        "district": "New Delhi",
        "state": "Delhi",
        "country": "India",
        "latitude": 28.6315,
        "longitude": 77.2167,
        "camera_type": "RTSP",
        "stream_url": "rtsp://live.smartcity.ai/cam018",
        "status": "ONLINE",
        "camera_url": "https://www.youtube.com/watch?v=Ugkx6lCFjZA",
        "fps": 30,
        "ward": "NDMC Ward 1",
        "zone": "Central Zone",
        "nearest_landmark": "Rajiv Chowk Metro",
        "last_updated": "2026-08-08 12:00:00",
        "distance_km": 0.0,
    },
]


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in km between two coordinates using the Haversine formula."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 2)


def get_all_cameras(latitude: Optional[float] = None, longitude: Optional[float] = None, db = None) -> List[Dict[str, Any]]:
    """Return all cameras from DB or fallback registry, sorted by proximity if GPS provided."""
    registry = []
    if db is not None:
        try:
            from app.models import TrafficCamera
            db_cams = db.query(TrafficCamera).all()
            if db_cams:
                for c in db_cams:
                    registry.append({
                        "id": c.camera_id,
                        "camera_id": c.camera_id,
                        "name": c.camera_name,
                        "camera_name": c.camera_name,
                        "road_name": c.road_name,
                        "area": c.area,
                        "city": c.city,
                        "district": c.district or "Central",
                        "state": c.state,
                        "country": c.country or "India",
                        "latitude": c.latitude,
                        "longitude": c.longitude,
                        "camera_type": c.camera_type or "RTSP",
                        "stream_url": c.stream_url or "",
                        "status": "Online" if c.status.upper() == "ONLINE" else "Offline",
                        "camera_url": c.stream_url or "",
                        "fps": 25,
                        "ward": "Main Ward",
                        "zone": "Central Zone",
                        "nearest_landmark": f"{c.area} Landmark",
                        "last_updated": str(c.last_updated),
                        "distance_km": 0.0,
                    })
        except Exception as e:
            print(f"[WARN] DB camera fetch error: {e}")

    if not registry:
        registry = [dict(c) for c in CAMERA_REGISTRY]

    cameras = []
    for cam in registry:
        entry = dict(cam)
        if latitude is not None and longitude is not None:
            entry["distance_km"] = _haversine(latitude, longitude, cam["latitude"], cam["longitude"])
        cameras.append(entry)

    if latitude is not None and longitude is not None:
        cameras.sort(key=lambda c: c["distance_km"])
    return cameras


def get_camera_by_id(camera_id: str, db = None) -> Optional[Dict[str, Any]]:
    """Return a single camera by ID, or None."""
    all_cams = get_all_cameras(db=db)
    for cam in all_cams:
        if cam["id"] == camera_id or cam.get("camera_id") == camera_id:
            return dict(cam)
    return None


def get_nearest_camera(latitude: float, longitude: float, online_only: bool = True, db = None) -> Optional[Dict[str, Any]]:
    """Return the nearest camera (filtering to Online only if requested)."""
    all_cams = get_all_cameras(latitude=latitude, longitude=longitude, db=db)
    candidates = [c for c in all_cams if (not online_only or c["status"].upper() in ("ONLINE", "ACTIVE"))]
    if not candidates:
        return None
    return candidates[0]


def get_location_hierarchy(db = None) -> Dict[str, Any]:
    """
    Return a structured hierarchy of registered locations:
    Country -> State -> City -> Areas (with road count, camera count, coordinates).
    """
    all_cams = get_all_cameras(db=db)
    hierarchy: Dict[str, Dict[str, Dict[str, List[Dict[str, Any]]]]] = {}

    for cam in all_cams:
        country = cam.get("country") or "India"
        state   = cam.get("state") or "Telangana"
        city    = cam.get("city") or "Hyderabad"
        area    = cam.get("area") or "Madhapur"

        hierarchy.setdefault(country, {}).setdefault(state, {}).setdefault(city, [])

        # Check if area already added for this city
        city_areas = hierarchy[country][state][city]
        existing_area = next((a for a in city_areas if a["area_name"] == area), None)

        if not existing_area:
            city_areas.append({
                "area_name": area,
                "city": city,
                "state": state,
                "country": country,
                "latitude": cam["latitude"],
                "longitude": cam["longitude"],
                "camera_count": 1,
                "active_cameras": 1 if cam["status"].upper() == "ONLINE" else 0,
                "roads": [cam["road_name"]],
            })
        else:
            existing_area["camera_count"] += 1
            if cam["status"].upper() == "ONLINE":
                existing_area["active_cameras"] += 1
            if cam["road_name"] not in existing_area["roads"]:
                existing_area["roads"].append(cam["road_name"])

    return {"hierarchy": hierarchy, "total_cameras": len(all_cams)}


def get_cameras_by_area(area: Optional[str] = None, city: Optional[str] = None, state: Optional[str] = None, country: Optional[str] = None, db = None) -> List[Dict[str, Any]]:
    """Return all registered cameras matching specified area, city, state filters."""
    all_cams = get_all_cameras(db=db)
    filtered = []

    for c in all_cams:
        if area and area != "All" and c.get("area", "").lower() != area.lower():
            continue
        if city and city != "All" and c.get("city", "").lower() != city.lower():
            continue
        if state and state != "All" and c.get("state", "").lower() != state.lower():
            continue
        if country and country != "All" and c.get("country", "").lower() != country.lower():
            continue
        filtered.append(c)

    return filtered


def estimate_travel_time(distance_km: float, avg_speed_kmh: float = 35.0) -> float:
    """Return estimated travel time in minutes."""
    if avg_speed_kmh <= 0:
        avg_speed_kmh = 35.0
    return round((distance_km / avg_speed_kmh) * 60, 1)


def seed_traffic_cameras(db):
    """Seed initial cameras into database if table is empty or missing entries."""
    try:
        from app.models import TrafficCamera
        existing_cams = db.query(TrafficCamera).all()
        existing_ids = {c.camera_id for c in existing_cams}

        for cam in CAMERA_REGISTRY:
            if cam["camera_id"] not in existing_ids:
                new_cam = TrafficCamera(
                    camera_id=cam["camera_id"],
                    camera_name=cam["camera_name"],
                    road_name=cam["road_name"],
                    area=cam["area"],
                    city=cam["city"],
                    district=cam.get("district", "Central"),
                    state=cam["state"],
                    country=cam.get("country", "India"),
                    latitude=cam["latitude"],
                    longitude=cam["longitude"],
                    camera_type=cam["camera_type"],
                    stream_url=cam["stream_url"],
                    status=cam["status"].upper(),
                )
                db.add(new_cam)
        db.commit()
        print("[SUCCESS] Traffic camera database synchronized with full registry.")
    except Exception as ex:
        db.rollback()
        print(f"[WARN] Camera seeding error: {ex}")
