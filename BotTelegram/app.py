import os
import time
import json
import requests
import telebot
from dotenv import load_dotenv
import google.generativeai as genai
import google_integration

# Cargar variables de entorno
load_dotenv()

TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

if not TELEGRAM_TOKEN or not GEMINI_API_KEY:
    print("⚠️ Faltan tokens de Telegram o Gemini en el archivo .env")
    exit(1)

# Configurar APIs
bot = telebot.TeleBot(TELEGRAM_TOKEN)
genai.configure(api_key=GEMINI_API_KEY)

# ─────────────────────────────────────────────
# Definición de Herramientas (Function Calling)
# ─────────────────────────────────────────────

def agendar_cita(nombre: str, correo: str, fecha: str, hora: str, servicio: str) -> str:
    """Envía los datos al backend para agendar una cita de fisioterapia."""
    try:
        # En el backend el servicio_id es un entero. Mapeo simple:
        servicios_map = {
            "terapia manual": 1,
            "rehabilitación postquirúrgica": 2,
            "terapia deportiva": 3,
            "masaje terapéutico": 4,
            "evaluación inicial": 5,
            "electroterapia": 6
        }
        
        # Buscar el ID aproximado
        servicio_id = 1 # Por defecto
        for key, val in servicios_map.items():
            if key in servicio.lower():
                servicio_id = val
                break
                
        fecha_hora = f"{fecha}T{hora}:00"
        
        payload = {
            "cliente_nombre": nombre,
            "cliente_email": correo,
            "cliente_telefono": "0000000000", # Asumimos por ahora si no lo pide
            "fecha_hora": fecha_hora,
            "servicio_id": servicio_id,
            "origen": "telegram",
            "notas": "Agendado vía Bot de Telegram"
        }
        
        # Llama a tu backend
        res = requests.post(f"{BACKEND_URL}/api/citas/reservar", json=payload)
        
        if res.status_code in [200, 201]:
            return json.dumps({"status": "success", "message": "Cita agendada correctamente en el sistema."})
        else:
            return json.dumps({"status": "error", "message": res.text})
            
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})

def crear_carpeta_drive(nombre_carpeta: str) -> str:
    """Crea una carpeta para el paciente en Google Drive."""
    try:
        enlace = google_integration.crear_carpeta(nombre_carpeta)
        return json.dumps({"status": "success", "message": f"Carpeta '{nombre_carpeta}' creada exitosamente.", "enlace": enlace})
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})

def guardar_reporte_sheets(texto: str) -> str:
    """Guarda un reporte o nota en la sábana de Google Sheets."""
    try:
        enlace = google_integration.guardar_reporte(texto)
        return json.dumps({"status": "success", "message": f"Reporte guardado exitosamente en Sheets.", "enlace": enlace})
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})

# Mapeo de funciones
funciones_disponibles = {
    "agendar_cita": agendar_cita,
    "crear_carpeta_drive": crear_carpeta_drive,
    "guardar_reporte_sheets": guardar_reporte_sheets
}

# ─────────────────────────────────────────────
# Configuración del Modelo Gemini
# ─────────────────────────────────────────────

instrucciones = """
Eres Fisioterapeuta Li, un asistente inteligente corporativo por Telegram.
Tu objetivo es ayudar a gestionar el negocio y conversar de forma amable con los pacientes y administradores.
Eres capaz de:
1. Agendar citas. Pide nombre, correo, fecha (YYYY-MM-DD), hora (HH:MM) y servicio.
2. Crear carpetas en Google Drive para pacientes. Pide el nombre de la carpeta.
3. Guardar reportes o notas en Google Sheets. Pide el texto de la nota.

IMPORTANTE: 
- NUNCA inventes datos. Si te falta el nombre, correo, fecha, hora o servicio para agendar, pídelos amablemente.
- Utiliza las funciones proporcionadas cuando tengas todos los datos.
"""

modelo = genai.GenerativeModel(
    model_name="gemini-3.5-flash",
    tools=[agendar_cita, crear_carpeta_drive, guardar_reporte_sheets],
    system_instruction=instrucciones
)

# Diccionario para guardar el historial de chat (instancias de chat de Gemini)
sesiones = {}

# ─────────────────────────────────────────────
# Handlers de Telegram
# ─────────────────────────────────────────────

@bot.message_handler(commands=['start', 'reiniciar'])
def send_welcome(message):
    chat_id = message.chat.id
    # Reiniciar la sesión
    sesiones[chat_id] = modelo.start_chat(enable_automatic_function_calling=True)
    bot.reply_to(message, "¡Hola! Soy Fisioterapeuta Li, tu asistente virtual. ¿En qué te puedo ayudar hoy? Puedo agendar citas, crear carpetas en Drive o guardar reportes.")

@bot.message_handler(func=lambda msg: True)
def handle_message(message):
    chat_id = message.chat.id
    texto = message.text

    if chat_id not in sesiones:
        # Activar el tool calling automático
        sesiones[chat_id] = modelo.start_chat(enable_automatic_function_calling=True)
    
    chat = sesiones[chat_id]
    
    # Enviar acción de "escribiendo" en Telegram
    bot.send_chat_action(chat_id, 'typing')
    
    try:
        # Enviar mensaje a Gemini. Con enable_automatic_function_calling=True,
        # el SDK de Python se encarga de ejecutar las funciones locales y 
        # devolver el resultado a Gemini automáticamente.
        response = chat.send_message(texto)
        bot.reply_to(message, response.text)
        
    except Exception as e:
        print(f"Error con Gemini: {e}")
        bot.reply_to(message, "Lo siento, tuve un pequeño problema procesando tu mensaje. ¿Me lo repites?")

# ─────────────────────────────────────────────
# Ejecución del Bot
# ─────────────────────────────────────────────

if __name__ == '__main__':
    print("🤖 Bot de Telegram iniciando...")
    # Intentar limpiar webhooks previos si había alguno conflictivo
    bot.remove_webhook()
    time.sleep(1)
    # Iniciar polling
    bot.infinity_polling()
