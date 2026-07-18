import requests
import random

API_URL = "http://localhost:8000/api/auth"

def test_auth():
    uid = random.randint(1, 1000000)
    print("Testing Registration...")
    res = requests.post(f"{API_URL}/register", json={
        "username": f"testuser_{uid}",
        "email": f"testuser_{uid}@example.com",
        "password": "Password@123",
        "role": "Traffic Analyst"
    })
    print("Register Response:", res.status_code, res.text)
    
    print("\nTesting Login...")
    res = requests.post(f"{API_URL}/login", data={
        "username": f"testuser_{uid}",
        "password": "Password@123"
    })
    print("Login Response:", res.status_code, res.text)

if __name__ == "__main__":
    test_auth()
