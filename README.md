# SmartCity AI ❖
### AI-Driven Urban Traffic Congestion Analytics & Intelligent Road Optimization System

SmartCity AI is a production-ready, industry-standard full-stack web application designed to clean urban traffic datasets, perform exploratory data analysis, train predictive machine learning models (XGBoost, Random Forest, Decision Tree), and provide intelligent road recommendations to optimize traffic signal timings and carbon offsets.

---

## 1. Project Architecture & Flowchart

```mermaid
graph TD
    A[Traffic CSV Data / Realtime Input] --> B[FastAPI Backend]
    B --> C[Data Cleaning Engine]
    C --> D[Missing Imputations / Outlier Capping]
    D --> E[PostgreSQL DB Storage]
    E --> F[ML Training & Evaluation Suite]
    F --> G[Random Forest / Decision Tree / XGBoost Models]
    G --> H[AI Inference & Optimization Recommendations]
    H --> I[React.js Glassmorphism UI Dashboards]
    I --> J[PDF / Excel Reports Download]
    I --> K[Interactive Leaflet Maps Hotspots]
```

### Database ER Diagram

```mermaid
erDiagram
    USERS {
        int id PK
        string email UNIQUE
        string username UNIQUE
        string hashed_password
        string role
        boolean is_active
    }
    DATASETS {
        int id PK
        string filename
        int row_count
        string status
        datetime uploaded_at
        int uploaded_by_id FK
    }
    TRAFFIC_RECORDS {
        int id PK
        int dataset_id FK
        datetime timestamp
        float latitude
        float longitude
        string road_name
        string road_type
        int vehicle_count
        float average_speed
        string weather
        float temperature
        float humidity
        int accident_count
        boolean traffic_signal
        boolean holiday
        float travel_time
        string congestion_level
    }
    MODELS {
        int id PK
        string model_name
        string file_path
        float accuracy
        float precision_score
        float recall_score
        float f1_score
        boolean is_active
        datetime trained_at
    }

    USERS ||--o{ DATASETS : uploads
    DATASETS ||--o{ TRAFFIC_RECORDS : contains
```

---

## 2. API Documentation

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/auth/register` | `POST` | All | Sign up new users (Admin, Traffic Analyst, Guest) |
| `/api/auth/login` | `POST` | All | Authenticate user credentials and return JWT bearer token |
| `/api/auth/profile` | `GET` | All | Retrieve current authenticated user profile parameters |
| `/api/admin/upload-csv` | `POST` | Analyst, Admin | Upload raw traffic CSV dataset, clean anomalies, and store records |
| `/api/admin/datasets` | `GET` | Analyst, Admin | List metadata for uploaded datasets |
| `/api/admin/datasets/{id}` | `DELETE` | Analyst, Admin | Remove dataset and cascade-delete all corresponding traffic logs |
| `/api/admin/train` | `POST` | Analyst, Admin | Run background model fitting (Random Forest vs XGBoost vs Decision Tree) |
| `/api/admin/models` | `GET` | Analyst, Admin | Return comparison statistics for all trained models |
| `/api/admin/models/{id}/activate` | `POST` | Analyst, Admin | Set selected model as active engine for real-time predictions |
| `/api/analytics/kpis` | `GET` | All | Retrieve total vehicles, road health score, and carbon emissions |
| `/api/analytics/charts` | `GET` | All | Fetch structured arrays for hourly, weekly, and road type charts |
| `/api/analytics/map-markers` | `GET` | All | Fetch coordinate locations, speed logs, and active congestion |
| `/api/predict` | `POST` | All | Evaluate traffic scenario using active AI engine & output eco recommendations |
| `/api/reports/pdf` | `GET` | All | Generate and stream executive PDF analysis reports |
| `/api/reports/excel` | `GET` | All | Download workbook spreadsheets containing traffic data |

---

## 3. Installation & Local Setup

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a python virtual environment:
   ```bash
   python -m venv venv
   source venv/Scripts/activate  # On Windows: venv\Scripts\activate
   ```
3. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the development API server:
   ```bash
   python run.py
   ```
   *The FastAPI server will run on: http://localhost:8000*
   *API interactive Swagger docs: http://localhost:8000/docs*

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Launch local Vite development server:
   ```bash
   npm run dev
   ```
   *The web app will run on: http://localhost:5173*

---

## 4. Production Cloud Deployment Guide

### A. Database Setup (Neon PostgreSQL)
1. Register for a free tier database at [Neon.tech](https://neon.tech).
2. Create a new PostgreSQL project and copy the connection string.
3. Configure your backend deployment environment variables to use this string: `DATABASE_URL=postgresql://user:password@endpoint.neon.tech/dbname?sslmode=require`.

### B. Backend Deployment (Render or Railway)
1. Push the code repository to GitHub.
2. Sign in to [Render](https://render.com) and create a new **Web Service**.
3. Link your GitHub repository.
4. Set the build parameters:
   - **Environment**: Python
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `python backend/run.py` (ensure port is dynamically bound to `PORT` environment variable or uvicorn gets run on `$PORT`).
5. Configure Environment Variables:
   - `DATABASE_URL` (your Neon connection string)
   - `SECRET_KEY` (a random secure key)

### C. Frontend Deployment (Vercel)
1. Register on [Vercel](https://vercel.com) and create a **New Project**.
2. Select your repository.
3. Configure settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable:
   - `VITE_API_URL` (set to your deployed Render URL: `https://your-service.onrender.com/api`)
5. Click **Deploy**. The application is now live and fully responsive!
