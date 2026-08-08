import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="Guest")  # Admin, Traffic Analyst, Guest
    is_active = Column(Boolean, default=True)

    datasets = relationship("DatasetRecord", back_populates="uploader")

class DatasetRecord(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    row_count = Column(Integer, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    uploaded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    status = Column(String, default="Raw")  # Raw, Cleaned

    uploader = relationship("User", back_populates="datasets")
    records = relationship("TrafficRecord", back_populates="dataset", cascade="all, delete-orphan")

class TrafficRecord(Base):
    __tablename__ = "traffic_records"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"))
    timestamp = Column(DateTime, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    road_name = Column(String, nullable=False)
    road_type = Column(String, nullable=False)  # Highway, Arterial, Local
    vehicle_count = Column(Integer, nullable=False)
    average_speed = Column(Float, nullable=False)
    weather = Column(String, nullable=False)  # Clear, Rainy, Snowy, Foggy
    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)
    accident_count = Column(Integer, default=0)
    traffic_signal = Column(Boolean, default=False)
    holiday = Column(Boolean, default=False)
    travel_time = Column(Float, nullable=False)
    congestion_level = Column(String, nullable=False)  # Low, Moderate, High

    dataset = relationship("DatasetRecord", back_populates="records")

class ModelMetadata(Base):
    __tablename__ = "models"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String, nullable=False)  # Random Forest, XGBoost, Decision Tree
    file_path = Column(String, nullable=False)
    accuracy = Column(Float, nullable=True)
    precision_score = Column(Float, nullable=True)
    recall_score = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    is_active = Column(Boolean, default=False)
    trained_at = Column(DateTime, default=datetime.datetime.utcnow)

class LiveTrafficSnapshot(Base):
    __tablename__ = "live_traffic_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String, index=True, nullable=False)
    camera_name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    car_count = Column(Integer, default=0)
    bus_count = Column(Integer, default=0)
    truck_count = Column(Integer, default=0)
    motorcycle_count = Column(Integer, default=0)
    bicycle_count = Column(Integer, default=0)
    emergency_count = Column(Integer, default=0)
    total_vehicles = Column(Integer, default=0)
    congestion_percentage = Column(Float, default=0.0)
    traffic_density_level = Column(String, default="Low")  # Low, Medium, High, Very High
    average_speed_kmh = Column(Float, default=45.0)
    expected_waiting_time_mins = Column(Float, default=2.0)
    accident_detected = Column(Boolean, default=False)
    road_blockage_status = Column(String, default="Road Open")  # Road Open, Partial Block, Road Closed
    emergency_vehicle_detected = Column(Boolean, default=False)
    weather_condition = Column(String, default="Clear")
    temperature_c = Column(Float, default=28.0)


class TrafficCamera(Base):
    __tablename__ = "traffic_cameras"

    camera_id = Column(String, primary_key=True, index=True)
    camera_name = Column(String, nullable=False)
    road_name = Column(String, nullable=False)
    area = Column(String, nullable=False)
    city = Column(String, nullable=False)
    district = Column(String, nullable=True)
    state = Column(String, nullable=False)
    country = Column(String, default="India")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    camera_type = Column(String, default="RTSP")  # RTSP, HTTP, MJPEG, IP Camera, USB Camera
    stream_url = Column(String, nullable=True)
    status = Column(String, default="ONLINE")  # ONLINE, OFFLINE
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)


