// URL base del backend
// En producción (Render), cambiaremos esto por la URL real
const API_BASE_URL = 'http://localhost:5000/api';

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

// Establecer fecha mínima en el input de fecha (hoy)
const hoy = new Date().toISOString().split('T')[0];
fechaInput.setAttribute('min', hoy);

// ==========================================
// 1. Cargar Servicios al Iniciar
// ==========================================
async function cargarServicios() {
    try {
        const res = await fetch(`${API_BASE_URL}/servicios`);
        if (!res.ok) throw new Error('Error de red');
        const servicios = await res.json();
        
        // Limpiar
        serviciosGrid.innerHTML = '';
        servicioSelect.innerHTML = '<option value="">Selecciona un servicio...</option>';

        servicios.forEach(servicio => {
            // Renderizar tarjeta en el grid
            const card = document.createElement('div');
            card.className = 'servicio-card';
            card.innerHTML = `
                <h3>${servicio.nombre}</h3>
                <p>${servicio.descripcion}</p>
                <div class="servicio-meta">
                    <span>⏱ ${servicio.duracion_min} min</span>
                    <span>💰 $${servicio.precio.toLocaleString('es-CO')}</span>
                </div>
            `;
            // Click en tarjeta selecciona el servicio en el form y hace scroll
            card.addEventListener('click', () => {
                servicioSelect.value = servicio.id;
                document.getElementById('reservar').scrollIntoView({ behavior: 'smooth' });
            });
            serviciosGrid.appendChild(card);

            // Agregar opción al select
            const option = document.createElement('option');
            option.value = servicio.id;
            option.textContent = `${servicio.nombre} (${servicio.duracion_min} min)`;
            servicioSelect.appendChild(option);
        });

    } catch (error) {
        console.error('Error cargando servicios:', error);
        serviciosGrid.innerHTML = '<p class="error">No se pudieron cargar los servicios. Asegúrate de que el servidor esté encendido.</p>';
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

        if (data.disponibles.length === 0) {
            horariosMsg.textContent = 'No hay horarios disponibles para este día.';
        } else {
            data.disponibles.forEach(slot => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn-outline';
                // Convertir '08:00:00' a '08:00'
                const horaLimpia = slot.inicio.substring(0, 5);
                btn.textContent = horaLimpia;
                
                btn.addEventListener('click', () => {
                    // Quitar selección previa
                    document.querySelectorAll('.horarios-grid .btn').forEach(b => b.classList.remove('selected'));
                    // Marcar este
                    btn.classList.add('selected');
                    // Guardar valor
                    horaSeleccionadaInput.value = `${fecha}T${slot.inicio}`;
                    // Mostrar paso 3
                    datosPaciente.classList.remove('hidden');
                });

                horariosGrid.appendChild(btn);
            });
            horariosMsg.textContent = 'Selecciona una hora para continuar.';
        }
    } catch (error) {
        console.error('Error buscando disponibilidad:', error);
        alert('Hubo un error consultando la disponibilidad.');
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

    const clienteNombre = document.getElementById('nombre-input').value;
    const clienteTelefono = document.getElementById('telefono-input').value;
    const servicioId = servicioSelect.value;
    const fechaHora = horaSeleccionadaInput.value;

    if (!fechaHora) {
        alert('Asegúrate de seleccionar una hora.');
        return;
    }

    const btnConfirmar = document.getElementById('btn-confirmar');
    btnConfirmar.textContent = 'Procesando...';
    btnConfirmar.disabled = true;

    try {
        const payload = {
            cliente: {
                nombre: clienteNombre,
                telefono: clienteTelefono
            },
            cita: {
                servicio_id: parseInt(servicioId),
                fecha_hora: fechaHora,
                origen: 'web'
            }
        };

        const res = await fetch(`${API_BASE_URL}/citas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
            // Mostrar éxito
            reservaForm.classList.add('hidden');
            mensajeExito.classList.remove('hidden');
        } else {
            alert(`Error: ${data.error || 'No se pudo crear la cita.'}`);
        }

    } catch (error) {
        console.error('Error creando reserva:', error);
        alert('Error de conexión con el servidor.');
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
