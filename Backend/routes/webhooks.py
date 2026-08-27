"""
Webhooks para n8n — endpoints que el orquestador puede llamar.
Protegidos con API Key (header X-API-Key).
"""

from datetime import datetime, timezone

from flask import Blueprint, request, jsonify

from extensions import db
from models.cliente import Cliente
from models.cita import Cita
from models.servicio import Servicio
from routes.citas import calcular_disponibilidad
from utils.auth_middleware import api_key_required
from utils.logger import registrar_operacion

webhooks_bp = Blueprint("webhooks", __name__, url_prefix="/api/webhooks")


@webhooks_bp.route("/nueva-cita", methods=["POST"])
@api_key_required
def webhook_nueva_cita():
    """
    POST /api/webhooks/nueva-cita
    n8n envía datos de una nueva cita (ej. desde Telegram).
    Body: {
        "cliente_nombre": "María",
        "cliente_telefono": "3001234567",
        "servicio": "Terapia Manual",
        "fecha": "2026-08-29",
        "hora": "14:00"
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Body JSON requerido"}), 400

    # Buscar o crear cliente
    cliente = None
    if data.get("cliente_telefono"):
        cliente = Cliente.query.filter_by(telefono=data["cliente_telefono"]).first()
    if not cliente and data.get("telegram_id"):
        cliente = Cliente.query.filter_by(telegram_id=data["telegram_id"]).first()

    if not cliente:
        # Crear cliente nuevo
        cliente = Cliente(
            nombre=data.get("cliente_nombre", "Cliente sin nombre"),
            telefono=data.get("cliente_telefono"),
            telegram_id=data.get("telegram_id"),
        )
        db.session.add(cliente)
        db.session.flush()  # Para obtener el ID

    # Buscar servicio por nombre
    servicio_nombre = data.get("servicio", "")
    servicio = Servicio.query.filter(
        Servicio.nombre.ilike(f"%{servicio_nombre}%"),
        Servicio.activo == True,
    ).first()

    if not servicio:
        # Si no encuentra, usar el primer servicio activo
        servicio = Servicio.query.filter_by(activo=True).first()
        if not servicio:
            return jsonify({"error": "No hay servicios configurados"}), 404

    # Construir fecha_hora
    try:
        fecha = data.get("fecha", "")
        hora = data.get("hora", "10:00")
        fecha_hora = datetime.fromisoformat(f"{fecha}T{hora}:00")
    except (ValueError, TypeError):
        return jsonify({"error": "Formato de fecha/hora inválido"}), 400

    # Verificar disponibilidad
    slots = calcular_disponibilidad(fecha_hora.date(), servicio.id)
    fecha_hora_iso = fecha_hora.isoformat()
    slot_valido = any(fecha_hora_iso.startswith(s[:16]) for s in slots)

    if not slot_valido:
        return jsonify({
            "error": "Horario no disponible",
            "mensaje": f"El horario {hora} del {fecha} no está disponible.",
            "slots_disponibles": slots,
            "disponible": False,
        }), 409

    # Crear cita
    nueva_cita = Cita(
        cliente_id=cliente.id,
        servicio_id=servicio.id,
        fecha_hora=fecha_hora,
        estado="pendiente",
        origen="telegram",
        notas=data.get("notas"),
    )

    db.session.add(nueva_cita)
    db.session.commit()

    registrar_operacion(
        accion="crear_cita",
        entidad="cita",
        entidad_id=nueva_cita.id,
        detalle=f"Cita creada vía n8n/Telegram para {cliente.nombre}",
        origen="telegram",
    )

    return jsonify({
        "message": "Cita creada exitosamente",
        "disponible": True,
        "cita": nueva_cita.to_dict(),
        "cliente": cliente.to_dict(),
    }), 201


@webhooks_bp.route("/cancelar-cita", methods=["POST"])
@api_key_required
def webhook_cancelar_cita():
    """
    POST /api/webhooks/cancelar-cita
    n8n solicita cancelar una cita.
    Body: { "cita_id": 5 } o { "cliente_telefono": "300...", "fecha": "2026-08-29" }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Body JSON requerido"}), 400

    cita = None

    if data.get("cita_id"):
        cita = Cita.query.get(data["cita_id"])
    elif data.get("cliente_telefono") and data.get("fecha"):
        # Buscar por teléfono del cliente y fecha
        cliente = Cliente.query.filter_by(telefono=data["cliente_telefono"]).first()
        if cliente:
            try:
                fecha = datetime.strptime(data["fecha"], "%Y-%m-%d").date()
                from datetime import time as dtime
                inicio = datetime.combine(fecha, dtime.min)
                fin = datetime.combine(fecha, dtime.max)
                cita = Cita.query.filter(
                    Cita.cliente_id == cliente.id,
                    Cita.fecha_hora.between(inicio, fin),
                    Cita.estado.in_(["pendiente", "confirmada"]),
                ).first()
            except ValueError:
                return jsonify({"error": "Formato de fecha inválido"}), 400

    if not cita:
        return jsonify({"error": "Cita no encontrada"}), 404

    if cita.estado == "cancelada":
        return jsonify({"error": "La cita ya está cancelada"}), 400

    cita.estado = "cancelada"
    db.session.commit()

    registrar_operacion(
        accion="cancelar_cita",
        entidad="cita",
        entidad_id=cita.id,
        detalle="Cita cancelada vía n8n",
        origen="telegram",
    )

    return jsonify({
        "message": "Cita cancelada exitosamente",
        "cita": cita.to_dict(),
    }), 200


