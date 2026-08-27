# Estructura Modular — Fisioterapeuta Li (HackTech 5.0)
**Equipo:** 8 integrantes | **Nivel:** aprendizaje medio | **Arquitectura base:**
`Usuario → Telegram → n8n → IA Local → Servicios Empresariales → Google Workspace / BD / Sitio Web`

Principio de diseño obligatorio del reto: **la IA interpreta; el sistema valida; n8n orquesta; la API autorizada ejecuta.** La IA nunca debe tener permisos directos sobre Gmail, Calendar o Drive.

---

## Cómo se dividieron los 8 módulos

Se agruparon las 13 funcionalidades del reto en 8 bloques de trabajo del mismo tamaño aproximado, cada uno asignable a 1 persona (con apoyo puntual de otro módulo cuando haya dependencia).

---

### Módulo 1 — Bot de Telegram (Canal de interacción)
**Responsable:** Persona 1
**Cubre:** Funcionalidad 1 del reto

- Configurar el bot en BotFather y conectar el webhook a n8n.
- Recibir y enviar mensajes (texto, botones, confirmaciones).
- Identificar usuarios autorizados (whitelist de IDs de Telegram).
- Manejar conversaciones multi-turno (cuando falta un dato, el bot pregunta).
- Mostrar mensajes de confirmación antes de ejecutar acciones sensibles (crear/cancelar cita, enviar correo).
- Formatear respuestas legibles (agenda del día, resumen de citas, etc.).

**Entregable:** Bot funcional que recibe cualquier mensaje y lo reenvía a n8n, y que sabe mostrar el resultado final al usuario.

---

### Módulo 2 — IA Local / Interpretación de Lenguaje Natural
**Responsable:** Persona 2
**Cubre:** Funcionalidad 2

- Instalar y configurar Ollama (u otro motor local) con un modelo liviano (ej. Llama 3.1 8B, Mistral, Qwen).
- Exponer el modelo como API interna (`localhost:11434` o similar) consumible desde n8n.
- Diseñar el **prompt de sistema** que convierte lenguaje natural en JSON estructurado, por ejemplo:
  ```json
  {"intencion": "crear_cita", "cliente": "María", "fecha": "2026-08-29", "hora": "16:00"}
  ```
- Definir el catálogo cerrado de intenciones posibles (agendar, consultar, cancelar, buscar archivo, enviar correo, etc.).
- **Importante:** este módulo NO ejecuta nada, solo interpreta y entrega datos estructurados.

**Entregable:** Endpoint que recibe texto y devuelve JSON con intención + entidades extraídas.

---

### Módulo 3 — Orquestación con n8n (Motor central)
**Responsable:** Persona 3 (idealmente quien tenga más facilidad lógica/backend)
**Cubre:** Funcionalidad 3 — es el "pegamento" de todo el sistema

- Instalar y configurar n8n (local o Docker).
- Crear el workflow maestro: recibe mensaje de Telegram → llama a IA local → según intención, enruta al workflow correspondiente (Calendar, Gmail, Drive, Sheets).
- Diseñar el manejo de errores y reintentos.
- Implementar el paso de **validación** antes de ejecutar (regla del reto: la IA no ejecuta directo).
- Documentar cada workflow con nombres claros.

**Entregable:** Workflow maestro + sub-workflows por servicio, todos probados con casos reales.

---

### Módulo 4 — Google Calendar (Gestión de agenda)
**Responsable:** Persona 4
**Cubre:** Funcionalidad 4

- Conectar credenciales OAuth de Google Calendar en n8n.
- Consultar disponibilidad, crear, modificar y cancelar eventos.
- Lógica de detección de conflictos de horario.
- Definir duración de servicios, horarios bloqueados y horarios laborales configurables.
- Endpoint/workflow para "agenda del día" y "agenda semanal".

**Entregable:** Set de workflows en n8n que gestionan citas de extremo a extremo.

---

### Módulo 5 — Gmail (Correos automáticos)
**Responsable:** Persona 5
**Cubre:** Funcionalidad 6

- Conectar credenciales OAuth de Gmail en n8n.
- Plantillas de correo: confirmación de cita, recordatorio, cancelación.
- Envío automático disparado por eventos del Módulo 4 (ej. al crear una cita).
- Búsqueda/clasificación básica de mensajes entrantes si aplica.

