"""
Validadores de entrada — funciones de ayuda para validar datos.
"""

import re
from datetime import datetime


def validar_email(email):
    """Valida formato básico de email."""
    if not email:
        return True  # Email es opcional
    patron = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(patron, email))


def validar_telefono(telefono):
    """Valida que el teléfono solo contenga dígitos y caracteres válidos."""
    if not telefono:
        return True  # Teléfono es opcional
    patron = r"^[\d\s\+\-\(\)]{7,20}$"
    return bool(re.match(patron, telefono))


def validar_fecha_hora(fecha_hora_str):
    """
    Valida y parsea una cadena ISO 8601 a datetime.
    Retorna (datetime, None) si es válida, o (None, mensaje_error) si no.
    """
    try:
        dt = datetime.fromisoformat(fecha_hora_str)
        return dt, None
    except (ValueError, TypeError):
        return None, "Formato de fecha/hora inválido. Use ISO 8601 (ej: 2026-08-29T10:00:00)"


def validar_campos_requeridos(data, campos):
    """
    Verifica que todos los campos requeridos estén presentes en el dict.
    Retorna lista de campos faltantes (vacía si todo OK).
    """
    faltantes = []
    for campo in campos:
        if campo not in data or data[campo] is None or data[campo] == "":
            faltantes.append(campo)
    return faltantes
