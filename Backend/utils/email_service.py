import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import threading

def enviar_correo_confirmacion(nombre, correo_destino, servicio_nombre, fecha, hora):
    """
    Envía un correo de confirmación de cita al paciente usando SMTP (en segundo plano).
    """
    if not correo_destino:
        return
        
    def _enviar():
        import requests
        
        url = "https://api.brevo.com/v3/smtp/email"
        api_key = os.getenv('BREVO_API_KEY')
        
        if not api_key:
            print("[ERROR] No se ha configurado BREVO_API_KEY en el .env")
            return
            
        asunto = "¡Tu cita con Fisioterapeuta Li ha sido agendada! 🌿"
        
        html = f"""
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fdfa; border: 1px solid #e2f0e8; border-radius: 10px; overflow: hidden;">
            <div style="background-color: #2b7a5a; color: white; padding: 20px; text-align: center;">
                <h2 style="margin: 0; font-size: 24px;">¡Cita Confirmada! 🌿</h2>
                <p style="margin: 5px 0 0 0; font-size: 16px; opacity: 0.9;">Fisioterapeuta Li</p>
            </div>
            <div style="padding: 30px; color: #333;">
                <p style="font-size: 16px;">Hola <strong>{nombre}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.5;">Tu reserva ha sido agendada exitosamente en nuestro sistema. Aquí están los detalles de tu cita:</p>
                
                <div style="background-color: white; border-left: 4px solid #2b7a5a; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
                    <p style="margin: 5px 0;"><strong>📋 Servicio:</strong> <span style="color: #2b7a5a;">{servicio_nombre}</span></p>
                    <p style="margin: 5px 0;"><strong>📅 Fecha:</strong> {fecha}</p>
                    <p style="margin: 5px 0;"><strong>🕐 Hora:</strong> {hora}</p>
                </div>
                
                <p style="font-size: 15px; color: #666; line-height: 1.5;">Si necesitas cancelar o reprogramar, por favor contáctanos con al menos 24 horas de anticipación a través de nuestro Bot en Telegram.</p>
                <p style="font-size: 16px; margin-top: 30px;">¡Te esperamos con gusto!</p>
            </div>
            <div style="background-color: #e2f0e8; padding: 15px; text-align: center; color: #555; font-size: 12px;">
                Este es un correo automático, por favor no respondas a este mensaje.
            </div>
        </div>
        """
        
        payload = {
            "sender": {
                "name": "Fisioterapeuta Li",
                "email": remitente
            },
            "to": [
                {
                    "email": correo_destino,
                    "name": nombre
                }
            ],
            "subject": asunto,
            "htmlContent": html
        }
        
        headers = {
            "accept": "application/json",
            "api-key": api_key,
            "content-type": "application/json"
        }

        try:
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            print(f"[OK] Correo enviado exitosamente a {correo_destino} vía Brevo")
        except requests.exceptions.RequestException as e:
            err_msg = e.response.text if e.response else str(e)
            print(f"[ERROR] Fallo enviando correo a {correo_destino}: {err_msg}")

    # Lanzar en un hilo separado para no bloquear la respuesta del API
    hilo = threading.Thread(target=_enviar)
    hilo.start()
