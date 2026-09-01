"""
Seed data — carga datos iniciales en la base de datos.
Ejecutar: python seeds/seed_data.py
"""

import os
import sys

# Agregar directorio padre al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from extensions import db
from models.usuario import Usuario
from models.servicio import Servicio


def seed():
    """Carga datos iniciales: usuario admin + servicios base."""
    app = create_app()

    with app.app_context():
        print("🌱 Iniciando seed de datos...")

        # ── Usuario Admin ──
        admin_username = os.getenv("ADMIN_USERNAME", "admin")
        admin_email = os.getenv("ADMIN_EMAIL", "admin@fisioterapeuta-li.com")
        admin_password = os.getenv("ADMIN_PASSWORD", "admin123")

        admin = Usuario.query.filter_by(username=admin_username).first()
        if not admin:
            admin = Usuario(
                username=admin_username,
                email=admin_email,
                rol="admin",
            )
            admin.set_password(admin_password)
            db.session.add(admin)
            print(f"  ✅ Usuario admin creado: {admin_username}")
        else:
            print(f"  ℹ️  Usuario admin ya existe: {admin_username}")

        # ── Servicios de fisioterapia ──
        servicios_base = [
            {
                "nombre": "Terapia Manual",
                "descripcion": "Tratamiento manual para aliviar dolor muscular y articular, mejorar movilidad y reducir tensión.",
                "duracion_min": 60,
                "precio": 80000,
            },
            {
                "nombre": "Rehabilitación Postquirúrgica",
                "descripcion": "Programa de recuperación después de cirugía ortopédica o traumatológica.",
                "duracion_min": 45,
                "precio": 90000,
            },
            {
                "nombre": "Terapia Deportiva",
                "descripcion": "Tratamiento especializado para lesiones deportivas y prevención de recaídas.",
                "duracion_min": 60,
                "precio": 85000,
            },
            {
                "nombre": "Masaje Terapéutico",
                "descripcion": "Masaje profundo para aliviar contracturas, mejorar circulación y reducir estrés.",
                "duracion_min": 45,
                "precio": 70000,
            },
            {
                "nombre": "Evaluación Inicial",
                "descripcion": "Primera consulta con evaluación postural, diagnóstico y plan de tratamiento.",
                "duracion_min": 30,
                "precio": 60000,
            },
            {
                "nombre": "Electroterapia",
                "descripcion": "Aplicación de corrientes eléctricas terapéuticas para manejo del dolor y recuperación muscular.",
                "duracion_min": 30,
                "precio": 50000,
            },
        ]

        for servicio_data in servicios_base:
            existente = Servicio.query.filter_by(nombre=servicio_data["nombre"]).first()
            if not existente:
                servicio = Servicio(**servicio_data)
                db.session.add(servicio)
                print(f"  ✅ Servicio creado: {servicio_data['nombre']}")
            else:
                print(f"  ℹ️  Servicio ya existe: {servicio_data['nombre']}")

        db.session.commit()
        print("\n🎉 Seed completado exitosamente!")
        print(f"   Admin: {admin_username} / {admin_password}")
        print(f"   Servicios: {len(servicios_base)} configurados")


if __name__ == "__main__":
    seed()
