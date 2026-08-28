

import os
import smtplib
from email.message import EmailMessage
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from templates import generar_correo

load_dotenv()

app = Flask(__name__)

GMAIL_USER = os.getenv('GMAIL_USER')
GMAIL_PASSWORD = os.getenv('GMAIL_PASSWORD')

def enviar_correo_smtp(destinatario, asunto, cuerpo):
    if not GMAIL_USER or not GMAIL_PASSWORD:
        return False, "Credenciales no configuradas"

    msg = EmailMessage()
    msg.set_content(cuerpo)
    msg['Subject'] = asunto
    msg['From'] = GMAIL_USER
    msg['To'] = destinatario

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(GMAIL_USER, GMAIL_PASSWORD)
            server.send_message(msg)
        return True, "Correo enviado"
    except Exception as e:
        return False, str(e)


@app.route('/api/email/enviar', methods=['POST'])
def enviar_correo():
    """
    Endpoint para enviar un correo.
    Payload esperado:
    {
        "tipo": "confirmacion" | "recordatorio" | "cancelacion",
        "email": "correo@ejemplo.com",
        "cliente": "Nombre",
        "fecha": "DD/MM/YYYY",
        "hora": "HH:MM",
        "servicio": "Nombre del servicio"
    }
    """
    data = request.json
    if not data or not data.get('email'):
        return jsonify({'error': 'Email es requerido'}), 400

    tipo = data.get('tipo', 'confirmacion')
    destinatario = data.get('email')
    
    asunto, cuerpo = generar_correo(tipo, data)
    
    exito, mensaje = enviar_correo_smtp(destinatario, asunto, cuerpo)
    
    if exito:
        return jsonify({'status': 'success', 'message': mensaje})
    else:
        return jsonify({'status': 'error', 'message': mensaje}), 500


@app.route('/api/email/clasificar', methods=['POST'])
def clasificar_correo():
    """
    Endpoint para clasificar un correo entrante.
    Payload esperado:
    {
        "asunto": "asunto del correo",
        "cuerpo": "texto del correo"
    }
    """
    data = request.json or {}
    texto = (data.get('asunto', '') + " " + data.get('cuerpo', '')).lower()
    
    intencion = "consulta_general"
    
    if any(p in texto for p in ["cancelar", "anular", "no podre"]):
        intencion = "cancelar_cita"
    elif any(p in texto for p in ["agendar", "cita", "reserva"]):
        intencion = "solicitar_cita"
    elif any(p in texto for p in ["precio", "costo", "cuanto"]):
        intencion = "consulta_precios"
    elif any(p in texto for p in ["urgente", "emergencia", "dolor"]):
        intencion = "urgencia"
        
    return jsonify({
        'status': 'success',
        'intencion': intencion
    })


if __name__ == '__main__':
    app.run(port=5005, debug=True)
