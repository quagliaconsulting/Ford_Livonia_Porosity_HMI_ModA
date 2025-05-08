#!/usr/bin/env python3
"""
Entry point for the Ford Livonia Porosity HMI backend
Loads environment variables and starts the server
"""
import os
import dotenv
import uvicorn
from app.utils.config import load_config

# Load environment variables from .env file
dotenv.load_dotenv()

# Load configuration
config = load_config()

# Get API configuration
api_config = config.get('api', {})
host = api_config.get('host', '0.0.0.0')
port = int(api_config.get('port', 8000))
debug = api_config.get('debug', False)

if __name__ == "__main__":
    print(f"Starting Ford Livonia Porosity HMI backend on {host}:{port}")
    print(f"Connecting to database at {config['database']['host']}:{config['database']['port']}")
    print(f"Debug mode: {debug}")
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=debug
    )