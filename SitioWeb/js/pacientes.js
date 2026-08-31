/* ===================================================
   FISIOTERAPEUTA LI — GESTIÓN DE PACIENTES
   CRUD con búsqueda, paginación y modal
   =================================================== */

Auth.requireAuth();
Auth.fillUserInfo();

// Sidebar
document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('visible');
});
document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('visible');
});
document.getElementById('btn-logout')?.addEventListener('click', () => Auth.logout());

// Estado
let currentPage = 1;
let currentSearch = '';
let editingId = null;

// Demo data fallback
const DEMO_PACIENTES = [
  { id:1, nombre:'Carlos Rodríguez', telefono:'3101234567', email:'carlos@mail.com', activo:true, created_at:'2026-08-30', notas_medicas: null },
  { id:2, nombre:'María Gómez',      telefono:'3209876543', email:'maria@mail.com',  activo:true, created_at:'2026-08-29', notas_medicas: null },
  { id:3, nombre:'Juan Pérez',       telefono:'3154445566', email:'',               activo:true, created_at:'2026-08-28', notas_medicas: null },
  { id:4, nombre:'Ana Torres',       telefono:'3173334444', email:'ana@mail.com',   activo:true, created_at:'2026-08-27', notas_medicas: null },
  { id:5, nombre:'Luis Mora',        telefono:'3126667777', email:'',               activo:true, created_at:'2026-08-26', notas_medicas: null },
  { id:6, nombre:'Sara Niño',        telefono:'3185559999', email:'sara@mail.com',  activo:true, created_at:'2026-08-25', notas_medicas: null },
  { id:7, nombre:'Diego Castro',     telefono:'3162223333', email:'',               activo:true, created_at:'2026-08-24', notas_medicas: null },
];

let demoData = [...DEMO_PACIENTES];
let usandoDemo = false;

