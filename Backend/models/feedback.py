"""
Modelo Feedback (retroalimentación post-sesión).
"""

from datetime import datetime, timezone
from extensions import db


class Feedback(db.Model):
    __tablename__ = "feedbacks"

    id = db.Column(db.Integer, primary_key=True)
    cita_id = db.Column(
        db.Integer, db.ForeignKey("citas.id"), nullable=False
    )
    calificacion = db.Column(db.Integer, nullable=False) # 1 a 5
    comentario = db.Column(db.Text, nullable=True)
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # Relación
    cita = db.relationship("Cita", backref="feedback", uselist=False)

    def to_dict(self):
        return {
            "id": self.id,
            "cita_id": self.cita_id,
            "calificacion": self.calificacion,
            "comentario": self.comentario,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
