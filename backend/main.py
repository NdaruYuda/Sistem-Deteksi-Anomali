# backend/main.py
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from database import SessionLocal
from models import TestHistory, User
from model_service import model_service
from auth import create_access_token, get_current_user, get_current_admin
from pydantic import BaseModel
import shutil
import os
import pandas as pd
import numpy as np
import bcrypt

app = FastAPI(title="Deteksi Anomali Jaringan", version="1.0.0")

# ============================================================
# KONFIGURASI CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# KONFIGURASI UPLOAD FILE
# ============================================================

MAX_FILE_SIZE = 500 * 1024 * 1024
ALLOWED_EXTENSIONS = ['.csv']

# ============================================================
# PYDANTIC MODELS
# ============================================================

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    role: str = "petugas"

class UpdateUserRequest(BaseModel):
    email: str = None
    role: str = None
    is_active: bool = None
    password: str = None

# ============================================================
# ROOT & AUTH ENDPOINTS
# ============================================================

@app.get("/")
def root():
    return {
        "message": "Sistem Deteksi Anomali",
        "status": "running",
        "models": list(model_service.models.keys())
    }

@app.get("/model-info")
def get_model_info():
    return model_service.get_model_info()

@app.post("/auth/login")
def login(request: LoginRequest):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == request.username).first()
        if not user:
            raise HTTPException(400, "Username atau password salah")
        
        if not user.check_password(request.password):
            raise HTTPException(400, "Username atau password salah")
        
        if not user.is_active:
            raise HTTPException(403, "Akun Anda telah dinonaktifkan")
        
        token = create_access_token({"sub": str(user.id), "role": user.role})
        
        return {
            "token": token,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role
            }
        }
    finally:
        db.close()

@app.post("/auth/register")
def register(request: RegisterRequest, current_user: User = Depends(get_current_admin)):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(
            (User.username == request.username) | (User.email == request.email)
        ).first()
        if existing:
            raise HTTPException(400, "Username atau email sudah terdaftar")
        
        new_user = User(
            username=request.username,
            email=request.email,
            role=request.role
        )
        new_user.set_password(request.password)
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        return {
            "message": "User berhasil dibuat",
            "user": {
                "id": new_user.id,
                "username": new_user.username,
                "email": new_user.email,
                "role": new_user.role
            }
        }
    finally:
        db.close()

@app.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active
    }

# ============================================================
# ADMIN ENDPOINTS
# ============================================================

@app.get("/admin/users")
def get_all_users(current_user: User = Depends(get_current_admin)):
    db = SessionLocal()
    try:
        users = db.query(User).all()
        return [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "role": u.role,
                "is_active": u.is_active,
                "created_at": str(u.created_at)
            }
            for u in users
        ]
    finally:
        db.close()

@app.put("/admin/users/{user_id}")
def update_user(user_id: int, request: UpdateUserRequest, current_user: User = Depends(get_current_admin)):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(404, "User tidak ditemukan")
        
        if request.email is not None:
            user.email = request.email
        if request.role is not None:
            user.role = request.role
        if request.is_active is not None:
            user.is_active = request.is_active
        if request.password:
            user.set_password(request.password)
        
        db.commit()
        db.refresh(user)
        
        return {
            "message": "User berhasil diupdate",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "is_active": user.is_active
            }
        }
    finally:
        db.close()

@app.delete("/admin/users/{user_id}")
def delete_user(user_id: int, current_user: User = Depends(get_current_admin)):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(404, "User tidak ditemukan")
        
        if user.id == current_user.id:
            raise HTTPException(400, "Tidak bisa menghapus akun sendiri")
        
        db.delete(user)
        db.commit()
        
        return {"message": "User berhasil dihapus"}
    finally:
        db.close()

# ============================================================
# PREDICTION ENDPOINT
# ============================================================

