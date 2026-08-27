"""
Modelo LogOperacion (registro de auditoría de acciones del sistema).
"""

from datetime import datetime, timezone
from extensions import db


class LogOperacion(db.Model):
    __tablename__ = "logs_operaciones"

    id = db.Column(db.Integer, primary_key=True)
    accion = db.Column(db.String(50), nullable=False)  # crear_cita, cancelar_cita, login, etc.
    entidad = db.Column(db.String(50), nullable=True)   # cita, cliente, servicio, etc.
    entidad_id = db.Column(db.Integer, nullable=True)
    usuario_id = db.Column(
        db.Integer, db.ForeignKey("usuarios.id"), nullable=True
    )
    detalle = db.Column(db.Text, nullable=True)
    origen = db.Column(db.String(30), nullable=True)  # web, telegram, n8n, admin
    timestamp = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )

    def to_dict(self):
        """Serializa el log a diccionario."""
        return {
            "id": self.id,
            "accion": self.accion,
            "entidad": self.entidad,
            "entidad_id": self.entidad_id,
            "usuario_id": self.usuario_id,
            "usuario_nombre": self.usuario.username if self.usuario else None,
            "detalle": self.detalle,
            "origen": self.origen,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }

    def __repr__(self):
        return f"<Log {self.id}: {self.accion} - {self.entidad}>"
