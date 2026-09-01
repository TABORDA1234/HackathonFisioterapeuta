"""
Logger de operaciones — registra acciones en la tabla logs_operaciones.
"""

from extensions import db
from models.log_operacion import LogOperacion


def registrar_operacion(
    accion,
    entidad=None,
    entidad_id=None,
    usuario_id=None,
    detalle=None,
    origen=None,
):
    """
    Registra una operación en el log de auditoría.

    Args:
        accion: Tipo de acción (crear_cita, cancelar_cita, login, etc.)
        entidad: Nombre de la entidad afectada (cita, cliente, servicio)
        entidad_id: ID de la entidad afectada
        usuario_id: ID del usuario que realizó la acción (None si es sistema)
        detalle: Descripción adicional en texto libre
        origen: De dónde vino la acción (web, telegram, n8n, admin)
    """
    log = LogOperacion(
        accion=accion,
        entidad=entidad,
        entidad_id=entidad_id,
        usuario_id=usuario_id,
        detalle=detalle,
        origen=origen,
    )
    db.session.add(log)
    db.session.commit()
    return log
