# Módulo 5 — Gmail (Backend de Correos)

**Responsable:** Persona 5  
**Cubre:** Funcionalidad 6 del reto (Fisioterapia Li)

## 📌 Objetivo del Módulo

Este módulo proporciona una API REST pura (Backend) para el envío y clasificación de correos electrónicos. Siguiendo el requerimiento de enfocarse exclusivamente en la lógica de backend (sin interfaces gráficas ni HTML externo complejo), este microservicio en Flask expone endpoints simples que pueden ser consumidos por **n8n** o por el **Módulo 8 (Backend principal)**.

---

## 🚀 Instalación y Ejecución

1. **Instalar dependencias:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configurar variables de entorno:**
   - Copia `.env.example` a `.env`:
     ```bash
     cp .env.example .env
     ```
   - Abre el archivo `.env` y coloca tu correo de Gmail y tu **Contraseña de Aplicación**.
   *(Para obtenerla: Google Account > Security > 2-Step Verification > App Passwords)*

3. **Iniciar el servidor:**
   ```bash
   python app.py
   ```
   El servidor se levantará en `http://localhost:5005`.

---

## 🔌 Endpoints de la API

### 1. Enviar Correo (`POST /api/email/enviar`)

Envía un correo automático (confirmación, recordatorio o cancelación). Las plantillas de texto están embebidas en el código (`templates.py`).

**Payload de ejemplo:**
```json
{
    "tipo": "confirmacion",
    "email": "paciente@correo.com",
    "cliente": "Juan Pérez",
    "fecha": "29/08/2026",
    "hora": "14:00",
    "servicio": "Terapia Manual"
}
```
*(Valores válidos para "tipo": `confirmacion`, `recordatorio`, `cancelacion`)*

**Respuesta exitosa:**
```json
{
    "status": "success",
    "message": "Correo enviado"
}
```

### 2. Clasificar Correo Entrante (`POST /api/email/clasificar`)

Recibe el texto de un correo entrante y detecta la intención principal (útil para organizar la bandeja o disparar flujos en n8n).

**Payload de ejemplo:**
```json
{
    "asunto": "Quiero anular mi turno",
    "cuerpo": "Hola, no podré asistir a mi cita de mañana."
}
```

**Respuesta:**
```json
{
    "intencion": "cancelar_cita",
    "status": "success"
}
```
*(Intenciones detectadas: `cancelar_cita`, `solicitar_cita`, `consulta_precios`, `urgencia`, `consulta_general`)*

---

## 🛠️ Cómo interactúa con los otros Módulos

- **Módulo 3 (n8n)** o **Módulo 8 (Backend)**: Cuando se crea o cancela una cita, simplemente deben hacer una petición HTTP POST a `http://localhost:5005/api/email/enviar` con el payload correspondiente. El envío real a través de los servidores de Google se hace de forma segura desde este microservicio.
