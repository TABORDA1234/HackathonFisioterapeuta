"""
Script de inicialización y Seed directo a Supabase mediante psycopg2.
Crea las tablas si no existen e inserta los datos iniciales.
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres.ugdiecktcrhuozfaivwl:bd9wsz4x0E78YYPjk8@aws-0-ca-central-1.pooler.supabase.com:6543/postgres"
)

SCHEMA_SQL = """
-- 1. CREACIÓN DE TABLAS
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(150),
    telegram_id VARCHAR(50) UNIQUE,
    notas_medicas TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS servicios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    descripcion TEXT,
    duracion_min INTEGER NOT NULL DEFAULT 60,
    precio DOUBLE PRECISION,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'admin',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS citas (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id),
    servicio_id INTEGER NOT NULL REFERENCES servicios(id),
    fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    notas TEXT,
    origen VARCHAR(20) NOT NULL DEFAULT 'web',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logs_operaciones (
    id SERIAL PRIMARY KEY,
    accion VARCHAR(50) NOT NULL,
    entidad VARCHAR(50),
    entidad_id INTEGER,
    usuario_id INTEGER REFERENCES usuarios(id),
    detalle TEXT,
    origen VARCHAR(30),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
"""

SERVICIOS_SEED = [
    ('Terapia Manual', 'Tratamiento manual para aliviar dolor muscular y articular, mejorar movilidad y reducir tensión.', 60, 80000.0),
    ('Rehabilitación Postquirúrgica', 'Programa de recuperación después de cirugía ortopédica o traumatológica.', 45, 90000.0),
    ('Terapia Deportiva', 'Tratamiento especializado para lesiones deportivas y prevención de recaídas.', 60, 85000.0),
    ('Masaje Terapéutico', 'Masaje profundo para aliviar contracturas, mejorar circulación y reducir estrés.', 45, 70000.0),
    ('Evaluación Inicial', 'Primera consulta con evaluación postural, diagnóstico y plan de tratamiento.', 30, 60000.0),
    ('Electroterapia', 'Aplicación de corrientes eléctricas terapéuticas para manejo del dolor y recuperación muscular.', 30, 50000.0)
]

ADMIN_USER = (
    'admin',
    'admin@fisioterapeuta-li.com',
    # Hash bcrypt de 'admin123'
    '$2b$12$K.Fp21P8mF8h8KzQ/G0uOuE76tM00.N0Y/5s15xG52q.2pB87uJzK',
    'admin'
)

def run_seed():
    print("[*] Conectando a Supabase via Pooler IPv4 (.env)...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cur = conn.cursor()
        print("[+] Conexion exitosa a Supabase PostgreSQL.")

        print("\n[*] Creando tablas del sistema si no existen...")
        cur.execute(SCHEMA_SQL)
        print("[+] Tablas creadas/verificadas.")

        print("\n[*] Insertando usuario admin por defecto...")
        cur.execute(
            """
            INSERT INTO usuarios (username, email, password_hash, rol)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (username) DO NOTHING;
            """,
            ADMIN_USER
        )
        print("[+] Usuario admin verificado.")

        print("\n[*] Insertando servicios de fisioterapia...")
        for serv in SERVICIOS_SEED:
            cur.execute(
                """
                INSERT INTO servicios (nombre, descripcion, duracion_min, precio)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (nombre) DO NOTHING;
                """,
                serv
            )
            print(f"   - Servicio: {serv[0]}")
        print("[+] Servicios verificados.")

        # Consultar conteos
        cur.execute("SELECT count(*) FROM usuarios;")
        total_usuarios = cur.fetchone()[0]

        cur.execute("SELECT count(*) FROM servicios;")
        total_servicios = cur.fetchone()[0]

        cur.close()
        conn.close()

        print("\n" + "="*45)
        print("[SUCCESS] Base de datos en Supabase inicializada!")
        print(f"Total usuarios: {total_usuarios}")
        print(f"Total servicios: {total_servicios}")
        print("Credenciales Admin: admin / admin123")
        print("="*45)

    except Exception as e:
        print(f"[-] Error al conectar o inicializar base de datos: {e}")

if __name__ == "__main__":
    run_seed()
