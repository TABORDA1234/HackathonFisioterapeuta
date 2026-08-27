"""
Rutas de Citas — CRUD + disponibilidad + agenda.
Este es el módulo central del sistema de reservas.
"""

from datetime import datetime, timedelta, timezone, time as dtime

from flask import Blueprint, request, jsonify, current_app, g

from extensions import db
from models.cita import Cita, ESTADOS_CITA
from models.cliente import Cliente
from models.servicio import Servicio
from schemas.cita_schema import CitaSchema, CitaUpdateSchema, CambiarEstadoSchema
from utils.auth_middleware import jwt_required
from utils.logger import registrar_operacion

citas_bp = Blueprint("citas", __name__, url_prefix="/api/citas")

cita_schema = CitaSchema()
cita_update_schema = CitaUpdateSchema()
cambiar_estado_schema = CambiarEstadoSchema()


# ─────────────────────────────────────────────
# Helpers de disponibilidad
# ─────────────────────────────────────────────

def _parse_hora(hora_str):
    """Convierte '08:00' a un objeto time."""
    h, m = hora_str.split(":")
    return dtime(int(h), int(m))


def _obtener_horario(fecha):
    """
    Retorna (hora_inicio, hora_fin) para una fecha dada,
    considerando sábado con horario reducido.
    """
    config = current_app.config
    dia_semana = fecha.weekday()  # 0=Lunes ... 6=Domingo

    # Verificar si es día laboral
    if dia_semana not in config["DIAS_LABORALES"]:
        return None, None

    hora_inicio = _parse_hora(config["HORARIO_INICIO"])

    # Sábado tiene horario reducido
    if dia_semana == 5:  # Sábado
        hora_fin = _parse_hora(config["HORARIO_SABADO_FIN"])
    else:
        hora_fin = _parse_hora(config["HORARIO_FIN"])

    return hora_inicio, hora_fin


def _obtener_citas_del_dia(fecha):
    """Obtiene todas las citas activas (no canceladas) de un día."""
    inicio_dia = datetime.combine(fecha, dtime.min)
    fin_dia = datetime.combine(fecha, dtime.max)

    return Cita.query.filter(
        Cita.fecha_hora >= inicio_dia,
        Cita.fecha_hora <= fin_dia,
        Cita.estado.notin_(["cancelada"]),
    ).all()


def calcular_disponibilidad(fecha, servicio_id):
    """
    Calcula los horarios disponibles para una fecha y servicio dados.
    Retorna lista de slots disponibles como strings ISO 8601.
    """
    config = current_app.config
    hora_inicio, hora_fin = _obtener_horario(fecha)

    if hora_inicio is None:
        return []  # Día no laboral

    # Obtener duración del servicio
    servicio = Servicio.query.get(servicio_id)
    if not servicio or not servicio.activo:
        return []

    duracion = timedelta(minutes=servicio.duracion_min)
    buffer = timedelta(minutes=config["BUFFER_ENTRE_SESIONES_MIN"])

    # Obtener citas existentes del día
    citas_existentes = _obtener_citas_del_dia(fecha)

    # Generar slots de tiempo cada 30 minutos
    slots_disponibles = []
    slot_actual = datetime.combine(fecha, hora_inicio)
    fin_jornada = datetime.combine(fecha, hora_fin)

    # Anticipación mínima
    ahora = datetime.now(timezone.utc).replace(tzinfo=None)
    minimo = ahora + timedelta(hours=config["ANTICIPACION_MINIMA_HORAS"])

    while slot_actual + duracion <= fin_jornada:
        # Verificar anticipación mínima
        if slot_actual < minimo:
            slot_actual += timedelta(minutes=30)
            continue

        # Verificar que no choque con citas existentes
        fin_slot = slot_actual + duracion
        conflicto = False

        for cita in citas_existentes:
            cita_inicio = cita.fecha_hora
            cita_duracion = timedelta(minutes=cita.servicio.duracion_min) if cita.servicio else timedelta(minutes=60)
            cita_fin = cita_inicio + cita_duracion + buffer

            # Hay conflicto si los rangos se solapan
            if slot_actual < cita_fin and fin_slot > (cita_inicio - buffer):
                conflicto = True
                break

        if not conflicto:
            slots_disponibles.append(slot_actual.isoformat())

        slot_actual += timedelta(minutes=30)

    return slots_disponibles


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@citas_bp.route("/disponibilidad", methods=["GET"])
def consultar_disponibilidad():
    """
    GET /api/citas/disponibilidad?fecha=2026-08-29&servicio_id=1
    Consulta horarios disponibles para una fecha y servicio. Público.
    """
    fecha_str = request.args.get("fecha")
    servicio_id = request.args.get("servicio_id", type=int)

    if not fecha_str or not servicio_id:
        return jsonify({"error": "Parámetros 'fecha' y 'servicio_id' son requeridos"}), 400

    try:
        fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Formato de fecha inválido. Use YYYY-MM-DD"}), 400

    # No permitir fechas pasadas
    if fecha < datetime.now(timezone.utc).date():
        return jsonify({"error": "No se puede consultar disponibilidad de fechas pasadas"}), 400

    slots = calcular_disponibilidad(fecha, servicio_id)

    return jsonify({
        "fecha": fecha_str,
        "servicio_id": servicio_id,
        "slots_disponibles": slots,
        "total_slots": len(slots),
    }), 200


