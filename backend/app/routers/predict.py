from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ModelMetadata
from app.schemas import (
    PredictionInput, PredictionResponse,
    RoutePredictionInput, RoutePredictionResponse
)
from app.ml.predictor import MLPredictor
from app.auth import get_current_user, User

router = APIRouter(prefix="/predict", tags=["AI Predictions"])

@router.post("", response_model=PredictionResponse)
def get_prediction(
    data: PredictionInput,
    model_name: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if model_name:
        model_exists = db.query(ModelMetadata).filter(ModelMetadata.model_name == model_name).first()
        if not model_exists:
            model_name = None

    prediction = MLPredictor.predict(data, model_override=model_name)
    return prediction

@router.post("/route", response_model=RoutePredictionResponse)
def get_route_prediction(
    data: RoutePredictionInput,
    model_name: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if model_name:
        model_exists = db.query(ModelMetadata).filter(ModelMetadata.model_name == model_name).first()
        if not model_exists:
            model_name = None

    route_prediction = MLPredictor.predict_route(data, model_override=model_name)
    return route_prediction

