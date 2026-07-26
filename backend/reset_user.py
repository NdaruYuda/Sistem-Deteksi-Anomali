# backend/reset_users.py
from database import engine, SessionLocal
from models import User, Base
from sqlalchemy import text

def reset_users_only():
    print("="*60)
    print("🔄 RESET USER (TANPA MENGHAPUS HISTORY)")
    print("="*60)
    
    db = SessionLocal()
    try:
        # 1. Hapus semua data di tabel users
        db.execute(text("DELETE FROM users"))
        db.commit()
        print("✅ Semua user berhasil dihapus")
        
        # 2. Buat user admin baru
        admin = User(
            username="admin",
            email="admin@system.com",
            role="admin",
            is_active=True
        )
        admin.set_password("admin123")
        db.add(admin)
        print("✅ Admin user dibuat")
        
        # 3. Buat user petugas baru
        petugas = User(
            username="petugas",
            email="petugas@system.com",
            role="petugas",
            is_active=True
        )
        petugas.set_password("petugas123")
        db.add(petugas)
        print("✅ Petugas user dibuat")
        
        # 4. Commit ke database
        db.commit()
        
        print("\n" + "="*60)
        print("✅ RESET USER SELESAI!")
        print("="*60)
        print("🔑 Login Credentials:")
        print(f"   👤 Username: admin")
        print(f"   🔒 Password: admin123")
        print(f"   🎯 Role: admin")
        print()
        print(f"   👤 Username: petugas")
        print(f"   🔒 Password: petugas123")
        print(f"   🎯 Role: petugas")
        print("="*60)
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_users_only()