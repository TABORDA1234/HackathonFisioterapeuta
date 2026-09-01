"""
Modelo Cita (reserva de sesión de fisioterapia).
"""

from datetime import datetime, timezone
from extensions import db


# Estados válidos para una cita
ESTADOS_CITA = ["pendiente", "confirmada", "cancelada", "completada", "no_asistio"]

# Orígenes válidos para una cita
ORIGENES_CITA = ["web", "telegram", "admin"]


class Cita(db.Model):
    __tablename__ = "citas"

    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(
        db.Integer, db.ForeignKey("clientes.id"), nullable=False
    )
    servicio_id = db.Column(
        db.Integer, db.ForeignKey("servicios.id"), nullable=False
    )
    fecha_hora = db.Column(db.DateTime, nullable=False)
    estado = db.Column(db.String(20), nullable=False, default="pendiente")
    notas = db.Column(db.Text, nullable=True)
    origen = db.Column(db.String(20), nullable=False, default="web")
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        """Serializa la cita a diccionario, incluyendo nombre de cliente y servicio."""
        data = {
            "id": self.id,
            "cliente_id": self.cliente_id,
            "servicio_id": self.servicio_id,
            "fecha_hora": self.fecha_hora.isoformat() if self.fecha_hora else None,
            "estado": self.estado,
            "notas": self.notas,
            "origen": self.origen,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        # Incluir datos del cliente y servicio si están cargados
        if self.cliente:
            data["cliente_nombre"] = self.cliente.nombre
        if self.servicio:
            data["servicio_nombre"] = self.servicio.nombre
            data["duracion_min"] = self.servicio.duracion_min
        return data

    def __repr__(self):
        return f"<Cita {self.id}: {self.estado} - {self.fecha_hora}>"
