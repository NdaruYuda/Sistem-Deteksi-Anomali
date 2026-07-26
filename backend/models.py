# backend/models.py
from sqlalchemy import String, Column, Integer, Float, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
import bcrypt

Base = declarative_base()


class TestHistory(Base):
    __tablename__ = "test_history"
    
    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String)
    model_name = Column(String)
    
    recall = Column(Float, default=0.0)
    precision = Column(Float, default=0.0)
    f1_score = Column(Float, default=0.0)
    
    normal_count = Column(Integer, default=0)
    anomaly_count = Column(Integer, default=0)
    
    true_positive = Column(Integer, default=0)
    true_negative = Column(Integer, default=0)
    false_positive = Column(Integer, default=0)
    false_negative = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relasi ke user
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user = relationship("User", back_populates="histories")

    prediction_data = Column(JSON, nullable=True)


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="petugas")  # "petugas" atau "admin"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relasi ke test_history
    histories = relationship("TestHistory", back_populates="user")
    
    def set_password(self, password):
        """Hash password sebelum disimpan"""
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def check_password(self, password):
        """Verifikasi password"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))