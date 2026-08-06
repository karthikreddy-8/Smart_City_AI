import os
import math
import joblib
import pandas as pd
import numpy as np
from app.config import settings
from app.schemas import (
    PredictionInput, PredictionResponse, Recommendation,
    RoutePredictionInput, RoutePredictionResponse, RouteStep
)

MODEL_FILENAME_MAP = {
    "XGBoost": "xgboost",
    "Random Forest": "random_forest",
    "Decision Tree": "decision_tree"
}

def safe_transform_category(encoder, value: str, default_index: int = 0) -> int:
    """Transform categorical string safely, handling case mismatches and unknown labels."""
    try:
        val_str = str(value).strip()
        classes = [str(c).strip() for c in encoder.classes_]
        if val_str in classes:
            return int(encoder.transform([val_str])[0])
        for idx, c in enumerate(classes):
            if c.lower() == val_str.lower():
                return idx
        return default_index
    except Exception:
        return default_index

class MLPredictor:
    @staticmethod
    def get_active_model_name() -> str:
        for name in ["xgboost", "random_forest", "decision_tree"]:
            if os.path.exists(os.path.join(settings.MODELS_DIR, f"{name}.joblib")):
                return name
        return "xgboost"

    @staticmethod
    def predict(data: PredictionInput, model_override: str = None) -> PredictionResponse:
        file_basename = None
        if model_override:
            file_basename = MODEL_FILENAME_MAP.get(model_override, model_override.lower().replace(" ", "_"))
        if not file_basename:
            file_basename = MLPredictor.get_active_model_name()

        model_path = os.path.join(settings.MODELS_DIR, f"{file_basename}.joblib")
        encoders_path = os.path.join(settings.MODELS_DIR, "encoders.joblib")

        if not os.path.exists(model_path) or not os.path.exists(encoders_path):
            return MLPredictor._fallback_prediction(data)

        try:
            model = joblib.load(model_path)
            encoders = joblib.load(encoders_path)

            road_type_encoded = safe_transform_category(encoders["Road Type"], data.road_type, 0)
            weather_encoded = safe_transform_category(encoders["Weather"], data.weather, 0)

            features = pd.DataFrame([{
                "Latitude": data.latitude,
                "Longitude": data.longitude,
                "Vehicle Count": data.vehicle_count,
                "Road Type": road_type_encoded,
                "Weather": weather_encoded,
                "Temperature": data.temperature,
                "Humidity": data.humidity,
                "Accident Count": data.accident_count,
                "Traffic Signal": 1 if data.traffic_signal else 0,
                "Holiday": 1 if data.holiday else 0
            }])

            congestion_idx = int(model.predict(features)[0])

            try:
                congestion_level = str(encoders["Congestion Level"].inverse_transform([congestion_idx])[0])
            except Exception:
                levels = ["Low", "Moderate", "High"]
                congestion_level = levels[congestion_idx] if 0 <= congestion_idx < len(levels) else "Moderate"

            try:
                probs = model.predict_proba(features)[0]
                confidence = float(np.max(probs))
            except Exception:
                confidence = 0.88

            return MLPredictor._generate_full_response(data, congestion_level, confidence)

        except Exception as e:
            print(f"[WARN] Prediction execution error: {e}. Using fallback prediction.")
            return MLPredictor._fallback_prediction(data)

    @staticmethod
    def predict_route(input_data: RoutePredictionInput, model_override: str = None) -> RoutePredictionResponse:
        """Calculates distance, segments, predicted congestion, and step-by-step navigation from Point A to Point B."""
        lat1, lon1 = input_data.origin_lat, input_data.origin_lng
        lat2, lon2 = input_data.destination_lat, input_data.destination_lng

        # Calculate distance using Haversine formula
        R = 6371.0  # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) ** 2) + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * (math.sin(dlon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance_km = round(R * c, 2)
        if distance_km < 0.5:
            distance_km = 1.5

        mid_lat = (lat1 + lat2) / 2
        mid_lng = (lon1 + lon2) / 2

        sim_input = PredictionInput(
            latitude=mid_lat,
            longitude=mid_lng,
            road_type=input_data.road_type or "Arterial",
            vehicle_count=180,
            average_speed=35.0,
            weather=input_data.weather or "Clear",
            temperature=30.0,
            humidity=55.0,
            accident_count=0,
            traffic_signal=True,
            holiday=False
        )

        pred = MLPredictor.predict(sim_input, model_override=model_override)
        overall_congestion = pred.congestion_level
        avg_speed = pred.predicted_average_speed

        travel_time_mins = round((distance_km / max(avg_speed, 10.0)) * 60, 1)

        num_points = 6
        route_coords = []
        for i in range(num_points):
            t = i / (num_points - 1)
            offset_lat = 0.002 * math.sin(t * math.pi)
            offset_lng = 0.002 * math.cos(t * math.pi)
            p_lat = round(lat1 + t * (lat2 - lat1) + offset_lat, 6)
            p_lng = round(lon1 + t * (lon2 - lon1) + offset_lng, 6)
            route_coords.append([p_lat, p_lng])

        steps = [
            RouteStep(
                step_number=1,
                instruction=f"Depart from {input_data.origin_name} onto primary feeder road",
                distance_km=round(distance_km * 0.25, 1),
                duration_mins=round(travel_time_mins * 0.25, 1),
                congestion_level="Low"
            ),
            RouteStep(
                step_number=2,
                instruction=f"Merge onto main urban arterial corridor heading towards target destination",
                distance_km=round(distance_km * 0.55, 1),
                duration_mins=round(travel_time_mins * 0.55, 1),
                congestion_level=overall_congestion
            ),
            RouteStep(
                step_number=3,
                instruction=f"Turn towards {input_data.destination_name} access boulevard and arrive at location",
                distance_km=round(distance_km * 0.2, 1),
                duration_mins=round(travel_time_mins * 0.2, 1),
                congestion_level="Low" if overall_congestion != "High" else "Moderate"
            )
        ]

        alt_name = "Bypass Expressway Route" if overall_congestion == "High" else "Direct Main Corridor"
        fuel_saved = pred.recommendation.fuel_saved_liters
        co2_saved = pred.recommendation.co2_saved_kg

        return RoutePredictionResponse(
            origin=input_data.origin_name,
            destination=input_data.destination_name,
            total_distance_km=distance_km,
            estimated_travel_time_mins=travel_time_mins,
            average_speed_kmh=avg_speed,
            overall_congestion=overall_congestion,
            accident_risk=pred.accident_risk,
            confidence=pred.confidence,
            alternative_route_name=alt_name,
            fuel_saved_liters=fuel_saved,
            co2_saved_kg=co2_saved,
            steps=steps,
            route_coordinates=route_coords
        )

    @staticmethod
    def _fallback_prediction(data: PredictionInput) -> PredictionResponse:
        vehicle_count = data.vehicle_count
        road_type = data.road_type

        base_capacity = 200 if road_type == "Highway" else (100 if road_type == "Arterial" else 40)
        ratio = vehicle_count / base_capacity

        if ratio > 1.5 or data.accident_count > 0:
            congestion = "High"
        elif ratio > 0.8:
            congestion = "Moderate"
        else:
            congestion = "Low"

        return MLPredictor._generate_full_response(data, congestion, 0.75)

    @staticmethod
    def _generate_full_response(data: PredictionInput, congestion_level: str, confidence: float) -> PredictionResponse:
        density = float(data.vehicle_count)
        base_speed = 70 if data.road_type == "Highway" else (40 if data.road_type == "Arterial" else 25)

        if congestion_level == "High":
            speed_factor = 0.30
            accident_risk = "High"
        elif congestion_level == "Moderate":
            speed_factor = 0.65
            accident_risk = "Medium"
        else:
            speed_factor = 0.95
            accident_risk = "Low"

        if data.weather in ["Rainy", "Foggy"]:
            speed_factor *= 0.85
            accident_risk = "High" if congestion_level != "Low" else "Medium"

        predicted_speed = max(8.0, base_speed * speed_factor)
        predicted_travel_time = (5.0 / predicted_speed) * 60

        alt_route = "Outer Bypass Service Corridor" if congestion_level == "High" else (
            "Service Lane Detour" if congestion_level == "Moderate" else "No detour needed"
        )
        delay_mins = max(0.0, predicted_travel_time - ((5.0 / base_speed) * 60))

        fuel_saved = 0.0
        co2_saved = 0.0
        if congestion_level == "High":
            fuel_saved = 0.18 * delay_mins
            co2_saved = fuel_saved * 2.31
        elif congestion_level == "Moderate":
            fuel_saved = 0.09 * delay_mins
            co2_saved = fuel_saved * 2.31

        road_health = max(35, int(100 - (data.vehicle_count / 10) - (data.accident_count * 15)))

        if congestion_level == "High" and data.traffic_signal:
            signal_opt = "Extend Green light signal by 25 seconds"
        elif congestion_level == "Moderate" and data.traffic_signal:
            signal_opt = "Extend Green light signal by 12 seconds"
        else:
            signal_opt = "Maintain normal adaptive cycle"

        recommendation = Recommendation(
            alternative_route=alt_route,
            expected_delay_minutes=round(delay_mins, 1),
            fuel_saved_liters=round(fuel_saved, 2),
            co2_saved_kg=round(co2_saved, 2),
            road_health_score=road_health,
            signal_optimization=signal_opt
        )

        return PredictionResponse(
            congestion_level=congestion_level,
            predicted_travel_time=round(predicted_travel_time, 1),
            predicted_average_speed=round(predicted_speed, 1),
            traffic_density=density,
            accident_risk=accident_risk,
            confidence=round(confidence, 2),
            recommendation=recommendation
        )
