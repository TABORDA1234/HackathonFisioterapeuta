import os
from dotenv import load_dotenv

# Asegurar que cargue las variables de entorno de Backend/.env
load_dotenv('.env')

from app import app
from extensions import db
from models.cita import Cita
from models.cliente import Cliente
from models.servicio import Servicio
from utils.email_service import enviar_correo_confirmacion
import time

def probar_correo():
    with app.app_context():
        # Obtener la cita con ID 19
        cita = Cita.query.get(19)
        if not cita:
            print("Cita con ID 19 no encontrada.")
            return
            
        cliente = Cliente.query.get(cita.cliente_id)
        servicio = Servicio.query.get(cita.servicio_id)
        
        fecha_str = cita.fecha_hora.strftime("%Y-%m-%d")
        hora_str = cita.fecha_hora.strftime("%H:%M")
        
        print(f"Enviando correo a {cliente.email} para la cita {cita.id}...")
        
        enviar_correo_confirmacion(
            nombre=cliente.nombre,
            correo_destino=cliente.email,
            servicio_nombre=servicio.nombre,
            fecha=fecha_str,
            hora=hora_str
        )
        
        # Como se ejecuta en un hilo separado, damos un segundo antes de que termine el script principal
        time.sleep(3)

if __name__ == "__main__":
    probar_correo()
