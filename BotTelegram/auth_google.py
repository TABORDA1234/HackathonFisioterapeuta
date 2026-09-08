import os
import google_auth_oauthlib.flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

# Permisos que necesita el bot (Drive y Sheets)
SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets'
]

# Busca el archivo de client_secret
CLIENT_SECRET_FILE = None
for file in os.listdir('.'):
    if file.startswith('client_secret_') and file.endswith('.json'):
        CLIENT_SECRET_FILE = file
        break

if not CLIENT_SECRET_FILE:
    print("❌ No se encontró ningún archivo 'client_secret_....json' en esta carpeta.")
    exit(1)

def main():
    creds = None
    # Si ya existe un token.json, usarlo
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
        
    # Si no hay credenciales válidas, pedir login al usuario
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("🔄 Refrescando token expirado...")
            creds.refresh(Request())
        else:
            print("🌐 Abriendo navegador para iniciar sesión en Google...")
            # Aquí es donde se usa http://localhost:8080/
            flow = google_auth_oauthlib.flow.InstalledAppFlow.from_client_secrets_file(
                CLIENT_SECRET_FILE, SCOPES)
            creds = flow.run_local_server(port=8080)
            
        # Guardar las credenciales para la próxima vez
        with open('token.json', 'w') as token_file:
            token_file.write(creds.to_json())
            print("✅ ¡Autenticación exitosa! Se ha creado el archivo 'token.json'.")
            print("🤖 Tu bot ya puede usar los servicios de Google de forma autónoma.")
            
if __name__ == '__main__':
    main()
