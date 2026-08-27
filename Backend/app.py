"""
Fisioterapeuta Li — Backend API
Entry point con Application Factory pattern.
"""

import os
from flask import Flask, jsonify
from config import config_by_name
from extensions import db, migrate, cors, limiter, ma


def create_app(config_name=None):
    """
    Crea y configura la aplicación Flask.

    Args:
        config_name: 'development', 'production' o 'testing'.
                     Por defecto lee de FLASK_ENV.
    """
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # ── Inicializar extensiones ──
    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, origins=app.config["CORS_ORIGINS"])
    limiter.init_app(app)
    ma.init_app(app)

    # ── Registrar blueprints ──
    from routes.auth import auth_bp
    from routes.clientes import clientes_bp
    from routes.servicios import servicios_bp
    from routes.citas import citas_bp
    from routes.webhooks import webhooks_bp
    from routes.admin import admin_bp
    from routes.health import health_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(clientes_bp)
    app.register_blueprint(servicios_bp)
    app.register_blueprint(citas_bp)
    app.register_blueprint(webhooks_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(health_bp)

    # ── Manejo global de errores ──
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Recurso no encontrado"}), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({"error": "Método no permitido"}), 405

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "Error interno del servidor"}), 500

    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        return jsonify({"error": "Demasiadas solicitudes. Intente más tarde."}), 429

    # ── Ruta raíz ──
    @app.route("/")
    def index():
        return jsonify({
            "servicio": "Fisioterapeuta Li — Backend API",
            "version": "1.0.0",
            "documentacion": "/api/health para verificar estado",
            "endpoints": {
                "auth": "/api/auth",
                "clientes": "/api/clientes",
                "servicios": "/api/servicios",
                "citas": "/api/citas",
                "disponibilidad": "/api/citas/disponibilidad",
                "webhooks": "/api/webhooks",
                "admin": "/api/admin",
                "health": "/api/health",
            },
        })

    # ── Crear tablas si no existen (para desarrollo rápido) ──
    with app.app_context():
        # Importar modelos para que SQLAlchemy los registre
        import models  # noqa: F401
        db.create_all()

    return app


# ── Entry point para desarrollo ──
if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
