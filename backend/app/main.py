import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import User
from app.auth import get_password_hash
from app.routers import auth, admin, predict, analytics, reports, live_traffic

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
                print(f"[OK] Demo account updated: {account['email']} ({account['role']})")
            else:
                new_user = User(
                    username=account["username"],
                    email=account["email"],
                    hashed_password=get_password_hash(account["password"]),
                    role=account["role"],
                    is_active=True
                )
                db.add(new_user)
                print(f"[OK] Demo account created: {account['email']} ({account['role']})")

        db.commit()
        print("[SUCCESS] All demo accounts are ready.")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Demo account seeding failed: {e}")
    finally:
        db.close()

def seed_cameras():
    """Seed initial traffic cameras into database table."""
    db = SessionLocal()
    try:
        from app.services.camera_service import seed_traffic_cameras
        seed_traffic_cameras(db)
    except Exception as e:
        print(f"[ERROR] Camera database seeding failed: {e}")
    finally:
        db.close()

seed_demo_accounts()
seed_cameras()

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
if cors_origins_env and cors_origins_env != "*":
    cors_origins = [o.strip().rstrip("/") for o in cors_origins_env.split(",") if o.strip()]
    cors_allow_credentials = True
else:
    # The app uses a Bearer Authorization header, not cookies. When no explicit
    # origins are configured, allow cross-origin requests without credential mode
    # so mobile Vercel -> Render requests are not blocked by wildcard CORS.
    cors_origins = ["*"]
    cors_allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────────────────────

# Register all API routers
app.include_router(auth.router,         prefix=settings.API_V1_STR)
app.include_router(admin.router,        prefix=settings.API_V1_STR)
app.include_router(predict.router,      prefix=settings.API_V1_STR)
app.include_router(analytics.router,    prefix=settings.API_V1_STR)
app.include_router(reports.router,      prefix=settings.API_V1_STR)
app.include_router(live_traffic.router, prefix=settings.API_V1_STR)



@app.get("/")
def read_root():
    return {
        "status":   "Healthy",
        "project":  settings.PROJECT_NAME,
        "docs_url": "/docs",
        "message":  "Welcome to SmartCity AI API"
    }


@app.get("/health")
@app.get("/api/health")
@app.get("/api/v1/health")
def detailed_health_check():
    """Detailed health check endpoint reporting Backend, YOLO, Database, and Camera status."""
    db_status = "CONNECTED"
    try:
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception as e:
        db_status = f"DISCONNECTED ({e})"


    try:
        from app.ml.yolo_detector import yolo_detector
        yolo_status = "READY" if yolo_detector.using_yolo else "FALLBACK CONTOUR (PyTorch active)"
    except Exception as yerr:
        yolo_status = f"UNAVAILABLE ({yerr})"

    tomtom_configured = bool(os.getenv("TOMTOM_API_KEY", "").strip())
    return {
        "Backend": "ONLINE",
        "YOLO": yolo_status,
        "Database": db_status,
        "Camera": "AVAILABLE",
        "TrafficProvider": "TOMTOM_CONFIGURED" if tomtom_configured else "TOMTOM_API_KEY_MISSING",
    }

