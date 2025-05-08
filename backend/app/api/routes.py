from fastapi import APIRouter

from .endpoints import cameras, images, defects, regions

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(cameras.router, prefix="/cameras", tags=["cameras"])
api_router.include_router(images.router, prefix="/images", tags=["images"])
api_router.include_router(defects.router, prefix="/defects", tags=["defects"])
api_router.include_router(regions.router, prefix="/regions", tags=["regions"])