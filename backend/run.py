import sys
import os
import uvicorn

# Add backend directory to sys.path so 'app' module can always be imported
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    # Run from anywhere: python backend/run.py
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

