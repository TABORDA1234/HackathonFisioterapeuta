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
from utils.email_service import enviar_correo_confirmacion, notificar_nueva_cita
from utils.google_calendar import crear_evento_calendario
import os
import requests

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
            # Asegurar que cita_inicio no tenga tzinfo para poder compararla con slot_actual
            cita_inicio = cita.fecha_hora.replace(tzinfo=None) if cita.fecha_hora.tzinfo else cita.fecha_hora
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
    fecha_inicio_str = request.args.get("fecha_inicio")
    fecha_fin_str = request.args.get("fecha_fin")
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
            
    elif fecha_inicio_str and fecha_fin_str:
        try:
            f_ini = datetime.strptime(fecha_inicio_str, "%Y-%m-%d").date()
            f_fin = datetime.strptime(fecha_fin_str, "%Y-%m-%d").date()
            inicio = datetime.combine(f_ini, dtime.min)
            fin = datetime.combine(f_fin, dtime.max)
            query = query.filter(Cita.fecha_hora.between(inicio, fin))
        except ValueError:
            return jsonify({"error": "Formato de fecha de inicio/fin inválido"}), 400

    if estado:
        if estado not in ESTADOS_CITA:
            return jsonify({"error": f"Estado inválido. Use: {ESTADOS_CITA}"}), 400
        query = query.filter_by(estado=estado)

    if cliente_id:
        query = query.filter_by(cliente_id=cliente_id)

    query = query.order_by(Cita.fecha_hora.desc())
    
    # Si viene paginación explicitamente o no viene rango de fechas
    if request.args.get("page") or not (fecha_inicio_str and fecha_fin_str):
        paginacion = query.paginate(page=page, per_page=per_page, error_out=False)
        return jsonify({
            "citas": [c.to_dict() for c in paginacion.items],
            "total": paginacion.total,
            "pagina": paginacion.page,
            "paginas": paginacion.pages,
        }), 200
    else:
        # Si pide rango de fechas (grid semanal) y no especifica paginación, devolver todo el rango
        citas = query.all()
        return jsonify({
            "citas": [c.to_dict() for c in citas],
            "total": len(citas),
            "pagina": 1,
            "paginas": 1,
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

    # Intentar enviar notificación por email (se hace en segundo plano)
    try:
        threading.Thread(target=notificar_nueva_cita, args=(nueva_cita.id,), daemon=True).start()
    except Exception as e:
        print(f"Error al iniciar thread de notificación de correo: {e}")

    # Intentar agendar en Google Calendar (se hace en segundo plano)
    try:
        threading.Thread(target=crear_evento_calendario, args=(nueva_cita, servicio), daemon=True).start()
    except Exception as e:
        print(f"Error al iniciar thread de Google Calendar: {e}")

    return jsonify({
        "message": "Cita creada exitosamente",
        "cita": nueva_cita.to_dict(),
    }), 201


@citas_bp.route("/reservar", methods=["POST"])
def reservar_cita():
    """
    POST /api/citas/reservar
    Endpoint público para el sitio web. Busca o crea el cliente
    automáticamente y luego agenda la cita validando disponibilidad.
    Body: {
        "cliente_nombre": "Ana Pérez",
        "cliente_telefono": "+57 300 000 0000",
        "servicio_id": 1,
        "fecha_hora": "2026-08-29T10:00:00",
        "origen": "web"
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Body JSON requerido"}), 400

    nombre = data.get("cliente_nombre", "").strip()
    telefono = data.get("cliente_telefono", "").strip()
    email = data.get("cliente_email", "").strip()
    servicio_id = data.get("servicio_id")
    fecha_hora_str = data.get("fecha_hora")
    origen = data.get("origen", "web")

    # Validaciones básicas
    if not nombre:
        return jsonify({"error": "El nombre del paciente es obligatorio"}), 400
    if not telefono:
        return jsonify({"error": "El teléfono del paciente es obligatorio"}), 400
    if not servicio_id:
        return jsonify({"error": "El ID del servicio es obligatorio"}), 400
    if not fecha_hora_str:
        return jsonify({"error": "La fecha y hora son obligatorias"}), 400

    # Verificar servicio
    servicio = Servicio.query.get(servicio_id)
    if not servicio or not servicio.activo:
        return jsonify({"error": "Servicio no encontrado"}), 404

    # Parsear fecha_hora
    try:
        fecha_hora = datetime.fromisoformat(str(fecha_hora_str))
    except (ValueError, TypeError):
        return jsonify({"error": "Formato de fecha/hora invalido"}), 400

    # No permitir fechas pasadas
    ahora = datetime.now(timezone.utc).replace(tzinfo=None)
    if fecha_hora < ahora:
        return jsonify({"error": "No se puede crear una cita en el pasado"}), 400

    # Verificar disponibilidad
    fecha = fecha_hora.date()
    slots = calcular_disponibilidad(fecha, servicio_id)
    fecha_hora_iso = fecha_hora.isoformat()
    slot_valido = any(fecha_hora_iso.startswith(s[:16]) for s in slots)

    if not slot_valido:
        return jsonify({
            "error": "El horario seleccionado no esta disponible",
            "slots_disponibles": slots,
        }), 409

    # Buscar o crear cliente por teléfono
    cliente = Cliente.query.filter_by(telefono=telefono).first()
    if not cliente:
        cliente = Cliente(nombre=nombre, telefono=telefono, email=email or None)
        db.session.add(cliente)
        db.session.flush()
    else:
        # Actualizar email si se proporcionó y el cliente no lo tenía
        if email and not cliente.email:
            cliente.email = email
            db.session.add(cliente)
            db.session.flush()

    # Crear la cita
    nueva_cita = Cita(
        cliente_id=cliente.id,
        servicio_id=servicio_id,
        fecha_hora=fecha_hora,
        estado="pendiente",
        origen=origen,
    )
    db.session.add(nueva_cita)
    db.session.commit()

    registrar_operacion(
        accion="crear_cita",
        entidad="cita",
        entidad_id=nueva_cita.id,
        detalle=f"Reserva web: {cliente.nombre} - {servicio.nombre} el {fecha_hora}",
        origen=origen,
    )

    # Enviar correo de confirmación
    fecha_str = nueva_cita.fecha_hora.strftime("%Y-%m-%d")
    hora_str = nueva_cita.fecha_hora.strftime("%H:%M")
    enviar_correo_confirmacion(
        nombre=cliente.nombre,
        correo_destino=cliente.email,
        servicio_nombre=servicio.nombre,
        fecha=fecha_str,
        hora=hora_str
    )

    # Intentar agendar en Google Calendar (se hace en segundo plano)
    try:
        threading.Thread(target=crear_evento_calendario, args=(nueva_cita, servicio), daemon=True).start()
    except Exception as e:
        print(f"Error al iniciar thread de Google Calendar: {e}")

    return jsonify({
        "message": "Cita reservada exitosamente",
        "cita": nueva_cita.to_dict(),
        "cliente": cliente.to_dict(),
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

@citas_bp.route("/test-email", methods=["GET"])
def test_email_endpoint():
    """
    Endpoint de diagnóstico para probar credenciales SMTP.
    Envía un correo de prueba de forma síncrona y devuelve el error detallado.
    """
    destino = request.args.get("destino")
    if not destino:
        return jsonify({"error": "Debes proveer un ?destino=correo@ejemplo.com"}), 400

    api_key = os.getenv('BREVO_API_KEY')
    remitente = os.getenv('SMTP_USER', 'tu-correo@ejemplo.com')

    if not api_key:
        return jsonify({"error": "BREVO_API_KEY no está configurado en el servidor"}), 500

    url = "https://api.brevo.com/v3/smtp/email"
    payload = {
        "sender": {"name": "Diagnostico", "email": remitente},
        "to": [{"email": destino, "name": "Usuario de Prueba"}],
        "subject": "Correo de prueba desde Render (Brevo)",
        "htmlContent": "<p>Si recibes esto, el envío por Brevo en Render funciona perfectamente.</p>"
    }
    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return jsonify({"success": True, "message": f"Correo enviado a {destino} vía Brevo"}), 200
    except requests.exceptions.RequestException as e:
        err_msg = e.response.text if e.response else str(e)
        return jsonify({
            "success": False, 
            "error_type": type(e).__name__,
            "error_detail": err_msg,
            "hint": "Verifica que la API Key de Brevo sea correcta y que el remitente (SMTP_USER) esté validado en Brevo."
        }), 500
