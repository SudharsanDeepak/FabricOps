import os
import joblib
import pandas as pd
import numpy as np
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from pdf_generator import generate_qa_report_pdf

# Initialize FastAPI App
app = FastAPI(
    title="FabricOps AI Quality Assurance Service",
    description="XGBoost-powered fabric roll quality prediction and automated Quality Assurance PDF generation.",
    version="1.0.0"
)

# Enable CORS for local dev across ports 5173, 5174, 5000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Path to trained model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "fabric_quality_model.joblib")

# Global model artifacts
model_bundle = None

def load_model():
    global model_bundle
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
    model_bundle = joblib.load(MODEL_PATH)
    print(f"[AI Service] Model loaded successfully from {MODEL_PATH}")

@app.on_event("startup")
def startup_event():
    load_model()

# Valid categories learned during training
VALID_FABRIC_TYPES = ['Cotton', 'Cotton-Polyester', 'Denim', 'Linen', 'Polyester', 'Viscose']
VALID_COLOURS = ['Beige', 'Black', 'Blue', 'Green', 'Grey', 'Navy', 'Red', 'White', 'Yellow']

class PredictionRequest(BaseModel):
    fabric_type: str = Field(..., example="Cotton")
    colour: str = Field(..., example="White")
    yarn_batch_age_days: float = Field(..., ge=0, example=15.0)
    production_length_m: float = Field(..., gt=0, example=1200.0)
    downtime_min: float = Field(..., ge=0, example=10.0)
    production_duration_min: float = Field(..., gt=0, example=140.0)
    # Contextual metadata
    roll_id: Optional[str] = "ROL-9041-A"
    order_number: Optional[str] = "ORD-2026-0018"
    loom_id: Optional[str] = "LOOM-AJ-01"
    customer_name: Optional[str] = "Apex Garments Sourcing Pvt Ltd"
    target_persona: Optional[str] = "MANAGER"  # "MANAGER" or "BUYER"

def normalize_category(val: str, valid_list: List[str], default_val: str) -> str:
    cleaned = str(val).strip().lower()
    for item in valid_list:
        if item.lower() == cleaned:
            return item
    for item in valid_list:
        if cleaned in item.lower() or item.lower() in cleaned:
            return item
    return default_val

@app.get("/health")
def health_check():
    global model_bundle
    return {
        "status": "healthy",
        "service": "FabricOps AI Quality Assurance Sentinel",
        "model_loaded": model_bundle is not None,
        "model_type": model_bundle.get("model_type", "XGBoost multiclass classifier") if model_bundle else None,
        "test_accuracy": model_bundle.get("test_accuracy", 0.5356) if model_bundle else None,
        "features": model_bundle.get("features", []) if model_bundle else [],
        "classes": list(model_bundle.get("label_encoder").classes_) if model_bundle else ["PASS", "REJECT", "REWORK"],
    }

@app.get("/api/v1/qc/metadata")
def get_qc_metadata():
    return {
        "model_name": "Fabricops AI-Powered Fabric Quality Assurance Model",
        "algorithm": "XGBoost Multiclass Classifier (Synthetic 200,000 Dataset)",
        "features": [
            {"name": "fabric_type", "type": "categorical", "options": VALID_FABRIC_TYPES},
            {"name": "colour", "type": "categorical", "options": VALID_COLOURS},
            {"name": "yarn_batch_age_days", "type": "numerical", "unit": "days", "min": 0, "max": 365},
            {"name": "production_length_m", "type": "numerical", "unit": "meters", "min": 10, "max": 100000},
            {"name": "downtime_min", "type": "numerical", "unit": "minutes", "min": 0, "max": 1440},
            {"name": "production_duration_min", "type": "numerical", "unit": "minutes", "min": 1, "max": 2880},
        ],
        "classes": ["PASS", "REWORK", "REJECT"],
        "descriptions": {
            "PASS": "Roll passes all ASTM D5430 optical inspections; authorized for export packaging.",
            "REWORK": "Minor warp tension deviation or selvedge slub; requires secondary stentering or shearing.",
            "REJECT": "Critical density inconsistency or yarn degradation; quarantined in silo."
        }
    }

@app.post("/api/v1/qc/predict")
def predict_quality(req: PredictionRequest):
    global model_bundle
    if not model_bundle:
        load_model()

    # Normalize categories to prevent OHE unknown category issues
    norm_fabric = normalize_category(req.fabric_type, VALID_FABRIC_TYPES, "Cotton")
    norm_colour = normalize_category(req.colour, VALID_COLOURS, "White")

    input_df = pd.DataFrame([{
        "fabric_type": norm_fabric,
        "colour": norm_colour,
        "yarn_batch_age_days": float(req.yarn_batch_age_days),
        "production_length_m": float(req.production_length_m),
        "downtime_min": float(req.downtime_min),
        "production_duration_min": float(req.production_duration_min)
    }])

    preprocessor = model_bundle["preprocessor"]
    model = model_bundle["model"]
    label_encoder = model_bundle["label_encoder"]

    try:
        X_trans = preprocessor.transform(input_df)
        pred_idx = int(model.predict(X_trans)[0])
        probabilities_raw = model.predict_proba(X_trans)[0]

        pred_label = str(label_encoder.inverse_transform([pred_idx])[0])

        prob_dict = {}
        for cls_name, prob in zip(label_encoder.classes_, probabilities_raw):
            prob_dict[str(cls_name)] = round(float(prob), 4)

        confidence = float(probabilities_raw[pred_idx])

        # Evaluate risk level
        if pred_label == "PASS":
            risk_level = "LOW"
            recommendation = "Approved for container stuffing and international shipping."
        elif pred_label == "REWORK":
            risk_level = "MEDIUM"
            recommendation = "Route to finishing bay for secondary shearing, inspect selvedges."
        else:
            risk_level = "HIGH"
            recommendation = "Quarantine fabric roll immediately. Perform tensile warp break test."

        return {
            "success": True,
            "predicted_status": pred_label,
            "confidence": round(confidence, 4),
            "probabilities": prob_dict,
            "risk_level": risk_level,
            "recommendation": recommendation,
            "normalized_inputs": {
                "fabric_type": norm_fabric,
                "colour": norm_colour,
                "yarn_batch_age_days": req.yarn_batch_age_days,
                "production_length_m": req.production_length_m,
                "downtime_min": req.downtime_min,
                "production_duration_min": req.production_duration_min,
            },
            "metadata": {
                "roll_id": req.roll_id,
                "order_number": req.order_number,
                "loom_id": req.loom_id,
                "customer_name": req.customer_name,
                "target_persona": req.target_persona,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/api/v1/qc/report/pdf")
def generate_pdf_report(req: PredictionRequest):
    # First get the prediction
    pred_res = predict_quality(req)

    # Merge metadata with prediction
    payload = {
        **pred_res["normalized_inputs"],
        "predicted_status": pred_res["predicted_status"],
        "confidence": pred_res["confidence"],
        "probabilities": pred_res["probabilities"],
        "risk_level": pred_res["risk_level"],
        "recommendation": pred_res["recommendation"],
        "roll_id": req.roll_id or "ROL-9041-A",
        "order_number": req.order_number or "ORD-2026-0018",
        "loom_id": req.loom_id or "LOOM-AJ-01",
        "customer_name": req.customer_name or "Apex Garments Sourcing Pvt Ltd",
    }

    persona = req.target_persona or "MANAGER"
    pdf_bytes = generate_qa_report_pdf(payload, target_persona=persona)

    filename = f"QA_Report_{payload['roll_id']}_{persona.lower()}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
