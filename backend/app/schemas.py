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
    average_speed: float
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

