/* ===================================================
   FISIOTERAPEUTA LI — DASHBOARD ADMIN (versión completa)
   KPIs, agenda del día, gráfica de citas por semana, evolución de
   registros, participación en programas, distribución de usuarios,
   estado de solicitudes, salud del sistema y últimos pacientes.

   Un solo archivo JS, sin frameworks. El sidebar es estático y se
   llena aparte con Auth.fillUserInfo() (auth.js), no se toca aquí.

   Requiere (además de lo que ya usabas):
   - dashboard-extra.css enlazado en el <head>
   - Contenedores nuevos en el HTML: #registration-chart,
     #program-chart, #role-donut, #status-donut, #health-list,
     #last-updated, #btn-refresh
   =================================================== */

(function () {
  'use strict';

  // ===================================================
  // 0. Guard de autenticación + info de sesión en sidebar
  // ===================================================
  Auth.requireAuth();
  Auth.fillUserInfo(); // llena #sidebar-avatar, #sidebar-user-name, #sidebar-user-role

  // ===================================================
  // 1. Diccionarios de etiquetas / colores para los donuts
  // ===================================================
  const roleLabels = {
    paciente: 'Pacientes',
    fisioterapeuta: 'Fisioterapeutas',
    editor: 'Editores',
    admin: 'Administradores',
  };
  const roleColors = {
    paciente: '#0f766e',
    fisioterapeuta: '#2f6f8f',
    editor: '#c28a36',
    admin: '#7a5b43',
  };
  const statusLabels = {
    pendiente: 'Pendiente',
    aprobada: 'Aprobada',
    completada: 'Completada',
    rechazada: 'Rechazada',
  };
  const statusColors = {
    pendiente: '#c28a36',
    aprobada: '#2f6f8f',
    completada: '#0f766e',
    rechazada: '#b45c4d',
  };

  // ===================================================
  // 2. Topbar: fecha actual
  // ===================================================
  function renderTopbarDate() {
    const el = document.getElementById('topbar-date');
    if (!el) return;
    const now = new Date();
    el.innerHTML =
      `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align:text-bottom;margin-right:4px;">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg> ` +
      now.toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }
  renderTopbarDate();

  function renderLastUpdated(date) {
    const el = document.getElementById('last-updated');
    if (!el) return;
    el.textContent = date
      ? `Actualizado ${date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
      : 'Actualizar';
  }

  // ===================================================
  // 3. Sidebar mobile toggle + logout + refrescar manual
  // ===================================================
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('visible');
  });
  overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('visible');
  });
  document.getElementById('btn-logout')?.addEventListener('click', () => Auth.logout());
  document.getElementById('btn-refresh')?.addEventListener('click', () => loadDashboard());

  // ===================================================
  // 4. KPIs
  // ===================================================
  function renderKPIs(data) {
    setText('kpi-pacientes', data.pacientes);
    setText('kpi-hoy', data.citasHoy);
    setText('kpi-pendientes', data.pendientes);
    setText('kpi-ingresos', Utils.formatCOP(data.ingresos).replace('COP', '$'));
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  // ===================================================
  // 5. Agenda del día
  // ===================================================
  function renderAgenda(citas) {
    const container = document.getElementById('agenda-hoy');
    if (!container) return;

    if (!citas.length) {
      container.innerHTML = `
        <div class="empty-state" style="padding:var(--space-xl);">
          <div class="empty-state-icon" style="color:var(--color-teal);opacity:0.5;">
            <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <div class="empty-state-title">Sin citas para hoy</div>
        </div>`;
      return;
    }

    container.innerHTML = citas
      .map((c) => {
        const badgeClass = c.estado === 'confirmada' ? 'badge-ok' : c.estado === 'pendiente' ? 'badge-warn' : 'badge-danger';
        const estadoLabel = c.estado === 'confirmada' ? 'Confirmada' : c.estado === 'pendiente' ? 'Pendiente' : 'Cancelada';
        // Evitar desfase de zona horaria (UTC -> Local)
        const cleanFecha = c.fecha_hora ? c.fecha_hora.split('+')[0].replace('Z', '') : null;
        const horaStr = cleanFecha ? new Date(cleanFecha).toLocaleTimeString('es-CO', {hour: '2-digit', minute: '2-digit'}) : '--:--';
        const nombreStr = c.cliente_nombre || 'Desconocido';
        const servicioStr = c.servicio_nombre || 'Servicio no especificado';
        
        return `
          <div style="display:flex; align-items:center; gap:var(--space-md); padding:var(--space-md); border-bottom:1px solid var(--color-border);">
            <div style="min-width:50px; font-size:0.85rem; font-weight:700; color:var(--color-teal);">${horaStr}</div>
            <div class="avatar avatar-sm">${Utils.iniciales(nombreStr)}</div>
            <div style="flex:1; min-width:0;">
              <div style="font-size:0.88rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${nombreStr}</div>
              <div style="font-size:0.75rem; color:var(--color-text-muted);">${servicioStr}</div>
            </div>
            <span class="badge ${badgeClass}">${estadoLabel}</span>
          </div>`;
      })
      .join('');
  }

  // ===================================================
  // 6. Gráfica de barras (citas últimas 7 semanas)
  //    CSS-based, usa .chart-bar-wrap / .chart-bar / .chart-bar-tooltip
  //    que ya trae tu admin.css.
  // ===================================================
  function renderWeeklyChart(data) {
    const barsContainer = document.getElementById('chart-bars');
    const labelsContainer = document.getElementById('chart-labels');
    if (!barsContainer || !labelsContainer) return;

    if (!data.length) {
      barsContainer.innerHTML = '';
      labelsContainer.innerHTML = '';
      return;
    }

    const maxVal = Math.max(...data.map((d) => d.total), 1);

    barsContainer.innerHTML = data
      .map((d) => `
        <div class="chart-bar-wrap">
          <div class="chart-bar" style="height:${Math.max((d.total / maxVal) * 100, 5)}%;">
            <div class="chart-bar-tooltip">${d.total} citas</div>
          </div>
        </div>`)
      .join('');

    labelsContainer.innerHTML = data
      .map((d) => `<span class="chart-label" style="flex:1;text-align:center;font-size:0.72rem;color:var(--color-text-muted);">${d.semana}</span>`)
      .join('');
  }

  // ===================================================
  // 7. Evolución de registros — gráfica de línea (SVG)
  // ===================================================
  function renderRegistrationChart(items) {
    const el = document.getElementById('registration-chart');
    if (!el) return;

    const data = (items || []).map((item) => ({ label: item.month, value: item.cumulative }));

    if (!data.length) {
      el.innerHTML = emptyMini('Sin datos de registro todavía.');
      return;
    }

    const color = '#2f6f8f';
    const height = 190;
    const max = Math.max(...data.map((d) => d.value), 1);
    const step = data.length > 1 ? 100 / (data.length - 1) : 100;

    const points = data.map((d, i) => ({
      x: i * step,
      y: 100 - (d.value / max) * 90 - 5,
      label: d.label,
      value: d.value,
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = `${pathD} L 100 100 L 0 100 Z`;
    const gradId = 'lineGrad_' + Math.random().toString(36).slice(2, 8);

    const gridLines = [0, 25, 50, 75, 100]
      .map((y) => `<line x1="0" y1="${y}" x2="100" y2="${y}" stroke="#e5e7eb" stroke-width="0.3"/>`)
      .join('');

    const dots = points
      .map((p) => `<circle cx="${p.x}" cy="${p.y}" r="1.2" fill="white" stroke="${color}" stroke-width="0.8"><title>${p.label}: ${p.value}</title></circle>`)
      .join('');

    const labels = data
      .map((d) => `<span style="width:${step}%">${d.label}</span>`)
      .join('');

    el.innerHTML = `
      <div class="line-chart-wrap" style="height:${height}px;">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;overflow:visible;">
          <defs>
            <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
            </linearGradient>
          </defs>
          ${gridLines}
          <path d="${areaD}" fill="url(#${gradId})"/>
          <path d="${pathD}" fill="none" stroke="${color}" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/>
          ${dots}
        </svg>
        <div class="chart-axis-labels">${labels}</div>
      </div>`;
  }

  // ===================================================
  // 8. Participación en programas — barras horizontales
  // ===================================================
  function renderProgramChart(items) {
    const el = document.getElementById('program-chart');
    if (!el) return;

    const data = (items || []).map((item) => ({
      label: item.programa,
      value: item.solicitudes,
      secondary: item.testimonios,
    }));

    if (!data.length) {
      el.innerHTML = emptyMini('Sin programas con actividad todavía.');
      return;
    }

    const color = '#0f766e';
    const secondaryColor = '#b9d8d0';
    const max = Math.max(...data.flatMap((d) => [d.value, d.secondary || 0]), 1);

    const rows = data
      .map((d) => {
        const secondaryLabel = d.secondary !== undefined
          ? `<span class="hbar-secondary">T:${d.secondary}</span>`
          : '';
        const secondaryBar = d.secondary !== undefined && d.secondary > 0
          ? `<div class="hbar-fill" style="width:${(d.secondary / max) * 100}%;background:${secondaryColor};"></div>`
          : '';
        return `
          <div class="hbar-row">
            <div class="hbar-row-top">
              <span class="hbar-row-label">${d.label}</span>
              <span class="hbar-row-value">${d.value}${secondaryLabel}</span>
            </div>
            <div class="hbar-track">
              <div class="hbar-fill" style="width:${(d.value / max) * 100}%;background:${color};"></div>
              ${secondaryBar}
            </div>
          </div>`;
      })
      .join('');

    el.innerHTML = `<div class="hbar-list">${rows}</div>`;
  }

  // ===================================================
  // 9. Donuts — distribución de usuarios / estado de solicitudes
  // ===================================================
  function donutHTML(data) {
    const total = data.reduce((s, d) => s + d.value, 0);
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    const segments = total > 0
      ? data
        .map((d) => {
          const dash = (d.value / total) * circumference;
          const seg = `
              <circle cx="50" cy="50" r="${radius}" fill="none" stroke="${d.color}" stroke-width="12"
                stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}"
                transform="rotate(-90 50 50)">
                <title>${d.label}: ${d.value}</title>
              </circle>`;
          offset += dash;
          return seg;
        })
        .join('')
      : '';

    const legend = data
      .map((d) => {
        const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
        return `
          <div class="donut-legend-row">
            <span class="donut-legend-swatch" style="background:${d.color}"></span>
            <span class="donut-legend-label">${d.label}</span>
            <span class="donut-legend-value">${d.value}</span>
            <span class="donut-legend-pct">${pct}%</span>
          </div>`;
      })
      .join('');

    return `
      <div class="donut-wrap">
        <svg viewBox="0 0 100 100" style="width:150px;height:150px;flex-shrink:0;">
          <circle cx="50" cy="50" r="${radius}" fill="none" stroke="#f3f4f6" stroke-width="12"/>
          ${segments}
          <text x="50" y="48" text-anchor="middle" style="fill:#111827;font-size:10px;font-weight:700;">${total}</text>
          <text x="50" y="56" text-anchor="middle" style="fill:#9ca3af;font-size:5px;">Total</text>
        </svg>
        <div class="donut-legend">${legend}</div>
      </div>`;
  }

  function renderRoleDonut(items) {
    const el = document.getElementById('role-donut');
    if (!el) return;
    const data = (items || []).map((item) => ({
      label: roleLabels[item.rol] || item.rol,
      value: item.count,
      color: roleColors[item.rol] || '#8b8175',
    }));
    el.innerHTML = data.length ? donutHTML(data) : emptyMini('Sin datos de usuarios todavía.');
  }

  function renderStatusDonut(items) {
    const el = document.getElementById('status-donut');
    if (!el) return;
    const data = (items || []).map((item) => ({
      label: statusLabels[item.estado] || item.estado,
      value: item.count,
      color: statusColors[item.estado] || '#8b8175',
    }));
    el.innerHTML = data.length ? donutHTML(data) : emptyMini('Sin solicitudes todavía.');
  }

  // ===================================================
  // 10. Salud del sistema
  // ===================================================
  function renderHealthSummary(summary) {
    const el = document.getElementById('health-list');
    if (!el) return;

    const rows = [
      ['Usuarios activos', summary.usuariosActivos ?? 0],
      ['Programas activos', summary.programasActivos ?? 0],
      ['Noticias publicadas', summary.noticiasPublicadas ?? 0],
      ['Solicitudes completadas', summary.solicitudesCompletadas ?? 0],
    ];

    el.innerHTML = rows
      .map(([label, value]) => `
        <div>
          <span>
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            ${label}
          </span>
          <strong>${value}</strong>
        </div>`)
      .join('');
  }

  // ===================================================
  // 11. Últimos pacientes registrados
  // ===================================================
  function renderTabla(pacientes) {
    const container = document.getElementById('tabla-pacientes');
    if (!container) return;

    if (!pacientes.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon" style="color:var(--color-teal);opacity:0.5;">
            <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="empty-state-title">Sin pacientes</div>
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
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${pacientes
        .map((p) => `
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
            </tr>`)
        .join('')}
        </tbody>
      </table>`;
  }

  // ===================================================
  // 12. Helper: estado vacío chiquito para los paneles nuevos
  // ===================================================
  function emptyMini(text) {
    return `<div style="padding:var(--space-lg) 0;text-align:center;color:var(--color-text-muted);font-size:0.85rem;">${text}</div>`;
  }

  // ===================================================
  // 13. Carga de datos del backend
  // ===================================================
  async function loadDashboard() {
    // --- Bloque base: ya existía y funciona ---
    try {
      const [resumen, pacientes] = await Promise.all([
        AdminAPI.resumen(),
        ClientesAPI.list({ per_page: 5 }),
      ]);

      renderKPIs({
        pacientes: resumen.total_pacientes ?? 0,
        citasHoy: resumen.citas_hoy ?? 0,
        pendientes: resumen.pendientes ?? 0,
        ingresos: resumen.ingresos_mes ?? 0,
      });
      renderTabla(pacientes.clientes || []);
      renderWeeklyChart(resumen.citasSemana || []);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
      renderKPIs({ pacientes: 0, citasHoy: 0, pendientes: 0, ingresos: 0 });
      renderTabla([]);
      renderWeeklyChart([]);
    }

    try {
      const citasHoy = await AdminAPI.citasHoy();
      renderAgenda(citasHoy.citas || []);
    } catch (error) {
      console.error('Error cargando agenda de hoy:', error);
      renderAgenda([]);
    }

    // --- Bloque nuevo: si tu AdminAPI todavía no expone estos métodos,
    //     cada sección degrada a su estado vacío sin romper el resto. ---
    try {
      const evolucion = await AdminAPI.evolucionRegistros();
      renderRegistrationChart(evolucion.data || evolucion || []);
    } catch (error) {
      renderRegistrationChart([]);
    }

    try {
      const programas = await AdminAPI.participacionProgramas();
      renderProgramChart(programas.data || programas || []);
    } catch (error) {
      renderProgramChart([]);
    }

    try {
      const roles = await AdminAPI.distribucionRoles();
      renderRoleDonut(roles.data || roles || []);
    } catch (error) {
      renderRoleDonut([]);
    }

    try {
      const estados = await AdminAPI.distribucionEstados();
      renderStatusDonut(estados.data || estados || []);
    } catch (error) {
      renderStatusDonut([]);
    }

    try {
      const salud = await AdminAPI.saludSistema();
      renderHealthSummary(salud || {});
    } catch (error) {
      renderHealthSummary({});
    }

    renderLastUpdated(new Date());
  }

  // 9. Cargar inicial
  loadDashboard();
  
  // Real-time updates cada 15 segundos
  setInterval(loadDashboard, 15000);
})();
