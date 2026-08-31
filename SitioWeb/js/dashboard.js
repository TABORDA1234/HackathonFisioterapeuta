/* ===================================================
   FISIOTERAPEUTA LI — DASHBOARD ADMIN
   KPIs, agenda del día, gráfica de barras
   =================================================== */

// Guard de autenticación
Auth.requireAuth();
Auth.fillUserInfo();

// Fecha actual en topbar
const now = new Date();
document.getElementById('topbar-date').textContent = '📅 ' + now.toLocaleDateString('es-CO', {
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

// ── Datos de demo para cuando el backend no esté disponible
const DEMO = {
  pacientes: 47,
  citasHoy: 8,
  pendientes: 3,
  ingresos: 2850000,
  agendaHoy: [
    { hora: '07:00', nombre: 'Carlos Rodríguez', servicio: 'Rehabilitación Física', estado: 'confirmed' },
    { hora: '08:00', nombre: 'María Gómez',      servicio: 'Prescripción de Ejercicio', estado: 'confirmed' },
    { hora: '09:00', nombre: 'Juan Pérez',        servicio: 'Punción Seca', estado: 'pending' },
    { hora: '10:00', nombre: 'Ana Torres',         servicio: 'Cuerpo Completo', estado: 'confirmed' },
    { hora: '14:00', nombre: 'Luis Mora',          servicio: 'Terapia Neural', estado: 'confirmed' },
    { hora: '15:00', nombre: 'Sara Niño',          servicio: 'Valoración Inicial', estado: 'pending' },
    { hora: '16:00', nombre: 'Diego Castro',       servicio: 'PRP', estado: 'confirmed' },
    { hora: '17:00', nombre: 'Paula Vargas',       servicio: 'Rehabilitación Física', estado: 'confirmed' },
  ],
  pacientesRecientes: [
    { id:1, nombre:'Carlos Rodríguez', telefono:'3101234567', email:'carlos@mail.com', created_at:'2026-08-30' },
    { id:2, nombre:'María Gómez',      telefono:'3209876543', email:'maria@mail.com',  created_at:'2026-08-29' },
    { id:3, nombre:'Juan Pérez',       telefono:'3154445566', email:'',               created_at:'2026-08-28' },
    { id:4, nombre:'Ana Torres',       telefono:'3173334444', email:'ana@mail.com',   created_at:'2026-08-27' },
    { id:5, nombre:'Luis Mora',        telefono:'3126667777', email:'',               created_at:'2026-08-26' },
  ],
  citasSemana: [
    { semana: 'S1', total: 12 }, { semana: 'S2', total: 18 }, { semana: 'S3', total: 9  },
    { semana: 'S4', total: 22 }, { semana: 'S5', total: 15 }, { semana: 'S6', total: 27 },
    { semana: 'S7', total: 8  },
  ],
};

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
    container.innerHTML = '<div class="empty-state" style="padding:var(--space-xl);"><div class="empty-state-icon">😴</div><div class="empty-state-title">Sin citas para hoy</div></div>';
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
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-title">Sin pacientes</div></div>';
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

/** Cargar datos del backend o usar demo */
async function loadDashboard() {
  try {
    const [resumen, pacientes] = await Promise.all([
      AdminAPI.resumen(),
      ClientesAPI.list({ per_page: 5 }),
    ]);
    renderKPIs({
      pacientes: resumen.total_pacientes ?? DEMO.pacientes,
      citasHoy:  resumen.citas_hoy ?? DEMO.citasHoy,
      pendientes: resumen.pendientes ?? DEMO.pendientes,
      ingresos:  resumen.ingresos_mes ?? DEMO.ingresos,
    });
    renderTabla(pacientes.clientes || DEMO.pacientesRecientes);
  } catch {
    // Backend no disponible → usar datos demo
    renderKPIs(DEMO);
    renderTabla(DEMO.pacientesRecientes);
  }

  try {
    const citasHoy = await AdminAPI.citasHoy();
    renderAgenda(citasHoy.citas || DEMO.agendaHoy);
  } catch {
    renderAgenda(DEMO.agendaHoy);
  }

  renderChart(DEMO.citasSemana);
}

loadDashboard();
