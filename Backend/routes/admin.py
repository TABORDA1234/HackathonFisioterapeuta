"""
Rutas del panel administrativo — dashboard, logs, estado de integraciones.
"""

from datetime import datetime, timedelta, timezone, time as dtime

from flask import Blueprint, request, jsonify, g

from extensions import db
from models.cita import Cita
from models.cliente import Cliente
from models.servicio import Servicio
from models.log_operacion import LogOperacion
from utils.auth_middleware import jwt_required

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.route("/dashboard", methods=["GET"])
@jwt_required
def dashboard():
    """
    GET /api/admin/dashboard
    Estadísticas generales para el panel administrativo.
    """
    ahora = datetime.now(timezone.utc).replace(tzinfo=None)
    hoy = ahora.date()

    # Citas de hoy
    inicio_hoy = datetime.combine(hoy, dtime.min)
    fin_hoy = datetime.combine(hoy, dtime.max)
    citas_hoy = Cita.query.filter(
        Cita.fecha_hora.between(inicio_hoy, fin_hoy),
        Cita.estado.notin_(["cancelada"]),
    ).count()

    # Citas de esta semana
    lunes = hoy - timedelta(days=hoy.weekday())
    domingo = lunes + timedelta(days=6)
    inicio_semana = datetime.combine(lunes, dtime.min)
    fin_semana = datetime.combine(domingo, dtime.max)
    citas_semana = Cita.query.filter(
        Cita.fecha_hora.between(inicio_semana, fin_semana),
        Cita.estado.notin_(["cancelada"]),
    ).count()

    # Citas pendientes (todas las futuras pendientes)
    citas_pendientes = Cita.query.filter(
        Cita.estado == "pendiente",
        Cita.fecha_hora >= ahora,
    ).count()

    # Totales
    total_clientes = Cliente.query.filter_by(activo=True).count()
    total_servicios = Servicio.query.filter_by(activo=True).count()
    total_citas = Cita.query.count()

    # Citas por estado
    citas_por_estado = {}
    for estado in ["pendiente", "confirmada", "cancelada", "completada", "no_asistio"]:
        citas_por_estado[estado] = Cita.query.filter_by(estado=estado).count()

    # Próximas 5 citas
    proximas_citas = Cita.query.filter(
        Cita.fecha_hora >= ahora,
        Cita.estado.notin_(["cancelada"]),
    ).order_by(Cita.fecha_hora.asc()).limit(5).all()

    return jsonify({
        "estadisticas": {
            "citas_hoy": citas_hoy,
            "citas_semana": citas_semana,
            "citas_pendientes": citas_pendientes,
            "total_clientes": total_clientes,
            "total_servicios": total_servicios,
            "total_citas": total_citas,
        },
        "citas_por_estado": citas_por_estado,
        "proximas_citas": [c.to_dict() for c in proximas_citas],
        "fecha_consulta": ahora.isoformat(),
    }), 200


@admin_bp.route("/logs", methods=["GET"])
@jwt_required
def listar_logs():
    """
    GET /api/admin/logs?page=1&per_page=50&accion=crear_cita
    Historial de operaciones paginado.
    """
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)
    accion = request.args.get("accion")
    origen = request.args.get("origen")

    query = LogOperacion.query

    if accion:
        query = query.filter_by(accion=accion)
    if origen:
        query = query.filter_by(origen=origen)

    query = query.order_by(LogOperacion.timestamp.desc())
    paginacion = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "logs": [log.to_dict() for log in paginacion.items],
        "total": paginacion.total,
        "pagina": paginacion.page,
        "paginas": paginacion.pages,
    }), 200


@admin_bp.route("/integraciones", methods=["GET"])
@jwt_required
def estado_integraciones():
    """
    GET /api/admin/integraciones
    Estado de las integraciones del sistema (n8n, Telegram, etc.).
    """
    # Verificar BD (si estamos aquí, ya está conectada)
    try:
        db.session.execute(db.text("SELECT 1"))
        bd_ok = True
    except Exception:
        bd_ok = False

    # Contar operaciones recientes (últimas 24h) por origen
    ahora = datetime.now(timezone.utc).replace(tzinfo=None)
    hace_24h = ahora - timedelta(hours=24)
    ops_recientes = LogOperacion.query.filter(
        LogOperacion.timestamp >= hace_24h
    ).all()

    ops_por_origen = {}
    for op in ops_recientes:
        origen = op.origen or "desconocido"
        ops_por_origen[origen] = ops_por_origen.get(origen, 0) + 1

    return jsonify({
        "integraciones": {
            "base_de_datos": {
                "estado": "conectada" if bd_ok else "error",
                "ok": bd_ok,
            },
            "n8n": {
                "estado": "configurado",
                "operaciones_24h": ops_por_origen.get("n8n", 0),
                "nota": "Verificar conectividad con n8n manualmente.",
            },
            "telegram": {
                "estado": "configurado",
                "operaciones_24h": ops_por_origen.get("telegram", 0),
                "nota": "Verificar conectividad del bot con BotFather.",
            },
        },
        "operaciones_24h": ops_por_origen,
        "total_operaciones_24h": len(ops_recientes),
    }), 200


@admin_bp.route("/resumen", methods=["GET"])
@jwt_required
def resumen():
    """
    GET /api/admin/resumen
    Alias del dashboard para compatibilidad con el nuevo SitioWeb.
    """
    return dashboard()


@admin_bp.route("/citas-hoy", methods=["GET"])
@jwt_required
def citas_hoy():
    """
    GET /api/admin/citas-hoy
    Retorna todas las citas de hoy ordenadas por hora.
    """
    ahora = datetime.now(timezone.utc).replace(tzinfo=None)
    hoy = ahora.date()

    inicio_hoy = datetime.combine(hoy, dtime.min)
    fin_hoy = datetime.combine(hoy, dtime.max)

    citas = Cita.query.filter(
        Cita.fecha_hora.between(inicio_hoy, fin_hoy),
    ).order_by(Cita.fecha_hora.asc()).all()

    return jsonify({
        "fecha": hoy.isoformat(),
        "citas": [c.to_dict() for c in citas],
        "total": len(citas),
    }), 200

