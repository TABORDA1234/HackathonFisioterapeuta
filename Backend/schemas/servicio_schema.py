"""
Schema de validación y serialización para Servicio.
"""

from marshmallow import Schema, fields, validate


class ServicioSchema(Schema):
    id = fields.Int(dump_only=True)
    nombre = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=150),
        error_messages={"required": "El nombre del servicio es obligatorio"},
    )
    descripcion = fields.Str(load_default=None)
    duracion_min = fields.Int(
        required=True,
        validate=validate.Range(min=15, max=240),
        error_messages={"required": "La duración en minutos es obligatoria"},
    )
    precio = fields.Float(validate=validate.Range(min=0), load_default=None)
    activo = fields.Bool(dump_only=True)


class ServicioUpdateSchema(Schema):
    """Schema para actualizaciones parciales de servicio."""
    nombre = fields.Str(validate=validate.Length(min=2, max=150))
    descripcion = fields.Str()
    duracion_min = fields.Int(validate=validate.Range(min=15, max=240))
    precio = fields.Float(validate=validate.Range(min=0))
    activo = fields.Bool()
