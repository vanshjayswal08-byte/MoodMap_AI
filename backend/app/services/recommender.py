import requests
import math
import random
import logging
import time
import concurrent.futures
import difflib
import json
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, timedelta
from app.models.schemas import PlaceRequest, PlaceResponse

# --- AI NLP Model Setup ---
try:
    from sentence_transformers import SentenceTransformer, util
    import torch
    NLP_AVAILABLE = True
except ImportError:
    SentenceTransformer = None
    util = None
    torch = None
    NLP_AVAILABLE = False
    print("WARNING: sentence-transformers not installed.")

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: \n%(message)s"
)
logger = logging.getLogger("PlaceRecommenderService")

# ─────────────────────────────────────────────
#  API KEYS & CONSTANTS
# ─────────────────────────────────────────────
FOURSQUARE_API_KEY = "8f29ba756160b090ae28a0bb1018689d" 
GEOAPIFY_API_KEY = "9dcaaabfadcb4075b85873cdd8258e58"   

OVERPASS_MIRRORS = [
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]

DEFAULT_IMAGES: Dict[str, List[str]] = {
    "cafe": ["https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80"],
    "restaurant": ["https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80"],
    "gym": ["https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=600&q=80"],
    "park": ["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=600&q=80"],
    "bar": ["https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=600&q=80"],
    "default": ["https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=600&q=80"],
}

MOOD_PROFILES: List[Dict[str, Any]] = [
    {
        "description": "chill relax calm coffee peaceful quiet cozy cafe library study book",
        "osm_filter": '["amenity"~"cafe|library|ice_cream"]',
        "geoapify": "catering.cafe,catering.ice_cream,education.library",
        "categories": ["cafe", "library", "ice_cream", "lounge"],
        "intent_label": "chill_spots",
    },
    {
        "description": "party fun club nightlife drink celebrate festive loud bar pub dance",
        "osm_filter": '["amenity"~"pub|bar|nightclub|biergarten"]',
        "geoapify": "catering.bar,catering.pub,entertainment.nightclub",
        "categories": ["bar", "pub", "nightclub", "lounge"],
        "intent_label": "nightlife_party",
    },
    {
        "description": "happy joy smile fun weekend vibe ice cream amusement cinema",
        "osm_filter": '["amenity"~"ice_cream|cinema|cafe|arts_centre"]["leisure"~"amusement_arcade"]',
        "geoapify": "catering.ice_cream,entertainment.cinema,entertainment.amusement_arcade",
        "categories": ["ice_cream", "cinema", "cafe", "amusement"],
        "intent_label": "happy_vibes",
    },
    {
        "description": "romantic date love couple rooftop intimate dinner lake park beautiful",
        "osm_filter": '["amenity"~"restaurant|cafe"]["leisure"~"park"]',
        "geoapify": "catering.restaurant,leisure.park",
        "categories": ["restaurant", "park", "lake", "rooftop"],
        "intent_label": "romantic_date",
    },
    {
        "description": "hungry food eat dinner lunch breakfast craving bite tasty delicious restaurant",
        "osm_filter": '["amenity"~"restaurant|fast_food|food_court"]',
        "geoapify": "catering.restaurant,catering.fast_food",
        "categories": ["restaurant", "fast_food", "food_court", "diner"],
        "intent_label": "dining_food",
    },
    {
        "description": "nature peace park fresh air walk outdoor greenery trees lake garden forest",
        "osm_filter": '["leisure"~"park|garden|nature_reserve"]',
        "geoapify": "leisure.park,national_park",
        "categories": ["park", "garden", "nature_reserve", "lake"],
        "intent_label": "nature_outdoors",
    },
    {
        "description": "workout active gym fitness exercise training motivated lifting weights sweat run yoga crossfit",
        "osm_filter": '["leisure"~"fitness_centre|sports_centre"]',
        "geoapify": "sport.fitness,sport.sports_centre,sport.yoga",
        "categories": ["fitness_centre", "sports_centre", "gym", "yoga_studio", "crossfit"],
        "intent_label": "fitness_workout",
    },
    {
        "description": "shop mall buy shopping retail browse clothes market store",
        "osm_filter": '["shop"~"mall|department_store|supermarket"]',
        "geoapify": "commercial.shopping_mall,commercial.supermarket",
        "categories": ["mall", "supermarket", "store", "boutique"],
        "intent_label": "shopping_retail",
    },
]

CACHE_EXPIRY_MINUTES = 10
EARTH_RADIUS_KM = 6371.0

