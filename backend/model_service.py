# backend/model_service.py
import torch
import torch.nn as nn
import torch.nn.functional as F
import json
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from pathlib import Path
import os
import joblib

# ============================================================
# ARSITEKTUR MODEL (SESUAI COLAB)
# ============================================================

class EncoderMLP(nn.Module):
    """Encoder MLP untuk SimCLR (dari Colab)"""
    def __init__(self, input_dim=11, output_dim=64):
        super(EncoderMLP, self).__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(512, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, output_dim)
        )
        self.output_dim = output_dim

    def forward(self, x):
        return self.encoder(x)

class AnomalyDetector(nn.Module):
    """Anomaly Detector (Encoder + Classifier) dari Colab"""
    def __init__(self, encoder):
        super(AnomalyDetector, self).__init__()
        self.encoder = encoder
        self.classifier = nn.Sequential(
            nn.Linear(encoder.output_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 2)
        )

    def forward(self, x):
        h = self.encoder(x)
        return self.classifier(h)

class SimpleMLP(nn.Module):
    """Baseline MLP (Skenario 1) dari Colab"""
    def __init__(self, input_dim=11, num_classes=2):
        super(SimpleMLP, self).__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, 512),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, num_classes)
        )

    def forward(self, x):
        return self.network(x)


# ============================================================
# MODEL SERVICE - MENGGUNAKAN JOBLIB
# ============================================================

