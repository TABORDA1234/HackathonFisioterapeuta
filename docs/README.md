# Módulo n8n — Orquestación | Fisioterapeuta Li

Este módulo es el **cerebro de orquestación** del sistema. No contiene lógica de negocio propia:
recibe eventos (Telegram, sitio web), llama al servicio de IA local para interpretar la intención,
valida, y ejecuta acciones llamando a las APIs REST de los demás módulos del equipo.

```
Usuario → Telegram → [n8n] → AI Service (Ollama) → [n8n valida] → Backend Service correspondiente
                                                                    (Calendar / Gmail / Drive+Sheets)
                                                                          ↓
                                                              [n8n] ← respuesta ← Telegram
```

**Regla de oro del reto:** la IA solo interpreta, nunca ejecuta directamente sobre Google Workspace.
Todas las acciones pasan por un servicio REST autorizado.

---

## 0. Equipo y módulos (según votación del grupo)

| # | Módulo | Funcionalidades | Responsable(s) |
|---|---|---|---|
| 1 | Bot de Telegram | 1 | Daniel Jiménez |
| 2 | IA Local (Ollama / NLP) | 2 | Camilo Peña |
| 3 | **Orquestación n8n** | 3, 12, 13 | **Tú** |
| 4 | Google Calendar / Agenda | 4 | Nicolas Muñoz |
| 5 | Gmail | 6 | Samuel Suarez |
| 6 | Google Drive + Sheets | 7, 8, 9 | Taborda, Juan Neira |
| 7 | Sitio Web + Reservas | 5, 10 | Taborda, Edwin Amézquita |
| 8 | Backend / BD / Auth / Panel Admin | 11, 12, 13 | Samuel Suarez |

Samuel Suarez lleva Gmail **y** Backend/Auth — son dos servicios/contenedores distintos
(`gmail-service` y `auth-service`), cada uno con su propio `docker-compose.<modulo>.yml`.

---

## 1. Dónde vive esto en el monorepo

```
fisioterapeuta-li/                              ← raíz del monorepo
├── docker-compose.yml                          ← raíz: solo define la red compartida "fisioli_net"
├── .env                                        ← raíz: TODAS las variables fusionadas (ver abajo)
├── docs/
│   └── API_CONTRACT.md                         ← CONTRATO compartido por todo el equipo (léelo primero)
└── services/
    ├── n8n-orchestration/                      ← ESTA carpeta, la mía
    │   ├── docker-compose.n8n.yml
    │   ├── .env.n8n.example
    │   └── workflows/
    │       ├── agendar_sesion.json
    │       ├── consultar_disponibilidad.json
    │       └── recordatorios_automaticos.json
    ├── telegram-bot/          ← Daniel
    ├── ai-service/            ← Camilo
    ├── calendar-service/      ← Nicolas
    ├── gmail-service/         ← Samuel
    ├── drive-sheets-service/  ← Taborda + Juan
    ├── website-reservas/      ← Taborda + Edwin
    └── auth-backend/          ← Samuel
```

Cada compañero aporta su propia carpeta bajo `services/<su-modulo>/` con su
`docker-compose.<modulo>.yml`, siguiendo el mismo patrón que este módulo. Así nadie
pisa el trabajo de nadie en un solo archivo compartido.

## 2. Cómo se levanta todo junto (comando que va en el README raíz del repo)

```bash
docker compose \
  -f docker-compose.yml \
  -f services/n8n-orchestration/docker-compose.n8n.yml \
  -f services/ai-service/docker-compose.ai.yml \
  -f services/calendar-service/docker-compose.calendar.yml \
  -f services/gmail-service/docker-compose.gmail.yml \
  -f services/drive-sheets-service/docker-compose.drive-sheets.yml \
  -f services/auth-backend/docker-compose.auth.yml \
  up -d
```

Cada quien agrega su `-f` cuando su módulo esté listo; no hace falta que todos estén
implementados desde el día uno para poder levantar los que ya existen.

## 3. Qué debe hacer cada compañero

1. Leer `docs/API_CONTRACT.md` y exponer sus endpoints **exactamente** con esos paths,
   métodos, payloads y el envelope común `{ "ok": bool, "data": {...}, "error": null }`.
2. Copiar el patrón de este módulo: su propio `docker-compose.<modulo>.yml` que se une
   a la red externa `fisioli_net` (ya definida en el compose raíz).
3. Usar el nombre del servicio como hostname interno (ej. `http://calendar-service:5000`),
   no `localhost`.
4. Fusionar sus variables de entorno en el `.env` raíz (mismo patrón que `.env.n8n.example`
   de este módulo) — **un solo `.env` para todo el monorepo**, no uno por módulo.
5. Devolver siempre HTTP 200 con el envelope de error dentro del body para errores de
   negocio, y reservar 4xx/5xx solo para errores técnicos reales.

## 4. Setup de este módulo específico

```bash
# 1. Fusiona las variables de .env.n8n.example dentro del .env raíz del monorepo
cat services/n8n-orchestration/.env.n8n.example >> .env
# 2. Levanta al menos n8n + su base de datos
docker compose -f docker-compose.yml -f services/n8n-orchestration/docker-compose.n8n.yml up -d
```

n8n queda disponible en `http://localhost:5678`. Importa los 3 workflows desde
**Import from File**: `agendar_sesion.json`, `consultar_disponibilidad.json`,
`recordatorios_automaticos.json`.

## 5. Los 3 workflows de este módulo

### `agendar_sesion.json`
Telegram → Auth → AI interpret → IF intención=agendar → Calendar Service (crear) →
Gmail Service (confirmación) → Telegram (respuesta) → Auth Service (auditoría).
Cubre funcionalidad 3 (orquestación) apoyando la 1, 2, 4 y 6.

### `consultar_disponibilidad.json`
Telegram → Auth → AI interpret → IF intención=consultar_disponibilidad →
Calendar Service (GET availability) → Telegram (lista de horarios formateada).
Flujo de solo lectura, sin pasos de confirmación.

### `recordatorios_automaticos.json` — cubre funcionalidad 12
**No se dispara por Telegram**, corre por **Schedule Trigger cada hora**:
Cron → Calendar Service (`GET /calendar/upcoming?within_hours=24`) → separa cada sesión →
Gmail Service (envía recordatorio) → si tuvo éxito, Calendar Service
(`POST /calendar/mark-reminded`, evita reenviar el mismo recordatorio) → auditoría.
Este workflow debe quedar **activo** (`active: true`) en producción; los otros dos se
activan cuando estén probados.

Usa este mismo esqueleto para nuevos flujos (cancelar sesión, gestión de Drive, asistente
de consulta general — funcionalidad 13): cambia el trigger o el endpoint del paso 4 según
corresponda.

## 6. Seguridad (checklist mínimo del reto)

- [x] Credenciales de Google nunca pasan por n8n ni por el modelo de IA.
- [x] Confirmación explícita antes de operaciones sensibles.
- [x] Variables de entorno para todos los secretos, nunca hardcoded en el workflow.
- [x] `INTERNAL_API_TOKEN` idéntico en el `.env` de todo el equipo — si no coincide, las
      llamadas entre servicios fallan con 401/403 (primer punto a revisar si algo no conecta).
- [x] Registro de acciones: cada ejecución de workflow queda en el log de n8n
      (activar "Save execution data") + tabla de auditoría vía `/admin/log`.
