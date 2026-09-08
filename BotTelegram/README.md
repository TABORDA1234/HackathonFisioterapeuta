# Orquestador de Telegram con Gemini

Este es un bot de Telegram puro en Python que reemplaza completamente a n8n. Utiliza la API de Gemini y su característica de **Function Calling** para tomar decisiones de forma autónoma.

## Cómo probarlo localmente

1. Abre una terminal y navega a esta carpeta: `cd BotTelegram`
2. Crea un entorno virtual e instala las librerías:
   ```bash
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Renombra el archivo `.env.example` a `.env` y pega tus tokens de Telegram y Gemini.
4. Ejecuta el bot:
   ```bash
   python app.py
   ```
5. ¡Escríbele a tu bot en Telegram! Podrás ver cómo analiza tu texto y hace llamadas POST a tu backend (o a `http://localhost:8000` si lo pruebas local).

## Despliegue en Render

Ya actualicé el archivo `render.yaml` en la raíz del proyecto.
En tu próximo **git push**, Render detectará un nuevo servicio llamado `fisio-telegram-bot` (un Background Worker).
Sólo tendrás que ir al panel de Render de ese nuevo servicio e inyectar las siguientes variables de entorno:
- `TELEGRAM_BOT_TOKEN`
- `GEMINI_API_KEY`
- `BACKEND_URL` (Ya configurada por defecto a `https://fisio-backend-s25s.onrender.com`)

## ⚠️ Sobre Google Drive y Sheets (Cuenta de Servicio)

Actualmente las funciones `crear_carpeta_drive` y `guardar_reporte_sheets` están programadas pero **simuladas**. 
A diferencia de n8n, donde hacías login manualmente (OAuth), un servidor autónomo requiere una **Service Account**.

**¿Qué necesitas hacer?**
1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Habilita las APIs: **Google Drive API** y **Google Sheets API**.
3. Ve a Credenciales -> Crear Credenciales -> **Cuenta de Servicio**.
4. Descarga la clave en formato **JSON**.
5. Pon ese archivo en esta carpeta como `service_account.json` (NO lo subas a GitHub).
6. Cuando lo tengas, avísame y reemplazaré los `TODO` en `app.py` por el código real para que el bot pueda crear carpetas de verdad.
