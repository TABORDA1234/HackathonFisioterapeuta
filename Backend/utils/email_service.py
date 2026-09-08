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
        remitente = os.getenv('SMTP_USER')
        password = os.getenv('SMTP_PASSWORD')
        
        if not remitente or not password:
            print("⚠️ No se han configurado SMTP_USER o SMTP_PASSWORD en el .env")
            return
            
        asunto = "¡Tu cita con Fisioterapeuta Li ha sido agendada! 🌿"
        
        # El mismo diseño HTML que tenías en n8n
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
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = asunto
        msg['From'] = f"Fisioterapeuta Li <{remitente}>"
        msg['To'] = correo_destino
        
        parte_html = MIMEText(html, 'html')
        msg.attach(parte_html)
        
        try:
            # Asumimos Gmail (puerto 587 con TLS)
            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(remitente, password)
            server.sendmail(remitente, correo_destino, msg.as_string())
            server.quit()
            print(f"[OK] Correo enviado exitosamente a {correo_destino}")
        except Exception as e:
            print(f"[ERROR] Fallo enviando correo a {correo_destino}: {e}")

    # Lanzar en un hilo separado para no bloquear la respuesta del API
    hilo = threading.Thread(target=_enviar)
    hilo.start()
