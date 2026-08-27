"""
Modelo Usuario (administradores del sistema).
"""

from datetime import datetime, timezone

import bcrypt

from extensions import db


class Usuario(db.Model):
    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    rol = db.Column(db.String(20), nullable=False, default="admin")
    activo = db.Column(db.Boolean, default=True)
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # Relación con logs
    logs = db.relationship("LogOperacion", backref="usuario", lazy="dynamic")

    def set_password(self, password):
        """Hashea y almacena la contraseña con bcrypt."""
        self.password_hash = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

    def check_password(self, password):
        """Verifica una contraseña contra el hash almacenado."""
        return bcrypt.checkpw(
            password.encode("utf-8"), self.password_hash.encode("utf-8")
        )

    def to_dict(self):
        """Serializa el usuario (sin contraseña)."""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "rol": self.rol,
            "activo": self.activo,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Usuario {self.id}: {self.username}>"
