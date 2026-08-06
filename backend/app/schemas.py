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
    co2_emission_kg: float
    ai_prediction_accuracy: float = 87.4  # default when no model trained

