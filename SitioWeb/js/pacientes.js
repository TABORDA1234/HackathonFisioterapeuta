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

// No demo data - we enforce real backend data

/** Renderizar tabla */
function renderTabla(pacientes, total) {
  const container = document.getElementById('tabla-pacientes');
  document.getElementById('badge-total').textContent = `${total} paciente${total !== 1 ? 's' : ''}`;

  if (!pacientes.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:var(--space-3xl);">
        <div class="empty-state-icon" style="color:var(--color-teal); opacity:0.6;"><svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></div>
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
                ${p.notas_medicas ? '<div class="tag" style="font-size:0.65rem;margin-top:2px;"><svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:2px; vertical-align:middle;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> HC</div>' : ''}
              </div>
            </div>
          </td>
          <td>
            <a href="https://wa.me/57${p.telefono}" target="_blank" style="color:var(--color-teal); font-size:0.88rem; display:flex; align-items:center; gap:4px;">
              <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="color:var(--color-text-muted)"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> ${p.telefono || '—'}
            </a>
          </td>
          <td class="td-muted">${p.email || '—'}</td>
          <td class="td-muted">${Utils.formatDate(p.created_at)}</td>
          <td>
            <div style="display:flex; gap:var(--space-xs);">
              <a href="historia-clinica.html?id=${p.id}" class="btn btn-ghost btn-sm" title="Ver Historia Clínica"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:4px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> HC</a>
              <button class="btn btn-ghost btn-sm" onclick="editarPaciente(${p.id})" title="Editar"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
              <button class="btn btn-danger btn-sm" onclick="eliminarPaciente(${p.id}, '${p.nombre}')" title="Eliminar"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
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

/** Cargar pacientes desde el backend */
async function cargarPacientes() {
  try {
    const res = await ClientesAPI.list({ page: currentPage, per_page: 10, buscar: currentSearch });
    renderTabla(res.clientes || [], res.total || 0);
    renderPaginacion(res.pagina || 1, res.paginas || 1);
  } catch (error) {
    console.error("Error al cargar pacientes:", error);
    renderTabla([], 0);
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
};

/** Eliminar paciente */
window.eliminarPaciente = function(id, nombre) {
  if (!confirm(`¿Eliminar al paciente "${nombre}"? Esta acción no se puede deshacer.`)) return;
  ClientesAPI.delete(id).then(() => {
    Toast.success('Paciente eliminado correctamente.');
    cargarPacientes();
  }).catch(e => Toast.error(e.message));
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
    const data = { nombre, telefono, email, telegram_id: telegram || undefined, notas_medicas: notas || undefined };
    if (editingId) {
      await ClientesAPI.update(editingId, data);
      Toast.success('Paciente actualizado correctamente.');
    } else {
      await ClientesAPI.create(data);
      Toast.success('Paciente creado exitosamente.');
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
