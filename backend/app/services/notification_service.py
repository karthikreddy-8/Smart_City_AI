"""
Notification Service – evaluates alerts for heavy traffic, emergency vehicles, accidents,
road closures, and camera offline status.
"""
from typing import Dict, Any, List, Optional


def evaluate_traffic_alerts(
    vehicle_counts: Dict[str, int],
    congestion_percentage: float,
    road_status: str,
    accident_status: str,
    road_blockage_status: str,
    camera_status: str = "ONLINE"
) -> List[Dict[str, str]]:
    """
    Evaluate alerts based on current detection frame and camera status.
    Returns list of active alert objects with type, level, and message.
    """
    alerts = []

    # 1. Camera Offline Alert
    if camera_status.upper() in ("OFFLINE", "INACTIVE"):
        alerts.append({
            "type": "Camera Offline",
            "level": "error",
            "message": "🚨 CAMERA OFFLINE – Stream signal lost or camera powered off."
        })
        return alerts

    # 2. Emergency Vehicle Alert
    emergency_count = vehicle_counts.get("emergency", 0)
    if emergency_count > 0:
        ambul = vehicle_counts.get("ambulance", 0)
        fire  = vehicle_counts.get("fire_truck", 0)
        police = vehicle_counts.get("police", 0)
        types_str = []
        if ambul > 0: types_str.append(f"{ambul} Ambulance{'s' if ambul > 1 else ''}")
        if fire > 0:  types_str.append(f"{fire} Fire Truck{'s' if fire > 1 else ''}")
        if police > 0: types_str.append(f"{police} Police Vehicle{'s' if police > 1 else ''}")

        alerts.append({
            "type": "Emergency Vehicle",
            "level": "critical",
            "message": f"🚨 EMERGENCY VEHICLE DETECTED ({', '.join(types_str)}) – Clear priority lane immediately!"
        })

    # 3. Accident Alert
    if accident_status == "Possible Accident Detected":
        alerts.append({
            "type": "Accident Detected",
            "level": "warning",
            "message": "⚠️ ACCIDENT DETECTED – Obstruction on carriageway. Emergency units notified."
        })

    # 4. Road Closed / Blocked Alert
    if road_blockage_status == "Road Closed" or road_status == "Blocked":
        alerts.append({
            "type": "Road Closed",
            "level": "error",
            "message": "🚧 ROAD CLOSED / BLOCKED – Complete traffic standstill. Take immediate detours."
        })
    elif road_blockage_status == "Partial Block":
        alerts.append({
            "type": "Partial Blockage",
            "level": "warning",
            "message": "⚠️ PARTIAL ROAD BLOCKAGE – Single lane open. Severe delays ahead."
        })

    # 5. Heavy Traffic Alert
    if congestion_percentage >= 75.0 or road_status in ("Heavy", "Very Heavy"):
        alerts.append({
            "type": "Heavy Traffic",
            "level": "warning",
            "message": f"🔴 HEAVY TRAFFIC CONGESTION ({congestion_percentage:.1f}%) – Gridlock expected."
        })

    return alerts
