import os
import joblib
import pandas as pd
import numpy as np
from app.config import settings
from app.schemas import PredictionInput, PredictionResponse, Recommendation

class MLPredictor:
    @staticmethod
    def get_active_model_name() -> str:
        # Defaults to XGBoost if available, else Random Forest, else Decision Tree
        for name in ["xgboost", "random_forest", "decision_tree"]:
            if os.path.exists(os.path.join(settings.MODELS_DIR, f"{name}.joblib")):
                return name
        return None

    @staticmethod
    def predict(data: PredictionInput, model_override: str = None) -> PredictionResponse:
        model_name = model_override or MLPredictor.get_active_model_name() or "xgboost"
        model_path = os.path.join(settings.MODELS_DIR, f"{model_name}.joblib")
        encoders_path = os.path.join(settings.MODELS_DIR, "encoders.joblib")

        # Safe fallback if models aren't trained yet (mock prediction)
        if not os.path.exists(model_path) or not os.path.exists(encoders_path):
            return MLPredictor._fallback_prediction(data)

        try:
            model = joblib.load(model_path)
            encoders = joblib.load(encoders_path)

            # Prepare feature vector
            road_type_encoded = encoders["Road Type"].transform([data.road_type])[0]
            weather_encoded = encoders["Weather"].transform([data.weather])[0]

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

            # Predict Congestion Level index
            congestion_idx = int(model.predict(features)[0])
            congestion_level = encoders["Congestion Level"].inverse_transform([congestion_idx])[0]

            # Predict Probabilities for confidence
            try:
                probs = model.predict_proba(features)[0]
                confidence = float(np.max(probs))
            except Exception:
                confidence = 0.85

            return MLPredictor._generate_full_response(data, congestion_level, confidence)

        except Exception as e:
            print(f"Prediction Error: {e}. Falling back...")
            return MLPredictor._fallback_prediction(data)

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

        return MLPredictor._generate_full_response(data, congestion, 0.70)

    @staticmethod
    def _generate_full_response(data: PredictionInput, congestion_level: str, confidence: float) -> PredictionResponse:
        density = float(data.vehicle_count)

        base_speed = 70 if data.road_type == "Highway" else (40 if data.road_type == "Arterial" else 25)

        if congestion_level == "High":
            speed_factor = 0.25
            accident_risk = "High"
        elif congestion_level == "Moderate":
            speed_factor = 0.60
            accident_risk = "Medium"
        else:
            speed_factor = 0.95
            accident_risk = "Low"

        if data.weather in ["Rainy", "Foggy"]:
            speed_factor *= 0.8
            accident_risk = "High" if congestion_level != "Low" else "Medium"

        predicted_speed = max(5.0, base_speed * speed_factor)
        predicted_travel_time = (5.0 / predicted_speed) * 60  # standard 5km segment

        alt_route = "Route B via Outer Ring Road" if congestion_level == "High" else (
            "Route C via Service Lane" if congestion_level == "Moderate" else "No detour needed"
        )
        delay_mins = max(0.0, predicted_travel_time - ((5.0 / base_speed) * 60))

        fuel_saved = 0.0
        co2_saved = 0.0
        if congestion_level == "High":
            fuel_saved = 0.15 * delay_mins
            co2_saved = fuel_saved * 2.31
        elif congestion_level == "Moderate":
            fuel_saved = 0.08 * delay_mins
            co2_saved = fuel_saved * 2.31

        # Road Health Score (out of 100)
        road_health = max(30, int(100 - (data.vehicle_count / 10) - (data.accident_count * 15)))

        # Signal optimization
        if congestion_level == "High" and data.traffic_signal:
            signal_opt = "Increase Green light duration by 25 seconds"
        elif congestion_level == "Moderate" and data.traffic_signal:
            signal_opt = "Increase Green light duration by 10 seconds"
        else:
            signal_opt = "Keep current dynamic schedule"

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
