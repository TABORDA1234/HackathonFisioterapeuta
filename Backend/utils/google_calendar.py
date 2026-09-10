import os
import datetime
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

def get_calendar_service():
    """
    Obtiene el servicio de Google Calendar utilizando el token.json 
    generado previamente por el Bot de Telegram.
    """
    # Intentar buscar token.json en la carpeta BotTelegram
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    token_path = os.path.join(base_dir, 'BotTelegram', 'token.json')
    
    if not os.path.exists(token_path):
        print(f"[Calendar] No se encontró token.json en {token_path}")
        return None
        
    try:
        creds = Credentials.from_authorized_user_file(token_path)
        service = build('calendar', 'v3', credentials=creds)
        return service
    except Exception as e:
        print(f"[Calendar] Error al autenticar con Google Calendar: {e}")
        return None

def crear_evento_calendario(cita, servicio_ofrecido):
    """
    Crea un evento en el Google Calendar primario para una cita dada.
    """
    service = get_calendar_service()
    if not service:
        print("[Calendar] Servicio de Google Calendar no disponible. Saltando evento.")
        return False
        
    try:
        # Calcular duración. Asumimos 60 minutos si no está especificada.
        duracion_min = servicio_ofrecido.duracion_min if servicio_ofrecido else 60
        inicio_dt = cita.fecha_hora
        
        # Google Calendar requiere que la fecha y hora tengan zona horaria.
        # Si es naive, asumimos UTC ya que la base de datos guarda en UTC.
        if inicio_dt.tzinfo is None:
            inicio_dt = inicio_dt.replace(tzinfo=datetime.timezone.utc)
            
        fin_dt = inicio_dt + datetime.timedelta(minutes=duracion_min)
        
        cliente_nombre = cita.cliente.nombre if cita.cliente else "Paciente Desconocido"
        servicio_nombre = servicio_ofrecido.nombre if servicio_ofrecido else "Sesión de Fisioterapia"
        
        event = {
            'summary': f'Fisioterapia: {cliente_nombre} - {servicio_nombre}',
            'description': f'Cita creada desde: {cita.origen}\\nNotas: {cita.notas or "N/A"}',
            'start': {
                'dateTime': inicio_dt.isoformat(),
            },
            'end': {
                'dateTime': fin_dt.isoformat(),
            },
            # Color 5 = amarillo/naranja, ideal para citas médicas.
            'colorId': '5',
        }
        
        event_result = service.events().insert(calendarId='primary', body=event).execute()
        print(f"[Calendar] Evento creado exitosamente: {event_result.get('htmlLink')}")
        return True
        
    except Exception as e:
        print(f"[Calendar] Error creando evento en Google Calendar: {e}")
        return False