@citas_bp.route("", methods=["GET"])
@jwt_required
def listar_citas():
    """
    GET /api/citas?fecha=2026-08-29&estado=pendiente&cliente_id=1&page=1
    Lista citas con filtros. Requiere JWT.
    """
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    fecha_str = request.args.get("fecha")
    estado = request.args.get("estado")
    cliente_id = request.args.get("cliente_id", type=int)

    query = Cita.query

    if fecha_str:
        try:
            fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
            inicio = datetime.combine(fecha, dtime.min)
            fin = datetime.combine(fecha, dtime.max)
            query = query.filter(Cita.fecha_hora.between(inicio, fin))
        except ValueError:
            return jsonify({"error": "Formato de fecha inválido"}), 400

    if estado:
        if estado not in ESTADOS_CITA:
            return jsonify({"error": f"Estado inválido. Use: {ESTADOS_CITA}"}), 400
        query = query.filter_by(estado=estado)

    if cliente_id:
        query = query.filter_by(cliente_id=cliente_id)

    query = query.order_by(Cita.fecha_hora.desc())
    paginacion = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "citas": [c.to_dict() for c in paginacion.items],
        "total": paginacion.total,
        "pagina": paginacion.page,
        "paginas": paginacion.pages,
    }), 200


@citas_bp.route("/<int:cita_id>", methods=["GET"])
@jwt_required
def obtener_cita(cita_id):
    """
    GET /api/citas/:id
    Detalle de una cita.
    """
    cita = Cita.query.get(cita_id)
    if not cita:
        return jsonify({"error": "Cita no encontrada"}), 404

    return jsonify({"cita": cita.to_dict()}), 200


