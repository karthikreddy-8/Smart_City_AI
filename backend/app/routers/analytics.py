import os
import pandas as pd
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database import get_db
from app.models import TrafficRecord, User
from app.schemas import DatasetResponse, DashboardKPIs, PredictionInput
from app.ml.predictor import MLPredictor
from app.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["Traffic Analytics"])

def get_base_dataframe(db: Session) -> pd.DataFrame:
    from app.models import DatasetRecord
    latest = db.query(DatasetRecord).order_by(DatasetRecord.uploaded_at.desc()).first()
    if latest:
        records = db.query(TrafficRecord).filter(TrafficRecord.dataset_id == latest.id).all()
        if not records:
            records = db.query(TrafficRecord).all()
    else:
        records = db.query(TrafficRecord).all()

    if not records:
        return pd.DataFrame()

    data = []
    for r in records:
        data.append({
            "Timestamp": r.timestamp,
            "Latitude": r.latitude,
            "Longitude": r.longitude,
            "Road Name": r.road_name,
            "Road Type": r.road_type,
            "Vehicle Count": r.vehicle_count,
            "Average Speed": r.average_speed,
            "Weather": r.weather,
            "Temperature": r.temperature,
            "Humidity": r.humidity,
            "Accident Count": r.accident_count,
            "Traffic Signal": r.traffic_signal,
            "Holiday": r.holiday,
            "Travel Time": r.travel_time,
            "Congestion Level": r.congestion_level
        })
    return pd.DataFrame(data)

def _parse_hour(df):
    if "Timestamp" in df.columns:
        df["Hour"] = pd.to_datetime(df["Timestamp"], errors='coerce').dt.hour
        df["Weekday"] = pd.to_datetime(df["Timestamp"], errors='coerce').dt.day_name()
    else:
        df["Hour"] = 12
        df["Weekday"] = "Monday"
    df["Hour"] = df["Hour"].fillna(12).astype(int)
    df["Weekday"] = df["Weekday"].fillna("Monday")
    return df

