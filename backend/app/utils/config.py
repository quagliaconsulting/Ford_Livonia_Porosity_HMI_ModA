import os
import yaml
from typing import Dict, Any

# Default configuration file path
CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'config', 'config.yaml')


def load_config(config_path: str = CONFIG_PATH) -> Dict[str, Any]:
    """
    Load configuration from YAML file
    """
    try:
        with open(config_path, 'r') as config_file:
            config = yaml.safe_load(config_file)
        return config
    except Exception as e:
        print(f"Error loading configuration: {e}")
        # Return a minimal default configuration
        return {
            "database": {
                "host": "localhost",
                "port": 5432,
                "username": "postgres",
                "password": "password",
                "dbname": "ford_porosity",
                "pool_size": 5,
                "max_overflow": 10
            },
            "api": {
                "host": "0.0.0.0",
                "port": 8000,
                "debug": True
            },
            "storage": {
                "image_path": "./images",
                "cache_enabled": False
            }
        }


def get_database_url(config: Dict[str, Any] = None) -> str:
    """
    Get database URL from configuration
    """
    if config is None:
        config = load_config()
    
    db_config = config['database']
    return f"postgresql://{db_config['username']}:{db_config['password']}@{db_config['host']}:{db_config['port']}/{db_config['dbname']}"