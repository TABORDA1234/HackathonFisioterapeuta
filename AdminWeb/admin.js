const API_BASE_URL = 'http://localhost:5000/api';

// Verificar Auth
const token = localStorage.getItem('fisioli_token');
const user = JSON.parse(localStorage.getItem('fisioli_user') || '{}');

if (!token && !window.location.href.includes('index.html')) {
    window.location.href = 'index.html';
}

if (document.getElementById('user-name')) {
    document.getElementById('user-name').textContent = user.nombre || 'Admin';
}

function logout() {
    localStorage.removeItem('fisioli_token');
    localStorage.removeItem('fisioli_user');
    window.location.href = 'index.html';
}

// ================= TABS =================
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    if (tabId === 'agenda') cargarAgenda();
    if (tabId === 'pacientes') cargarPacientes();
}

// ================= API HEADERS =================
const getHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
});

// ================= AGENDA =================
const dateInput = document.getElementById('agenda-date');
if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
    dateInput.addEventListener('change', cargarAgenda);
    // Cargar inicialmente
    cargarAgenda();
}

async function cargarAgenda() {
    const tbody = document.getElementById('agenda-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Cargando...</td></tr>';
    
    try {
        const date = dateInput.value;
        const res = await fetch(`${API_BASE_URL}/citas/agenda?fecha=${date}`, { headers: getHeaders() });
        
        if (res.status === 401) return logout();
        const data = await res.json();
        
        tbody.innerHTML = '';
        if (data.citas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay citas para este día.</td></tr>';
            return;
        }

        data.citas.forEach(cita => {
            const hora = cita.fecha_hora.substring(11, 16);
            tbody.innerHTML += `
                <tr>
                    <td><b>${hora}</b></td>
                    <td>${cita.cliente_nombre}</td>
                    <td>${cita.servicio_nombre}</td>
                    <td><span style="color: var(--primary)">${cita.estado}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick="abrirNotasMedicas(${cita.cliente_id}, '${cita.cliente_nombre}')">📝 Notas Médicas</button>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-red">Error cargando agenda</td></tr>';
    }
}

// ================= PACIENTES Y NOTAS MÉDICAS =================
let pacientesCache = [];

async function cargarPacientes() {
    const grid = document.getElementById('pacientes-grid');
    if (!grid) return;
    grid.innerHTML = '<p>Cargando...</p>';

    try {
        const res = await fetch(`${API_BASE_URL}/clientes`, { headers: getHeaders() });
        const data = await res.json();
        pacientesCache = data.clientes;
        renderPacientes(pacientesCache);
    } catch (e) {
        grid.innerHTML = '<p class="text-red">Error cargando pacientes.</p>';
    }
}

function renderPacientes(lista) {
    const grid = document.getElementById('pacientes-grid');
    grid.innerHTML = '';
    
    if(lista.length === 0) {
        grid.innerHTML = '<p>No se encontraron pacientes.</p>';
        return;
    }

    lista.forEach(p => {
        grid.innerHTML += `
            <div class="paciente-card">
                <h4>${p.nombre}</h4>
                <p>📞 ${p.telefono || 'Sin teléfono'}</p>
                <button class="btn btn-sm btn-primary w-full" onclick="abrirNotasMedicas(${p.id}, '${p.nombre}', \`${p.notas_medicas || ''}\`)">Historia Clínica</button>
            </div>
        `;
    });
}

function buscarPacientes() {
    const query = document.getElementById('search-paciente').value.toLowerCase();
    const filtrados = pacientesCache.filter(p => p.nombre.toLowerCase().includes(query) || (p.telefono && p.telefono.includes(query)));
    renderPacientes(filtrados);
}

// ================= MODAL DE NOTAS MÉDICAS =================
const modal = document.getElementById('modal-notas');
const notasTexto = document.getElementById('notas-texto');
const modalClienteId = document.getElementById('modal-cliente-id');
const modalPacienteNombre = document.getElementById('modal-paciente-nombre');

function abrirNotasMedicas(id, nombre, notasAnteriores = "") {
    modalClienteId.value = id;
    modalPacienteNombre.textContent = `Historia Clínica: ${nombre}`;
    
    // Si no vinieron notas (ej. desde la agenda), las buscamos
    if (notasAnteriores === "") {
        const p = pacientesCache.find(x => x.id === id);
        notasTexto.value = p ? p.notas_medicas || "" : "";
    } else {
        notasTexto.value = notasAnteriores !== "null" ? notasAnteriores : "";
    }
    
    modal.classList.remove('hidden');
}

function cerrarModal() {
    modal.classList.add('hidden');
}

async function guardarNotas() {
    const id = modalClienteId.value;
    const notas = notasTexto.value;
    
    try {
        const res = await fetch(`${API_BASE_URL}/clientes/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ notas_medicas: notas })
        });
        
        if(res.ok) {
            alert('Notas actualizadas correctamente');
            cerrarModal();
            cargarPacientes(); // Refrescar lista
        } else {
            alert('Error guardando notas');
        }
    } catch (e) {
        alert('Error de conexión');
    }
}