@router.get("/kpis", response_model=DashboardKPIs)
def get_kpis(
    road_name: str = None,
    weather: str = None,
    date: str = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    base_df = get_base_dataframe(db)
    has_dataset = not base_df.empty

    if not has_dataset:
        return DashboardKPIs(
            is_demo=True,
            total_vehicles=12500,
            average_speed=45.2,
            max_speed=85.0,
            min_speed=12.5,
            traffic_density=35.5,
            congestion_index=42.1,
            peak_hours="08:00 - 10:00",
            off_peak_hours="02:00 - 04:00",
            accident_count=3,
            road_health_score=85.0,
            fuel_waste_liters=250.5,
            co2_emission_kg=578.6,
            ai_prediction_accuracy=92.5
        )

    df = base_df.copy()

    # Safe case-insensitive filtering
    if road_name and str(road_name).strip() not in ["All", "", "null", "None"]:
        df_filtered = df[df["Road Name"].astype(str).str.strip().str.lower() == str(road_name).strip().lower()]
        if not df_filtered.empty:
            df = df_filtered

    if weather and str(weather).strip() not in ["All", "", "null", "None"]:
        df_filtered = df[df["Weather"].astype(str).str.strip().str.lower() == str(weather).strip().lower()]
        if not df_filtered.empty:
            df = df_filtered

    if date and str(date).strip() not in ["", "null", "None"] and "Timestamp" in df.columns:
        df["DateStr"] = pd.to_datetime(df["Timestamp"], errors='coerce').dt.strftime("%Y-%m-%d")
        df_filtered = df[df["DateStr"] == str(date).strip()]
        if not df_filtered.empty:
            df = df_filtered

    df = _parse_hour(df)
    
    hourly_counts = df.groupby("Hour")["Vehicle Count"].sum()
    if not hourly_counts.empty:
        peak_hour = hourly_counts.idxmax()
        off_peak_hour = hourly_counts.idxmin()
        peak_hours = f"{peak_hour:02d}:00 - {(peak_hour+2)%24:02d}:00"
        off_peak_hours = f"{off_peak_hour:02d}:00 - {(off_peak_hour+2)%24:02d}:00"
    else:
        peak_hours = "08:00 - 10:00"
        off_peak_hours = "02:00 - 04:00"

    total_vehicles = int(df["Vehicle Count"].sum())
    
    pred_input = PredictionInput(
        latitude=float(df["Latitude"].mean()) if "Latitude" in df.columns else 0.0,
        longitude=float(df["Longitude"].mean()) if "Longitude" in df.columns else 0.0,
        road_type=str(df["Road Type"].mode()[0]) if not df["Road Type"].empty else "Arterial",
        vehicle_count=int(df["Vehicle Count"].mean()),
        average_speed=float(df["Average Speed"].mean()),
        weather=str(df["Weather"].mode()[0]) if not df["Weather"].empty else "Clear",
        temperature=float(df["Temperature"].mean()) if "Temperature" in df.columns else 25.0,
        humidity=float(df["Humidity"].mean()) if "Humidity" in df.columns else 50.0,
        accident_count=int(df["Accident Count"].sum()),
        traffic_signal=True,
        holiday=False
    )
    
    prediction = MLPredictor.predict(pred_input)

    average_speed = prediction.predicted_average_speed
    max_speed = float(df["Average Speed"].max()) if not df["Average Speed"].empty else average_speed
    min_speed = float(df["Average Speed"].min()) if not df["Average Speed"].empty else average_speed

    traffic_density = prediction.traffic_density
    congestion_index = 10.0 if prediction.congestion_level == "High" else (5.0 if prediction.congestion_level == "Moderate" else 2.0)
    
    road_health_score = float(prediction.recommendation.road_health_score)
    fuel_waste_liters = prediction.recommendation.fuel_saved_liters
    co2_emission_kg = prediction.recommendation.co2_saved_kg
    accident_count = int(df["Accident Count"].sum()) if "Accident Count" in df.columns else 0

    from app.models import ModelMetadata
    active_model = db.query(ModelMetadata).filter(ModelMetadata.is_active == True).first()
    accuracy_val = round(float(active_model.accuracy * 100), 1) if (active_model and active_model.accuracy) else 94.2

    return DashboardKPIs(
        is_demo=False,
        total_vehicles=total_vehicles,
        average_speed=round(average_speed, 1),
        max_speed=round(max_speed, 1),
        min_speed=round(min_speed, 1),
        traffic_density=round(traffic_density, 1),
        congestion_index=round(congestion_index, 1),
        peak_hours=peak_hours,
        off_peak_hours=off_peak_hours,
        accident_count=accident_count,
        road_health_score=round(road_health_score, 1),
        fuel_waste_liters=round(fuel_waste_liters, 2),
        co2_emission_kg=round(co2_emission_kg, 2),
        ai_prediction_accuracy=accuracy_val
    )

@router.get("/charts", response_model=Dict[str, Any])
def get_charts_data(
    road_name: str = None,
    weather: str = None,
    date: str = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    base_df = get_base_dataframe(db)
    
    if base_df.empty:
        return {
            "hourly": [{"hour": f"{h:02d}:00", "vehicles": 100 + (h*50 if h<12 else (24-h)*50)} for h in range(24)],
            "weekly": [{"day": d, "vehicles": 5000} for d in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]],
            "weather": [{"weather": "Clear", "avg_vehicles": 150, "avg_speed": 45}, {"weather": "Rainy", "avg_vehicles": 100, "avg_speed": 30}],
            "road_type": [{"road_type": "Highway", "avg_vehicles": 500, "avg_speed": 65}, {"road_type": "Local", "avg_vehicles": 100, "avg_speed": 25}],
            "congestion_distribution": [{"level": "High", "count": 20}, {"level": "Moderate", "count": 50}, {"level": "Low", "count": 130}],
            "top_congested_roads": [{"road_name": "Demo Route A", "score": 2.8}, {"road_name": "Demo Route B", "score": 2.1}],
            "scatter": [],
            "heatmap": []
        }

    df = base_df.copy()

    if road_name and str(road_name).strip() not in ["All", "", "null", "None"]:
        df_filtered = df[df["Road Name"].astype(str).str.strip().str.lower() == str(road_name).strip().lower()]
        if not df_filtered.empty:
            df = df_filtered

    if weather and str(weather).strip() not in ["All", "", "null", "None"]:
        df_filtered = df[df["Weather"].astype(str).str.strip().str.lower() == str(weather).strip().lower()]
        if not df_filtered.empty:
            df = df_filtered

    if date and str(date).strip() not in ["", "null", "None"] and "Timestamp" in df.columns:
        df["DateStr"] = pd.to_datetime(df["Timestamp"], errors='coerce').dt.strftime("%Y-%m-%d")
        df_filtered = df[df["DateStr"] == str(date).strip()]
        if not df_filtered.empty:
            df = df_filtered

    df = _parse_hour(df)

    hourly = df.groupby("Hour")["Vehicle Count"].mean().round(1).to_dict()
    hourly_data = [{"hour": f"{h:02d}:00", "vehicles": v} for h, v in sorted(hourly.items())]

    weekdays_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    weekday_grouped = df.groupby("Weekday")["Vehicle Count"].mean().round(1).to_dict()
    weekday_data = [{"day": day, "vehicles": weekday_grouped.get(day, 0.0)} for day in weekdays_order]

    if "Timestamp" in df.columns:
        df["Month"] = pd.to_datetime(df["Timestamp"], errors='coerce').dt.month_name()
    else:
        df["Month"] = "January"
    
    monthly_grouped = df.groupby("Month")["Vehicle Count"].mean().round(1).to_dict()
    monthly_data = [{"month": m, "vehicles": v} for m, v in monthly_grouped.items()]

    weather_grouped = df.groupby("Weather")[["Vehicle Count", "Average Speed"]].mean().round(1).to_dict(orient="index")
    weather_data = [{"weather": k, "avg_vehicles": v["Vehicle Count"], "avg_speed": v["Average Speed"]} for k, v in weather_grouped.items()]

    road_type_grouped = df.groupby("Road Type")[["Vehicle Count", "Average Speed"]].mean().round(1).to_dict(orient="index")
    road_type_data = [{"road_type": k, "avg_vehicles": v["Vehicle Count"], "avg_speed": v["Average Speed"]} for k, v in road_type_grouped.items()]

    congestion_dist = df["Congestion Level"].value_counts().to_dict()
    congestion_data = [{"level": k, "count": v} for k, v in congestion_dist.items()]

    df["CongestionScore"] = df["Congestion Level"].map({"Low": 1, "Moderate": 2, "High": 3})
    top_roads = df.groupby("Road Name")["CongestionScore"].mean().round(2).sort_values(ascending=False).head(5).to_dict()
    top_roads_data = [{"road_name": k, "score": v} for k, v in top_roads.items()]

    scatter_sample = df.dropna(subset=["Vehicle Count", "Average Speed"]).sample(min(100, len(df)))
    scatter_data = [{"x": row["Vehicle Count"], "y": row["Average Speed"]} for _, row in scatter_sample.iterrows()]

    heatmap_df = df.groupby(["Weekday", "Hour"])["Vehicle Count"].mean().reset_index()
    heatmap_data = [{"day": row["Weekday"], "hour": int(row["Hour"]), "value": round(float(row["Vehicle Count"]), 1)} for _, row in heatmap_df.iterrows()]

    numeric_df = df.select_dtypes(include=['number']).fillna(0)
    corr_matrix = numeric_df.corr().round(2).to_dict() if not numeric_df.empty and len(numeric_df) > 1 else {}

    return {
        "hourly": hourly_data,
        "weekly": weekday_data,
        "monthly": monthly_data,
        "weather": weather_data,
        "road_type": road_type_data,
        "congestion_distribution": congestion_data,
        "top_congested_roads": top_roads_data,
        "correlation_matrix": corr_matrix,
        "scatter": scatter_data,
        "heatmap": heatmap_data
    }

@router.get("/map-markers", response_model=List[Dict[str, Any]])
def get_map_markers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    df = get_base_dataframe(db)
    if df.empty:
        return [
            {"road_name": "Demo Highway", "road_type": "Highway", "latitude": 28.6139, "longitude": 77.2090, "avg_vehicles": 1500, "avg_speed": 40, "total_accidents": 2, "congestion_level": "High"},
            {"road_name": "Demo Street", "road_type": "Local", "latitude": 28.6239, "longitude": 77.2190, "avg_vehicles": 300, "avg_speed": 25, "total_accidents": 0, "congestion_level": "Low"},
        ]

    grouped = df.groupby(["Road Name", "Road Type"]).agg({
        "Latitude": "mean",
        "Longitude": "mean",
        "Vehicle Count": "mean",
        "Average Speed": "mean",
        "Accident Count": "sum",
        "Congestion Level": lambda x: x.mode().iloc[0] if not x.mode().empty else "Low"
    }).reset_index()

    markers = []
    for _, row in grouped.iterrows():
        markers.append({
            "road_name": str(row["Road Name"]),
            "road_type": str(row["Road Type"]),
            "latitude": float(row["Latitude"]),
            "longitude": float(row["Longitude"]),
            "avg_vehicles": round(float(row["Vehicle Count"]), 0),
            "avg_speed": round(float(row["Average Speed"]), 1),
            "total_accidents": int(row["Accident Count"]),
            "congestion_level": str(row["Congestion Level"])
        })
    return markers

@router.get("/filters", response_model=Dict[str, List[str]])
def get_filters(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    df = get_base_dataframe(db)
    if df.empty:
        return {
            "roads": ["Demo Highway", "Demo Street", "Demo Avenue"],
            "weathers": ["Clear", "Rainy", "Foggy", "Snowy"],
            "areas": ["City Center", "Suburbs", "Industrial Zone"],
            "road_types": ["Highway", "Arterial", "Local"],
            "is_demo": ["true"]
        }

    # Build unique filter lists from actual dataset
    roads = sorted([str(r) for r in df["Road Name"].dropna().unique().tolist()])
    weathers = sorted([str(w) for w in df["Weather"].dropna().unique().tolist()])
    road_types = sorted([str(t) for t in df["Road Type"].dropna().unique().tolist()]) if "Road Type" in df.columns else []

    # Build area list from road names (treat road names as areas if no dedicated area column)
    areas = roads[:20]  # Top 20 road names as selectable areas

    return {
        "roads": roads,
        "weathers": weathers,
        "areas": areas,
        "road_types": road_types,
        "is_demo": []
    }

@router.get("/area")
def get_area_analytics(
    road_name: str = None,
    weather: str = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    df = get_base_dataframe(db)
    if df.empty:
        return {
            "area_name": "Demo Area",
            "total_vehicles": 5000,
            "average_speed": 35.5,
            "congestion_index": 45.0,
            "accident_count": 1,
            "travel_time": 25.0,
            "road_health_score": 88.0,
            "fuel_waste_liters": 150.0,
            "co2_emission_kg": 346.5,
            "traffic_density": 200.0,
            "risk_level": "Moderate",
            "alternative_route": "Use Route B"
        }

    if road_name and road_name != "All":
        df = df[df["Road Name"] == road_name]
    if weather and weather != "All":
        df = df[df["Weather"] == weather]

    if df.empty:
        return {}

    total_vehicles = int(df["Vehicle Count"].sum())
    average_speed = float(df["Average Speed"].mean())
    accident_count = int(df["Accident Count"].sum())
    
    congestion_counts = df["Congestion Level"].value_counts()
    high_count = congestion_counts.get("High", 0)
    mod_count = congestion_counts.get("Moderate", 0)
    congestion_index = float((high_count + 0.5 * mod_count) / len(df) * 100) if len(df) > 0 else 0.0
    
    travel_time = float(df["Travel Time"].mean())
    
    df["Delay"] = (df["Travel Time"] - 5.0).clip(lower=0)
    df["Fuel Wasted"] = 0.0
    df.loc[df["Congestion Level"] == "High", "Fuel Wasted"] = df["Delay"] * 0.15
    df.loc[df["Congestion Level"] == "Moderate", "Fuel Wasted"] = df["Delay"] * 0.08
    fuel_waste = float(df["Fuel Wasted"].sum())
    co2_emission = float(fuel_waste * 2.31)
    
    df["Health"] = (100 - (df["Vehicle Count"] / 12) - (df["Accident Count"] * 10)).clip(30, 100)
    road_health = float(df["Health"].mean())

    risk_level = "High" if accident_count > 5 or congestion_index > 50 else "Moderate" if accident_count > 1 or congestion_index > 25 else "Low"
    alt_route = "Consider avoiding this route during peak hours." if risk_level == "High" else "Route is currently clear."

    return {
        "area_name": road_name if road_name and road_name != "All" else "All Areas",
        "total_vehicles": total_vehicles,
        "average_speed": round(average_speed, 1),
        "congestion_index": round(congestion_index, 1),
        "accident_count": accident_count,
        "travel_time": round(travel_time, 1),
        "road_health_score": round(road_health, 1),
        "fuel_waste_liters": round(fuel_waste, 1),
        "co2_emission_kg": round(co2_emission, 1),
        "traffic_density": round(total_vehicles / max(1, travel_time), 1),
        "risk_level": risk_level,
        "alternative_route": alt_route
    }
