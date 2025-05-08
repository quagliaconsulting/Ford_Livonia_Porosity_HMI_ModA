# Backend Implementation Plan for Ford Livonia Porosity HMI

This document outlines the implementation plan for creating a Python backend to connect the Ford Livonia Porosity HMI to the production database.

## 1. Backend Architecture

### Technology Stack
- **Framework**: FastAPI (for REST API endpoints with async support)
- **Database**: PostgreSQL (existing database)
- **ORM**: SQLAlchemy (for database interactions)
- **Authentication**: JWT tokens with time-based verification
- **Configuration**: YAML-based configuration
- **Image Storage**: File system with references in DB

### Project Structure
```
backend/
├── config/
│   ├── config.yaml         # Main configuration file
│   └── logging.yaml        # Logging configuration
├── app/
│   ├── __init__.py
│   ├── main.py             # FastAPI application entry point
│   ├── db/
│   │   ├── __init__.py
│   │   ├── database.py     # Database connection management
│   │   ├── models.py       # SQLAlchemy models matching the DB schema
│   │   └── crud.py         # CRUD operations for each model
│   ├── api/
│   │   ├── __init__.py
│   │   ├── endpoints/
│   │   │   ├── __init__.py
│   │   │   ├── cameras.py  # Camera endpoints
│   │   │   ├── images.py   # Image endpoints
│   │   │   ├── defects.py  # Defect endpoints
│   │   │   └── regions.py  # Region endpoints
│   │   ├── dependencies.py # API dependencies (auth, etc.)
│   │   └── routes.py       # Main API router
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── camera.py       # Pydantic models for API
│   │   ├── image.py
│   │   ├── defect.py
│   │   └── region.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── image_service.py  # Image processing service
│   │   └── analysis_service.py # Defect analysis service
│   └── utils/
│       ├── __init__.py
│       └── config.py       # Configuration utilities
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_api.py
│   └── test_services.py
├── requirements.txt
└── README.md
```

## 2. Core Components Development

### 2.1 Database Models and ORM Setup

Map the existing database schema to SQLAlchemy models:

- Cameras
- Images
- Defects
- Triggers
- Current_Part
- Part_Information
- Regions (new table)

### 2.2 API Endpoints

#### Camera Endpoints
- GET `/api/cameras` - List all cameras
- GET `/api/cameras/{serial_number}` - Get camera details
- GET `/api/cameras/{serial_number}/latest` - Get latest image and status

#### Image Endpoints
- GET `/api/images/{id}` - Get image by ID
- GET `/api/images/latest` - Get latest images for all cameras
- GET `/api/images/trigger/{trigger_id}` - Get images for a specific trigger

#### Defect Endpoints
- GET `/api/defects/image/{image_id}` - Get defects for an image
- PATCH `/api/defects/{id}` - Update defect disposition
- GET `/api/defects/statistics` - Get defect statistics

#### Region Endpoints
- GET `/api/regions/camera/{camera_id}` - Get regions for a camera
- POST `/api/regions` - Create a new region
- PUT `/api/regions/{id}` - Update an existing region
- DELETE `/api/regions/{id}` - Delete a region

### 2.3 Service Layer

#### Image Service
- Image conversion (DB storage to web-compatible format)
- Image caching for performance
- Defect overlay generation

#### Analysis Service
- Defect analysis logic (size, density, proximity)
- Region-based analysis
- Statistics generation

## 3. Frontend Integration

### 3.1 API Service in React

Create an API service layer in the frontend:

```javascript
// api.js
const API_BASE_URL = '/api';

export const CameraService = {
  getAllCameras: async () => {
    const response = await fetch(`${API_BASE_URL}/cameras`);
    return response.json();
  },
  
  getCameraLatest: async (serialNumber) => {
    const response = await fetch(`${API_BASE_URL}/cameras/${serialNumber}/latest`);
    return response.json();
  }
};

export const DefectService = {
  getDefectsForImage: async (imageId) => {
    const response = await fetch(`${API_BASE_URL}/defects/image/${imageId}`);
    return response.json();
  },
  
  updateDefectDisposition: async (defectId, disposition) => {
    const response = await fetch(`${API_BASE_URL}/defects/${defectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ disposition }),
    });
    return response.json();
  }
};

