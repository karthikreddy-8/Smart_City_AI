from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "Guest"  # Default to Guest, Admin can elevate

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool

    class Config:
        from_attributes = True

# Dataset & Traffic schemas
class DatasetResponse(BaseModel):
    id: int
    filename: str
    row_count: int
    status: str
    uploaded_at: datetime
    uploaded_by_id: int

    class Config:
        from_attributes = True

# ML Prediction request/response schemas
class PredictionInput(BaseModel):
    latitude: float
    longitude: float
    road_type: str       # Highway, Arterial, Local
    vehicle_count: int
    average_speed: Optional[float] = 30.0
    weather: str         # Clear, Rainy, Snowy, Foggy
    temperature: float
    humidity: float
    accident_count: int
    traffic_signal: bool
    holiday: bool

class Recommendation(BaseModel):
    alternative_route: str
    expected_delay_minutes: float
    fuel_saved_liters: float
    co2_saved_kg: float
    road_health_score: int
    signal_optimization: str

class PredictionResponse(BaseModel):
    congestion_level: str
    predicted_travel_time: float
    predicted_average_speed: float
    traffic_density: float
    accident_risk: str
    confidence: float
    recommendation: Recommendation

# Point A to Point B Route Prediction Schemas
class RoutePredictionInput(BaseModel):
    origin_name: str
    origin_lat: float
    origin_lng: float
    destination_name: str
    destination_lat: float
    destination_lng: float
    travel_mode: Optional[str] = "Driving"
    road_type: Optional[str] = "Arterial"
    weather: Optional[str] = "Clear"

class RouteStep(BaseModel):
    step_number: int
    instruction: str
    distance_km: float
    duration_mins: float
    congestion_level: str

class RoutePredictionResponse(BaseModel):
    origin: str
    destination: str
    total_distance_km: float
    estimated_travel_time_mins: float
    average_speed_kmh: float
    overall_congestion: str
    accident_risk: str
    confidence: float
    alternative_route_name: str
    fuel_saved_liters: float
    co2_saved_kg: float
    steps: List[RouteStep]
    route_coordinates: List[List[float]]  # List of [lat, lng] points

# Model comparisons
class ModelComparison(BaseModel):
    model_name: str
    accuracy: float
    precision_score: float
    recall_score: float
    f1_score: float
    is_active: bool
    trained_at: datetime

    class Config:
        from_attributes = True

# System Dashboard Metrics
class DashboardKPIs(BaseModel):
    is_demo: bool = False
    total_vehicles: int
    average_speed: float
    max_speed: float
    min_speed: float
    traffic_density: float
    congestion_index: float
    peak_hours: str
    off_peak_hours: str
    accident_count: int
    road_health_score: float
    fuel_waste_liters: float
    ai_prediction_accuracy: float = 87.4  # default when no model trained

