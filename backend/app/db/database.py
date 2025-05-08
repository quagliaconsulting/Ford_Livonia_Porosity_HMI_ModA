from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import yaml
import os

# Load configuration from YAML file
config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'config', 'config.yaml')
with open(config_path, 'r') as config_file:
    config = yaml.safe_load(config_file)

db_config = config['database']

# Get password from environment variable or config
password = os.environ.get('DATABASE_PASSWORD', db_config['password'])

# Create database URL
DATABASE_URL = f"postgresql://{db_config['username']}:{password}@{db_config['host']}:{db_config['port']}/{db_config['dbname']}"

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_size=db_config['pool_size'],
    max_overflow=db_config['max_overflow']
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()