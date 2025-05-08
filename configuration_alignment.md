# Configuration Alignment Between Frontend and Backend

This document confirms that the frontend and backend configurations are properly aligned and follow the naming conventions from the example configuration.

## Configuration Structure

| Category | Backend (YAML) | Frontend (JS) | Alignment |
|----------|---------------|---------------|-----------|
| Database | `database` | N/A | Backend only |
| Image Access | `image_access` | `imageAccess` | ✅ Aligned |
| API | `api` | `api` | ✅ Aligned |
| UI | `ui` | `ui` | ✅ Aligned |
| Region Analysis | `region_analysis` | `regionAnalysis` | ✅ Aligned |
| Logging | `logging` | N/A | Backend only |
| Authentication | `auth` | N/A | Backend only |
| Debug | N/A | `debug` | Frontend only |

## Image Access Configuration

The image access configuration is structured to support FTP access as specified in the example configuration:

**Backend (YAML):**
```yaml
image_access:
  protocol: 'ftp'
  fallback_path: '/public/images'
  ftp:
    host: '10.1.1.100'
    username: 'livonia_ftp'
    password: 'password'
    base_path: '/images'
    cache_enabled: true
    cache_ttl_seconds: 3600
```

**Frontend (JS):**
```javascript
imageAccess: {
  fallbackPath: '/images',
}
```

## UI Configuration

The UI configuration maintains the same structure and naming conventions as the example:

**Backend (YAML):**
```yaml
ui:
  client: "Ford"
  site: "Livonia Transmission"
  line: "Mod A"
  max_zoom: 6.0
  app_title: "Ford Livonia Porosity HMI"
  client_logo: "/images/Ford.png"
  service_logo: "/images/USS.png"
  logo_size: 65
```

**Frontend (JS):**
```javascript
ui: {
  client: 'Ford',
  site: 'Livonia Transmission',
  line: 'Mod A',
  maxZoom: 6.0,
  appTitle: 'Ford Livonia Porosity HMI',
  clientLogo: '/images/Ford.png',
  serviceLogo: '/images/USS.png',
  logoSize: 65,
}
```

## How Frontend API Services Use the Configuration

1. **Base API URL**: The frontend uses `config.api.baseUrl` from the configuration to construct API endpoints.
   
2. **Image URLs**: The frontend constructs image URLs using the API endpoint for images or the fallback path:
   ```javascript
   const imageUrl = ImageService.getImageUrl(imageId);
   ```

3. **Polling Configuration**: The frontend uses `config.api.pollingInterval` to determine how frequently to poll for updates:
   ```javascript
   startPolling: (serialNumber, callback, interval = config.api.pollingInterval) => {
     // Polling implementation
   }
   ```

4. **Region Analysis Defaults**: The frontend uses the region analysis configuration for default values:
   ```javascript
   const defaultPixelDensity = config.regionAnalysis.defaultPixelDensity;
   ```

## How Backend Services Use the Configuration

1. **Image Access**: The backend image service uses the image access protocol and configuration to determine how to fetch images:
   ```python
   if PROTOCOL == 'local':
       return get_local_image_path(image_path)
   elif PROTOCOL == 'ftp':
       try:
           return fetch_ftp_image(image_path)
       except ImageAccessError as e:
           logger.warning(f"FTP access failed, trying fallback: {str(e)}")
           return get_local_image_path(image_path)
   ```

2. **Database Connection**: The backend uses the database configuration to connect to the PostgreSQL database:
   ```python
   DATABASE_URL = f"postgresql://{db_config['username']}:{db_config['password']}@{db_config['host']}:{db_config['port']}/{db_config['dbname']}"
   ```

3. **API Settings**: The backend uses the API configuration to set up the FastAPI server:
   ```python
   host = config["api"]["host"]
   port = config["api"]["port"]
   debug = config["api"]["debug"]
   ```

4. **CORS Origins**: The backend sets up CORS based on the API configuration:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=config["api"]["cors_origins"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

## Environment Variables

The frontend environment variables are properly configured in `.env.development` and `.env.production` with consistent API URL settings:

```
VITE_API_BASE_URL=/api
```

The Vite configuration includes a proxy for local development that forwards API requests to the backend server:

```javascript
proxy: {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
  },
  '/images': {
    target: 'http://localhost:8000',
    changeOrigin: true,
  },
}
```

## Conclusion

The frontend and backend configurations are properly aligned and follow the naming conventions from the example configuration. Key aspects like image access via FTP, UI configuration, and API settings are consistently defined across both environments.