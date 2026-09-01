"""
Rutas de autenticación — login, registro y perfil.
"""

from datetime import datetime, timedelta, timezone

import jwt
from flask import Blueprint, request, jsonify, current_app

from extensions import db
from models.usuario import Usuario
from schemas.usuario_schema import UsuarioSchema, LoginSchema
from utils.auth_middleware import jwt_required
from utils.logger import registrar_operacion
from flask import g

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

usuario_schema = UsuarioSchema()
login_schema = LoginSchema()


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    POST /api/auth/login
    Autentica un usuario admin y devuelve un JWT.
    Body: { "username": "...", "password": "..." }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Body JSON requerido"}), 400

    # Validar entrada
    errors = login_schema.validate(data)
    if errors:
        return jsonify({"error": "Datos inválidos", "detalle": errors}), 400

    # Buscar usuario
    user = Usuario.query.filter_by(username=data["username"]).first()
    if not user or not user.check_password(data["password"]):
        return jsonify({"error": "Credenciales inválidas"}), 401

    if not user.activo:
        return jsonify({"error": "Usuario desactivado"}), 403

    # Generar JWT
    expiration = datetime.now(timezone.utc) + timedelta(
        hours=current_app.config["JWT_EXPIRATION_HOURS"]
    )
    token = jwt.encode(
        {
            "user_id": user.id,
            "username": user.username,
            "rol": user.rol,
            "exp": expiration,
        },
        current_app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )

    registrar_operacion(
        accion="login",
        entidad="usuario",
        entidad_id=user.id,
        usuario_id=user.id,
        detalle=f"Login exitoso de {user.username}",
        origen="admin",
    )

    return jsonify({
        "message": "Login exitoso",
        "token": token,
        "usuario": user.to_dict(),
        "expira_en": expiration.isoformat(),
    }), 200


@auth_bp.route("/register", methods=["POST"])
@jwt_required
def register():
    """
    POST /api/auth/register
    Crea un nuevo usuario admin. Solo accesible por admins autenticados.
    Body: { "username": "...", "email": "...", "password": "...", "rol": "admin" }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Body JSON requerido"}), 400

    # Validar entrada
    errors = usuario_schema.validate(data)
    if errors:
        return jsonify({"error": "Datos inválidos", "detalle": errors}), 400

    # Verificar unicidad
    if Usuario.query.filter_by(username=data["username"]).first():
        return jsonify({"error": "El nombre de usuario ya existe"}), 409

    if Usuario.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "El email ya está registrado"}), 409

    # Crear usuario
    nuevo_usuario = Usuario(
        username=data["username"],
        email=data["email"],
        rol=data.get("rol", "admin"),
    )
    nuevo_usuario.set_password(data["password"])

    db.session.add(nuevo_usuario)
    db.session.commit()

    registrar_operacion(
        accion="crear_usuario",
        entidad="usuario",
        entidad_id=nuevo_usuario.id,
        usuario_id=g.current_user.id,
        detalle=f"Nuevo usuario creado: {nuevo_usuario.username}",
        origen="admin",
    )

    return jsonify({
        "message": "Usuario creado exitosamente",
        "usuario": nuevo_usuario.to_dict(),
    }), 201


@auth_bp.route("/me", methods=["GET"])
@jwt_required
def me():
    """
    GET /api/auth/me
    Devuelve la información del usuario autenticado.
    """
    return jsonify({"usuario": g.current_user.to_dict()}), 200
