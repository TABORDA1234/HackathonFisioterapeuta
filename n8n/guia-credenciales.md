# 🔐 Guía Rápida: Credenciales para n8n

Para que el orquestador (n8n) funcione correctamente y cumpla los Módulos 1 al 6, necesita permisos para hablar con Telegram y Google. Aquí está el paso a paso detallado para obtener ambas cosas (te tomará unos 5 minutos).

---

## 🤖 1. Obtener el Token del Bot de Telegram (Módulo 1)

Telegram hace que crear bots sea extremadamente fácil a través de su bot oficial llamado **BotFather**.

1. Abre la aplicación de Telegram (en tu celular o en la web).
2. En la barra de búsqueda, busca `@BotFather` (asegúrate de que tenga el check azul de verificación).
3. Escríbele el mensaje: `/newbot`
4. BotFather te preguntará el nombre de tu bot (ej. `Fisioterapeuta Li Asistente`).
5. Luego te pedirá un nombre de usuario ("username") único que debe terminar en `bot` (ej. `FisioLi_Asistente_bot`).
6. Si el nombre está disponible, BotFather te responderá con un mensaje de felicitaciones que incluye un **Token HTTP API** (se ve algo como `123456789:ABCdefGHIjklMNOpqrSTUvwxYZ`).
7. **Guarda ese token**. Lo copiarás en el nodo de Telegram dentro de n8n.

---

## 📅 2. Obtener Credenciales OAuth2 de Google Workspace (Módulos 4, 5 y 6)

Para que n8n pueda leer Google Calendar, enviar correos por Gmail y guardar cosas en Drive, necesita unas credenciales oficiales llamadas "Client ID" y "Client Secret".

### Paso A: Crear el Proyecto
1. Ve a [Google Cloud Console](https://console.cloud.google.com/) e inicia sesión con tu cuenta de Google.
2. Arriba a la izquierda, haz clic en **Seleccionar un proyecto** -> **Proyecto Nuevo**.
3. Ponle un nombre (ej. `FisioLi-Automatizacion`) y dale a **Crear**.

### Paso B: Habilitar las APIs
1. En el menú izquierdo ve a **APIs y servicios** -> **Biblioteca**.
2. Busca y habilita estas 3 APIs, una por una:
   - `Google Calendar API`
   - `Gmail API`
   - `Google Drive API`

### Paso C: Configurar la Pantalla de Consentimiento
1. Ve a **APIs y servicios** -> **Pantalla de consentimiento de OAuth**.
2. Selecciona **Externo** y haz clic en Crear.
3. Llena los datos obligatorios (Nombre de la App, Correo de asistencia técnica y Datos de contacto del desarrollador).
4. Dale "Guardar y continuar" a todo hasta el final (no te preocupes por los scopes detallados ahora, n8n los pedirá).
5. En la sección "Usuarios de prueba", **agrega tu propio correo electrónico**. (Si no lo haces, Google no te dejará conectar n8n).

### Paso D: Crear las Credenciales (Client ID y Secret)
1. Ve a **APIs y servicios** -> **Credenciales**.
2. Haz clic en **Crear Credenciales** -> **ID de cliente de OAuth**.
3. En Tipo de aplicación elige **Aplicación web**.
4. En **Orígenes de JavaScript autorizados**, pon la URL donde correrá tu n8n (ej. `http://localhost:5678` si lo corres local, o `https://fisio-n8n.onrender.com` si usas Render).
5. En **URI de redireccionamiento autorizados**, pon la URL exacta que te dará n8n cuando intentes crear la credencial (usualmente es `http://localhost:5678/rest/oauth2-credential/callback`).
6. Haz clic en Crear.
7. ¡Listo! Te saldrá una ventana con tu **ID de cliente** y tu **Secreto de cliente**. Cópialos.

---

## 🔗 3. Conectar en n8n
1. Abre tu n8n.
2. En el menú izquierdo ve a **Credentials** -> **Add Credential**.
3. Busca **Telegram API** y pega el token del Paso 1.
4. Luego busca **Google Calendar OAuth2 API** y pega el Client ID y el Client Secret del Paso 2.
5. Haz clic en **Sign in with Google** y autoriza tu cuenta. ¡Y ya estás conectado!
