import os
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from dotenv import load_dotenv, set_key

load_dotenv()

# Cargar credenciales desde token.json
def get_credentials():
    if os.path.exists('token.json'):
        return Credentials.from_authorized_user_file('token.json')
    return None

def get_drive_service():
    creds = get_credentials()
    if not creds:
        return None
    return build('drive', 'v3', credentials=creds)

def get_sheets_service():
    creds = get_credentials()
    if not creds:
        return None
    return build('sheets', 'v4', credentials=creds)

def crear_carpeta(nombre_carpeta: str) -> str:
    service = get_drive_service()
    if not service:
        raise Exception("No hay credenciales de Google configuradas.")
        
    file_metadata = {
        'name': nombre_carpeta,
        'mimeType': 'application/vnd.google-apps.folder'
    }
    
    file = service.files().create(body=file_metadata, fields='id, webViewLink').execute()
    return file.get('webViewLink')

def guardar_reporte(texto: str) -> str:
    service = get_sheets_service()
    if not service:
        raise Exception("No hay credenciales de Google configuradas.")
        
    spreadsheet_id = os.getenv("SPREADSHEET_ID")
    
    # Si no existe un spreadsheet, lo creamos automáticamente
    if not spreadsheet_id:
        spreadsheet = {
            'properties': {
                'title': 'Reportes - Fisioterapeuta Li'
            }
        }
        spreadsheet = service.spreadsheets().create(body=spreadsheet, fields='spreadsheetId, spreadsheetUrl').execute()
        spreadsheet_id = spreadsheet.get('spreadsheetId')
        url = spreadsheet.get('spreadsheetUrl')
        
        # Guardamos el ID en el .env
        set_key('.env', 'SPREADSHEET_ID', spreadsheet_id)
        
        # Le damos formato a la primera fila (Cabeceras)
        values = [['Fecha', 'Reporte']]
        body = {'values': values}
        service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id, range="Sheet1!A1:B1",
            valueInputOption="RAW", body=body).execute()
    else:
        # Obtener URL si ya existía
        spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id, fields='spreadsheetUrl').execute()
        url = spreadsheet.get('spreadsheetUrl')
        
    # Añadimos la fila con el reporte
    from datetime import datetime
    ahora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    values = [[ahora, texto]]
    body = {'values': values}
    
    service.spreadsheets().values().append(
        spreadsheetId=spreadsheet_id, range="Sheet1!A:B",
        valueInputOption="USER_ENTERED", body=body).execute()
        
    return url
