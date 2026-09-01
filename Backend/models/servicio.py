"""
Modelo Servicio (tipos de sesión que ofrece la fisioterapeuta).
"""

from extensions import db


class Servicio(db.Model):
    __tablename__ = "servicios"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(150), nullable=False)
    descripcion = db.Column(db.Text, nullable=True)
    duracion_min = db.Column(db.Integer, nullable=False, default=60)
    precio = db.Column(db.Float, nullable=True)
    activo = db.Column(db.Boolean, default=True)

    # Relación con citas
    citas = db.relationship("Cita", backref="servicio", lazy="dynamic")

    def to_dict(self):
        """Serializa el servicio a diccionario."""
        return {
            "id": self.id,
            "nombre": self.nombre,
            "descripcion": self.descripcion,
            "duracion_min": self.duracion_min,
            "precio": self.precio,
            "activo": self.activo,
        }

    def __repr__(self):
        return f"<Servicio {self.id}: {self.nombre}>"
