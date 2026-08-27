"""
Schema de validación y serialización para Usuario.
"""

from marshmallow import Schema, fields, validate


class UsuarioSchema(Schema):
    id = fields.Int(dump_only=True)
    username = fields.Str(
        required=True,
        validate=validate.Length(min=3, max=80),
    )
    email = fields.Email(required=True)
    password = fields.Str(
        required=True,
        load_only=True,
        validate=validate.Length(min=6),
    )
    rol = fields.Str(
        validate=validate.OneOf(["admin", "operador"]),
        load_default="admin",
    )
    activo = fields.Bool(dump_only=True)
    created_at = fields.DateTime(dump_only=True)


class LoginSchema(Schema):
    username = fields.Str(
        required=True,
        error_messages={"required": "El nombre de usuario es obligatorio"},
    )
    password = fields.Str(
        required=True,
        error_messages={"required": "La contraseña es obligatoria"},
    )
