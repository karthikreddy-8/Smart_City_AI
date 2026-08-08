"""
Weather Service – fetches live weather or returns realistic simulation.
"""
import datetime
from typing import Dict, Any


def get_weather(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Returns weather data. Tries OpenWeatherMap if an API key is configured,
    otherwise returns a time-aware simulated response.
    """
    import os
    api_key = os.getenv("OPENWEATHER_API_KEY", "")

    if api_key:
        try:
            import requests
            url = (
                f"https://api.openweathermap.org/data/2.5/weather"
                f"?lat={latitude}&lon={longitude}&appid={api_key}&units=metric"
            )
            resp = requests.get(url, timeout=4)
            if resp.status_code == 200:
                data = resp.json()
                weather_main = data.get("weather", [{}])[0]
                main = data.get("main", {})
                wind = data.get("wind", {})
                vis = data.get("visibility", 10000)
                condition = weather_main.get("description", "Clear Sky").title()
                rain = weather_main.get("main", "").lower() in ("rain", "drizzle", "thunderstorm")
                fog  = weather_main.get("main", "").lower() in ("mist", "fog", "haze", "smoke")
                temp = round(main.get("temp", 28.0), 1)
                humidity = main.get("humidity", 60)
                vis_km = round(vis / 1000, 1)

                impact = _traffic_impact(condition, rain, fog, vis_km)
                return {
                    "temperature": temp,
                    "weather_condition": condition,
                    "humidity": humidity,
                    "visibility_km": vis_km,
                    "wind_speed_kmh": round(wind.get("speed", 0) * 3.6, 1),
                    "fog": fog,
                    "rain": rain,
                    "traffic_impact": impact,
                }
        except Exception as e:
            print(f"[WARN] OpenWeather API error: {e}")

    # ── Simulated fallback ────────────────────────────────────────────────────
    hour = datetime.datetime.now().hour
    # Hyderabad climate simulation
    if 6 <= hour < 10:
        condition, temp, hum, vis = "Partly Cloudy", 26.0, 72, 8.0
        rain, fog = False, True
    elif 10 <= hour < 14:
        condition, temp, hum, vis = "Clear Sky", 34.0, 55, 10.0
        rain, fog = False, False
    elif 14 <= hour < 18:
        condition, temp, hum, vis = "Sunny with Haze", 36.5, 50, 9.0
        rain, fog = False, False
    elif 18 <= hour < 21:
        condition, temp, hum, vis = "Light Rain", 28.0, 80, 6.0
        rain, fog = True, False
    else:
        condition, temp, hum, vis = "Clear Night", 24.0, 65, 10.0
        rain, fog = False, False

    return {
        "temperature": temp,
        "weather_condition": condition,
        "humidity": hum,
        "visibility_km": vis,
        "wind_speed_kmh": 12.0,
        "fog": fog,
        "rain": rain,
        "traffic_impact": _traffic_impact(condition, rain, fog, vis),
    }


def _traffic_impact(condition: str, rain: bool, fog: bool, vis_km: float) -> str:
    if rain and vis_km < 4:
        return "Heavy rain with poor visibility – expect severe slowdowns."
    if rain:
        return "Rain detected – roads slippery, reduce speed."
    if fog or vis_km < 3:
        return "Low visibility due to fog – drive with caution."
    if "haze" in condition.lower():
        return "Hazy conditions – moderate traffic impact."
    return "Good driving conditions. Visibility clear."
