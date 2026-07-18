import urllib.request
import json
import os

with open("token.txt") as f:
    token = f.read().strip()

print(f"Using token: {token[:40]}...")

# ---- Upload CSV ----
csv_path = os.path.join(os.path.dirname(__file__), "data", "sample_traffic_data.csv")
boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
filename = "sample_traffic_data.csv"

with open(csv_path, "rb") as f:
    csv_data = f.read()

part_header = (
    "--" + boundary + "\r\n"
    "Content-Disposition: form-data; name=\"file\"; filename=\"" + filename + "\"\r\n"
    "Content-Type: text/csv\r\n\r\n"
).encode()

body = part_header + csv_data + ("\r\n--" + boundary + "--\r\n").encode()

req = urllib.request.Request(
    "http://localhost:8000/api/admin/upload-csv",
    data=body,
    method="POST",
)
req.add_header("Authorization", "Bearer " + token)
req.add_header("Content-Type", "multipart/form-data; boundary=" + boundary)

print("\n--- Uploading CSV ---")
try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read())
        print("SUCCESS:", json.dumps(result, indent=2))
        dataset_id = result.get("id") or result.get("dataset_id")
except urllib.error.HTTPError as e:
    body_err = e.read().decode()
    print("HTTP", e.code, ":", body_err)
    dataset_id = None

# ---- Train Model ----
print("\n--- Training Random Forest Model ---")
train_payload = json.dumps({"model_type": "random_forest"}).encode()
req2 = urllib.request.Request(
    "http://localhost:8000/api/admin/train",
    data=train_payload,
    method="POST",
)
req2.add_header("Authorization", "Bearer " + token)
req2.add_header("Content-Type", "application/json")
try:
    with urllib.request.urlopen(req2, timeout=300) as resp2:
        train_result = json.loads(resp2.read())
        print("TRAIN SUCCESS:", json.dumps(train_result, indent=2))
except urllib.error.HTTPError as e2:
    print("HTTP", e2.code, ":", e2.read().decode())

# ---- List Datasets ----
print("\n--- Listing Datasets ---")
req3 = urllib.request.Request("http://localhost:8000/api/admin/datasets")
req3.add_header("Authorization", "Bearer " + token)
try:
    with urllib.request.urlopen(req3, timeout=30) as resp3:
        print(json.dumps(json.loads(resp3.read()), indent=2))
except urllib.error.HTTPError as e3:
    print("HTTP", e3.code, ":", e3.read().decode())

# ---- KPIs ----
print("\n--- Fetching KPIs ---")
req4 = urllib.request.Request("http://localhost:8000/api/analytics/kpis")
req4.add_header("Authorization", "Bearer " + token)
try:
    with urllib.request.urlopen(req4, timeout=30) as resp4:
        print(json.dumps(json.loads(resp4.read()), indent=2))
except urllib.error.HTTPError as e4:
    print("HTTP", e4.code, ":", e4.read().decode())