@citas_bp.route("", methods=["POST"])
def crear_cita():
    """
    POST /api/citas
    Crea una nueva cita validando disponibilidad.
    Público (para web y n8n). Se puede proteger con API key opcionalmente.
    Body: { "cliente_id": 1, "servicio_id": 1, "fecha_hora": "2026-08-29T10:00:00", "origen": "web" }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Body JSON requerido"}), 400

    errors = cita_schema.validate(data)
    if errors:
        return jsonify({"error": "Datos inválidos", "detalle": errors}), 400

    # Verificar que el cliente existe
    cliente = Cliente.query.get(data["cliente_id"])
    if not cliente or not cliente.activo:
        return jsonify({"error": "Cliente no encontrado"}), 404

    # Verificar que el servicio existe
    servicio = Servicio.query.get(data["servicio_id"])
    if not servicio or not servicio.activo:
        return jsonify({"error": "Servicio no encontrado"}), 404

    # Parsear fecha
    try:
        fecha_hora = datetime.fromisoformat(str(data["fecha_hora"]))
    except (ValueError, TypeError):
        return jsonify({"error": "Formato de fecha/hora inválido"}), 400

    # Verificar que no es fecha pasada
    ahora = datetime.now(timezone.utc).replace(tzinfo=None)
    if fecha_hora < ahora:
        return jsonify({"error": "No se puede crear una cita en el pasado"}), 400

    # Verificar disponibilidad
    fecha = fecha_hora.date()
    slots = calcular_disponibilidad(fecha, data["servicio_id"])
    fecha_hora_iso = fecha_hora.isoformat()

    # Buscar si el slot solicitado está disponible (comparar sin microsegundos)
    slot_valido = any(
        fecha_hora_iso.startswith(s[:16]) for s in slots
    )
    if not slot_valido:
        return jsonify({
            "error": "El horario seleccionado no está disponible",
            "slots_disponibles": slots,
        }), 409

    # Crear la cita
    nueva_cita = Cita(
        cliente_id=data["cliente_id"],
        servicio_id=data["servicio_id"],
        fecha_hora=fecha_hora,
        estado=data.get("estado", "pendiente"),
        notas=data.get("notas"),
        origen=data.get("origen", "web"),
    )

    db.session.add(nueva_cita)
    db.session.commit()

    registrar_operacion(
        accion="crear_cita",
        entidad="cita",
        entidad_id=nueva_cita.id,
        detalle=f"Cita creada para {cliente.nombre} - {servicio.nombre} el {fecha_hora}",
        origen=data.get("origen", "web"),
    )

    return jsonify({
        "message": "Cita creada exitosamente",
        "cita": nueva_cita.to_dict(),
    }), 201


@citas_bp.route("/<int:cita_id>", methods=["PUT"])
@jwt_required
def actualizar_cita(cita_id):
    """
    PUT /api/citas/:id
    Actualiza una cita existente.
    """
    cita = Cita.query.get(cita_id)
    if not cita:
        return jsonify({"error": "Cita no encontrada"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Body JSON requerido"}), 400

    errors = cita_update_schema.validate(data)
    if errors:
        return jsonify({"error": "Datos inválidos", "detalle": errors}), 400

    if "fecha_hora" in data:
        try:
            cita.fecha_hora = datetime.fromisoformat(str(data["fecha_hora"]))
        except (ValueError, TypeError):
            return jsonify({"error": "Formato de fecha/hora inválido"}), 400

    if "estado" in data:
        cita.estado = data["estado"]
    if "notas" in data:
        cita.notas = data["notas"]

    db.session.commit()

    registrar_operacion(
        accion="actualizar_cita",
        entidad="cita",
        entidad_id=cita.id,
        usuario_id=g.current_user.id,
        detalle=f"Cita actualizada: {cita.id}",
        origen="admin",
    )

    return jsonify({
        "message": "Cita actualizada",
        "cita": cita.to_dict(),
    }), 200


@citas_bp.route("/<int:cita_id>/estado", methods=["PATCH"])
@jwt_required
def cambiar_estado(cita_id):
    """
    PATCH /api/citas/:id/estado
    Cambia solo el estado de una cita.
    Body: { "estado": "confirmada" }
    """
    cita = Cita.query.get(cita_id)
    if not cita:
        return jsonify({"error": "Cita no encontrada"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Body JSON requerido"}), 400

    errors = cambiar_estado_schema.validate(data)
    if errors:
        return jsonify({"error": "Datos inválidos", "detalle": errors}), 400

    estado_anterior = cita.estado
    cita.estado = data["estado"]
    db.session.commit()

    registrar_operacion(
        accion="cambiar_estado_cita",
        entidad="cita",
        entidad_id=cita.id,
        usuario_id=g.current_user.id,
        detalle=f"Estado cambiado de '{estado_anterior}' a '{cita.estado}'",
        origen="admin",
    )

    return jsonify({
        "message": f"Estado cambiado a '{cita.estado}'",
        "cita": cita.to_dict(),
    }), 200


@citas_bp.route("/agenda", methods=["GET"])
@jwt_required
def agenda():
    """
    GET /api/citas/agenda?fecha=2026-08-29&rango=dia
    Agenda del día o semana. Requiere JWT.
    rango: 'dia' (default) o 'semana'
    """
    fecha_str = request.args.get("fecha")
    rango = request.args.get("rango", "dia")

    if not fecha_str:
        fecha = datetime.now(timezone.utc).date()
    else:
        try:
            fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Formato de fecha inválido"}), 400

    if rango == "semana":
        # Calcular lunes de la semana
        lunes = fecha - timedelta(days=fecha.weekday())
        inicio = datetime.combine(lunes, dtime.min)
        fin = datetime.combine(lunes + timedelta(days=6), dtime.max)
    else:
        inicio = datetime.combine(fecha, dtime.min)
        fin = datetime.combine(fecha, dtime.max)

    citas = Cita.query.filter(
        Cita.fecha_hora.between(inicio, fin),
        Cita.estado.notin_(["cancelada"]),
    ).order_by(Cita.fecha_hora.asc()).all()

    return jsonify({
        "fecha": fecha.isoformat(),
        "rango": rango,
        "citas": [c.to_dict() for c in citas],
        "total": len(citas),
    }), 200