@webhooks_bp.route("/consultar-agenda", methods=["GET"])
@api_key_required
def webhook_consultar_agenda():
    """
    GET /api/webhooks/consultar-agenda?fecha=2026-08-29
    n8n consulta la agenda del día.
    """
    fecha_str = request.args.get("fecha")

    if not fecha_str:
        fecha = datetime.now(timezone.utc).date()
    else:
        try:
            fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Formato de fecha inválido"}), 400

    from datetime import time as dtime
    inicio = datetime.combine(fecha, dtime.min)
    fin = datetime.combine(fecha, dtime.max)

    citas = Cita.query.filter(
        Cita.fecha_hora.between(inicio, fin),
        Cita.estado.notin_(["cancelada"]),
    ).order_by(Cita.fecha_hora.asc()).all()

    return jsonify({
        "fecha": fecha.isoformat(),
        "citas": [c.to_dict() for c in citas],
        "total": len(citas),
        "mensaje": f"Hay {len(citas)} cita(s) para el {fecha.isoformat()}.",
    }), 200


@webhooks_bp.route("/buscar-cliente", methods=["GET"])
@api_key_required
def webhook_buscar_cliente():
    """
    GET /api/webhooks/buscar-cliente?nombre=Maria&telefono=300...
    n8n busca un cliente por nombre o teléfono.
    """
    nombre = request.args.get("nombre", "")
    telefono = request.args.get("telefono", "")
    telegram_id = request.args.get("telegram_id", "")

    query = Cliente.query.filter_by(activo=True)

    if nombre:
        query = query.filter(Cliente.nombre.ilike(f"%{nombre}%"))
    if telefono:
        query = query.filter(Cliente.telefono.ilike(f"%{telefono}%"))
    if telegram_id:
        query = query.filter_by(telegram_id=telegram_id)

    clientes = query.limit(10).all()

    return jsonify({
        "clientes": [c.to_dict() for c in clientes],
        "total": len(clientes),
    }), 200


@webhooks_bp.route("/log", methods=["POST"])
@api_key_required
def webhook_registrar_log():
    """
    POST /api/webhooks/log
    n8n registra una operación en los logs.
    Body: { "accion": "...", "entidad": "...", "detalle": "...", "origen": "n8n" }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Body JSON requerido"}), 400

    log = registrar_operacion(
        accion=data.get("accion", "operacion_n8n"),
        entidad=data.get("entidad"),
        entidad_id=data.get("entidad_id"),
        detalle=data.get("detalle"),
        origen=data.get("origen", "n8n"),
    )

    return jsonify({
        "message": "Log registrado",
        "log": log.to_dict(),
    }), 201