@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    model: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    db = SessionLocal()
    file_path = None
    
    try:
        if not file.filename.endswith('.csv'):
            raise HTTPException(400, "File harus berformat CSV (.csv)")
        
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            max_mb = MAX_FILE_SIZE / (1024 * 1024)
            file_mb = file_size / (1024 * 1024)
            raise HTTPException(
                413, 
                f"Ukuran file terlalu besar ({file_mb:.2f} MB). Maksimal {int(max_mb)} MB"
            )
        
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file.filename)
        
        with open(file_path, "wb") as buffer:
            chunk_size = 1024 * 1024
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                buffer.write(chunk)
        
        try:
            df = pd.read_csv(file_path)
            if df.empty:
                raise HTTPException(400, "File CSV kosong")
        except pd.errors.EmptyDataError:
            raise HTTPException(400, "File CSV kosong")
        except Exception as e:
            raise HTTPException(400, f"File CSV tidak valid: {str(e)}")
        
        try:
            result = model_service.predict(file_path, model)
        except Exception as e:
            raise HTTPException(500, f"Error prediksi: {str(e)}")
        
        if "error" in result:
            raise HTTPException(400, result["error"])
        
        history = TestHistory(
            file_name=file.filename,
            model_name=result["model_name"],
            recall=result.get("recall", 0.0),
            precision=result.get("precision", 0.0),
            f1_score=result.get("f1_score", 0.0),
            normal_count=result.get("normal_count", 0),
            anomaly_count=result.get("anomaly_count", 0),
            true_positive=result.get("tp", 0),
            true_negative=result.get("tn", 0),
            false_positive=result.get("fp", 0),
            false_negative=result.get("fn", 0),
            user_id=current_user.id,
            prediction_data=result.get("prediction_details", [])  # ✅ TAMBAHKAN 1 BARIS INI!
        )
        
        db.add(history)
        db.commit()
        db.refresh(history)
        
        # if os.path.exists(file_path):
        #     os.remove(file_path)
        
        return {
            "id": history.id,
            "model_name": result["model_name"],
            "recall": result.get("recall", 0.0),
            "precision": result.get("precision", 0.0),
            "f1_score": result.get("f1_score", 0.0),
            "normal_count": result.get("normal_count", 0),
            "anomaly_count": result.get("anomaly_count", 0),
            "total": result.get("total", 0),
            "tp": result.get("tp", 0),
            "tn": result.get("tn", 0),
            "fp": result.get("fp", 0),
            "fn": result.get("fn", 0),
            "prediction_data": result.get("prediction_details", [])  # ✅ Kirim detail prediksi
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(500, f"Terjadi kesalahan: {str(e)}")
    finally:
        db.close()

# ============================================================
# HISTORY ENDPOINT
# ============================================================

@app.get("/history")
def get_history(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        if current_user.role == "admin":
            history = db.query(TestHistory).order_by(TestHistory.id.desc()).all()
        else:
            history = db.query(TestHistory).filter(
                TestHistory.user_id == current_user.id
            ).order_by(TestHistory.id.desc()).all()
        
        return [
            {
                "id": row.id,
                "file_name": row.file_name,
                "model_name": row.model_name,
                "recall": row.recall,
                "precision": row.precision,
                "f1_score": row.f1_score,
                "normal_count": row.normal_count,
                "anomaly_count": row.anomaly_count,
                "true_positive": row.true_positive,
                "true_negative": row.true_negative,
                "false_positive": row.false_positive,
                "false_negative": row.false_negative,
                "created_at": row.created_at,
                "user_id": row.user_id
            }
            for row in history
        ]
    finally:
        db.close()

# ============================================================
# DASHBOARD ENDPOINT - MENAMPILKAN HASIL PREDIKSI
# ============================================================

@app.get("/dashboard/{model}")
def get_dashboard(model: str, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        model_map = {
            "baseline": "Baseline MLP",
            "simclr": "SimCLR + MLP"
        }
        
        if model not in model_map:
            return {"message": "model tidak ditemukan"}
        
        db_model = model_map[model]
        
        query = db.query(TestHistory).filter(TestHistory.model_name == db_model)
        if current_user.role != "admin":
            query = query.filter(TestHistory.user_id == current_user.id)
        
        latest = query.order_by(TestHistory.id.desc()).first()
        total_test = query.count()
        
        if not latest:
            return {"message": "Belum ada data pengujian untuk model ini"}
        
        # ============================================================
        # ✅ AMBIL DATA PREDIKSI DARI DATABASE (BATASI 1000 DATA)
        # ============================================================
        prediction_details = []
        total_data = 0
        total_normal = latest.normal_count or 0
        total_anomali = latest.anomaly_count or 0
        DISPLAY_LIMIT = 1000  # ✅ TAMBAHKAN INI!
        
        # ✅ CEK APAKAH ADA prediction_data DI DATABASE
        if latest.prediction_data:
            # ✅ AMBIL HANYA 1000 DATA PERTAMA
            prediction_details = latest.prediction_data[:DISPLAY_LIMIT]
            total_data = len(latest.prediction_data)  # ✅ Total tetap dari semua data
            print(f"✅ Loaded {len(prediction_details)} rows from DATABASE (total: {total_data})")
        else:
            print("⚠️ No prediction_data in database")
            prediction_details = []
        
        return {
            "total_test": total_test,
            "id": latest.id,
            "file_name": latest.file_name,
            "model_name": latest.model_name,
            "recall": latest.recall,
            "precision": latest.precision,
            "f1_score": latest.f1_score,
            "normal_count": latest.normal_count,
            "anomaly_count": latest.anomaly_count,
            "true_positive": latest.true_positive,
            "true_negative": latest.true_negative,
            "false_positive": latest.false_positive,
            "false_negative": latest.false_negative,
            "created_at": str(latest.created_at),
            "total_data": total_data,  # ✅ Total data (140.784)
            "total_normal": total_normal,
            "total_anomali": total_anomali,
            "prediction_details": prediction_details  # ✅ Hanya 1000 data pertama
        }
    finally:
        db.close()

# ============================================================
# DEBUG ENDPOINT
# ============================================================

@app.get("/debug/last-prediction")
def get_last_prediction(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        latest = db.query(TestHistory).order_by(TestHistory.id.desc()).first()
        if not latest:
            return {"message": "Belum ada data"}
        
        return {
            "id": latest.id,
            "file_name": latest.file_name,
            "model_name": latest.model_name,
            "recall": latest.recall,
            "precision": latest.precision,
            "f1_score": latest.f1_score,
            "normal_count": latest.normal_count,
            "anomaly_count": latest.anomaly_count,
            "true_positive": latest.true_positive,
            "true_negative": latest.true_negative,
            "false_positive": latest.false_positive,
            "false_negative": latest.false_negative,
        }
    finally:
        db.close()