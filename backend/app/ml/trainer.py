import os
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
from sklearn.preprocessing import LabelEncoder
import xgboost as xgb
from app.config import settings

class MLTrainer:
    @staticmethod
    def preprocess_data(df: pd.DataFrame):
        feature_cols = [
            "Latitude", "Longitude", "Vehicle Count", "Road Type",
            "Weather", "Temperature", "Humidity", "Accident Count",
            "Traffic Signal", "Holiday"
        ]

        for col in feature_cols:
            if col not in df.columns:
                if col in ["Latitude", "Longitude"]:
                    df[col] = 0.0
                elif col in ["Vehicle Count", "Accident Count"]:
                    df[col] = 0
                elif col in ["Temperature", "Humidity"]:
                    df[col] = 25.0
                elif col in ["Traffic Signal", "Holiday"]:
                    df[col] = 0
                else:
                    df[col] = "Unknown"

        X = df[feature_cols].copy()

        le_road_type = LabelEncoder()
        X["Road Type"] = le_road_type.fit_transform(X["Road Type"].astype(str))

        le_weather = LabelEncoder()
        X["Weather"] = le_weather.fit_transform(X["Weather"].astype(str))

        y_congestion = df["Congestion Level"].copy()
        le_congestion = LabelEncoder()
        unique_congestions = list(y_congestion.unique())
        if "Low" not in unique_congestions: unique_congestions.append("Low")
        if "Moderate" not in unique_congestions: unique_congestions.append("Moderate")
        if "High" not in unique_congestions: unique_congestions.append("High")
        le_congestion.fit(unique_congestions)
        y_congestion = le_congestion.transform(y_congestion)

        encoders = {
            "Road Type": le_road_type,
            "Weather": le_weather,
            "Congestion Level": le_congestion
        }

        return X, y_congestion, encoders

    @staticmethod
    def train_models(df: pd.DataFrame) -> dict:
        X, y, encoders = MLTrainer.preprocess_data(df)

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        encoders_path = os.path.join(settings.MODELS_DIR, "encoders.joblib")
        joblib.dump(encoders, encoders_path)

        results = {}

        # 1. Random Forest
        rf = RandomForestClassifier(n_estimators=100, random_state=42)
        rf.fit(X_train, y_train)
        rf_pred = rf.predict(X_test)
        rf_acc = accuracy_score(y_test, rf_pred)
        rf_prec, rf_rec, rf_f1, _ = precision_recall_fscore_support(y_test, rf_pred, average="weighted", zero_division=0)

        rf_model_path = os.path.join(settings.MODELS_DIR, "random_forest.joblib")
        joblib.dump(rf, rf_model_path)

        results["Random Forest"] = {
            "accuracy": float(rf_acc),
            "precision": float(rf_prec),
            "recall": float(rf_rec),
            "f1": float(rf_f1),
            "path": rf_model_path,
            "confusion_matrix": confusion_matrix(y_test, rf_pred).tolist(),
            "feature_importance": {k: float(v) for k, v in zip(X.columns, rf.feature_importances_)}
        }

        # 2. Decision Tree
        dt = DecisionTreeClassifier(random_state=42)
        dt.fit(X_train, y_train)
        dt_pred = dt.predict(X_test)
        dt_acc = accuracy_score(y_test, dt_pred)
        dt_prec, dt_rec, dt_f1, _ = precision_recall_fscore_support(y_test, dt_pred, average="weighted", zero_division=0)

        dt_model_path = os.path.join(settings.MODELS_DIR, "decision_tree.joblib")
        joblib.dump(dt, dt_model_path)

        results["Decision Tree"] = {
            "accuracy": float(dt_acc),
            "precision": float(dt_prec),
            "recall": float(dt_rec),
            "f1": float(dt_f1),
            "path": dt_model_path,
            "confusion_matrix": confusion_matrix(y_test, dt_pred).tolist(),
            "feature_importance": {k: float(v) for k, v in zip(X.columns, dt.feature_importances_)}
        }

        # 3. XGBoost
        xgb_clf = xgb.XGBClassifier(eval_metric="mlogloss", random_state=42, verbosity=0)
        xgb_clf.fit(X_train, y_train)
        xgb_pred = xgb_clf.predict(X_test)
        xgb_acc = accuracy_score(y_test, xgb_pred)
        xgb_prec, xgb_rec, xgb_f1, _ = precision_recall_fscore_support(y_test, xgb_pred, average="weighted", zero_division=0)

        xgb_model_path = os.path.join(settings.MODELS_DIR, "xgboost.joblib")
        joblib.dump(xgb_clf, xgb_model_path)

        results["XGBoost"] = {
            "accuracy": float(xgb_acc),
            "precision": float(xgb_prec),
            "recall": float(xgb_rec),
            "f1": float(xgb_f1),
            "path": xgb_model_path,
            "confusion_matrix": confusion_matrix(y_test, xgb_pred).tolist(),
            "feature_importance": {k: float(v) for k, v in zip(X.columns, xgb_clf.feature_importances_)}
        }

        return results
