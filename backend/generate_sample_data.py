import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_data(num_rows=2000):
    np.random.seed(42)
    
    # Roads mapping
    roads = {
        "Grand Trunk Road": ("Highway", 28.6139, 77.2090),
        "Ring Road": ("Highway", 28.5672, 77.2100),
        "Connaught Place Inner Circle": ("Arterial", 28.6304, 77.2177),
        "Vikas Marg": ("Arterial", 28.6387, 77.2758),
        "Nelson Mandela Marg": ("Arterial", 28.5416, 77.1643),
        "MG Road": ("Highway", 28.4595, 77.0266),
        "Park Street": ("Local", 22.5488, 88.3523),
        "Outer Ring Road": ("Highway", 28.6400, 77.1200),
        "Lodi Road": ("Local", 28.5878, 77.2245),
        "Sardar Patel Marg": ("Arterial", 28.5990, 77.1770)
    }
    
    road_names = list(roads.keys())
    
    start_date = datetime(2026, 6, 1)
    
    data = []
    for i in range(num_rows):
        road = np.random.choice(road_names)
        road_type, base_lat, base_lng = roads[road]
        
        # Add small random variation to coordinates
        lat = base_lat + np.random.uniform(-0.01, 0.01)
        lng = base_lng + np.random.uniform(-0.01, 0.01)
        
        # Date & Time
        days_offset = np.random.randint(0, 30)
        hour = np.random.randint(0, 24)
        minute = int(np.random.choice([0, 15, 30, 45]))
        dt = start_date + timedelta(days=days_offset, hours=hour, minutes=minute)
        
        date_str = dt.strftime("%Y-%m-%d")
        time_str = dt.strftime("%H:%M")
        
        # Factors affecting speed and count
        is_rush_hour = (7 <= hour <= 10) or (17 <= hour <= 20)
        is_weekend = dt.weekday() >= 5
        holiday = int(np.random.choice([0, 1], p=[0.95, 0.05]))
        
        weather = np.random.choice(["Clear", "Rainy", "Snowy", "Foggy"], p=[0.75, 0.18, 0.02, 0.05])
        
        # Temperature & Humidity
        if weather == "Clear":
            temp = np.random.uniform(28, 42)
            humidity = np.random.uniform(30, 60)
        elif weather == "Rainy":
            temp = np.random.uniform(22, 30)
            humidity = np.random.uniform(80, 100)
        elif weather == "Snowy":
            temp = np.random.uniform(-5, 5)
            humidity = np.random.uniform(70, 95)
        else: # Foggy
            temp = np.random.uniform(10, 20)
            humidity = np.random.uniform(85, 100)
            
        # Vehicle Count
        base_vehicles = 150 if road_type == "Highway" else (80 if road_type == "Arterial" else 30)
        if is_rush_hour:
            base_vehicles *= np.random.uniform(1.8, 2.5)
        if is_weekend or holiday:
            base_vehicles *= np.random.uniform(0.6, 0.8)
            
        vehicle_count = int(base_vehicles * np.random.uniform(0.8, 1.2))
        
        # Accident
        accident = int(np.random.choice([0, 1, 2], p=[0.97, 0.025, 0.005]))
        
        # Traffic Signal status
        traffic_signal = int(np.random.choice([0, 1], p=[0.3, 0.7]))
        
        # Average Speed
        base_speed = 70 if road_type == "Highway" else (40 if road_type == "Arterial" else 25)
        speed_factor = 1.0
        if is_rush_hour:
            speed_factor *= 0.45
        if weather in ["Rainy", "Foggy"]:
            speed_factor *= 0.7
        if weather == "Snowy":
            speed_factor *= 0.5
        if accident > 0:
            speed_factor *= (0.3 / accident)
            
        avg_speed = max(5, base_speed * speed_factor * np.random.uniform(0.8, 1.2))
        
        # Travel time (in minutes) for a standardized 5km segment
        travel_time = (5.0 / avg_speed) * 60 # distance / speed * 60 minutes
        
        # Congestion Level
        if avg_speed < 15 or vehicle_count > 250:
            congestion = "High"
        elif avg_speed < 35 or vehicle_count > 120:
            congestion = "Moderate"
        else:
            congestion = "Low"
            
        data.append({
            "Date": date_str,
            "Time": time_str,
            "Latitude": lat,
            "Longitude": lng,
            "Road Name": road,
            "Road Type": road_type,
            "Vehicle Count": vehicle_count,
            "Average Speed": round(avg_speed, 2),
            "Weather": weather,
            "Temperature": round(temp, 1),
            "Humidity": round(humidity, 1),
            "Accident Count": accident,
            "Traffic Signal": traffic_signal,
            "Holiday": holiday,
            "Travel Time": round(travel_time, 2),
            "Congestion Level": congestion
        })
        
    df = pd.DataFrame(data)
    
    # Intentionally inject anomalies (for cleaning validation)
    # 1. Missing values (nulls)
    df.loc[np.random.choice(df.index, 30), "Average Speed"] = np.nan
    df.loc[np.random.choice(df.index, 30), "Temperature"] = np.nan
    df.loc[np.random.choice(df.index, 20), "Weather"] = None
    
    # 2. Outliers
    df.loc[np.random.choice(df.index, 10), "Vehicle Count"] = 9999  # extreme outlier
    df.loc[np.random.choice(df.index, 10), "Average Speed"] = -50    # invalid negative speed
    
    # 3. Invalid Coordinates
    df.loc[np.random.choice(df.index, 5), "Latitude"] = 999.0       # invalid lat
    
    # 4. Duplicate rows
    duplicates = df.sample(n=25, random_state=42)
    df = pd.concat([df, duplicates], ignore_index=True)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname("data/"), exist_ok=True)
    df.to_csv("data/sample_traffic_data.csv", index=False)
    print("Successfully generated data/sample_traffic_data.csv with anomalies.")

if __name__ == "__main__":
    generate_data()
