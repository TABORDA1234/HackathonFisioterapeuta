"""
Schema de validación y serialización para Cita.
"""

from marshmallow import Schema, fields, validate

from models.cita import ESTADOS_CITA, ORIGENES_CITA


class CitaSchema(Schema):
    id = fields.Int(dump_only=True)
    cliente_id = fields.Int(
        required=True,
        error_messages={"required": "El ID del cliente es obligatorio"},
    )
    servicio_id = fields.Int(
        required=True,
        error_messages={"required": "El ID del servicio es obligatorio"},
    )
    fecha_hora = fields.DateTime(
        required=True,
        error_messages={"required": "La fecha y hora son obligatorias"},
    )
    estado = fields.Str(
        validate=validate.OneOf(ESTADOS_CITA),
        load_default="pendiente",
    )
    notas = fields.Str(load_default=None)
    origen = fields.Str(
        validate=validate.OneOf(ORIGENES_CITA),
        load_default="web",
    )
    # Campos de solo lectura (se incluyen en la respuesta)
    cliente_nombre = fields.Str(dump_only=True)
    servicio_nombre = fields.Str(dump_only=True)
    duracion_min = fields.Int(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class CitaUpdateSchema(Schema):
    """Schema para actualizaciones parciales de cita."""
    fecha_hora = fields.DateTime()
    estado = fields.Str(validate=validate.OneOf(ESTADOS_CITA))
    notas = fields.Str()


class CambiarEstadoSchema(Schema):
    """Schema para cambiar solo el estado de una cita."""
    estado = fields.Str(
        required=True,
        validate=validate.OneOf(ESTADOS_CITA),
        error_messages={"required": "El nuevo estado es obligatorio"},
    )
