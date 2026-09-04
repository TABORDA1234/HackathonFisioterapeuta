/* ===================================================
   FISIOTERAPEUTA LI — DASHBOARD ADMIN
   KPIs, agenda del día, gráfica de barras
   =================================================== */

// Guard de autenticación
Auth.requireAuth();
Auth.fillUserInfo();

// Fecha actual en topbar
const now = new Date();
document.getElementById('topbar-date').innerHTML = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align:text-bottom;margin-right:4px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ` + now.toLocaleDateString('es-CO', {
  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
});

// Sidebar mobile toggle
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  overlay.classList.toggle('visible');
});
overlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  overlay.classList.remove('visible');
});

// Logout
document.getElementById('btn-logout')?.addEventListener('click', () => Auth.logout());

// DEMO DATA REMOVED - using real backend data only
/** Rellena KPIs */
function renderKPIs(data) {
  document.getElementById('kpi-pacientes').textContent = data.pacientes;
  document.getElementById('kpi-hoy').textContent       = data.citasHoy;
  document.getElementById('kpi-pendientes').textContent = data.pendientes;
  document.getElementById('kpi-ingresos').textContent  = Utils.formatCOP(data.ingresos).replace('COP', '$');
}

/** Rellena agenda del día */
function renderAgenda(citas) {
  const container = document.getElementById('agenda-hoy');
  if (!citas.length) {
    container.innerHTML = '<div class="empty-state" style="padding:var(--space-xl);"><div class="empty-state-icon" style="color:var(--color-teal);opacity:0.5;"><svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div><div class="empty-state-title">Sin citas para hoy</div></div>';
    return;
  }
  container.innerHTML = citas.map(c => {
    const badgeClass = c.estado === 'confirmed' ? 'badge-ok' : c.estado === 'pending' ? 'badge-warn' : 'badge-danger';
    const estadoLabel = c.estado === 'confirmed' ? 'Confirmada' : c.estado === 'pending' ? 'Pendiente' : 'Cancelada';
    return `
    <div style="display:flex; align-items:center; gap:var(--space-md); padding:var(--space-md); border-bottom:1px solid var(--color-border);">
      <div style="min-width:50px; font-size:0.85rem; font-weight:700; color:var(--color-teal);">${c.hora}</div>
      <div class="avatar avatar-sm">${Utils.iniciales(c.nombre)}</div>
      <div style="flex:1; min-width:0;">
        <div style="font-size:0.88rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.nombre}</div>
        <div style="font-size:0.75rem; color:var(--color-text-muted);">${c.servicio}</div>
      </div>
      <span class="badge ${badgeClass}">${estadoLabel}</span>
    </div>`;
  }).join('');
}

/** Renderiza gráfica de barras */
function renderChart(data) {
  const maxVal = Math.max(...data.map(d => d.total));
  const barsContainer   = document.getElementById('chart-bars');
  const labelsContainer = document.getElementById('chart-labels');

  barsContainer.innerHTML = data.map(d => {
    const pct = maxVal ? (d.total / maxVal * 100) : 0;
    return `
      <div class="chart-bar-wrap">
        <div class="chart-bar" style="height:${Math.max(pct, 5)}%;">
          <div class="chart-bar-tooltip">${d.total} citas</div>
        </div>
        <span class="chart-label">${d.semana}</span>
      </div>`;
  }).join('');
}

/** Renderiza tabla de pacientes */
function renderTabla(pacientes) {
  const container = document.getElementById('tabla-pacientes');
  if (!pacientes.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon" style="color:var(--color-teal);opacity:0.5;"><svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div class="empty-state-title">Sin pacientes</div></div>';
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
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${pacientes.map(p => `
        <tr onclick="window.location.href='historia-clinica.html?id=${p.id}'" style="cursor:pointer;">
          <td>
            <div style="display:flex; align-items:center; gap:var(--space-md);">
              <div class="avatar avatar-sm">${Utils.iniciales(p.nombre)}</div>
              <span style="font-weight:600;">${p.nombre}</span>
            </div>
          </td>
          <td>${p.telefono || '—'}</td>
          <td class="td-muted">${p.email || '—'}</td>
          <td class="td-muted">${Utils.formatDate(p.created_at)}</td>
          <td><a href="historia-clinica.html?id=${p.id}" class="btn btn-ghost btn-sm">Ver HC</a></td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

/** Cargar datos del backend */
async function loadDashboard() {
  try {
    const [resumen, pacientes] = await Promise.all([
      AdminAPI.resumen(),
      ClientesAPI.list({ per_page: 5 }),
    ]);
    renderKPIs({
      pacientes: resumen.total_pacientes ?? 0,
      citasHoy:  resumen.citas_hoy ?? 0,
      pendientes: resumen.pendientes ?? 0,
      ingresos:  resumen.ingresos_mes ?? 0,
    });
    renderTabla(pacientes.clientes || []);
  } catch (error) {
    console.error("Error cargando dashboard:", error);
    renderKPIs({ pacientes: 0, citasHoy: 0, pendientes: 0, ingresos: 0 });
    renderTabla([]);
  }

  try {
    const citasHoy = await AdminAPI.citasHoy();
    renderAgenda(citasHoy.citas || []);
  } catch {
    renderAgenda([]);
  }

  try {
    // Para simplificar, obtenemos la gráfica del resumen si está disponible
    const resumen = await AdminAPI.resumen();
    renderChart(resumen.citasSemana || []);
  } catch {
    renderChart([]);
  }
}

loadDashboard();
