"""
Schema de validación y serialización para Cliente.
"""

from marshmallow import Schema, fields, validate


class ClienteSchema(Schema):
    id = fields.Int(dump_only=True)
    nombre = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=150),
        error_messages={"required": "El nombre es obligatorio"},
    )
    telefono = fields.Str(
        validate=validate.Length(max=20), load_default=None
    )
    email = fields.Email(load_default=None)
    telegram_id = fields.Str(
        validate=validate.Length(max=50), load_default=None
    )
    notas_medicas = fields.Str(load_default=None)
    activo = fields.Bool(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class ClienteUpdateSchema(Schema):
    """Schema para actualizaciones parciales de cliente."""
    nombre = fields.Str(validate=validate.Length(min=2, max=150))
    telefono = fields.Str(validate=validate.Length(max=20))
    email = fields.Email()
    telegram_id = fields.Str(validate=validate.Length(max=50))
    notas_medicas = fields.Str()
