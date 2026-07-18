from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ModelMetadata
from app.schemas import PredictionInput, PredictionResponse
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
    # Verify model is trained if specific model requested
    if model_name:
        model_exists = db.query(ModelMetadata).filter(ModelMetadata.model_name == model_name).first()
        if not model_exists:
            model_name = None

    prediction = MLPredictor.predict(data, model_override=model_name)
    return prediction
