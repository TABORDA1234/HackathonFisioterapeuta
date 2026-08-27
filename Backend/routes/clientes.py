"""
Rutas CRUD de Clientes (pacientes).
"""

from flask import Blueprint, request, jsonify, g

from extensions import db
from models.cliente import Cliente
from schemas.cliente_schema import ClienteSchema, ClienteUpdateSchema
from utils.auth_middleware import jwt_required
from utils.logger import registrar_operacion

clientes_bp = Blueprint("clientes", __name__, url_prefix="/api/clientes")

cliente_schema = ClienteSchema()
cliente_update_schema = ClienteUpdateSchema()


@clientes_bp.route("", methods=["GET"])
@jwt_required
def listar_clientes():
    """
    GET /api/clientes?page=1&per_page=20&buscar=...
    Lista clientes con paginación y búsqueda por nombre/teléfono.
    """
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    buscar = request.args.get("buscar", "", type=str)

    query = Cliente.query.filter_by(activo=True)

    if buscar:
        filtro = f"%{buscar}%"
        query = query.filter(
            db.or_(
                Cliente.nombre.ilike(filtro),
                Cliente.telefono.ilike(filtro),
                Cliente.email.ilike(filtro),
            )
        )

    query = query.order_by(Cliente.nombre.asc())
    paginacion = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "clientes": [c.to_dict() for c in paginacion.items],
        "total": paginacion.total,
        "pagina": paginacion.page,
        "paginas": paginacion.pages,
        "por_pagina": paginacion.per_page,
    }), 200


@clientes_bp.route("/<int:cliente_id>", methods=["GET"])
@jwt_required
def obtener_cliente(cliente_id):
    """
    GET /api/clientes/:id
    Detalle de un cliente específico.
    """
    cliente = Cliente.query.get(cliente_id)
    if not cliente or not cliente.activo:
        return jsonify({"error": "Cliente no encontrado"}), 404

    return jsonify({"cliente": cliente.to_dict()}), 200


@clientes_bp.route("", methods=["POST"])
@jwt_required
def crear_cliente():
    """
    POST /api/clientes
    Crea un nuevo cliente.
    Body: { "nombre": "...", "telefono": "...", "email": "...", ... }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Body JSON requerido"}), 400

    errors = cliente_schema.validate(data)
    if errors:
        return jsonify({"error": "Datos inválidos", "detalle": errors}), 400

    # Verificar unicidad de telegram_id si viene
    if data.get("telegram_id"):
        existente = Cliente.query.filter_by(telegram_id=data["telegram_id"]).first()
        if existente:
            return jsonify({"error": "Ya existe un cliente con ese Telegram ID"}), 409

    nuevo_cliente = Cliente(
        nombre=data["nombre"],
        telefono=data.get("telefono"),
        email=data.get("email"),
        telegram_id=data.get("telegram_id"),
        notas_medicas=data.get("notas_medicas"),
    )

    db.session.add(nuevo_cliente)
    db.session.commit()

    registrar_operacion(
        accion="crear_cliente",
        entidad="cliente",
        entidad_id=nuevo_cliente.id,
        usuario_id=g.current_user.id,
        detalle=f"Cliente creado: {nuevo_cliente.nombre}",
        origen="admin",
    )

    return jsonify({
        "message": "Cliente creado exitosamente",
        "cliente": nuevo_cliente.to_dict(),
    }), 201


@clientes_bp.route("/<int:cliente_id>", methods=["PUT"])
@jwt_required
def actualizar_cliente(cliente_id):
    """
    PUT /api/clientes/:id
    Actualiza un cliente existente.
    """
    cliente = Cliente.query.get(cliente_id)
    if not cliente or not cliente.activo:
        return jsonify({"error": "Cliente no encontrado"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Body JSON requerido"}), 400

    errors = cliente_update_schema.validate(data)
    if errors:
        return jsonify({"error": "Datos inválidos", "detalle": errors}), 400

    # Actualizar campos proporcionados
    if "nombre" in data:
        cliente.nombre = data["nombre"]
    if "telefono" in data:
        cliente.telefono = data["telefono"]
    if "email" in data:
        cliente.email = data["email"]
    if "telegram_id" in data:
        cliente.telegram_id = data["telegram_id"]
    if "notas_medicas" in data:
        cliente.notas_medicas = data["notas_medicas"]

    db.session.commit()

    registrar_operacion(
        accion="actualizar_cliente",
        entidad="cliente",
        entidad_id=cliente.id,
        usuario_id=g.current_user.id,
        detalle=f"Cliente actualizado: {cliente.nombre}",
        origen="admin",
    )

    return jsonify({
        "message": "Cliente actualizado",
        "cliente": cliente.to_dict(),
    }), 200


@clientes_bp.route("/<int:cliente_id>", methods=["DELETE"])
@jwt_required
def eliminar_cliente(cliente_id):
    """
    DELETE /api/clientes/:id
    Soft delete — desactiva el cliente sin borrar datos.
    """
    cliente = Cliente.query.get(cliente_id)
    if not cliente or not cliente.activo:
        return jsonify({"error": "Cliente no encontrado"}), 404

    cliente.activo = False
    db.session.commit()

    registrar_operacion(
        accion="eliminar_cliente",
        entidad="cliente",
        entidad_id=cliente.id,
        usuario_id=g.current_user.id,
        detalle=f"Cliente desactivado: {cliente.nombre}",
        origen="admin",
    )

    return jsonify({"message": "Cliente eliminado"}), 200


@clientes_bp.route("/<int:cliente_id>/citas", methods=["GET"])
@jwt_required
def historial_citas_cliente(cliente_id):
    """
    GET /api/clientes/:id/citas
    Historial de citas de un cliente específico.
    """
    cliente = Cliente.query.get(cliente_id)
    if not cliente:
        return jsonify({"error": "Cliente no encontrado"}), 404

    citas = cliente.citas.order_by(db.desc("fecha_hora")).all()

    return jsonify({
        "cliente": cliente.to_dict(),
        "citas": [c.to_dict() for c in citas],
        "total": len(citas),
    }), 200
