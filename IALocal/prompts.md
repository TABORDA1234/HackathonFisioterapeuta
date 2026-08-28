# Ejemplos de Prompts y Pruebas para Ollama

Una vez que tengas el modelo corriendo (`ollama run fisio-ai`), puedes enviarle estos textos para verificar que devuelve el JSON correctamente:

## Prueba 1: Agendar una cita
**Usuario:**
> "Hola, necesito una cita para Ana mañana a las 3 de la tarde."

**Respuesta esperada de la IA:**
```json
{
  "intencion": "crear_cita",
  "entidades": {
    "cliente": "Ana",
    "fecha": "mañana",
    "hora": "15:00"
  }
}
```

## Prueba 2: Cancelar una cita
**Usuario:**
> "Por favor cancela mi sesión del viernes a las 10 am."

**Respuesta esperada de la IA:**
```json
{
  "intencion": "cancelar_cita",
  "entidades": {
    "fecha": "viernes",
    "hora": "10:00"
  }
}
```

## Prueba 3: Consultar disponibilidad
**Usuario:**
> "¿Tienen espacio el próximo lunes?"

**Respuesta esperada de la IA:**
```json
{
  "intencion": "consultar_disponibilidad",
  "entidades": {
    "fecha": "próximo lunes"
  }
}
```

## Prueba 4: Información general
**Usuario:**
> "¿Cuánto cuesta la sesión de fisioterapia deportiva?"

**Respuesta esperada de la IA:**
```json
{
  "intencion": "informacion",
  "entidades": {
    "pregunta": "¿Cuánto cuesta la sesión de fisioterapia deportiva?"
  }
}
```
