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
