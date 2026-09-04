from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import PlaceRequest, APIResponse
from app.services.recommender import PlaceRecommenderService
import logging

logger = logging.getLogger("PlacesRouter")

router = APIRouter()

# 🔥 THE FIX (Singleton Pattern): 
# Service aur AI Model sirf ek baar server start hote hi memory mein load ho jayenge!
recommender_service_instance = PlaceRecommenderService()

# Dependency ab naya object nahi banayegi, purana pre-loaded instance degi
def get_service():
    return recommender_service_instance

@router.post("/places", response_model=APIResponse)
async def fetch_places(
    request: PlaceRequest,
    service: PlaceRecommenderService = Depends(get_service)
):
    try:
        places = service.get_recommendations(request)
        
        return APIResponse(
            status="success",
            message=f"Fetched places for mood: {request.mood}",
            data=places,
            results_count=len(places)
        )
    except Exception as e:
        logger.error(f"Error fetching places: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")