# Real-Time Smart Traffic Monitoring Schemas
class TrafficCameraInfo(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    road_name: str
    status: str = "Active"
    distance_km: Optional[float] = 0.0

class VehicleCountBreakdown(BaseModel):
    car: int = 0
    bus: int = 0
    truck: int = 0
    motorcycle: int = 0
    bicycle: int = 0
    emergency: int = 0  # ambulance, fire truck, police
    total: int = 0

class LiveTrafficDetectRequest(BaseModel):
    latitude: Optional[float] = 17.4484
    longitude: Optional[float] = 78.3908
    camera_id: Optional[str] = None
    frame_base64: Optional[str] = None
    source_type: Optional[str] = "camera"  # 'camera', 'device', 'video', 'image'

class LiveTrafficDetectionResult(BaseModel):
    camera_id: str
    camera_name: str
    latitude: float
    longitude: float
    timestamp: str
    vehicle_counts: VehicleCountBreakdown
    traffic_density: str
    congestion_percentage: float
    average_speed_kmh: float
    expected_waiting_time_mins: float
    accident_status: str
    road_blockage_status: str
    emergency_vehicle_detected: bool
    emergency_alert_message: Optional[str] = None
    weather_info: Dict[str, Any]
    annotated_frame_base64: Optional[str] = None

class HistoricalTrafficPoint(BaseModel):
    time_label: str
    today_count: int
    yesterday_count: int
    last_week_count: int
    last_month_count: int
    today_speed: float
    yesterday_speed: float

class PeakHourPredictionItem(BaseModel):
    horizon: str
    predicted_congestion_pct: float
    predicted_density: str
    predicted_vehicle_count: int
    confidence_pct: float
    recommendation: str

class LiveTrafficRouteInfo(BaseModel):
    route_name: str
    estimated_time_mins: float
    distance_km: float
    congestion_level: str
    road_status: str
    waypoints: List[List[float]] = []

# ── Enhanced Live Traffic Schemas (v2) ────────────────────────────────────────

class TrafficCameraFull(BaseModel):
    """Full camera record returned by Camera Management endpoints."""
    id: str
    camera_id: str = ""
    name: str
    camera_name: str = ""
    road_name: str
    area: str
    city: str
    district: Optional[str] = ""
    state: str
    country: str = "India"
    latitude: float
    longitude: float
    camera_type: str = "RTSP"            # RTSP, HTTP, MJPEG, IP Camera, USB Camera
    stream_url: Optional[str] = ""
    status: str                         # ONLINE / OFFLINE
    camera_url: Optional[str] = ""
    fps: int = 25
    ward: Optional[str] = ""
    zone: Optional[str] = ""
    nearest_landmark: Optional[str] = ""
    last_updated: Optional[str] = ""
    distance_km: float = 0.0

class TrafficCameraCreate(BaseModel):
    camera_id: str
    camera_name: str
    road_name: str
    area: str
    city: str
    district: Optional[str] = ""
    state: str
    country: str = "India"
    latitude: float
    longitude: float
    camera_type: str = "RTSP"
    stream_url: Optional[str] = ""
    status: str = "ONLINE"


class VehicleCountFull(BaseModel):
    """9-class vehicle count breakdown."""
    car: int = 0
    bus: int = 0
    truck: int = 0
    motorcycle: int = 0
    bicycle: int = 0
    auto_rickshaw: int = 0
    ambulance: int = 0
    fire_truck: int = 0
    police: int = 0
    emergency: int = 0
    total: int = 0

class AreaInfo(BaseModel):
    area: str
    road_name: str
    nearest_landmark: str
    ward: str
    zone: str
    district: str
    city: str
    state: str

class LiveDetectionResultFull(BaseModel):
    """Full detection result returned by POST /api/live-traffic/detect (v2)."""
    camera_id: str
    camera_name: str
    latitude: float
    longitude: float
    timestamp: str
    fps: int = 25
    vehicle_counts: VehicleCountFull
    traffic_density: str
    road_status: str
    congestion_percentage: float
    average_speed_kmh: float
    expected_waiting_time_mins: float
    accident_status: str
    road_blockage_status: str
    emergency_vehicle_detected: bool
    emergency_alert_message: Optional[str] = None
    weather_info: Dict[str, Any] = {}
    area_info: Optional[AreaInfo] = None
    annotated_frame_base64: Optional[str] = None

class NearestCameraResult(BaseModel):
    found: bool = True
    camera: Optional[TrafficCameraFull] = None
    distance_km: float = 0.0
    estimated_travel_mins: float = 0.0
    message: str

class ReverseGeocodeResult(BaseModel):
    country: str = "Unknown"
    state: str = "Unknown"
    city: str = "Unknown"
    district: str = "Unknown"
    area: str = "Unknown"
    road_name: str = "Unknown"
    postal_code: str = "Unknown"
    latitude: float
    longitude: float
    accuracy_meters: Optional[float] = 15.0

class RoadTrafficItem(BaseModel):
    road_name: str
    traffic_level: str               # LOW, MODERATE, HIGH, VERY HIGH
    level_icon: str                # 🟢, 🟡, 🟠, 🔴
    congestion_pct: float
    vehicle_count: int
    camera_status: str              # Online / Offline

class AreaTrafficAnalysisResult(BaseModel):
    area_name: str
    city: str
    state: str
    country: str = "India"
    latitude: float
    longitude: float
    accuracy_meters: float = 15.0
    overall_traffic_level: str      # LOW, MODERATE, HIGH, VERY HIGH
    overall_traffic_icon: str       # 🟢, 🟡, 🟠, 🔴
    estimated_vehicles_in_area: int
    traffic_density_pct: float
    congestion_pct: float
    average_speed_kmh: float
    estimated_waiting_time_mins: float
    active_cameras_count: int
    offline_cameras_count: int
    traffic_by_road: List[RoadTrafficItem] = []
    vehicle_breakdown: VehicleCountFull
    cameras_coverage: List[TrafficCameraFull] = []

