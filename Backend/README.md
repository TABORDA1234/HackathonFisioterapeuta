# ⚙️ Backend API — Fisioterapeuta Li

Backend REST API construido en Flask + SQLAlchemy + Supabase PostgreSQL para el sistema Fisioterapeuta Li (HackTech 5.0).

---

## 📦 Stack Tecnológico
- **Python 3.11** + **Flask 3.1** (Application Factory & Blueprints)
- **SQLAlchemy 2.0** + **Supabase PostgreSQL** (IPv4 Session Pooler)
- **Autenticación:** JWT (`PyJWT`) + `bcrypt`
- **Integración n8n:** Webhooks protegidos por `X-API-Key`
- **Validación:** `marshmallow`
- **Despliegue:** Docker / Gunicorn / Render

---

## 📁 Estructura del Módulo

```text
Backend/
├── app.py                      # Application Factory y configuración central
├── config.py                   # Configuración multi-entorno (dev, prod, test)
├── extensions.py               # Instancias de SQLAlchemy, CORS, Limiter, Marshmallow
├── requirements.txt            # Dependencias Python del proyecto
├── Dockerfile                  # Docker container definition
├── docker-compose.yml          # Orquestación con hot-reload
├── .env.example / .env         # Variables de entorno
│
├── models/                     # Modelos de base de datos
│   ├── cliente.py              # Pacientes (nombre, tel, telegram_id, notas)
│   ├── servicio.py             # Sesiones de fisioterapia
│   ├── cita.py                 # Reservas y estados
│   ├── usuario.py              # Administradores (bcrypt)
│   └── log_operacion.py        # Logs de auditoría
│
├── schemas/                    # Validación y serialización con Marshmallow
│   ├── cliente_schema.py
│   ├── servicio_schema.py
│   ├── cita_schema.py
│   └── usuario_schema.py
│
├── routes/                     # Controladores API REST
│   ├── auth.py                 # Login JWT y registro admin
│   ├── clientes.py             # CRUD clientes + historial
│   ├── servicios.py            # CRUD servicios (público / protegido)
│   ├── citas.py                # CRUD citas + motor de disponibilidad + agenda
│   ├── webhooks.py             # Webhooks para n8n (X-API-Key)
│   ├── admin.py                # Dashboard y auditoría
│   └── health.py               # Health check del sistema
│
├── utils/                      # Middleware y utilidades
│   ├── auth_middleware.py      # Decoradores @jwt_required y @api_key_required
│   ├── validators.py           # Validadores auxiliares
│   └── logger.py               # Registro de auditoría a BD
│
└── seeds/
    ├── seed_data.py            # Seed usando Flask context
    └── seed_supabase.py        # Seed directo a Supabase vía psycopg2
```

---

## 🔑 Endpoints Clave para Otros Equipos

### Sitio Web (Módulo 7)
- `GET /api/servicios` - Lista de servicios disponibles
- `GET /api/citas/disponibilidad?fecha=YYYY-MM-DD&servicio_id=1` - Slots disponibles
- `POST /api/citas` - Crear cita

### n8n (Módulo 3) - Header requerido: `X-API-Key: <N8N_API_KEY>`
- `POST /api/webhooks/nueva-cita` - Crear cita desde Telegram
- `POST /api/webhooks/cancelar-cita` - Cancelar cita
- `GET /api/webhooks/consultar-agenda?fecha=YYYY-MM-DD` - Consultar citas del día
- `GET /api/webhooks/buscar-cliente?telefono=...` - Buscar paciente

### Panel Admin (Módulo 8) - Header requerido: `Authorization: Bearer <TOKEN>`
- `POST /api/auth/login` - Login (`admin` / `admin123`)
- `GET /api/admin/dashboard` - Estadísticas y métricas