**Entregable:** Workflows de envío de correo conectados a los eventos de agenda.

---

### Módulo 6 — Google Drive + Google Sheets (Gestión documental y reportes)
**Responsable:** Persona 6
**Cubre:** Funcionalidades 7, 8 y 9

- Diseñar y crear la estructura de carpetas: Administración, Finanzas, Clientes, Servicios, Marketing, Plantillas.
- Workflows para crear carpetas, buscar archivos, mover/organizar documentos.
- Hoja de cálculo (Sheets) para registro de servicios, reportes mensuales e indicadores básicos.
- Conectar Sheets como fuente de reportes consultables desde Telegram (ej. "muéstrame indicadores del mes").

**Entregable:** Estructura de Drive lista + workflows de organización + Sheet de reportes funcional.

---

### Módulo 7 — Sitio Web + Sistema de Reservas
**Responsable:** Persona 7 y Persona 8 (dupla, es el módulo más grande)
**Cubre:** Funcionalidades 5 y 10

- Página principal, información del negocio, servicios, contacto (frontend).
- Diseño responsive (mobile-first).
- Módulo de reservas: mostrar horarios disponibles, validar anticipación mínima, tiempo entre sesiones, días bloqueados.
- Conexión del formulario de reserva con el backend/n8n para que dispare el flujo de creación de cita (Módulo 4).
- Página de confirmación tras reservar.

**Entregable:** Sitio web funcional con formulario de reserva conectado en vivo al sistema.

---

### Módulo 8 — Backend, Base de Datos, Autenticación y Panel Administrativo
**Responsable:** Persona 8 (comparte apoyo con Módulo 7) — o si prefieren, redistribuir como "módulo transversal" entre 2 personas
**Cubre:** Funcionalidades 11, 12, 13 + requisitos de alcance (seguridad, BD, auth)

- Base de datos (clientes, servicios, citas, usuarios autorizados, logs de operaciones).
- Backend/API que conecta el sitio web con n8n y con la base de datos.
- Autenticación para el panel administrativo (login protegido).
- Panel admin: ver agenda, reservas, clientes, estado de integraciones, historial de operaciones.
- Recordatorios automáticos (workflow en n8n disparado por tiempo, ej. 24h antes de la cita).
- Seguridad: variables de entorno, HTTPS, principio de mínimo privilegio, validación de entradas, logs.

**Entregable:** Panel admin funcional + base de datos + capa de seguridad básica implementada.

---

## Resumen de asignación (8 personas)

| # | Módulo | Funcionalidades del reto |
|---|--------|---------------------------|
| 1 | Bot de Telegram | 1 |
| 2 | IA Local (interpretación NLP) | 2 |
| 3 | Orquestación n8n | 3 |
| 4 | Google Calendar / Agenda | 4 |
| 5 | Gmail | 6 |
| 6 | Google Drive + Sheets | 7, 8, 9 |
| 7 | Sitio Web + Reservas | 5, 10 |
| 8 | Backend / BD / Auth / Panel Admin | 11, 12, 13 |

---

## Orden sugerido de desarrollo (para evitar bloqueos entre módulos)

1. **1 (maximo 3 dias plazo hasta el viernes )** Módulos 3 (n8n base) y 8 (BD + backend base) se arrancan primero — son la base de todo.
2. **Paralelo:** Módulos 1 (Telegram) y 2 (IA local) pueden avanzar independientes.
3. **2 (maximo 2 dias plazo hasta el domingo)** Módulos 4, 5, 6 se conectan una vez n8n tiene el esqueleto listo.
4. **3 (maximo 2 dias plazo hasta el martes de la semana siguiente)** Módulo 7 (sitio web) se conecta al backend en cuanto existan endpoints de disponibilidad.
5. **4 (maximo 2 dias plazo hasta el jueves de la semana siguiente)** Integración total + demo del flujo mínimo exigido: *reserva desde web → valida disponibilidad → crea evento en Calendar → confirma por correo → se puede consultar por Telegram.*

---

## Notas de arquitectura a respetar siempre
- La IA local **solo interpreta**, nunca ejecuta directamente sobre Gmail/Calendar/Drive.
- Toda acción sensible pasa por **confirmación explícita** antes de ejecutarse.
- Credenciales siempre en variables de entorno, nunca hardcodeadas.
- Separar ambiente de desarrollo y producción desde el inicio.
