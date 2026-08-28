# Contrato de integración REST — n8n ↔ Servicios de equipo

Este documento es la **fuente de verdad** de cómo n8n habla con cada microservicio.
Cada compañero implementa su parte en Flask siguiendo exactamente estos paths, métodos y payloads.

## Convenciones generales (aplican a TODOS los servicios)

- Base URL interna: `http://<nombre-servicio>:<puerto>` (red Docker `fisioli_net`).
- Todas las requests desde n8n incluyen el header:
  ```
  X-Internal-Token: <INTERNAL_API_TOKEN>
  Content-Type: application/json
  ```
- Envelope de respuesta **obligatorio** en todos los endpoints:
  ```json
  {
    "ok": true,
    "data": { },
    "error": null
  }
  ```
  En caso de error de negocio (no técnico):
  ```json
  {
    "ok": false,
    "data": null,
    "error": { "code": "SLOT_UNAVAILABLE", "message": "El horario solicitado ya está ocupado." }
  }
  ```
- Devolver HTTP 200 para errores de negocio (así el nodo IF en n8n solo revisa `data.ok`).
  Usar 401/403 solo si falta o es inválido el `X-Internal-Token`, y 500 solo ante fallo técnico real.
- Fechas siempre en formato ISO 8601 (`2026-08-29T15:00:00-05:00`).

---

## 1. AI Service (interpretación de lenguaje natural — Ollama)

**Responsable:** Camilo Peña
**Funcionalidad del reto:** #2

⚠️ Importante: Ollama corre **dentro** de este contenedor/servicio (`localhost:11434` desde
la perspectiva de Camilo). n8n nunca habla con Ollama directamente — solo con `AI_SERVICE_URL`.

`POST /interpret`

Request:
```json
{ "text": "Agenda a María el viernes a las 4:00 p. m.", "chat_id": "123456" }
```
Response (`data`):
```json
{
  "intent": "agendar_sesion",
  "entities": {
    "cliente": "María",
    "fecha": "2026-08-29",
    "hora": "16:00",
    "servicio": null
  },
  "confidence": 0.91,
  "missing_fields": []
}
```
`intent` posibles: `agendar_sesion`, `consultar_disponibilidad`, `cancelar_sesion`,
`modificar_sesion`, `consultar_agenda`, `enviar_correo`, `buscar_archivo`, `crear_carpeta`,
`consulta_general`, `desconocido`.

---

## 2. Calendar Service

**Responsable:** Nicolas Muñoz
**Funcionalidades del reto:** #4, #5

| Endpoint | Método | Uso |
|---|---|---|
| `/calendar/availability` | `GET` | Consultar disponibilidad (`?date=2026-08-29`) |
| `/calendar/create` | `POST` | Crear sesión |
| `/calendar/update` | `POST` | Modificar sesión |
| `/calendar/cancel` | `POST` | Cancelar sesión |
| `/calendar/agenda` | `GET` | Agenda diaria/semanal (`?date=` o `?week=`) |
| `/calendar/upcoming` | `GET` | Sesiones próximas sin recordatorio enviado (`?within_hours=24`) — usado por el workflow de recordatorios automáticos |
| `/calendar/mark-reminded` | `POST` | Marca una sesión como "ya se envió recordatorio" (evita duplicados) |

`GET /calendar/upcoming` response (`data`):
```json
{
  "sessions": [
    { "id": "evt_123", "cliente": "María", "email": "maria@correo.com", "fecha": "2026-08-29", "hora": "16:00" }
  ]
}
```

`POST /calendar/mark-reminded` request:
```json
{ "id": "evt_123" }
```

`POST /calendar/create` request:
```json
{ "cliente": "María", "fecha": "2026-08-29", "hora": "16:00", "duracion_min": 45, "servicio": "Terapia general" }
```

---

## 3. Gmail Service

**Responsable:** Samuel Suarez
**Funcionalidad del reto:** #6

| Endpoint | Método | Uso |
|---|---|---|
| `/email/send` | `POST` | Enviar correo (confirmación, recordatorio) |
| `/email/search` | `GET` | Buscar mensajes (`?query=`) |

`POST /email/send` request:
```json
{ "to": "cliente@correo.com", "template": "confirmacion_cita", "vars": { "cliente": "María", "fecha": "2026-08-29", "hora": "16:00" } }
```

---

## 4. Drive + Sheets Service (un solo servicio, un solo `base_url`)

**Responsables:** Taborda y Juan Neira
**Funcionalidades del reto:** #7, #8, #9

Ambas cosas viven en el mismo microservicio (`DRIVE_SHEETS_SERVICE_URL`), simplemente con
prefijos de path distintos:

| Endpoint | Método | Uso |
|---|---|---|
| `/drive/folders` | `POST` | Crear carpeta |
| `/drive/files` | `GET` | Buscar/listar archivos (`?query=&folder=`) |
| `/drive/files/move` | `POST` | Mover archivo |
| `/drive/files/share` | `POST` | Compartir archivo |
| `/sheets/append` | `POST` | Registrar fila (servicio, cita, etc.) |
| `/sheets/report` | `GET` | Obtener reporte/indicador (`?type=mensual`) |

Estructura base esperada en Drive (folder raíz): `Administración`, `Finanzas`, `Clientes`, `Servicios`, `Marketing`, `Plantillas`.

---

## 5. Backend / Auth Service

**Responsable:** Samuel Suarez (comparte responsabilidad con Gmail, pero son dos servicios/contenedores distintos)
**Funcionalidades del reto:** #11 (panel admin), #12, #13, autenticación y usuarios autorizados

| Endpoint | Método | Uso |
|---|---|---|
| `/auth/validate` | `POST` | Valida que el `chat_id` de Telegram o token del sitio web esté autorizado |
| `/admin/log` | `POST` | n8n registra cada acción ejecutada (auditoría) |

`POST /auth/validate` request:
```json
{ "chat_id": "123456", "channel": "telegram" }
```
Response (`data`):
```json
{ "authorized": true, "role": "admin", "nombre": "Fisioterapeuta Li" }
```

n8n debe llamar este endpoint **al inicio de cada workflow** antes de procesar cualquier intención,
y detener el flujo con un mensaje de "no autorizado" si `authorized: false`.

---

## 6. Website / Reservas (llama HACIA n8n, no al revés)

**Responsables:** Taborda y Edwin Amézquita
**Funcionalidades del reto:** #5, #10

El sitio web NO es llamado por n8n. En su lugar, cuando un cliente reserva desde el sitio, el
backend del sitio dispara un **webhook hacia n8n**:

`POST https://<n8n-host>/webhook/reserva-web`

Payload esperado por n8n:
```json
{ "cliente": "María", "email": "maria@correo.com", "fecha": "2026-08-29", "hora": "16:00", "servicio": "Terapia general" }
```

n8n valida disponibilidad contra Calendar Service, confirma, y responde de vuelta al sitio con
el resultado (mismo envelope `{ok, data, error}`) para que el sitio muestre la confirmación al cliente.
