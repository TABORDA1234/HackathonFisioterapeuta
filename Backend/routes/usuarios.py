"""
Rutas para la gestión de usuarios administradores.
Protegidas con JWT.
"""

from flask import Blueprint, request, jsonify
from extensions import db
from models.usuario import Usuario
from utils.auth_middleware import jwt_required
from utils.logger import registrar_operacion

usuarios_bp = Blueprint("usuarios", __name__, url_prefix="/api/usuarios")

@usuarios_bp.route("", methods=["GET"])
@jwt_required
def get_usuarios():
    """Obtener lista de usuarios (solo lectura, sin hashes)."""
    usuarios = Usuario.query.all()
    return jsonify({
        "usuarios": [u.to_dict() for u in usuarios],
        "total": len(usuarios)
    }), 200

@usuarios_bp.route("/<int:usuario_id>", methods=["GET"])
@jwt_required
def get_usuario(usuario_id):
    """Obtener un usuario específico."""
    usuario = Usuario.query.get_or_404(usuario_id)
    return jsonify(usuario.to_dict()), 200

@usuarios_bp.route("", methods=["POST"])
@jwt_required
def create_usuario():
    """Crear un nuevo usuario."""
    data = request.get_json()
    if not data or not data.get("username") or not data.get("email") or not data.get("password"):
        return jsonify({"error": "Faltan campos requeridos (username, email, password)"}), 400

    # Verificar si ya existe
    if Usuario.query.filter_by(username=data["username"]).first() or Usuario.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "El usuario o email ya está en uso"}), 409

    nuevo_usuario = Usuario(
        username=data["username"],
        email=data["email"],
        rol=data.get("rol", "admin"),
        activo=data.get("activo", True)
    )
    nuevo_usuario.set_password(data["password"])
    
    db.session.add(nuevo_usuario)
    db.session.commit()

    registrar_operacion(
        accion="crear_usuario",
        entidad="usuario",
        entidad_id=nuevo_usuario.id,
        detalle=f"Usuario creado: {nuevo_usuario.username}",
        origen="web_admin"
    )

    return jsonify({"message": "Usuario creado exitosamente", "usuario": nuevo_usuario.to_dict()}), 201

@usuarios_bp.route("/<int:usuario_id>", methods=["PUT"])
@jwt_required
def update_usuario(usuario_id):
    """Actualizar datos de un usuario."""
    usuario = Usuario.query.get_or_404(usuario_id)
    data = request.get_json()
    if not data:
        return jsonify({"error": "Cuerpo de la petición vacío"}), 400

    if "username" in data:
        # Check conflict
        existente = Usuario.query.filter_by(username=data["username"]).first()
        if existente and existente.id != usuario_id:
            return jsonify({"error": "Username ya está en uso"}), 409
        usuario.username = data["username"]
        
    if "email" in data:
        existente = Usuario.query.filter_by(email=data["email"]).first()
        if existente and existente.id != usuario_id:
            return jsonify({"error": "Email ya está en uso"}), 409
        usuario.email = data["email"]

    if "rol" in data:
        usuario.rol = data["rol"]
        
    if "activo" in data:
        usuario.activo = bool(data["activo"])
        
    if "password" in data and data["password"]:
        usuario.set_password(data["password"])

    db.session.commit()

    registrar_operacion(
        accion="actualizar_usuario",
        entidad="usuario",
        entidad_id=usuario.id,
        detalle=f"Usuario actualizado: {usuario.username}",
        origen="web_admin"
    )

    return jsonify({"message": "Usuario actualizado exitosamente", "usuario": usuario.to_dict()}), 200

@usuarios_bp.route("/<int:usuario_id>", methods=["DELETE"])
@jwt_required
def delete_usuario(usuario_id):
    """Eliminar un usuario."""
    usuario = Usuario.query.get_or_404(usuario_id)
    
    # Prevenir que el último usuario activo sea eliminado
    activos = Usuario.query.filter_by(activo=True).count()
    if activos <= 1 and usuario.activo:
        return jsonify({"error": "No puedes eliminar el último usuario activo del sistema"}), 400

    db.session.delete(usuario)
    db.session.commit()

    registrar_operacion(
        accion="eliminar_usuario",
        entidad="usuario",
        entidad_id=usuario_id,
        detalle=f"Usuario eliminado: {usuario.username}",
        origen="web_admin"
    )

    return jsonify({"message": "Usuario eliminado exitosamente"}), 200
