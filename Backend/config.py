"""
Configuración del backend — Fisioterapeuta Li
Lee todas las credenciales desde variables de entorno (.env).
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Configuración base compartida por todos los entornos."""

    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-cambiar-en-prod")

    # SQLAlchemy
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql://fisio_user:fisio_pass@localhost:5432/fisio_db",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "pool_size": 5,
        "max_overflow": 10,
    }

    # JWT
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-dev-secret")
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))

    # API Key para n8n
    N8N_API_KEY = os.getenv("N8N_API_KEY", "dev-api-key")

    # CORS
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

    # Horarios de la fisioterapeuta
    HORARIO_INICIO = os.getenv("HORARIO_INICIO", "08:00")
    HORARIO_FIN = os.getenv("HORARIO_FIN", "18:00")
    HORARIO_SABADO_FIN = os.getenv("HORARIO_SABADO_FIN", "13:00")
    # 0=Lunes ... 6=Domingo
    DIAS_LABORALES = [
        int(d) for d in os.getenv("DIAS_LABORALES", "0,1,2,3,4,5").split(",")
    ]
    BUFFER_ENTRE_SESIONES_MIN = int(
        os.getenv("BUFFER_ENTRE_SESIONES_MIN", "15")
    )
    ANTICIPACION_MINIMA_HORAS = int(
        os.getenv("ANTICIPACION_MINIMA_HORAS", "2")
    )


class DevelopmentConfig(Config):
    """Configuración para desarrollo local."""
    DEBUG = True


class ProductionConfig(Config):
    """Configuración para producción."""
    DEBUG = False


class TestingConfig(Config):
    """Configuración para tests."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}
