from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .api.routes import api_router
from .utils.config import load_config

# Load configuration
config = load_config()

# Create FastAPI app
app = FastAPI(
    title="Ford Livonia Porosity HMI API",
    description="API for the Ford Livonia Porosity HMI",
    version="0.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config["api"]["cors_origins"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api")

# Check if fallback image directory exists and mount it for static serving (useful for dev/fallback)
# Use the correct keys from config.yaml
if config.get("image_access") and config["image_access"].get("fallback_path"):
    fallback_image_path = config["image_access"]["fallback_path"]
    if os.path.exists(fallback_image_path) and os.path.isdir(fallback_image_path):
        print(f"Mounting fallback image directory: {fallback_image_path} at /fallback_images") # Added print statement
        app.mount("/fallback_images", StaticFiles(directory=fallback_image_path), name="fallback_images")
    else:
        print(f"Warning: Fallback image path specified but not found or not a directory: {fallback_image_path}") # Added warning
else:
    print("Warning: image_access.fallback_path not found in config.yaml, fallback images won't be served statically.") # Added warning


@app.get("/")
async def root():
    """
    Root endpoint returning API status
    """
    return {
        "status": "online",
        "api_version": "0.1.0",
        "documentation": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    
    host = config["api"]["host"]
    port = config["api"]["port"]
    debug = config["api"]["debug"]
    
    uvicorn.run("app.main:app", host=host, port=port, reload=debug)