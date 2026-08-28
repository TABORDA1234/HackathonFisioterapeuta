// ==========================================
// Fisioterapeuta Li — Frontend JS
// Consume la API REST del Backend Flask
// ==========================================

// URL base del backend. Se puede cambiar en produccion.
const API_BASE_URL = window.FISIO_API_URL || 'http://localhost:5000/api';

// Elementos del DOM
const serviciosGrid = document.getElementById('servicios-grid');
const servicioSelect = document.getElementById('servicio-select');
const fechaInput = document.getElementById('fecha-input');
const btnBuscar = document.getElementById('btn-buscar');
const horariosContainer = document.getElementById('horarios-container');
const horariosGrid = document.getElementById('horarios-grid');
const horariosMsg = document.getElementById('horarios-msg');
const datosPaciente = document.getElementById('datos-paciente');
const horaSeleccionadaInput = document.getElementById('hora-seleccionada');
const reservaForm = document.getElementById('reserva-form');
const mensajeExito = document.getElementById('mensaje-exito');
const btnNuevaCita = document.getElementById('btn-nueva-cita');

// Establecer fecha minima en el input de fecha (hoy)
const hoy = new Date().toISOString().split('T')[0];
fechaInput.setAttribute('min', hoy);

// ==========================================
// 1. Cargar Servicios al Iniciar
// ==========================================
async function cargarServicios() {
    try {
        const res = await fetch(`${API_BASE_URL}/servicios`);
        if (!res.ok) throw new Error('Error de red');
        const data = await res.json();
        
        // La API devuelve { "servicios": [...], "total": N }
        const servicios = data.servicios || data;
        
        // Limpiar
        serviciosGrid.innerHTML = '';
        servicioSelect.innerHTML = '<option value="">Selecciona un servicio...</option>';

        servicios.forEach(servicio => {
            // Renderizar tarjeta en el grid
            const card = document.createElement('div');
            card.className = 'servicio-card';
            
            const precioFormateado = servicio.precio
                ? `$${Number(servicio.precio).toLocaleString('es-CO')}`
                : 'Consultar';

            card.innerHTML = `
                <h3>${servicio.nombre}</h3>
                <p>${servicio.descripcion || ''}</p>
                <div class="servicio-meta">
                    <span>&#9201; ${servicio.duracion_min} min</span>
                    <span>${precioFormateado}</span>
                </div>
            `;
            // Click en tarjeta selecciona el servicio en el form y hace scroll
            card.addEventListener('click', () => {
                servicioSelect.value = servicio.id;
                document.getElementById('reservar').scrollIntoView({ behavior: 'smooth' });
            });
            serviciosGrid.appendChild(card);

            // Agregar opcion al select
            const option = document.createElement('option');
            option.value = servicio.id;
            option.textContent = `${servicio.nombre} (${servicio.duracion_min} min)`;
            servicioSelect.appendChild(option);
        });

    } catch (error) {
        console.error('Error cargando servicios:', error);
        serviciosGrid.innerHTML = '<p class="error-msg">No se pudieron cargar los servicios. Verifica que el servidor del backend este encendido.</p>';
    }
}

// ==========================================
// 2. Buscar Disponibilidad
// ==========================================
btnBuscar.addEventListener('click', async () => {
    const servicioId = servicioSelect.value;
    const fecha = fechaInput.value;

    if (!servicioId || !fecha) {
        alert('Por favor selecciona un servicio y una fecha.');
        return;
    }

    // Resetear UI
    btnBuscar.textContent = 'Buscando...';
    btnBuscar.disabled = true;
    horariosContainer.classList.add('hidden');
    datosPaciente.classList.add('hidden');
    horariosGrid.innerHTML = '';
    horariosMsg.textContent = '';
    horaSeleccionadaInput.value = '';

    try {
        const res = await fetch(`${API_BASE_URL}/citas/disponibilidad?fecha=${fecha}&servicio_id=${servicioId}`);
        const data = await res.json();
        
        horariosContainer.classList.remove('hidden');

        // La API devuelve { "slots_disponibles": ["2026-08-29T08:00:00", ...] }
        const slots = data.slots_disponibles || [];

        if (slots.length === 0) {
            horariosMsg.textContent = 'No hay horarios disponibles para este dia. Intenta otra fecha.';
        } else {
            slots.forEach(slot => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn-outline';
                // Extraer la hora de un ISO string como "2026-08-29T08:00:00"
                const horaLimpia = slot.substring(11, 16);
                btn.textContent = horaLimpia;
                
                btn.addEventListener('click', () => {
                    // Quitar seleccion previa
                    document.querySelectorAll('.horarios-grid .btn').forEach(b => b.classList.remove('selected'));
                    // Marcar este
                    btn.classList.add('selected');
                    // Guardar valor (el ISO completo del slot)
                    horaSeleccionadaInput.value = slot;
                    // Mostrar paso 3
                    datosPaciente.classList.remove('hidden');
                });

                horariosGrid.appendChild(btn);
            });
            horariosMsg.textContent = 'Selecciona una hora para continuar.';
        }
    } catch (error) {
        console.error('Error buscando disponibilidad:', error);
        horariosContainer.classList.remove('hidden');
        horariosMsg.textContent = 'Error al consultar disponibilidad. Verifica la conexion.';
    } finally {
        btnBuscar.textContent = 'Buscar Disponibilidad';
        btnBuscar.disabled = false;
    }
});

// ==========================================
// 3. Confirmar Reserva
// ==========================================
reservaForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const clienteNombre = document.getElementById('nombre-input').value.trim();
    const clienteTelefono = document.getElementById('telefono-input').value.trim();
    const servicioId = servicioSelect.value;
    const fechaHora = horaSeleccionadaInput.value;

    if (!fechaHora) {
        alert('Asegurate de seleccionar una hora.');
        return;
    }

    if (!clienteNombre || !clienteTelefono) {
        alert('Por favor ingresa tu nombre y telefono.');
        return;
    }

    const btnConfirmar = document.getElementById('btn-confirmar');
    btnConfirmar.textContent = 'Procesando...';
    btnConfirmar.disabled = true;

    try {
        // Usamos el endpoint de webhooks/nueva-cita que busca o crea cliente automaticamente
        // Asi no necesitamos un cliente_id existente previamente
        const payload = {
            cliente_nombre: clienteNombre,
            cliente_telefono: clienteTelefono,
            servicio_id: parseInt(servicioId),
            fecha_hora: fechaHora,
            origen: 'web'
        };

        const res = await fetch(`${API_BASE_URL}/citas/reservar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
            // Mostrar exito
            reservaForm.classList.add('hidden');
            mensajeExito.classList.remove('hidden');
        } else {
            alert(`Error: ${data.error || 'No se pudo crear la cita.'}`);
        }

    } catch (error) {
        console.error('Error creando reserva:', error);
        alert('Error de conexion con el servidor.');
    } finally {
        btnConfirmar.textContent = 'Confirmar Reserva';
        btnConfirmar.disabled = false;
    }
});

// ==========================================
// Resetear para nueva cita
// ==========================================
btnNuevaCita.addEventListener('click', () => {
    mensajeExito.classList.add('hidden');
    reservaForm.classList.remove('hidden');
    reservaForm.reset();
    horariosContainer.classList.add('hidden');
    datosPaciente.classList.add('hidden');
    horaSeleccionadaInput.value = '';
    document.querySelectorAll('.horarios-grid .btn').forEach(b => b.classList.remove('selected'));
});

// Init
cargarServicios();
