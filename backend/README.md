# Ford Livonia Porosity HMI Backend

This is the Python backend for the Ford Livonia Porosity HMI application, which provides API endpoints to access camera data, images, defects, and region configuration.

## Features

- REST API for accessing camera data, images, defects, and region configuration
- PostgreSQL database integration using SQLAlchemy ORM
- Defect analysis based on region-specific criteria
- Image serving and processing
- Configuration via YAML file

## Getting Started

### Prerequisites

- Python 3.8 or higher
- PostgreSQL database with the schema defined in `/schema_dump.sql`
- Network access to the database
- Access to image storage location

### Installation

1. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Configure the application:

Edit `config/config.yaml` to set your database connection, image storage path, and other settings.

### Running the Application

Start the API server:

```bash
cd backend
python -m app.main
```

The API will be available at http://localhost:8000 and the Swagger documentation at http://localhost:8000/docs.

## API Endpoints

### Cameras

- `GET /api/cameras` - List all cameras
- `GET /api/cameras/{serial_number}` - Get camera details
- `GET /api/cameras/{serial_number}/latest` - Get latest image and status

### Images

- `GET /api/images` - Get recent images (optionally filtered by trigger)
- `GET /api/images/latest` - Get latest images for all cameras
- `GET /api/images/{image_id}` - Get image details
- `GET /api/images/{image_id}/file` - Get the actual image file

### Defects

- `GET /api/defects/image/{image_id}` - Get defects for an image
- `GET /api/defects/{defect_id}` - Get details for a specific defect
- `PATCH /api/defects/{defect_id}` - Update defect disposition
- `GET /api/defects/statistics/summary` - Get defect statistics

### Regions

- `GET /api/regions/camera/{camera_id}` - Get regions for a camera
- `GET /api/regions/{region_id}` - Get details for a specific region
- `POST /api/regions` - Create a new region
- `PUT /api/regions/{region_id}` - Update an existing region
- `DELETE /api/regions/{region_id}` - Delete a region

## Configuration

The application is configured via the `config/config.yaml` file. Key settings include:

- Database connection parameters
- API settings
- Image storage path
- Authentication settings
- Logging configuration

## Frontend Integration

The backend is designed to be integrated with the Ford Livonia Porosity HMI frontend. It serves as a replacement for the hardcoded data in the frontend application, providing real-time access to the production database.

Key integration points:

1. Image loading in the CameraCard component
2. Defect overlay data for visualization
3. Region configuration management in the ExpandedCameraModal
4. Defect disposition tracking and persistence

## Development

To run the application in development mode with auto-reload:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```