"""
Middleware de autenticación — JWT y API Key.
Decoradores para proteger endpoints.
"""

from functools import wraps

import jwt
from flask import request, jsonify, current_app, g

from models.usuario import Usuario


def jwt_required(f):
    """
    Decorador que protege un endpoint con JWT.
    Extrae el token del header Authorization: Bearer <token>.
    Inyecta el usuario autenticado en g.current_user.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # Extraer token del header
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

        if not token:
            return jsonify({"error": "Token de autenticación requerido"}), 401

        try:
            payload = jwt.decode(
                token,
                current_app.config["JWT_SECRET_KEY"],
                algorithms=["HS256"],
            )
            user = Usuario.query.get(payload["user_id"])
            if not user or not user.activo:
                return jsonify({"error": "Usuario no válido o inactivo"}), 401
            g.current_user = user
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expirado"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Token inválido"}), 401

        return f(*args, **kwargs)

    return decorated


def api_key_required(f):
    """
    Decorador que protege un endpoint con API Key.
    Espera el header X-API-Key con la clave configurada para n8n.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        api_key = request.headers.get("X-API-Key", "")

        if not api_key:
            return jsonify({"error": "API Key requerida"}), 401

        if api_key != current_app.config["N8N_API_KEY"]:
            return jsonify({"error": "API Key inválida"}), 403

        return f(*args, **kwargs)

    return decorated