export const RegionService = {
  getRegionsForCamera: async (cameraId) => {
    const response = await fetch(`${API_BASE_URL}/regions/camera/${cameraId}`);
    return response.json();
  },
  
  createRegion: async (regionData) => {
    const response = await fetch(`${API_BASE_URL}/regions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(regionData),
    });
    return response.json();
  },
  
  updateRegion: async (regionId, regionData) => {
    const response = await fetch(`${API_BASE_URL}/regions/${regionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(regionData),
    });
    return response.json();
  },
  
  deleteRegion: async (regionId) => {
    const response = await fetch(`${API_BASE_URL}/regions/${regionId}`, {
      method: 'DELETE',
    });
    return response.json();
  }
};
```

### 3.2 Component Updates

#### App.jsx
- Fetch camera configuration from API
- Load metadata from database

#### CameraCard.jsx
- Replace random status with real-time data polling
- Fetch images from API
- Load defects from API
- Add loading states

#### ExpandedCameraModal.jsx
- Replace localStorage with API calls for regions
- Update disposition system to save to database
- Load real inspection history
- Implement proper authentication

## 4. Configuration

### 4.1 config.yaml Structure

```yaml
# Database Configuration
database:
  host: "localhost"
  port: 5432
  username: "postgres"
  password: "password"  # Use environment variables in production
  dbname: "ford_porosity"
  pool_size: 20
  max_overflow: 10

# API Configuration
api:
  host: "0.0.0.0"
  port: 8000
  debug: true
  cors_origins:
    - "http://localhost:5173"  # Vite dev server
    - "http://localhost:4173"  # Vite preview server

# Image Storage
storage:
  image_path: "/path/to/images"
  cache_enabled: true
  cache_size_mb: 500
  cache_ttl_seconds: 3600

# Authentication
auth:
  secret_key: "your-secret-key"  # Use environment variables in production
  algorithm: "HS256"
  access_token_expire_minutes: 30

# Logging
logging:
  level: "INFO"
  file: "logs/app.log"
  max_size_mb: 100
  backup_count: 5
```

## 5. Implementation Strategy

### Phase 1: Database Connectivity and Basic API
- Set up SQLAlchemy models
- Implement basic CRUD operations
- Create initial API endpoints
- Configure authentication

### Phase 2: Region Functionality
- Implement Regions table and API
- Create service methods for region analysis
- Update frontend to use Region API

### Phase 3: Image and Defect Integration
- Implement image serving API
- Add defect overlay API
- Integrate with frontend for real-time updates

### Phase 4: Disposition System
- Implement defect disposition API
- Update ExpandedCameraModal to save dispositions
- Add reporting API for disposition statistics

### Phase 5: Testing and Optimization
- Unit and integration tests
- Performance optimization
- Caching strategies
- Documentation

## 6. Deployment Considerations

### Prerequisites
- PostgreSQL database (existing)
- Python 3.8+ environment
- Network access to the database server
- Storage for image data

### Environment Setup
- Virtual environment for Python dependencies
- Environment variables for secrets
- Logging configuration

### Proxy Configuration
- Nginx for static file serving and API proxying
- WebSocket support for real-time updates (if implemented)
- SSL termination

## 7. Testing Plan

### Unit Tests
- Database models and CRUD operations
- API endpoint validation
- Service layer logic

### Integration Tests
- End-to-end API flows
- Database transaction handling
- Authentication and authorization

### Performance Tests
- Image loading and serving
- Concurrent API requests
- Database query optimization

## 8. Documentation

### API Documentation
- OpenAPI/Swagger documentation
- Endpoint descriptions and examples
- Authentication requirements

### Configuration Guide
- Configuration file structure
- Environment variable options
- Security best practices

### Developer Guide
- Setup instructions
- Testing procedures
- Code structure overview

This plan provides a comprehensive roadmap for implementing the backend system requested in the UPDATES_REQUIRED.md document.