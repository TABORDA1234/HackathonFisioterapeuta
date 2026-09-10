import os
import datetime
from google.oauth2.credentials import Credentials
from google.oauth2 import service_account
from googleapiclient.discovery import build

def get_calendar_service():
    """
    Obtiene el servicio de Google Calendar utilizando una cuenta de servicio
    (service_account.json) si existe, o como respaldo token.json (OAuth).
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    backend_dir = os.path.dirname(os.path.dirname(__file__))
    
    service_account_path = os.path.join(base_dir, 'service_account.json')
    token_path_bot = os.path.join(base_dir, 'BotTelegram', 'token.json')
    token_path_backend = os.path.join(backend_dir, 'token.json')
    
    try:
        import json
        
        # 1. Leer Cuenta de Servicio desde Variable de Entorno (Seguro)
        env_service_account = os.getenv('GOOGLE_SERVICE_ACCOUNT_JSON')
        if env_service_account:
            print("[Calendar] Usando cuenta de servicio desde Variable de Entorno")
            info = json.loads(env_service_account)
            SCOPES = ['https://www.googleapis.com/auth/calendar']
            creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
            service = build('calendar', 'v3', credentials=creds)
            return service
            
        # 2. Leer Token OAuth desde Variable de Entorno (Seguro)
        env_token = os.getenv('GOOGLE_TOKEN_JSON')
        if env_token:
            print("[Calendar] Usando token OAuth desde Variable de Entorno")
            info = json.loads(env_token)
            creds = Credentials.from_authorized_user_info(info)
            service = build('calendar', 'v3', credentials=creds)
            return service
            
        # 3. Priorizar Cuenta de Servicio de Google Cloud si existe el archivo (Uso local)
        if os.path.exists(service_account_path):
            print(f"[Calendar] Usando cuenta de servicio: {service_account_path}")
            SCOPES = ['https://www.googleapis.com/auth/calendar']
            creds = service_account.Credentials.from_service_account_file(service_account_path, scopes=SCOPES)
            service = build('calendar', 'v3', credentials=creds)
            return service
            
        # Respaldo 1: token.json en Backend
        elif os.path.exists(token_path_backend):
            print(f"[Calendar] Usando token OAuth en Backend: {token_path_backend}")
            creds = Credentials.from_authorized_user_file(token_path_backend)
            service = build('calendar', 'v3', credentials=creds)
            return service
            
        # Respaldo 2: token.json en BotTelegram (Generado por el flujo OAuth de usuario)
        elif os.path.exists(token_path_bot):
            print(f"[Calendar] Usando token OAuth en Bot: {token_path_bot}")
            creds = Credentials.from_authorized_user_file(token_path_bot)
            service = build('calendar', 'v3', credentials=creds)
            return service
            
        else:
            print("[Calendar] No se encontró service_account.json ni token.json")
            return None
            
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
        
        # Se requiere Calendar ID si se usa cuenta de servicio y se quiere ver en otro calendario.
        # Por defecto 'primary' es el calendario propio de quien autoriza (o el de la service account).
        calendar_id = os.getenv('GOOGLE_CALENDAR_ID', 'primary')
        
        event_result = service.events().insert(calendarId=calendar_id, body=event).execute()
        print(f"[Calendar] Evento creado exitosamente: {event_result.get('htmlLink')}")
        return True
        
    except Exception as e:
        print(f"[Calendar] Error creando evento en Google Calendar: {e}")
        return False