class PlaceRecommenderService:
    def __init__(self) -> None:
        self._cache: Dict[str, Dict[str, Any]] = {}
        self.nlp_model: Any = None 
        self.profile_embeddings: Any = None
        
        # 🔥 WARM UP THE NLP MODEL ON STARTUP
        self._warmup_nlp_model()
        logger.info("Service initialized. Ultra-Fast Priority Image Engine Ready.")

    def _warmup_nlp_model(self):
        """Loads the heavy NLP model into memory before users hit the API."""
        global NLP_AVAILABLE
        if NLP_AVAILABLE and self.nlp_model is None:
            logger.info("⏳ Warming up SentenceTransformer NLP model...")
            try:
                # Need to use type ignore to suppress Pylance warning for dynamic imports
                self.nlp_model = SentenceTransformer('all-MiniLM-L6-v2') # type: ignore
                descriptions = [p["description"] for p in MOOD_PROFILES]
                self.profile_embeddings = self.nlp_model.encode(descriptions, convert_to_tensor=True)
                logger.info("✅ NLP model loaded and embeddings cached!")
            except Exception as e:
                logger.error(f"❌ AI Loading failed: {e}")
                NLP_AVAILABLE = False

    def _expand_query_intent(self, user_mood: str) -> Dict[str, Any]:
        if NLP_AVAILABLE and self.nlp_model is None:
            self._warmup_nlp_model()

        best_profile = None
        confidence = 0.0

        # Type checking to satisfy Pylance
        if self.nlp_model is not None and util is not None and torch is not None:
            mood_emb = self.nlp_model.encode(user_mood, convert_to_tensor=True)
            scores = util.cos_sim(mood_emb, self.profile_embeddings) 
            best_idx = int(torch.argmax(scores)) 
            confidence = float(scores[0][best_idx]) 
            
            if confidence > 0.15:
                best_profile = MOOD_PROFILES[best_idx]
        
        if not best_profile:
            mood_lower = user_mood.lower()
            keyword_scores = [(p, sum(1 for kw in str(p["description"]).split() if kw in mood_lower)) for p in MOOD_PROFILES]
            best_match, best_score = max(keyword_scores, key=lambda x: x[1])
            best_profile = best_match if best_score > 0 else next(p for p in MOOD_PROFILES if "restaurant" in p["categories"])
            confidence = float(best_score / 10.0)

        expanded_query = {
            "original_query": user_mood,
            "ai_intent": best_profile["intent_label"],
            "confidence_score": round(confidence * 100, 2),
            "expanded_categories": best_profile["categories"],
            "api_filters": {
                "osm_query": best_profile["osm_filter"],
                "geoapify_tags": best_profile["geoapify"]
            }
        }
        logger.info(f"🧠 AI QUERY EXPANSION TRIGGERED:\n{json.dumps(expanded_query, indent=4)}")
        return expanded_query

    def _haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        d_lat, d_lon = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
        a = math.sin(d_lat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2)**2
        return round(EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 2)

    def _generate_rating(self, name: str) -> float:
        rng = random.Random(name)
        return round(rng.uniform(3.8, 4.9), 1)

    def _get_best_images(self, place_name: str, category: str, pre_fetched_urls: Optional[List[str]] = None) -> List[str]:
        if pre_fetched_urls and len(pre_fetched_urls) > 0:
            return pre_fetched_urls 

        pool = DEFAULT_IMAGES.get(category, DEFAULT_IMAGES["default"])
        rng = random.Random(place_name)
        return [rng.choice(pool)]

    def _fetch_foursquare(self, request: PlaceRequest, expanded_query: Dict[str, Any]) -> List[PlaceResponse]:
        if not FOURSQUARE_API_KEY: return []
        categories = expanded_query["expanded_categories"]
        search_query = " ".join(categories[:2])
        
        fields = "fsq_id,name,geocodes,location,categories,rating,photos"
        url = f"https://api.foursquare.com/v3/places/search?query={search_query}&ll={request.latitude},{request.longitude}&radius={int((request.radius_km or 15) * 1000)}&limit=10&fields={fields}"
        headers = {"Accept": "application/json", "Authorization": FOURSQUARE_API_KEY}
        places = []
        try:
            resp = requests.get(url, headers=headers, timeout=5)
            if resp.status_code == 200:
                for res in resp.json().get("results", []):
                    lat, lng = res["geocodes"]["main"]["latitude"], res["geocodes"]["main"]["longitude"]
                    category_names = [c.get("name", "").lower() for c in res.get("categories", [])]
                    combined_types = list(dict.fromkeys(category_names + categories))
                    raw_rating = res.get("rating")
                    real_rating = round(raw_rating / 2.0, 1) if raw_rating is not None else self._generate_rating(res.get("name", ""))
                    
                    photos = res.get("photos", [])
                    pre_fetched_urls = [f"{p['prefix']}original{p['suffix']}" for p in photos[:4]]
                    img_urls = self._get_best_images(res.get("name", ""), categories[0], pre_fetched_urls)
                    
                    places.append(PlaceResponse(
                        id=f"fsq_{res['fsq_id']}", name=res.get("name", ""), rating=real_rating, 
                        distance=self._haversine_distance(request.latitude, request.longitude, lat, lng),
                        address=res.get("location", {}).get("address", "Moradabad"), openNow=True,
                        types=combined_types, images=img_urls, lat=lat, lng=lng
                    ))
        except Exception as e: logger.warning(f"FSQ failed: {e}")
        return places

    def _fetch_geoapify(self, request: PlaceRequest, expanded_query: Dict[str, Any]) -> List[PlaceResponse]:
        if not GEOAPIFY_API_KEY: return []
        geo_filter = expanded_query["api_filters"]["geoapify_tags"]
        categories = expanded_query["expanded_categories"]
        url = f"https://api.geoapify.com/v2/places?categories={geo_filter}&filter=circle:{request.longitude},{request.latitude},{int((request.radius_km or 15) * 1000)}&limit=10&apiKey={GEOAPIFY_API_KEY}"
        places = []
        try:
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                for feature in resp.json().get("features", []):
                    props = feature["properties"]
                    name = props.get("name", "")
                    if not name: continue
                    actual_type = props.get("datasource", {}).get("raw", {}).get("amenity") or categories[0]
                    combined_types = list(dict.fromkeys([actual_type] + categories))
                    lat, lng = props["lat"], props["lon"]
                    
                    img_urls = self._get_best_images(name, categories[0])
                    
                    places.append(PlaceResponse(
                        id=f"geo_{props.get('place_id')}", name=name, rating=self._generate_rating(name),
                        distance=self._haversine_distance(request.latitude, request.longitude, lat, lng),
                        address=props.get("street", "Moradabad"), openNow=True,
                        types=combined_types, images=img_urls, lat=lat, lng=lng
                    ))
        except Exception as e: logger.warning(f"Geoapify failed: {e}")
        return places

    def _fetch_overpass(self, request: PlaceRequest, expanded_query: Dict[str, Any]) -> List[PlaceResponse]:
        radius_m = int((request.radius_km or 15) * 1000)
        osm_filter = expanded_query["api_filters"]["osm_query"]
        categories = expanded_query["expanded_categories"]
        
        query = f"[out:json][timeout:10];(node{osm_filter}(around:{radius_m},{request.latitude},{request.longitude});way{osm_filter}(around:{radius_m},{request.latitude},{request.longitude}););out center 15;"
        
        places = []
        for mirror in OVERPASS_MIRRORS:
            try:
                resp = requests.post(mirror, data={"data": query}, headers={"User-Agent": "MoodMap"}, timeout=4)
                if resp.status_code == 200:
                    data = resp.json()
                    for el in data.get("elements", []):
                        tags = el.get("tags", {})
                        name = tags.get("name", "").strip()
                        if not name: continue
                        lat = el.get("lat") or el.get("center", {}).get("lat")
                        lng = el.get("lon") or el.get("center", {}).get("lon")
                        actual_type = tags.get("amenity") or tags.get("leisure") or tags.get("shop") or categories[0]
                        combined_types = list(dict.fromkeys([actual_type] + categories))
                        
                        img_urls = self._get_best_images(name, categories[0])
                        
                        places.append(PlaceResponse(
                            id=f"osm_{el.get('id')}", name=name, rating=self._generate_rating(name),
                            distance=self._haversine_distance(request.latitude, request.longitude, lat, lng),
                            address=tags.get("addr:street", f"Near {name}"), openNow=True,
                            types=combined_types, images=img_urls, lat=lat, lng=lng
                        ))
                    return places
            except Exception: pass
        return places

    def _merge_and_deduplicate(self, all_places: List[PlaceResponse]) -> List[PlaceResponse]:
        unique_places: List[PlaceResponse] = []
        all_places.sort(key=lambda x: x.rating, reverse=True)
        
        for place in all_places:
            is_duplicate = False
            for existing in unique_places:
                dist = self._haversine_distance(place.lat, place.lng, existing.lat, existing.lng)
                if dist < 0.05: 
                    similarity = difflib.SequenceMatcher(None, place.name.lower(), existing.name.lower()).ratio()
                    if similarity > 0.60 or place.name.lower() in existing.name.lower() or existing.name.lower() in place.name.lower():
                        existing.types = list(dict.fromkeys(existing.types + place.types))
                        is_duplicate = True
                        break
            if not is_duplicate: 
                unique_places.append(place)
                
        return unique_places

    def _calculate_place_score(self, place: PlaceResponse, user_mood: str) -> float:
        normalized_rating = (place.rating * 2)
        rating_score = normalized_rating * 0.4
        popularity = min(10.0, float(len(place.name))) 
        popularity_score = popularity * 0.3
        open_now_score = 10.0 * 0.2 if place.openNow else 0.0
        distance_factor = max(0.0, 15.0 - place.distance)
        distance_score = ((distance_factor / 15.0) * 10.0) * 0.1
        final_score = rating_score + popularity_score + open_now_score + distance_score
        mood_lower = user_mood.lower()
        if mood_lower in place.name.lower() or any(mood_lower in t.lower() for t in place.types):
            final_score += 2.0  
        return round(final_score, 2)

    def get_recommendations(self, request: PlaceRequest) -> List[PlaceResponse]:
        cache_key = f"{round(request.latitude,3)}:{round(request.longitude,3)}:{request.mood}:{request.radius_km}"
        if cache_key in self._cache:
            entry = self._cache[cache_key]
            if datetime.now() - entry["timestamp"] < timedelta(minutes=CACHE_EXPIRY_MINUTES):
                return entry["data"]

        expanded_query = self._expand_query_intent(request.mood)
        raw_places = []
        
        logger.info("⚡ PARALLEL FETCHING STARTED: FSQ & Geoapify running together...")
        
        # 🔥 MULTITHREADING: Dono APIs ko ek sath call karo!
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            future_fsq = executor.submit(self._fetch_foursquare, request, expanded_query)
            future_geo = executor.submit(self._fetch_geoapify, request, expanded_query)
            
            raw_places.extend(future_fsq.result())
            raw_places.extend(future_geo.result())

        # Agar dono APIs milkar bhi data na laa payein, tab OSM chalega
        if len(raw_places) < 5:
            logger.info("⚠️ Low API results. Fetching OSM fallback...")
            raw_places.extend(self._fetch_overpass(request, expanded_query))

        deduplicated_places = self._merge_and_deduplicate(raw_places)
        deduplicated_places.sort(key=lambda p: self._calculate_place_score(p, request.mood), reverse=True)
        
        if not deduplicated_places: 
            deduplicated_places = self._get_fallback_data(request, expanded_query["expanded_categories"])
            deduplicated_places.sort(key=lambda p: self._calculate_place_score(p, request.mood), reverse=True)
        
        self._cache[cache_key] = {"timestamp": datetime.now(), "data": deduplicated_places}
        return deduplicated_places

    def _get_fallback_data(self, request: PlaceRequest, allowed_categories: List[str]) -> List[PlaceResponse]:
        lat, lng = request.latitude, request.longitude
        base = [
            {"name": "Royal Cafe", "types": ["cafe", "lounge"], "addr": "Civil Lines"},
            {"name": "City Central Park", "types": ["park", "nature_reserve"], "addr": "Near Stadium"},
            {"name": "Cult Fit", "types": ["gym", "yoga_studio", "crossfit"], "addr": "Kanth Road"},
            {"name": "Gold's Gym", "types": ["gym", "fitness_centre"], "addr": "Ram Ganga Vihar"},
            {"name": "Urban Bistro", "types": ["restaurant", "diner"], "addr": "Civil Lines"},
            {"name": "PVR Cinemas", "types": ["cinema", "amusement"], "addr": "Wave Mall"},
            {"name": "Gianis Ice Cream", "types": ["ice_cream", "cafe"], "addr": "Civil Lines"}
        ]
        results = []
        for i, b in enumerate(base):
            b_types: List[str] = b["types"] # type: ignore
            if any(cat in b_types for cat in allowed_categories):
                results.append(PlaceResponse(
                    id=f"fb_{i}", name=str(b["name"]), rating=round(random.uniform(4.0, 4.8),1), 
                    distance=round(random.uniform(1, 5), 1), address=str(b["addr"]), openNow=True, 
                    types=b_types + allowed_categories, 
                    images=DEFAULT_IMAGES.get(allowed_categories[0], ["https://picsum.photos/600"]),
                    lat=lat + (i * 0.01), lng=lng + (i * 0.01)
                ))
        return results