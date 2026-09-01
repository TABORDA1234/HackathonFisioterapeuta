# 🧠 Guía: IA Local (Ollama)

Esta carpeta contiene la configuración para el **Módulo 2 (Interpretación de lenguaje natural mediante IA local)** del Hackathon.

## 1. El Concepto
Como lo exige el reto: "La IA interpreta; el sistema valida; n8n orquesta; la API autorizada ejecuta."
El modelo de Inteligencia Artificial (IA) NO debe tocar las bases de datos ni el calendario directamente. Solo debe leer un mensaje de Telegram (ej. *"Quiero una cita mañana"*) y convertirlo a un formato estructurado (JSON) que las máquinas entiendan.

## 2. Archivo `Modelfile`
He creado un `Modelfile` en esta carpeta. Un Modelfile es como un Dockerfile pero para Inteligencia Artificial.
Contiene:
1. El modelo base (Llama 3.1).
2. Los parámetros de temperatura muy bajos (0.1) para que no "alucine" ni invente cosas, sino que sea preciso.
3. El **System Prompt**, donde le damos su personalidad y la instrucción estricta de responder SOLO en formato JSON.

## 3. ¿Cómo ejecutarlo localmente?
Dado que Render no tiene recursos gratuitos para correr modelos pesados, debes correr Ollama en tu computadora (o la de un compañero de equipo):

1. Descarga e instala [Ollama](https://ollama.com).
2. Abre tu terminal (PowerShell o CMD) en esta carpeta (`IALocal`).
3. Ejecuta el comando para crear el modelo personalizado:
   ```bash
   ollama create fisio-ai -f Modelfile
   ```
4. Inicia el modelo:
   ```bash
   ollama run fisio-ai
   ```
   *Pruébalo escribiendo: "Hola, agenda una cita para Ana a las 3pm". Te debe devolver un JSON.*

## 4. Conexión con n8n
Para que n8n (que estará en Render o en otra parte) pueda hablar con tu IA local, tienes dos opciones:

**Opción A (Fácil - ngrok):**
Usa [ngrok](https://ngrok.com/) para exponer el puerto 11434 de Ollama a internet:
```bash
ngrok http 11434
```
Esto te dará una URL (ej. `https://abc-123.ngrok.io`). En n8n usarás el nodo "HTTP Request" para enviarle el texto a esa URL (`https://abc-123.ngrok.io/api/generate`).

**Opción B (Todo Local):**
Si decides correr n8n también en tu computadora (usando el `docker-compose.yml` que dejamos en la carpeta `n8n`), n8n puede hablar con Ollama apuntando directamente a `http://host.docker.internal:11434/api/generate`.