class ModelService:
    def __init__(self, model_dir="trained_models"):
        self.model_dir = Path(model_dir)
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        self.models = {}
        self.encoders = {}
        self.scaler = None
        self.features = []
        self.categorical_features = ['proto', 'conn_state']
        self.num_features = []
        self.classes = ['Benign (Normal)', 'Malicious (Anomali)']
        
        # Load semua komponen
        self.load_features()
        self.load_scaler_joblib()
        self.load_encoders_joblib()
        self.load_models()
        
        print("="*60)
        print("✅ MODEL SERVICE INITIALIZED")
        print("="*60)
        print(f"   Device: {self.device}")
        print(f"   Features: {len(self.features)} features")
        print(f"   Models loaded: {list(self.models.keys())}")
        print("="*60)
    
    def load_features(self):
        """Load features.json"""
        features_path = self.model_dir / "features.json"
        if features_path.exists():
            with open(features_path, 'r') as f:
                data = json.load(f)
            self.features = data.get('features', [])
            self.classes = data.get('classes', ['Benign (Normal)', 'Malicious (Anomali)'])
            print(f"📋 Features loaded: {len(self.features)} features")
        else:
            self.features = [
                'id.orig_p', 'id.resp_p', 'proto', 'duration',
                'orig_bytes', 'resp_bytes', 'conn_state',
                'orig_pkts', 'resp_pkts', 'orig_ip_bytes', 'resp_ip_bytes'
            ]
            print(f"⚠️ features.json not found, using default features")
        
        self.num_features = [f for f in self.features if f not in self.categorical_features]
    
    def load_scaler_joblib(self):
        """Load scaler menggunakan joblib"""
        scaler_path = self.model_dir / "scaler.pkl"
        
        if scaler_path.exists():
            try:
                self.scaler = joblib.load(scaler_path)
                print("📊 Scaler loaded (joblib)")
                return
            except Exception as e:
                print(f"⚠️ Error loading scaler with joblib: {e}")
                try:
                    import pickle
                    with open(scaler_path, 'rb') as f:
                        self.scaler = pickle.load(f)
                    print("📊 Scaler loaded (pickle fallback)")
                    return
                except Exception as e2:
                    print(f"⚠️ Pickle fallback juga gagal: {e2}")
        else:
            print(f"⚠️ scaler.pkl not found at: {scaler_path}")
        
        self.scaler = StandardScaler()
        print("⚠️ WARNING: Scaler tidak dilatih, prediksi mungkin tidak akurat!")
    
    def load_encoders_joblib(self):
        """Load categorical encoders menggunakan joblib"""
        encoders_found = False
        
        proto_path = self.model_dir / "proto_encoder.pkl"
        if proto_path.exists():
            try:
                self.encoders['proto'] = joblib.load(proto_path)
                print("🔤 Proto encoder loaded (joblib)")
                encoders_found = True
            except Exception as e:
                print(f"⚠️ Gagal load proto_encoder: {e}")
        
        conn_path = self.model_dir / "conn_state_encoder.pkl"
        if conn_path.exists():
            try:
                self.encoders['conn_state'] = joblib.load(conn_path)
                print("🔤 Conn state encoder loaded (joblib)")
                encoders_found = True
            except Exception as e:
                print(f"⚠️ Gagal load conn_state_encoder: {e}")
        
        if not encoders_found:
            print("⚠️ Tidak ada encoder yang berhasil di-load")
    
    def load_models(self):
        """Load all PyTorch models"""
        
        # 1. Baseline MLP
        baseline_path = self.model_dir / "baseline_model.pth"
        if baseline_path.exists():
            try:
                model = SimpleMLP(input_dim=len(self.features), num_classes=2)
                state_dict = torch.load(baseline_path, map_location=self.device)
                model.load_state_dict(state_dict)
                model.to(self.device)
                model.eval()
                self.models['baseline'] = model
                print("🧠 Baseline MLP model loaded")
            except Exception as e:
                print(f"⚠️ Failed to load baseline_model: {e}")
        else:
            print("⚠️ baseline_model.pth not found")
        
        # 2. SimCLR Encoder
        encoder_path = self.model_dir / "simclr_encoder_weights.pth"
        if encoder_path.exists():
            try:
                encoder = EncoderMLP(input_dim=len(self.features), output_dim=64)
                state_dict = torch.load(encoder_path, map_location=self.device)
                encoder.load_state_dict(state_dict)
                encoder.to(self.device)
                encoder.eval()
                self.models['encoder'] = encoder
                print("🧠 SimCLR Encoder loaded")
            except Exception as e:
                print(f"⚠️ Failed to load simclr_encoder_weights: {e}")
        else:
            print("⚠️ simclr_encoder_weights.pth not found")
        
        # 3. Anomaly Detector
        anomaly_path = self.model_dir / "anomaly_detector.pth"
        if anomaly_path.exists():
            try:
                encoder = EncoderMLP(input_dim=len(self.features), output_dim=64)
                encoder_path = self.model_dir / "simclr_encoder_weights.pth"
                if encoder_path.exists():
                    encoder.load_state_dict(torch.load(encoder_path, map_location=self.device))
                
                model = AnomalyDetector(encoder)
                state_dict = torch.load(anomaly_path, map_location=self.device)
                model.load_state_dict(state_dict)
                model.to(self.device)
                model.eval()
                self.models['simclr'] = model
                print("🧠 Anomaly Detector (SimCLR) loaded")
            except Exception as e:
                print(f"⚠️ Failed to load anomaly_detector: {e}")
        else:
            print("⚠️ anomaly_detector.pth not found")
    
    def preprocess(self, df):
        """
        Preprocess dataframe sesuai dengan Colab:
        1. Pilih 11 fitur
        2. Encode categorical (proto, conn_state)
        3. Scale numerical
        """
        X = df[self.features].copy()
        
        # 2. Handle missing values
        for col in ['duration', 'orig_bytes', 'resp_bytes']:
            if col in X.columns:
                X[col] = X[col].replace('-', 0)
                X[col] = pd.to_numeric(X[col], errors='coerce').fillna(0)
        
        # 3. Encode categorical features
        for cat_feat in self.categorical_features:
            if cat_feat in X.columns and cat_feat in self.encoders:
                encoder = self.encoders[cat_feat]
                try:
                    X[cat_feat] = encoder.transform(X[cat_feat].astype(str))
                except:
                    X[cat_feat] = X[cat_feat].astype(str).apply(
                        lambda x: encoder.transform([x])[0] if x in encoder.classes_ else -1
                    )
        
        # 4. Konversi ke float
        X = X.astype(float)
        
        # 5. Scaling
        if self.scaler is not None:
            try:
                X_scaled = self.scaler.transform(X)
            except Exception as e:
                print(f"⚠️ Scaling error: {e}, menggunakan data tanpa scaling")
                X_scaled = X.values
        else:
            X_scaled = X.values
        
        return X_scaled
    
    def predict_batch(self, X, model_name):
        """Predict on preprocessed data"""
        if model_name not in self.models:
            raise ValueError(f"Model '{model_name}' not found. Available: {list(self.models.keys())}")
        
        model = self.models[model_name]
        model.eval()
        X_tensor = torch.FloatTensor(X).to(self.device)
        
        with torch.no_grad():
            outputs = model(X_tensor)
            probabilities = torch.softmax(outputs, dim=1)
            predictions = torch.argmax(outputs, dim=1)
        
        return predictions.cpu().numpy(), probabilities.cpu().numpy()
    
    def predict(self, file_path, model_name):
        """Predict anomaly on CSV file"""
        
        # ============================================================
        # 1. BACA CSV
        # ============================================================
        df = pd.read_csv(file_path)
        
        # ============================================================
        # 2. VALIDASI KOLOM
        # ============================================================
        missing_cols = set(self.features) - set(df.columns)
        if missing_cols:
            return {
                "error": f"Missing columns: {missing_cols}",
                "required": self.features
            }
        
        # ============================================================
        # 3. PREPROCESSING
        # ============================================================
        X_processed = self.preprocess(df)
        
        # ============================================================
        # 4. PREDIKSI
        # ============================================================
        if model_name not in self.models:
            return {"error": f"Model '{model_name}' not found"}
        
        y_pred, y_prob = self.predict_batch(X_processed, model_name)
        
        # ============================================================
        # 5. HITUNG DISTRIBUSI
        # ============================================================
        normal_count = int(np.sum(y_pred == 0))
        anomaly_count = int(np.sum(y_pred == 1))
        
        result = {
            "model_name": "Baseline MLP" if model_name == "baseline" else "SimCLR + MLP",
            "normal_count": normal_count,
            "anomaly_count": anomaly_count,
            "total": len(y_pred),
        }
        
        # ============================================================
        # 6. HITUNG METRIK JIKA LABEL TERSEDIA
        # ============================================================
        if 'label' in df.columns:
            from sklearn.metrics import recall_score, precision_score, f1_score, confusion_matrix
            
            # 🔍 DEBUG: Cek label di CSV
            print("="*60)
            print("🔍 DEBUG LABEL ENCODING")
            print("="*60)
            print(f"Unique labels in CSV: {df['label'].unique()}")
            print(f"Label counts: {df['label'].value_counts().to_dict()}")
            print(f"Label dtype: {df['label'].dtype}")
            print(f"Label has NaN: {df['label'].isna().any()}")
            
            # 🔥 PERBAIKAN 1: HANDLE LABEL DENGAN LEBIH FLEKSIBEL
            unique_labels = df['label'].unique()
            
            # Cek apakah ada nilai NaN di label
            if df['label'].isna().any():
                print("⚠️ Ada NaN di label! Mengganti dengan 0...")
                df['label'] = df['label'].fillna(0)
            
            # Mapping label yang fleksibel
            if 'Benign' in unique_labels and 'Malicious' in unique_labels:
                y_true = df['label'].map({'Benign': 0, 'Malicious': 1})
                print("✅ Mapping: Benign → 0, Malicious → 1")
            elif 'Normal' in unique_labels and 'Anomali' in unique_labels:
                y_true = df['label'].map({'Normal': 0, 'Anomali': 1})
                print("✅ Mapping: Normal → 0, Anomali → 1")
            elif 'benign' in unique_labels and 'malicious' in unique_labels:
                y_true = df['label'].map({'benign': 0, 'malicious': 1})
                print("✅ Mapping: benign → 0, malicious → 1")
            elif 'normal' in unique_labels and 'anomali' in unique_labels:
                y_true = df['label'].map({'normal': 0, 'anomali': 1})
                print("✅ Mapping: normal → 0, anomali → 1")
            else:
                # 🔥 PERBAIKAN 2: COBA KONVERSI LANGSUNG KE NUMERIC
                try:
                    y_true = pd.to_numeric(df['label'], errors='coerce')
                    y_true = y_true.fillna(0).astype(int)
                    print("✅ Konversi ke numeric berhasil")
                except Exception as e:
                    print(f"⚠️ Gagal konversi numeric: {e}")
                    # Fallback: auto mapping berdasarkan nilai unik
                    unique_vals = sorted([v for v in unique_labels if pd.notna(v)])
                    mapping = {val: i for i, val in enumerate(unique_vals)}
                    y_true = df['label'].map(mapping)
                    y_true = y_true.fillna(0).astype(int)
                    print(f"✅ Auto-mapping: {mapping}")
            
            y_true = y_true.values
            
            # 🔥 PERBAIKAN 3: PASTIKAN Y_PRED INTEGER
            y_pred = y_pred.astype(int)
            
            print(f"y_true unique: {np.unique(y_true)}")
            print(f"y_true counts: {np.bincount(y_true)}")
            print(f"y_pred unique: {np.unique(y_pred)}")
            print(f"y_pred counts: {np.bincount(y_pred)}")
            print("="*60)
            
            # 🔥 PERBAIKAN 4: HITUNG METRIK DENGAN ERROR HANDLING
            try:
                # Cek apakah ada kedua kelas di y_true dan y_pred
                if len(np.unique(y_true)) >= 2 and len(np.unique(y_pred)) >= 2:
                    result["recall"] = float(recall_score(y_true, y_pred, average='binary'))
                    result["precision"] = float(precision_score(y_true, y_pred, average='binary'))
                    result["f1_score"] = float(f1_score(y_true, y_pred, average='binary'))
                    
                    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
                    
                    # 🔥 PERBAIKAN 5: PASTIKAN TIDAK ADA NAN/INF
                    result["tp"] = int(tp) if not np.isnan(tp) and not np.isinf(tp) else 0
                    result["tn"] = int(tn) if not np.isnan(tn) and not np.isinf(tn) else 0
                    result["fp"] = int(fp) if not np.isnan(fp) and not np.isinf(fp) else 0
                    result["fn"] = int(fn) if not np.isnan(fn) and not np.isinf(fn) else 0
                    
                    print(f"✅ Confusion Matrix: TN={result['tn']}, FP={result['fp']}, FN={result['fn']}, TP={result['tp']}")
                else:
                    # Jika hanya satu kelas
                    print("⚠️ Hanya satu kelas yang terdeteksi di y_true atau y_pred")
                    result["recall"] = 0.0
                    result["precision"] = 0.0
                    result["f1_score"] = 0.0
                    result["tp"] = 0
                    result["tn"] = 0
                    result["fp"] = 0
                    result["fn"] = 0
                    
            except Exception as e:
                print(f"⚠️ Error calculating metrics: {e}")
                result["recall"] = 0.0
                result["precision"] = 0.0
                result["f1_score"] = 0.0
                result["tp"] = 0
                result["tn"] = 0
                result["fp"] = 0
                result["fn"] = 0
            
            print("="*60)
        
        # ============================================================
        # 7. ✅ TAMBAHKAN DETAIL PREDIKSI PER BARIS
        # ============================================================
        prediction_details = []
        for i, row in df.iterrows():
            prediction_details.append({
                'id_orig_p': row.get('id.orig_p', '-'),
                'id_resp_p': row.get('id.resp_p', '-'),
                'proto': row.get('proto', '-'),
                'duration': row.get('duration', 0),
                'orig_bytes': row.get('orig_bytes', 0),
                'resp_bytes': row.get('resp_bytes', 0),
                'conn_state': row.get('conn_state', '-'),
                'orig_pkts': row.get('orig_pkts', 0),
                'resp_pkts': row.get('resp_pkts', 0),
                'orig_ip_bytes': row.get('orig_ip_bytes', 0),
                'resp_ip_bytes': row.get('resp_ip_bytes', 0),
                'predicted_label': 'Normal' if y_pred[i] == 0 else 'Anomali',
                'probability': float(y_prob[i][1]) if len(y_prob.shape) > 1 else float(y_prob[i])
            })
        
        result["prediction_details"] = prediction_details
        print(f"✅ Added {len(prediction_details)} prediction details")
        
        return result
    
    def get_model_info(self):
        """Get information about loaded models"""
        return {
            "models": list(self.models.keys()),
            "features": self.features,
            "num_features": len(self.features),
            "categorical_features": self.categorical_features,
            "classes": self.classes,
            "device": str(self.device),
            "is_ready": len(self.models) > 0,
            "scaler_loaded": self.scaler is not None
        }


# ============================================================
# SINGLETON INSTANCE
# ============================================================

model_service = ModelService()