/** Renderizar tabla */
function renderTabla(pacientes, total) {
  const container = document.getElementById('tabla-pacientes');
  document.getElementById('badge-total').textContent = `${total} paciente${total !== 1 ? 's' : ''}`;

  if (!pacientes.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:var(--space-3xl);">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-title">Sin resultados</div>
        <div class="empty-state-desc">No se encontraron pacientes con esa búsqueda.</div>
      </div>`;
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Paciente</th>
          <th>Teléfono</th>
          <th>Correo</th>
          <th>Registrado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${pacientes.map(p => `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:var(--space-md);">
              <div class="avatar avatar-sm">${Utils.iniciales(p.nombre)}</div>
              <div>
                <div style="font-weight:600;">${p.nombre}</div>
                ${p.notas_medicas ? '<div class="tag" style="font-size:0.65rem;margin-top:2px;">📋 HC</div>' : ''}
              </div>
            </div>
          </td>
          <td>
            <a href="https://wa.me/57${p.telefono}" target="_blank" style="color:var(--color-teal); font-size:0.88rem;">
              📱 ${p.telefono || '—'}
            </a>
          </td>
          <td class="td-muted">${p.email || '—'}</td>
          <td class="td-muted">${Utils.formatDate(p.created_at)}</td>
          <td>
            <div style="display:flex; gap:var(--space-xs);">
              <a href="historia-clinica.html?id=${p.id}" class="btn btn-ghost btn-sm" title="Ver Historia Clínica">📋 HC</a>
              <button class="btn btn-ghost btn-sm" onclick="editarPaciente(${p.id})" title="Editar">✏️</button>
              <button class="btn btn-danger btn-sm" onclick="eliminarPaciente(${p.id}, '${p.nombre}')" title="Eliminar">🗑️</button>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

/** Paginación */
function renderPaginacion(pagina, totalPaginas) {
  const container = document.getElementById('paginacion');
  if (totalPaginas <= 1) { container.innerHTML = ''; return; }

  let btns = '';
  for (let i = 1; i <= totalPaginas; i++) {
    btns += `<button class="page-btn ${i === pagina ? 'active' : ''}" onclick="cargarPagina(${i})">${i}</button>`;
  }
  container.innerHTML = `
    <div class="pagination">
      <button class="page-btn" onclick="cargarPagina(${pagina - 1})" ${pagina === 1 ? 'disabled' : ''}>‹</button>
      ${btns}
      <button class="page-btn" onclick="cargarPagina(${pagina + 1})" ${pagina === totalPaginas ? 'disabled' : ''}>›</button>
    </div>`;
}

window.cargarPagina = function(p) {
  currentPage = p;
  cargarPacientes();
};

/** Cargar pacientes desde el backend o demo */
async function cargarPacientes() {
  try {
    const res = await ClientesAPI.list({ page: currentPage, per_page: 10, buscar: currentSearch });
    usandoDemo = false;
    renderTabla(res.clientes || [], res.total || 0);
    renderPaginacion(res.pagina || 1, res.paginas || 1);
  } catch {
    usandoDemo = true;
    // Filtrar demo
    const filtrados = demoData.filter(p =>
      p.nombre.toLowerCase().includes(currentSearch.toLowerCase()) ||
      (p.telefono && p.telefono.includes(currentSearch)) ||
      (p.email && p.email.toLowerCase().includes(currentSearch.toLowerCase()))
    );
    renderTabla(filtrados, filtrados.length);
    renderPaginacion(1, 1);
  }
}

// Búsqueda con debounce
document.getElementById('search-input').addEventListener('input', Utils.debounce((e) => {
  currentSearch = e.target.value;
  currentPage = 1;
  cargarPacientes();
}, 350));

// ── Modal ──
const modal = document.getElementById('modal-paciente');
const openModal = () => modal.classList.remove('hidden');
const closeModal = () => {
  modal.classList.add('hidden');
  editingId = null;
  document.getElementById('form-paciente').reset();
  document.getElementById('modal-title').textContent = 'Nuevo Paciente';
};

document.getElementById('btn-nuevo-paciente').addEventListener('click', () => {
  editingId = null;
  openModal();
});
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

/** Editar paciente */
window.editarPaciente = function(id) {
  const p = usandoDemo ? demoData.find(x => x.id === id) : null;
  if (p) {
    editingId = id;
    document.getElementById('modal-title').textContent = 'Editar Paciente';
    document.getElementById('p-nombre').value   = p.nombre || '';
    document.getElementById('p-telefono').value = p.telefono || '';
    document.getElementById('p-email').value    = p.email || '';
    document.getElementById('p-telegram').value = p.telegram_id || '';
    document.getElementById('p-notas').value    = p.notas_medicas || '';
    openModal();
  } else {
    // Intentar con backend
    ClientesAPI.get(id).then(res => {
      const p = res.cliente;
      editingId = id;
      document.getElementById('modal-title').textContent = 'Editar Paciente';
      document.getElementById('p-nombre').value   = p.nombre || '';
      document.getElementById('p-telefono').value = p.telefono || '';
      document.getElementById('p-email').value    = p.email || '';
      document.getElementById('p-telegram').value = p.telegram_id || '';
      document.getElementById('p-notas').value    = p.notas_medicas || '';
      openModal();
    }).catch(() => Toast.error('No se pudo cargar el paciente.'));
  }
};

/** Eliminar paciente */
window.eliminarPaciente = function(id, nombre) {
  if (!confirm(`¿Eliminar al paciente "${nombre}"? Esta acción no se puede deshacer.`)) return;
  if (usandoDemo) {
    demoData = demoData.filter(p => p.id !== id);
    Toast.success('Paciente eliminado.');
    cargarPacientes();
  } else {
    ClientesAPI.delete(id).then(() => {
      Toast.success('Paciente eliminado correctamente.');
      cargarPacientes();
    }).catch(e => Toast.error(e.message));
  }
};

/** Guardar paciente (crear o editar) */
document.getElementById('modal-save').addEventListener('click', async () => {
  const nombre   = document.getElementById('p-nombre').value.trim();
  const telefono = document.getElementById('p-telefono').value.trim();
  const email    = document.getElementById('p-email').value.trim();
  const telegram = document.getElementById('p-telegram').value.trim();
  const notas    = document.getElementById('p-notas').value.trim();

  if (!nombre) { Toast.warning('El nombre es requerido.'); return; }

  const btn = document.getElementById('modal-save');
  Utils.setLoading(btn, true);

  try {
    if (usandoDemo) {
      if (editingId) {
        const idx = demoData.findIndex(p => p.id === editingId);
        if (idx >= 0) demoData[idx] = { ...demoData[idx], nombre, telefono, email, telegram_id: telegram, notas_medicas: notas };
      } else {
        demoData.unshift({ id: Date.now(), nombre, telefono, email, telegram_id: telegram, notas_medicas: notas, activo: true, created_at: new Date().toISOString() });
      }
      Toast.success(editingId ? 'Paciente actualizado.' : 'Paciente creado exitosamente.');
    } else {
      const data = { nombre, telefono, email, telegram_id: telegram || undefined, notas_medicas: notas || undefined };
      if (editingId) {
        await ClientesAPI.update(editingId, data);
        Toast.success('Paciente actualizado correctamente.');
      } else {
        await ClientesAPI.create(data);
        Toast.success('Paciente creado exitosamente.');
      }
    }
    closeModal();
    cargarPacientes();
  } catch (e) {
    Toast.error(e.message || 'Error al guardar el paciente.');
  } finally {
    Utils.setLoading(btn, false);
  }
});

// Inicializar
cargarPacientes();
