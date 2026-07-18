import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import User
from app.auth import get_password_hash
from app.routers import auth, admin, predict, analytics, reports

# ── Create all DB tables ───────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── Demo Account Seeding ───────────────────────────────────────────────────────
# Always ensures demo accounts exist with the correct credentials.
# Safe to run on every startup — it upserts, never duplicates.
DEMO_ACCOUNTS = [
    {
        "username": "admin",
        "email":    "admin@smartcityai.com",
        "password": "Admin@123",
        "role":     "Admin"
    },
    {
        "username": "analyst",
        "email":    "analyst@smartcityai.com",
        "password": "Analyst@123",
        "role":     "Traffic Analyst"
    },
    {
        "username": "guest",
        "email":    "guest@smartcityai.com",
        "password": "Guest@123",
        "role":     "Guest"
    },
]

def seed_demo_accounts():
    """Upsert demo accounts so they always have correct credentials."""
    db = SessionLocal()
    try:
        for account in DEMO_ACCOUNTS:
            # Check by email first
            existing = db.query(User).filter(User.email == account["email"]).first()
            if not existing:
                # Also check by username to avoid duplicate key errors
                existing = db.query(User).filter(User.username == account["username"]).first()

            if existing:
                # Always reset password and role to guarantee correctness
                existing.hashed_password = get_password_hash(account["password"])
                existing.email    = account["email"]
                existing.username = account["username"]
                existing.role     = account["role"]
                existing.is_active = True
                print(f"  ✅ Demo account updated: {account['email']} ({account['role']})")
            else:
                new_user = User(
                    username=account["username"],
                    email=account["email"],
                    hashed_password=get_password_hash(account["password"]),
                    role=account["role"],
                    is_active=True
                )
                db.add(new_user)
                print(f"  ✅ Demo account created: {account['email']} ({account['role']})")

        db.commit()
        print("SUCCESS: All demo accounts are ready.")
    except Exception as e:
        db.rollback()
        print(f"ERROR: Demo account seeding failed: {e}")
    finally:
        db.close()

seed_demo_accounts()
# ──────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Driven Urban Traffic Congestion Analytics and Intelligent Road Optimization API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ── CORS ───────────────────────────────────────────────────────────────────────
cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    cors_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
else:
    cors_origins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ──────────────────────────────────────────────────────────────────────────────

# Register all API routers
app.include_router(auth.router,      prefix=settings.API_V1_STR)
app.include_router(admin.router,     prefix=settings.API_V1_STR)
app.include_router(predict.router,   prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(reports.router,   prefix=settings.API_V1_STR)


@app.get("/")
def read_root():
    return {
        "status":   "Healthy",
        "project":  settings.PROJECT_NAME,
        "docs_url": "/docs",
        "message":  "Welcome to SmartCity AI API"
    }


@app.get("/health")
def health_check():
    """Lightweight health check endpoint for uptime monitoring."""
    return {"status": "ok"}
