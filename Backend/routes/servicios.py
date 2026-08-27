"""
Rutas CRUD de Servicios (tipos de sesión de fisioterapia).
"""

from flask import Blueprint, request, jsonify, g

from extensions import db
from models.servicio import Servicio
from schemas.servicio_schema import ServicioSchema, ServicioUpdateSchema
from utils.auth_middleware import jwt_required
from utils.logger import registrar_operacion

servicios_bp = Blueprint("servicios", __name__, url_prefix="/api/servicios")

servicio_schema = ServicioSchema()
servicio_update_schema = ServicioUpdateSchema()


@servicios_bp.route("", methods=["GET"])
def listar_servicios():
    """
    GET /api/servicios
    Lista todos los servicios activos. Público (para el sitio web).
    """
    servicios = Servicio.query.filter_by(activo=True).order_by(Servicio.nombre).all()
    return jsonify({
        "servicios": [s.to_dict() for s in servicios],
        "total": len(servicios),
    }), 200


@servicios_bp.route("/<int:servicio_id>", methods=["GET"])
def obtener_servicio(servicio_id):
    """
    GET /api/servicios/:id
    Detalle de un servicio. Público.
    """
    servicio = Servicio.query.get(servicio_id)
    if not servicio or not servicio.activo:
        return jsonify({"error": "Servicio no encontrado"}), 404

    return jsonify({"servicio": servicio.to_dict()}), 200


@servicios_bp.route("", methods=["POST"])
@jwt_required
def crear_servicio():
    """
    POST /api/servicios
    Crea un nuevo servicio. Requiere JWT.
    Body: { "nombre": "...", "descripcion": "...", "duracion_min": 60, "precio": 50000 }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Body JSON requerido"}), 400

    errors = servicio_schema.validate(data)
    if errors:
        return jsonify({"error": "Datos inválidos", "detalle": errors}), 400

    nuevo_servicio = Servicio(
        nombre=data["nombre"],
        descripcion=data.get("descripcion"),
        duracion_min=data["duracion_min"],
        precio=data.get("precio"),
    )

    db.session.add(nuevo_servicio)
    db.session.commit()

    registrar_operacion(
        accion="crear_servicio",
        entidad="servicio",
        entidad_id=nuevo_servicio.id,
        usuario_id=g.current_user.id,
        detalle=f"Servicio creado: {nuevo_servicio.nombre}",
        origen="admin",
    )

    return jsonify({
        "message": "Servicio creado exitosamente",
        "servicio": nuevo_servicio.to_dict(),
    }), 201


@servicios_bp.route("/<int:servicio_id>", methods=["PUT"])
@jwt_required
def actualizar_servicio(servicio_id):
    """
    PUT /api/servicios/:id
    Actualiza un servicio existente.
    """
    servicio = Servicio.query.get(servicio_id)
    if not servicio:
        return jsonify({"error": "Servicio no encontrado"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Body JSON requerido"}), 400

    errors = servicio_update_schema.validate(data)
    if errors:
        return jsonify({"error": "Datos inválidos", "detalle": errors}), 400

    if "nombre" in data:
        servicio.nombre = data["nombre"]
    if "descripcion" in data:
        servicio.descripcion = data["descripcion"]
    if "duracion_min" in data:
        servicio.duracion_min = data["duracion_min"]
    if "precio" in data:
        servicio.precio = data["precio"]
    if "activo" in data:
        servicio.activo = data["activo"]

    db.session.commit()

    registrar_operacion(
        accion="actualizar_servicio",
        entidad="servicio",
        entidad_id=servicio.id,
        usuario_id=g.current_user.id,
        detalle=f"Servicio actualizado: {servicio.nombre}",
        origen="admin",
    )

    return jsonify({
        "message": "Servicio actualizado",
        "servicio": servicio.to_dict(),
    }), 200


@servicios_bp.route("/<int:servicio_id>", methods=["DELETE"])
@jwt_required
def eliminar_servicio(servicio_id):
    """
    DELETE /api/servicios/:id
    Desactiva el servicio (soft delete).
    """
    servicio = Servicio.query.get(servicio_id)
    if not servicio:
        return jsonify({"error": "Servicio no encontrado"}), 404

    servicio.activo = False
    db.session.commit()

    registrar_operacion(
        accion="eliminar_servicio",
        entidad="servicio",
        entidad_id=servicio.id,
        usuario_id=g.current_user.id,
        detalle=f"Servicio desactivado: {servicio.nombre}",
        origen="admin",
    )

    return jsonify({"message": "Servicio desactivado"}), 200
