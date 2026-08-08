"""
YOLO Service – thin wrapper around the YOLOv8Detector singleton.
Adds road-status classification and area-info enrichment.
"""
from typing import Dict, Any, Optional
from app.ml.yolo_detector import yolo_detector


def classify_road_status(total_vehicles: int) -> str:
    """Classify road status based on detected vehicle count."""
    if total_vehicles <= 8:
        return "Free Flow"
    elif total_vehicles <= 15:
        return "Moderate"
    elif total_vehicles <= 22:
        return "Heavy"
    else:
        return "Blocked"


def build_area_info(camera: Dict[str, Any]) -> Dict[str, Any]:
    """Extract area-level metadata from a camera record."""
    return {
        "area": camera.get("area", "—"),
        "road_name": camera.get("road_name", "—"),
        "nearest_landmark": camera.get("nearest_landmark", "—"),
        "ward": camera.get("ward", "—"),
        "zone": camera.get("zone", "—"),
        "district": camera.get("district", "—"),
        "city": camera.get("city", "—"),
        "state": camera.get("state", "—"),
    }


def run_detection(
    camera: Dict[str, Any],
    frame_base64: Optional[str] = None,
    source_type: str = "camera",
) -> Dict[str, Any]:
    """
    Run YOLOv8 detection for the given camera/source and frame.
    Returns the full detection result enriched with road_status and area_info.
    """
    result = yolo_detector.process_frame(
        frame_base64=frame_base64,
        camera_id=camera.get("id", "CUSTOM-001"),
        camera_name=camera.get("name", "Custom Input Stream"),
        latitude=camera.get("latitude", 0.0),
        longitude=camera.get("longitude", 0.0),
        source_type=source_type,
    )

    total = result["vehicle_counts"]["total"]
    result["road_status"] = classify_road_status(total)
    result["area_info"] = build_area_info(camera)
    result["fps"] = camera.get("fps", 25)
    result["camera_url"] = camera.get("camera_url", "")
    result["source_type"] = source_type

    return result
