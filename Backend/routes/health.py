"""
Health check — verifica que el backend y la BD están funcionando.
"""

from flask import Blueprint, jsonify
from extensions import db

health_bp = Blueprint("health", __name__, url_prefix="/api")


@health_bp.route("/health", methods=["GET"])
def health_check():
    """
    GET /api/health
    Health check del sistema. Público.
    """
    db_ok = False
    try:
        db.session.execute(db.text("SELECT 1"))
        db_ok = True
    except Exception as e:
        db_msg = str(e)

    return jsonify({
        "status": "ok" if db_ok else "degraded",
        "servicio": "Fisioterapeuta Li — Backend API",
        "version": "1.0.0",
        "base_de_datos": "conectada" if db_ok else "error",
    }), 200 if db_ok else 503
