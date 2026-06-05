from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import PlaceRequest, APIResponse
from app.services.recommender import PlaceRecommenderService

router = APIRouter()
# Dependency Injection
def get_service():
    return PlaceRecommenderService()

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
            results_count=len(places),
            data=places
        )
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")