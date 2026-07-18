import asyncio
from app.database import SessionLocal
from app.models import User
from app.auth import verify_password, get_password_hash

def test_login():
    db = SessionLocal()
    users = db.query(User).all()
    print("Users in DB:")
    for u in users:
        print(f"- {u.email}, {u.username}, Role: {u.role}, Active: {u.is_active}")
        
    print("\nTesting Guest Login:")
    user = db.query(User).filter(User.email == "guest@smartcityai.com").first()
    if user:
        is_valid = verify_password("Guest@123", user.hashed_password)
        print(f"Guest@123 valid for {user.email}? {is_valid}")
        
    print("\nTesting Analyst Login:")
    user = db.query(User).filter(User.email == "analyst@smartcityai.com").first()
    if user:
        is_valid = verify_password("Analyst@123", user.hashed_password)
        print(f"Analyst@123 valid for {user.email}? {is_valid}")

if __name__ == "__main__":
    test_login()
