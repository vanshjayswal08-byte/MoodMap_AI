# 🌍 MoodMap AI: Smart Hyperlocal Place Recommender

MoodMap AI is an intelligent, location-based recommendation engine that suggests nearby venues such as cafes, restaurants, gyms, and parks based on a user’s abstract mood and real-time geolocation.

## ✨ Key Features

- **🧠 AI Semantic Search:** Uses `Sentence-Transformers` (`all-MiniLM-L6-v2`) to translate abstract moods like “chill vibes” or “late night craving” into precise geospatial categories.
- **⚡ Parallel API Federation:** Fetches data concurrently from multiple providers, including Foursquare and Geoapify, using Python’s `concurrent.futures` to reduce latency.
- **🔍 Smart Entity Resolution:** Uses a custom deduplication algorithm that combines the Haversine formula and fuzzy string matching to merge duplicate cross-API records into a single enriched result.
- **🚀 Optimized Architecture:** Uses the Singleton design pattern for AI model loading, enabling fast inference after server startup.
- **🗺️ Interactive Spatial UI:** Built with React, TypeScript, and Leaflet.js to support dynamic map routing, real-time filtering, and explainable recommendation insights.

## 🛠️ Tech Stack

### Backend & AI Engine
- Python 3
- FastAPI
- Sentence-Transformers
- Uvicorn
- Requests
- `concurrent.futures`

### Frontend
- React.js (Vite)
- TypeScript
- Tailwind CSS
- Leaflet.js / React-Leaflet
- Framer Motion

### External APIs
- Foursquare Places API
- Geoapify API
- OpenStreetMap fallback

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites
- Python 3.9+
- Node.js 16+
- Git

### Backend Setup

```bash
cd backend
python -m venv .venv
```

#### Activate the virtual environment

**Windows:**
```bash
.venv\Scripts\activate
```

**Mac/Linux:**
```bash
source .venv/bin/activate
```

#### Install dependencies

```bash
pip install -r requirements.txt
```

### Configure API Keys

Create a `.env` file in `backend/app/` and add your API keys:

```env
FOURSQUARE_API_KEY=fsq3_your_api_key_here
GEOAPIFY_API_KEY=your_geoapify_key_here
```

### Run the Backend

```bash
python run.py
```

The FastAPI server will start at `http://127.0.0.1:8000`.

## Frontend Setup

Open a new terminal and run the following commands:

```bash
cd frontend
npm install
npm run dev
```

The React app will run at `http://localhost:5173`.

## 💡 System Design Highlights

- **Priority Waterfall Fallback:** Ensures high availability by falling back to secondary APIs when primary providers hit rate limits.
- **Backend-for-Frontend (BFF):** The FastAPI layer acts as a secure proxy, shielding client-side applications from CORS issues and API key exposure.

## 📝 License

This project is licensed under the MIT License.