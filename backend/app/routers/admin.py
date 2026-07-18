import io
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User, DatasetRecord, TrafficRecord, ModelMetadata
from app.schemas import DatasetResponse, ModelComparison
from app.auth import RoleChecker, get_current_user
from app.ml.cleaner import DataCleaner
from app.ml.trainer import MLTrainer

router = APIRouter(prefix="/admin", tags=["Admin Operations"])

# Restrict router to Admins and Traffic Analysts
admin_or_analyst = RoleChecker(["Admin", "Traffic Analyst"])

@router.get("/users", response_model=List[dict])
def list_users(current_user: User = Depends(RoleChecker(["Admin"])), db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{"id": u.id, "username": u.username, "email": u.email, "role": u.role, "is_active": u.is_active} for u in users]

@router.post("/upload-csv", response_model=dict)
async def upload_csv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(admin_or_analyst),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    try:
        import re
        import random
        import numpy as np
        from datetime import datetime, timedelta

        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))

        # ── Step 1: Normalize all column names ──────────────────────────────
        def normalize_col(c):
            c = str(c).lower().strip()
            c = re.sub(r'[_\-]', ' ', c)
            c = re.sub(r'\s+', ' ', c)
            return c

        df.columns = [normalize_col(c) for c in df.columns]

        # ── Step 2: Map aliases to standard column names ─────────────────────
        alias_mapping = {
            "Vehicle Count":  ["vehicle count", "vehiclecount", "vehicles", "traffic volume",
                               "vehicle volume", "count", "flow", "traffic flow"],
            "Average Speed":  ["average speed", "averagespeed", "avg speed", "speed",
                               "mean speed", "velocity", "vehicle speed"],
            "Road Name":      ["road name", "roadname", "road", "street", "street name",
                               "road id", "location"],
            "Road Type":      ["road type", "roadtype", "type", "road category", "highway type"],
            "Date":           ["date", "record date", "observation date"],
            "Time":           ["time", "record time", "observation time", "hour"],
            "Latitude":       ["latitude", "lat", "y coord"],
            "Longitude":      ["longitude", "lon", "lng", "x coord"],
            "Weather":        ["weather", "weather condition", "conditions", "climate"],
            "Congestion Level": ["congestion level", "congestion", "traffic condition",
                                 "level of service"],
            "Accident Count": ["accident count", "accidents", "incident count"],
            "Travel Time":    ["travel time", "journey time", "travel duration"],
            "Temperature":    ["temperature", "temp"],
            "Humidity":       ["humidity", "relative humidity"],
            "Traffic Signal": ["traffic signal", "signal", "traffic light"],
            "Holiday":        ["holiday", "is holiday", "public holiday"],
        }

        renames = {}
        for std_name, aliases in alias_mapping.items():
            for col in df.columns:
                if col in aliases and std_name not in renames.values():
                    renames[col] = std_name

        df.rename(columns=renames, inplace=True)
        n = len(df)

        # ── Step 3: Only Vehicle Count is strictly required ──────────────────
        if "Vehicle Count" not in df.columns:
            raise HTTPException(
                status_code=400,
                detail="Missing required column: 'Vehicle Count' (or equivalent: vehicles, traffic_volume, flow). "
                       "Please ensure your dataset contains a traffic volume column."
            )

        # ── Step 4: Generate any missing columns automatically ────────────────

        # Date & Time
        if "Date" not in df.columns:
            base_date = datetime.now()
            df["Date"] = [(base_date + timedelta(minutes=i * 15)).strftime("%Y-%m-%d") for i in range(n)]

        if "Time" not in df.columns:
            base_date = datetime.now()
            df["Time"] = [(base_date + timedelta(minutes=i * 15)).strftime("%H:%M") for i in range(n)]

        # Latitude & Longitude (Delhi NCR center with jitter)
        if "Latitude" not in df.columns:
            df["Latitude"] = [round(28.6139 + random.uniform(-0.15, 0.15), 6) for _ in range(n)]

        if "Longitude" not in df.columns:
            df["Longitude"] = [round(77.2090 + random.uniform(-0.15, 0.15), 6) for _ in range(n)]

        # Road Name
        if "Road Name" not in df.columns:
            road_names = ["MG Road", "NH-44", "Ring Road", "Airport Road", "Main Street", "Central Avenue"]
            df["Road Name"] = [random.choice(road_names) for _ in range(n)]

        # Road Type
        if "Road Type" not in df.columns:
            road_types = ["Highway", "Urban", "Residential", "Rural", "Expressway"]
            df["Road Type"] = [random.choice(road_types) for _ in range(n)]

        # Average Speed
        if "Average Speed" not in df.columns:
            # Generate realistic speed inversely proportional to vehicle count
            vc = pd.to_numeric(df["Vehicle Count"], errors="coerce").fillna(50)
            max_vc = vc.max() if vc.max() > 0 else 1
            df["Average Speed"] = ((1 - (vc / max_vc)) * 60 + 20).clip(lower=20, upper=80).round(1)

        # Weather
        if "Weather" not in df.columns:
            weathers = ["Sunny", "Cloudy", "Rainy", "Foggy"]
            df["Weather"] = [random.choice(weathers) for _ in range(n)]

        # Congestion Level (derive from vehicle count if missing)
        if "Congestion Level" not in df.columns:
            vc = pd.to_numeric(df["Vehicle Count"], errors="coerce").fillna(0)
            q33 = vc.quantile(0.33)
            q66 = vc.quantile(0.66)
            df["Congestion Level"] = pd.cut(
                vc, bins=[-float("inf"), q33, q66, float("inf")],
                labels=["Low", "Moderate", "High"]
            ).astype(str)

        # Other optional columns with safe defaults
        if "Temperature" not in df.columns:
            df["Temperature"] = [round(random.uniform(18.0, 38.0), 1) for _ in range(n)]
        if "Humidity" not in df.columns:
            df["Humidity"] = [round(random.uniform(30.0, 90.0), 1) for _ in range(n)]
        if "Accident Count" not in df.columns:
            df["Accident Count"] = 0
        if "Traffic Signal" not in df.columns:
            df["Traffic Signal"] = [random.choice([0, 1]) for _ in range(n)]
        if "Holiday" not in df.columns:
            df["Holiday"] = 0
        if "Travel Time" not in df.columns:
            # Approximate: 5 km / speed * 60 min
            df["Travel Time"] = (5.0 / df["Average Speed"].clip(lower=1) * 60).round(1)

        # ── Step 5: Ensure numeric types are correct ─────────────────────────
        df["Vehicle Count"] = pd.to_numeric(df["Vehicle Count"], errors="coerce").fillna(0).astype(int)
        df["Average Speed"] = pd.to_numeric(df["Average Speed"], errors="coerce").fillna(30.0).astype(float)

        # ── Step 6: Clean the dataset ─────────────────────────────────────────
        cleaned_df, cleaning_stats = DataCleaner.clean_dataset(df)

        # Save dataset record
        dataset_rec = DatasetRecord(
            filename=file.filename,
            row_count=len(cleaned_df),
            uploaded_by_id=current_user.id,
            status="Cleaned"
        )
        db.add(dataset_rec)
        db.commit()
        db.refresh(dataset_rec)

        # Bulk insert traffic records
        traffic_records = []
        for _, row in cleaned_df.iterrows():
            rec = TrafficRecord(
                dataset_id=dataset_rec.id,
                timestamp=pd.to_datetime(f"{row.get('Date')} {row.get('Time')}"),
                latitude=float(row.get('Latitude', 0.0)),
                longitude=float(row.get('Longitude', 0.0)),
                road_name=str(row.get('Road Name', 'Unknown')),
                road_type=str(row.get('Road Type', 'Arterial')),
                vehicle_count=int(row.get('Vehicle Count', 0)),
                average_speed=float(row.get('Average Speed', 0.0)),
                weather=str(row.get('Weather', 'Clear')),
                temperature=float(row.get('Temperature', 25.0)) if pd.notna(row.get('Temperature')) else None,
                humidity=float(row.get('Humidity', 50.0)) if pd.notna(row.get('Humidity')) else None,
                accident_count=int(row.get('Accident Count', 0)),
                traffic_signal=bool(row.get('Traffic Signal', 0)),
                holiday=bool(row.get('Holiday', 0)),
                travel_time=float(row.get('Travel Time', 0.0)),
                congestion_level=str(row.get('Congestion Level', 'Low'))
            )
            traffic_records.append(rec)

        db.bulk_save_objects(traffic_records)
        db.commit()

        # Trigger background analysis and model training automatically
        from app.database import SessionLocal
        background_tasks.add_task(background_train_models, SessionLocal, dataset_rec.id)

        return {
            "message": "Dataset uploaded, validated, cleaned, and stored successfully. AI training started in background.",
            "dataset_id": dataset_rec.id,
            "cleaning_stats": cleaning_stats
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process CSV: {str(e)}")

@router.get("/datasets", response_model=List[DatasetResponse])
def get_datasets(db: Session = Depends(get_db), current_user: User = Depends(admin_or_analyst)):
    return db.query(DatasetRecord).all()

@router.delete("/datasets/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db), current_user: User = Depends(admin_or_analyst)):
    dataset = db.query(DatasetRecord).filter(DatasetRecord.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    db.delete(dataset)
    db.commit()
    return {"message": f"Dataset {dataset_id} deleted successfully."}

def background_train_models(db_session_factory, dataset_id: int = None):
    db = db_session_factory()
    try:
        # Task 1: Check if models already exist. If so, skip training.
        existing_models = db.query(ModelMetadata).count()
        if existing_models > 0:
            print("Models already trained and saved. Skipping retraining.")
            return

        query = db.query(TrafficRecord)
        if dataset_id:
            query = query.filter(TrafficRecord.dataset_id == dataset_id)
        records = query.all()

        if not records:
            print("No records found for training.")
            return

        data = []
        for r in records:
            data.append({
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

        df = pd.DataFrame(data)
        metrics = MLTrainer.train_models(df)

        db.query(ModelMetadata).delete()

        active_selected = False
        for name, info in metrics.items():
            is_active = (name == "XGBoost")
            if is_active:
                active_selected = True
            metadata = ModelMetadata(
                model_name=name,
                file_path=info["path"],
                accuracy=info["accuracy"],
                precision_score=info["precision"],
                recall_score=info["recall"],
                f1_score=info["f1"],
                is_active=is_active
            )
            db.add(metadata)

        if not active_selected and metrics:
            first_model = db.query(ModelMetadata).first()
            if first_model:
                first_model.is_active = True
                
        # If no models were trained (e.g. data issues), make sure we don't crash
        if not metrics:
            print("Warning: Training returned no metrics.")

        db.commit()
        print("✅ Training background task completed successfully.")
    except Exception as e:
        print(f"❌ Background Training Error: {e}")
    finally:
        db.close()

@router.post("/train", response_model=dict)
def trigger_training(
    background_tasks: BackgroundTasks,
    dataset_id: int = None,
    current_user: User = Depends(admin_or_analyst),
    db: Session = Depends(get_db)
):
    records_count = db.query(TrafficRecord).count()
    if records_count == 0:
        raise HTTPException(status_code=400, detail="Cannot train models with an empty database. Please upload a dataset first.")

    from app.database import SessionLocal
    background_tasks.add_task(background_train_models, SessionLocal, dataset_id)
    return {"message": "Model training triggered in background. This may take a few minutes."}

@router.get("/models", response_model=List[ModelComparison])
def list_models(db: Session = Depends(get_db), current_user: User = Depends(admin_or_analyst)):
    models = db.query(ModelMetadata).all()
    return models

@router.post("/models/{model_id}/activate")
def activate_model(model_id: int, db: Session = Depends(get_db), current_user: User = Depends(admin_or_analyst)):
    model = db.query(ModelMetadata).filter(ModelMetadata.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    db.query(ModelMetadata).update({ModelMetadata.is_active: False})
    model.is_active = True
    db.commit()
    return {"message": f"Model {model.model_name} activated successfully."}
