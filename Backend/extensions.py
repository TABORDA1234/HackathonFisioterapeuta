"""
Extensiones Flask — instancias globales.
Se inicializan aquí para evitar importaciones circulares.
"""

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_marshmallow import Marshmallow

db = SQLAlchemy()
migrate = Migrate()
cors = CORS()
limiter = Limiter(key_func=get_remote_address, default_limits=["200 per hour"])
ma = Marshmallow()
