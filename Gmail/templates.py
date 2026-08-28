"""
Módulo 5 - Plantillas de Correo (Backend)
Funciones simples para generar el asunto y el cuerpo del correo.
"""

def get_confirmacion(datos: dict) -> tuple[str, str]:
    cliente = datos.get("cliente", "Paciente")
    fecha = datos.get("fecha", "Por confirmar")
    hora = datos.get("hora", "Por confirmar")
    servicio = datos.get("servicio", "Fisioterapia")
    
    asunto = f"Confirmación de Cita - {fecha}"
    cuerpo = f"""Hola {cliente},

Tu cita ha sido confirmada.

Detalles:
- Fecha: {fecha}
- Hora: {hora}
- Servicio: {servicio}

Te esperamos.

Saludos,
Fisioterapia Li"""
    return asunto, cuerpo

def get_recordatorio(datos: dict) -> tuple[str, str]:
    cliente = datos.get("cliente", "Paciente")
    fecha = datos.get("fecha", "Por confirmar")
    hora = datos.get("hora", "Por confirmar")
    servicio = datos.get("servicio", "Fisioterapia")
    
    asunto = f"Recordatorio de Cita - {fecha}"
    cuerpo = f"""Hola {cliente},

Te recordamos tu cita para el día de mañana.

Detalles:
- Fecha: {fecha}
- Hora: {hora}
- Servicio: {servicio}

Por favor, sé puntual.

Saludos,
Fisioterapia Li"""
    return asunto, cuerpo

def get_cancelacion(datos: dict) -> tuple[str, str]:
    cliente = datos.get("cliente", "Paciente")
    fecha = datos.get("fecha", "Por confirmar")
    hora = datos.get("hora", "Por confirmar")
    
    asunto = f"Cancelación de Cita - {fecha}"
    cuerpo = f"""Hola {cliente},

Te confirmamos que tu cita ha sido cancelada.

Detalles de la cita cancelada:
- Fecha: {fecha}
- Hora: {hora}

Si deseas reagendar, por favor contáctanos.

Saludos,
Fisioterapia Li"""
    return asunto, cuerpo

def generar_correo(tipo: str, datos: dict) -> tuple[str, str]:
    if tipo == 'confirmacion':
        return get_confirmacion(datos)
    elif tipo == 'recordatorio':
        return get_recordatorio(datos)
    elif tipo == 'cancelacion':
        return get_cancelacion(datos)
    else:
        return f"Información de cita - {datos.get('fecha', '')}", f"Hola {datos.get('cliente', 'Paciente')}, esta es información sobre tu cita."
