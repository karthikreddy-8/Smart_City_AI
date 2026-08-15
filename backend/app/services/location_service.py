"""
Location Service – GPS utilities, reverse geocoding, nearest-camera resolution,
and travel-time estimation.
"""
import math
import requests
import os
from typing import Optional, Dict, Any
from app.services.camera_service import (
    get_all_cameras,
    get_nearest_camera,
    estimate_travel_time,
    _haversine,
)


def _tomtom_reverse_geocode(latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
    """Use TomTom Orbis v2 first for consistent mobile GPS address resolution."""
    key = os.getenv("TOMTOM_API_KEY", "").strip()
    if not key:
        return None
    try:
        response = requests.get(
            "https://api.tomtom.com/maps/orbis/places/reverseGeocode",
            params={
                "position": f"{longitude},{latitude}",
                "radiusInMeters": 1000,
                "geopoliticalView": "IN",
            },
            headers={
                "TomTom-Api-Version": "2",
                "TomTom-Api-Key": key,
                "Accept": "application/json",
                # Request the full result object; Orbis v2 requires an Attributes
                # header and the exact nested syntax varies by endpoint version.
                # "results" is the safest supported value.
                "Attributes": "results",
            },
            timeout=7,
        )
        if response.status_code != 200:
            print(f"[WARN] TomTom reverse geocode HTTP {response.status_code}")
            return None
        payload = response.json()
        rows = payload.get("results") or []
        if not rows:
            print("[WARN] TomTom reverse geocode returned no results.")
            return None
        first = rows[0] or {}
        addr = first.get("address") or {}
        return {
            "country": addr.get("country") or "Unknown Country",
            "state": addr.get("countrySubdivision") or "Unknown State",
            "city": addr.get("municipality") or "Unknown City",
            "district": addr.get("countrySecondarySubdivision") or addr.get("countryTertiarySubdivision") or addr.get("municipality") or "Unknown District",
            "area": (
                addr.get("neighborhood")
                or addr.get("municipalitySubdivision")
                or addr.get("municipalitySecondarySubdivision")
                or addr.get("countryTertiarySubdivision")
                or addr.get("countrySecondarySubdivision")
                or addr.get("municipality")
                or "Unknown Area"
            ),
            "road_name": addr.get("street") or "Unknown Road",
            "postal_code": addr.get("postalCode") or "Unknown Postal Code",
            "latitude": round(latitude, 5),
            "longitude": round(longitude, 5),
            "provider": "TomTom Reverse Geocoding",
        }
    except requests.RequestException as exc:
        print(f"[WARN] TomTom reverse geocode failed: {exc}")
        return None


def reverse_geocode(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Reverse geocode GPS coordinates using OpenStreetMap Nominatim API.
    Returns Country, State, City, District, Area, Road Name, Postal Code.
    """
    # Prefer TomTom when the project has a valid key; fall back to Nominatim
    # so GPS still works if the traffic provider is temporarily unavailable.
    tomtom_result = _tomtom_reverse_geocode(latitude, longitude)
    if tomtom_result:
        return tomtom_result

    url = "https://nominatim.openstreetmap.org/reverse"
    headers = {"User-Agent": "SmartCityAI-UrbanTrafficAnalytics/1.0"}
    params = {
        "lat": latitude,
        "lon": longitude,
        "format": "json",
        "addressdetails": 1,
    }

    try:
        resp = requests.get(url, headers=headers, params=params, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            addr = data.get("address", {})

            road = addr.get("road") or addr.get("pedestrian") or addr.get("street") or addr.get("footway") or "Unknown Road"
            area = (
                addr.get("suburb")
                or addr.get("neighbourhood")
                or addr.get("residential")
                or addr.get("quarter")
                or addr.get("subdistrict")
                or addr.get("city_district")
                or "Unknown Area"
            )
            city = (
                addr.get("city")
                or addr.get("town")
                or addr.get("village")
                or addr.get("municipality")
                or addr.get("county")
                or "Unknown City"
            )
            district = addr.get("state_district") or addr.get("county") or addr.get("district") or city
            state = addr.get("state") or "Unknown State"
            country = addr.get("country") or "Unknown Country"
            postcode = addr.get("postcode") or "Unknown Postal Code"

            return {
                "country": country,
                "state": state,
                "city": city,
                "district": district,
                "area": area,
                "road_name": road,
                "postal_code": postcode,
                "latitude": round(latitude, 5),
                "longitude": round(longitude, 5),
                "provider": "OpenStreetMap Nominatim",
            }
    except Exception as e:
        print(f"[WARN] Reverse geocode request failed: {e}")

    return {
        "country": "Unknown",
        "state": "Unknown",
        "city": "Unknown",
        "district": "Unknown",
        "area": "GPS Location Area",
        "road_name": "GPS Location Road",
        "postal_code": "Unknown",
        "latitude": round(latitude, 5),
        "longitude": round(longitude, 5),
        "provider": "GPS coordinates only",
    }


def resolve_nearest(latitude: float, longitude: float, max_distance_km: float = 50.0) -> Dict[str, Any]:
    """
    Given user GPS position, return nearest camera IF within max_distance_km radius.
    If no camera exists within max_distance_km, returns empty dict / no nearby camera.
    """
    cam = get_nearest_camera(latitude, longitude, online_only=True)
    if cam is None:
        cam = get_nearest_camera(latitude, longitude, online_only=False)

    if cam is None:
        return {"found": False, "message": "No nearby traffic cameras found."}

    dist = cam.get("distance_km", 0.0)
    if dist > max_distance_km:
        return {
            "found": False,
            "message": f"No traffic cameras found within {max_distance_km} km of your location.",
            "nearest_available_distance_km": dist,
        }

    travel_mins = estimate_travel_time(dist)
    return {
        "found": True,
        "camera": cam,
        "distance_km": dist,
        "estimated_travel_mins": travel_mins,
        "message": (
            f"Nearest Camera: {cam['id']} – {cam['name']} ({cam['road_name']}). "
            f"Distance: {dist} km, ~{travel_mins} min drive."
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# CASCADING LOCATION DROPDOWNS API
# ─────────────────────────────────────────────────────────────────────────────

KNOWN_HIERARCHY = {
    "India": {
        "Tamil Nadu": {
            "Chennai": {
                "Chennai": {
                    "T Nagar": {
                        "roads": ["Anna Salai", "G N Chetty Road", "Usman Road", "Venkatnarayana Road", "Pondy Bazaar Main Road"],
                        "junctions": {
                            "Anna Salai": ["Gemini Flyover", "Teynampet Junction", "Nandanam Signal", "Saidapet Junction"],
                            "G N Chetty Road": ["Vani Mahal Junction", "Sun Plaza Signal", "Panagal Park Circle"],
                            "Usman Road": ["Pondy Bazaar Junction", "Kodambakkam Flyover Signal"],
                            "Venkatnarayana Road": ["Nageswara Rao Park Junction", "T Nagar Bus Terminus Signal"],
                            "Pondy Bazaar Main Road": ["Panagal Park Junction", "Usman Road Flyover Signal"],
                        }
                    },
                    "Anna Nagar": {
                        "roads": ["Anna Nagar Second Avenue", "100 Feet Road", "10th Main Road", "Shanthi Colony Main Road"],
                        "junctions": {
                            "Anna Nagar Second Avenue": ["Anna Arch Junction", "Roundtana Circle", "Blue Star Junction"],
                            "100 Feet Road": ["Koyambedu Junction", "Thirumangalam Signal"],
                            "10th Main Road": ["Shanthi Colony Junction"],
                            "Shanthi Colony Main Road": ["Anna Nagar West Bus Depot Signal"],
                        }
                    },
                    "Adyar": {
                        "roads": ["Lattice Bridge Road", "Sardar Patel Road", "Adyar Bridge Road", "MG Road"],
                        "junctions": {
                            "Lattice Bridge Road": ["Adyar Signal", "Thiruvanmiyur Junction"],
                            "Sardar Patel Road": ["IIT Madras Gate Signal", "Gandhi Mandapam Junction"],
                            "Adyar Bridge Road": ["Karpagam Avenue Signal"],
                            "MG Road": ["Indira Nagar Signal"],
                        }
                    },
                    "Velachery": {
                        "roads": ["Velachery Main Road", "100 Feet Bypass Road", "Taramani Link Road"],
                        "junctions": {
                            "Velachery Main Road": ["Vijayanagar Junction", "Phoenix Mall Signal"],
                            "100 Feet Bypass Road": ["Kaiveli Signal", "Checkpost Junction"],
                            "Taramani Link Road": ["Taramani Signal", "Baby Nagar Junction"],
                        }
                    },
                    "Mylapore": {
                        "roads": ["RK Mutt Road", "Luz Church Road", "Kutchery Road", "Kamarajar Salai"],
                        "junctions": {
                            "RK Mutt Road": ["Luz Corner Junction", "Mandaveli Signal"],
                            "Luz Church Road": ["Isabel Hospital Signal"],
                            "Kutchery Road": ["Santhome High Road Junction"],
                            "Kamarajar Salai": ["Marina Beach Lighthouse Signal"],
                        }
                    },
                    "Guindy": {
                        "roads": ["GST Road", "Mount Poonamallee Road", "Inner Ring Road"],
                        "junctions": {
                            "GST Road": ["Kathipara Flyover Circle", "Guindy Station Signal"],
                            "Mount Poonamallee Road": ["Porur Junction", "Ramapuram Signal"],
                            "Inner Ring Road": ["Ekkattuthangal Signal"],
                        }
                    }
                }
            },
            "Coimbatore": {
                "Coimbatore": {
                    "Gandhipuram": {
                        "roads": ["Cross Cut Road", "Dr Nanjappa Road", "100 Feet Road"],
                        "junctions": {
                            "Cross Cut Road": ["Gandhipuram Signal", "GP Signal"],
                            "Dr Nanjappa Road": ["Voc Park Junction"],
                            "100 Feet Road": ["Power House Signal"],
                        }
                    },
                    "Peelamedu": {
                        "roads": ["Avinashi Road", "Hope College Road"],
                        "junctions": {
                            "Avinashi Road": ["Hope College Signal", "TIDEL Park Junction", "PSG Tech Signal"],
                            "Hope College Road": ["Airport Junction"],
                        }
                    },
                    "RS Puram": {
                        "roads": ["DB Road", "TV Samy Road"],
                        "junctions": {
                            "DB Road": ["Head Post Office Signal", "Milk Company Junction"],
                            "TV Samy Road": ["Cowley Brown Road Signal"],
                        }
                    }
                }
            },
            "Madurai": {
                "Madurai": {
                    "Goripalayam": {
                        "roads": ["APJ Abdul Kalam Road", "Bridge Road"],
                        "junctions": {
                            "APJ Abdul Kalam Road": ["Goripalayam Junction", "Government Hospital Signal"],
                        }
                    },
                    "KK Nagar": {
                        "roads": ["80 Feet Road", "Lake View Road"],
                        "junctions": {
                            "80 Feet Road": ["District Court Signal", "KK Nagar Circle"],
                        }
                    }
                }
            }
        },
        "Telangana": {
            "Hyderabad": {
                "Hyderabad": {
                    "Madhapur": {
                        "roads": ["Hitec City Main Road", "Inorbit Mall Road", "100 Feet Road"],
                        "junctions": {
                            "Hitec City Main Road": ["Cyber Towers Flyover Junction", "Mindspace Circle"],
                            "Inorbit Mall Road": ["Durgam Cheruvu Cable Bridge Junction"],
                            "100 Feet Road": ["Ayyappa Society Junction"],
                        }
                    },
                    "Gachibowli": {
                        "roads": ["Gachibowli Miyapur Road", "Financial District Main Road", "ORR Service Road"],
                        "junctions": {
                            "Gachibowli Miyapur Road": ["Gachibowli Flyover Junction", "DLF Cyber City Signal"],
                            "Financial District Main Road": ["Wipro Circle", "IIIT Junction"],
                        }
                    },
                    "Banjara Hills": {
                        "roads": ["Road No 1", "Road No 12", "Road No 36"],
                        "junctions": {
                            "Road No 1": ["Taj Krishna Signal", "Cancer Hospital Signal"],
                            "Road No 12": ["KBR Park Junction"],
                        }
                    },
                    "Jubilee Hills": {
                        "roads": ["Road No 36", "Road No 45"],
                        "junctions": {
                            "Road No 36": ["Jubilee Hills Check Post Junction", "Peddamma Temple Signal"],
                            "Road No 45": ["Durgam Cheruvu Flyover Junction"],
                        }
                    }
                }
            }
        },
        "Karnataka": {
            "Bengaluru Urban": {
                "Bengaluru": {
                    "Koramangala": {
                        "roads": ["100 Feet Road", "80 Feet Road", "Hosur Road", "Intermediate Ring Road"],
                        "junctions": {
                            "100 Feet Road": ["Sony World Signal", "Koramangala Sony Signal"],
                            "80 Feet Road": ["Regional Passport Office Junction"],
                            "Hosur Road": ["Silk Board Flyover Junction", "Forum Mall Signal"],
                        }
                    },
                    "Indiranagar": {
                        "roads": ["100 Feet Road", "CMH Road", "Old Airport Road"],
                        "junctions": {
                            "100 Feet Road": ["12th Main Junction", "Indiranagar KFC Signal"],
                            "CMH Road": ["Indiranagar Metro Signal"],
                            "Old Airport Road": ["Domlur Flyover Circle", "Command Hospital Signal"],
                        }
                    },
                    "Whitefield": {
                        "roads": ["Whitefield Main Road", "ITPL Main Road", "Varthur Road"],
                        "junctions": {
                            "Whitefield Main Road": ["Hope Farm Circle", "Forum Shantiniketan Signal"],
                            "ITPL Main Road": ["Big Bazaar Junction", "Graphite India Signal"],
                        }
                    },
                    "Electronic City": {
                        "roads": ["Electronic City Flyover Road", "Velankani Drive"],
                        "junctions": {
                            "Electronic City Flyover Road": ["Toll Plaza Junction", "Phase 1 Circle"],
                        }
                    },
                    "MG Road Area": {
                        "roads": ["MG Road", "Brigade Road", "Residency Road"],
                        "junctions": {
                            "MG Road": ["Trinity Circle", "Cauvery Handicrafts Junction"],
                            "Brigade Road": ["Operah House Junction"],
                        }
                    }
                }
            }
        },
        "Maharashtra": {
            "Mumbai Suburban": {
                "Mumbai": {
                    "Andheri West": {
                        "roads": ["Link Road", "SV Road", "JP Road"],
                        "junctions": {
                            "Link Road": ["Infinity Mall Junction", "Lokhandwala Signal"],
                            "SV Road": ["Andheri Station West Junction"],
                        }
                    },
                    "Bandra West": {
                        "roads": ["Linking Road", "Hill Road", "Carter Road"],
                        "junctions": {
                            "Linking Road": ["National College Signal", "Bandra Waterfield Road Junction"],
                        }
                    },
                    "BKC": {
                        "roads": ["BKC Main Road", "BKC Connector"],
                        "junctions": {
                            "BKC Main Road": ["NSE Circle", "Diamond Bourse Signal"],
                        }
                    }
                }
            },
            "Pune": {
                "Pune": {
                    "Hinjawadi": {
                        "roads": ["Hinjawadi Main Road", "Phase 1 Main Road"],
                        "junctions": {
                            "Hinjawadi Main Road": ["Bhumkar Chowk", "Shivaji Chowk"],
                        }
                    },
                    "Viman Nagar": {
                        "roads": ["Nagar Road", "Viman Nagar Main Road"],
                        "junctions": {
                            "Nagar Road": ["Phoenix Marketcity Junction", "Ramwadi Signal"],
                        }
                    }
                }
            }
        },
        "Delhi": {
            "Central Delhi": {
                "New Delhi": {
                    "Connaught Place": {
                        "roads": ["Radial Road 1", "Barakhamba Road", "Janpath"],
                        "junctions": {
                            "Radial Road 1": ["Rajiv Chowk Inner Circle"],
                            "Barakhamba Road": ["Mandi House Circle"],
                            "Janpath": ["Windsor Place Signal"],
                        }
                    },
                    "Vasant Kunj": {
                        "roads": ["Nelson Mandela Marg", "Vasant Kunj Marg"],
                        "junctions": {
                            "Nelson Mandela Marg": ["Ambience Mall Signal", "Vasant Square Junction"],
                        }
                    }
                }
            }
        }
    }
}


def _dynamic_nominatim_search(query: str, limit: int = 8) -> List[Dict[str, Any]]:
    """Query OSM Nominatim dynamically for places when not found in static list."""
    url = "https://nominatim.openstreetmap.org/search"
    headers = {"User-Agent": "SmartCityAI-UrbanTrafficAnalytics/1.0"}
    params = {
        "q": query,
        "format": "json",
        "limit": limit,
        "addressdetails": 1,
    }
    try:
        resp = requests.get(url, headers=headers, params=params, timeout=4)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"[WARN] Dynamic Nominatim search error: {e}")
    return []


def get_cascading_options(
    level: str,
    country: Optional[str] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    city: Optional[str] = None,
    area: Optional[str] = None,
    road: Optional[str] = None,
) -> List[str]:
    """
    Fetch cascading options dynamically.
    Levels: country -> state -> district -> city -> area -> road -> junction
    """
    level = level.lower().strip()

    if level == "country":
        base_countries = list(KNOWN_HIERARCHY.keys())
        extra = ["United States", "United Kingdom", "United Arab Emirates", "Singapore", "Australia", "Canada", "Germany", "Japan"]
        return sorted(list(set(base_countries + extra)))

    if level == "state":
        country_name = country or "India"
        if country_name in KNOWN_HIERARCHY:
            return sorted(list(KNOWN_HIERARCHY[country_name].keys()))
        return sorted(["Tamil Nadu", "Telangana", "Karnataka", "Maharashtra", "Delhi", "Kerala", "Gujarat", "West Bengal", "Andhra Pradesh", "Rajasthan", "Uttar Pradesh", "Punjab", "Haryana"])

    if level == "district":
        country_name = country or "India"
        state_name = state or "Tamil Nadu"
        if country_name in KNOWN_HIERARCHY and state_name in KNOWN_HIERARCHY[country_name]:
            return sorted(list(KNOWN_HIERARCHY[country_name][state_name].keys()))
        nominatim_results = _dynamic_nominatim_search(f"districts in {state_name}, {country_name}")
        districts = set()
        for r in nominatim_results:
            addr = r.get("address", {})
            d = addr.get("state_district") or addr.get("county") or addr.get("district")
            if d:
                districts.add(d)
        if districts:
            return sorted(list(districts))
        return sorted([state_name, f"{state_name} Central", f"{state_name} North", f"{state_name} South"])

    if level == "city":
        country_name = country or "India"
        state_name = state or "Tamil Nadu"
        district_name = district or "Chennai"
        if (
            country_name in KNOWN_HIERARCHY
            and state_name in KNOWN_HIERARCHY[country_name]
            and district_name in KNOWN_HIERARCHY[country_name][state_name]
        ):
            return sorted(list(KNOWN_HIERARCHY[country_name][state_name][district_name].keys()))
        return sorted([district_name, f"{district_name} Urban", f"{district_name} Metro", f"{district_name} Suburbs"])

    if level == "area":
        country_name = country or "India"
        state_name = state or "Tamil Nadu"
        district_name = district or "Chennai"
        city_name = city or district_name
        if (
            country_name in KNOWN_HIERARCHY
            and state_name in KNOWN_HIERARCHY[country_name]
            and district_name in KNOWN_HIERARCHY[country_name][state_name]
            and city_name in KNOWN_HIERARCHY[country_name][state_name][district_name]
        ):
            return sorted(list(KNOWN_HIERARCHY[country_name][state_name][district_name][city_name].keys()))
        results = _dynamic_nominatim_search(f"areas in {city_name}, {state_name}")
        found_areas = set()
        for r in results:
            addr = r.get("address", {})
            a = addr.get("suburb") or addr.get("neighbourhood") or addr.get("residential") or addr.get("quarter")
            if a:
                found_areas.add(a)
        if found_areas:
            return sorted(list(found_areas))
        return sorted([f"{city_name} Center", f"{city_name} East", f"{city_name} West", f"{city_name} North", f"{city_name} South"])

    if level == "road":
        country_name = country or "India"
        state_name = state or "Tamil Nadu"
        district_name = district or "Chennai"
        city_name = city or district_name
        area_name = area or "T Nagar"

        if (
            country_name in KNOWN_HIERARCHY
            and state_name in KNOWN_HIERARCHY[country_name]
            and district_name in KNOWN_HIERARCHY[country_name][state_name]
            and city_name in KNOWN_HIERARCHY[country_name][state_name][district_name]
            and area_name in KNOWN_HIERARCHY[country_name][state_name][district_name][city_name]
        ):
            return KNOWN_HIERARCHY[country_name][state_name][district_name][city_name][area_name].get("roads", [])

        results = _dynamic_nominatim_search(f"roads in {area_name}, {city_name}")
        found_roads = set()
        for r in results:
            addr = r.get("address", {})
            rd = addr.get("road") or addr.get("pedestrian") or addr.get("street")
            if rd:
                found_roads.add(rd)
        if found_roads:
            return sorted(list(found_roads))
        return [f"{area_name} Main Road", f"{area_name} Commercial Arterial", f"{area_name} Ring Road", f"{area_name} Bypass"]

    if level == "junction":
        country_name = country or "India"
        state_name = state or "Tamil Nadu"
        district_name = district or "Chennai"
        city_name = city or district_name
        area_name = area or "T Nagar"
        road_name = road or "Anna Salai"

        if (
            country_name in KNOWN_HIERARCHY
            and state_name in KNOWN_HIERARCHY[country_name]
            and district_name in KNOWN_HIERARCHY[country_name][state_name]
            and city_name in KNOWN_HIERARCHY[country_name][state_name][district_name]
            and area_name in KNOWN_HIERARCHY[country_name][state_name][district_name][city_name]
        ):
            j_dict = KNOWN_HIERARCHY[country_name][state_name][district_name][city_name][area_name].get("junctions", {})
            if road_name in j_dict:
                return j_dict[road_name]

        return [f"{road_name} Central Flyover", f"{road_name} Signal 1", f"{road_name} Bypass Circle", f"{road_name} Junction"]

    return []

