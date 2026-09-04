/* ===================================================
   FISIOTERAPEUTA LI — GESTIÓN DE CITAS
   Agenda semanal, citas del día, nuevo agendamiento
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

// Estado de la agenda
let currentDate = new Date();
let citasCache = [];

// No demo data - we enforce real backend data

// ── Renderizado del Grid Semanal ──
const HORAS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];

function obtenerDiasSemana(fecha) {
  const f = new Date(fecha);
  const diaSemana = f.getDay();
  const diff = f.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1); // Ajustar para que Lunes sea 1
  
  const inicioSemana = new Date(f.setDate(diff));
  const dias = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(inicioSemana);
    d.setDate(d.getDate() + i);
    dias.push(d);
  }
  return dias;
}

function formatearFecha(d) {
  return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
}

function renderGridSemanal() {
  const dias = obtenerDiasSemana(currentDate);
  document.getElementById('semana-label').textContent = `${formatearFecha(dias[0])} — ${formatearFecha(dias[6])}`;
  
  const grid = document.getElementById('schedule-grid');
  let html = '';

  // Header row
  html += `<div class="schedule-header-cell">Hora</div>`;
  dias.forEach(d => {
    const esHoy = d.toDateString() === new Date().toDateString();
    html += `<div class="schedule-header-cell ${esHoy ? 'text-teal' : ''}" style="cursor:pointer;" onclick="seleccionarDia('${d.toISOString()}')">
      ${formatearFecha(d)}
    </div>`;
  });

  // Body rows
  HORAS.forEach(h => {
    html += `<div class="schedule-time-cell">${h}</div>`;
    dias.forEach(d => {
      const fechaStr = d.toISOString().split('T')[0];
      const slotId = `${fechaStr}T${h}`;
      html += `<div class="schedule-slot" data-slot="${slotId}" onclick="nuevaCitaEnSlot('${fechaStr}', '${h}')"></div>`;
    });
  });

  grid.innerHTML = html;
  colocarCitasEnGrid();
  calcularKPIs();
  
  // Seleccionar el día actual por defecto
  seleccionarDia(currentDate.toISOString());
}

function colocarCitasEnGrid() {
  // Limpiar slots
  document.querySelectorAll('.schedule-slot').forEach(el => el.innerHTML = '');

  citasCache.forEach(c => {
    if (!c.fecha_hora) return;
    // Extraer YYYY-MM-DD y HH:MM
    const dateObj = new Date(c.fecha_hora);
    const fecha = dateObj.toISOString().split('T')[0];
    const hora = dateObj.toTimeString().substring(0, 5); // "07:00"
    
    // Buscar el slot
    const slotEl = document.querySelector(`.schedule-slot[data-slot="${fecha}T${hora}"]`);
    if (slotEl) {
      const cls = c.estado === 'confirmed' ? 'event-confirmed' : c.estado === 'pending' ? 'event-pending' : 'event-cancelled';
      const evHtml = `<div class="schedule-event ${cls}" onclick="event.stopPropagation(); abrirDetalleCita(${c.id})" title="${c.cliente_nombre} - ${c.servicio_nombre}">
        ${c.cliente_nombre.split(' ')[0]}
      </div>`;
      slotEl.innerHTML += evHtml;
    }
  });
}

function calcularKPIs() {
  const hoyStr = new Date().toISOString().split('T')[0];
  const diasSemana = obtenerDiasSemana(currentDate).map(d => d.toISOString().split('T')[0]);
  
  let totalHoy = 0;
  let totalSemana = 0;
  let pendientes = 0;
  let canceladas = 0;

  citasCache.forEach(c => {
    if (!c.fecha_hora) return;
    const fecha = new Date(c.fecha_hora).toISOString().split('T')[0];
    
    if (fecha === hoyStr) totalHoy++;
    if (diasSemana.includes(fecha)) {
      totalSemana++;
      if (c.estado === 'pending') pendientes++;
      if (c.estado === 'cancelled') canceladas++;
    }
  });

  document.getElementById('stat-hoy').textContent = totalHoy;
  document.getElementById('stat-semana').textContent = totalSemana;
  document.getElementById('stat-pendientes').textContent = pendientes;
  document.getElementById('stat-canceladas').textContent = canceladas;
}

// ── Lista lateral del día ──
window.seleccionarDia = function(isoStr) {
  const d = new Date(isoStr);
  const strDate = d.toISOString().split('T')[0];
  
  document.getElementById('lista-dia-titulo').textContent = formatearFecha(d);
  
  const citasDelDia = citasCache.filter(c => {
    return c.fecha_hora && c.fecha_hora.startsWith(strDate);
  }).sort((a,b) => a.fecha_hora.localeCompare(b.fecha_hora));

  document.getElementById('lista-dia-count').textContent = citasDelDia.length;
  const container = document.getElementById('lista-dia');

  if (citasDelDia.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:var(--space-xl);"><div class="empty-state-icon" style="color:var(--color-teal); opacity:0.6;"><svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M19 4h-1V3a1 1 0 0 0-2 0v1H8V3a1 1 0 0 0-2 0v1H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V10h14v10Z"></path></svg></div><div class="empty-state-title">No hay citas registradas</div></div>';
    return;
  }

  container.innerHTML = citasDelDia.map(c => {
    const time = new Date(c.fecha_hora).toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit'});
    let dot = 'gray';
    if (c.estado==='confirmed') dot='var(--sem-ok)';
    if (c.estado==='pending') dot='var(--sem-warn)';
    if (c.estado==='cancelled') dot='var(--sem-danger)';
    
    return `
    <div style="padding:var(--space-md); border-bottom:1px solid var(--color-border); cursor:pointer; transition:background var(--transition-fast);" onclick="abrirDetalleCita(${c.id})" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span style="font-weight:700; color:var(--color-teal);">${time}</span>
        <div style="width:10px;height:10px;border-radius:50%;background:${dot}; margin-top:4px;"></div>
      </div>
      <div style="font-weight:600; font-size:0.95rem;">${c.cliente_nombre}</div>
      <div style="font-size:0.8rem; color:var(--color-text-muted);">${c.servicio_nombre}</div>
      ${c.sede ? `<div style="font-size:0.75rem; color:var(--color-text-subtle); margin-top:4px; display:flex; align-items:center; gap:4px;"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> Sede ${c.sede === 'tunja' ? 'Tunja' : 'Turmequé'}</div>` : ''}
    </div>`;
  }).join('');
};

// ── Cargar Datos ──
async function cargarCitas() {
  const dias = obtenerDiasSemana(currentDate);
  const inicio = dias[0].toISOString().split('T')[0];
  const fin = dias[6].toISOString().split('T')[0];

  try {
    const res = await CitasAPI.list({ fecha_inicio: inicio, fecha_fin: fin });
    citasCache = res.citas || [];
  } catch (e) {
    console.error("Error al cargar citas:", e);
    citasCache = [];
  }
  renderGridSemanal();
}

// Navegación de semana
document.getElementById('btn-semana-ant').addEventListener('click', () => {
  currentDate.setDate(currentDate.getDate() - 7);
  cargarCitas();
});
document.getElementById('btn-semana-sig').addEventListener('click', () => {
  currentDate.setDate(currentDate.getDate() + 7);
  cargarCitas();
});
document.getElementById('btn-hoy').addEventListener('click', () => {
  currentDate = new Date();
  cargarCitas();
});

// ── Modales ──
const modalCita = document.getElementById('modal-cita');
const modalDetalle = document.getElementById('modal-detalle');

function cerrarModales() {
  modalCita.classList.add('hidden');
  modalDetalle.classList.add('hidden');
  document.getElementById('form-cita').reset();
}

document.getElementById('btn-nueva-cita').addEventListener('click', () => {
  document.getElementById('modal-cita-title').textContent = 'Nueva Cita';
  document.getElementById('form-cita').reset();
  document.getElementById('cita-fecha').value = new Date().toISOString().split('T')[0];
  modalCita.classList.remove('hidden');
});

document.getElementById('modal-cita-close').addEventListener('click', cerrarModales);
document.getElementById('modal-cita-cancel').addEventListener('click', cerrarModales);
document.getElementById('modal-detalle-close').addEventListener('click', cerrarModales);
document.getElementById('modal-detalle-cancel').addEventListener('click', cerrarModales);

window.nuevaCitaEnSlot = function(fecha, hora) {
  document.getElementById('modal-cita-title').textContent = 'Nueva Cita';
  document.getElementById('form-cita').reset();
  document.getElementById('cita-fecha').value = fecha;
  document.getElementById('cita-hora').value = hora;
  modalCita.classList.remove('hidden');
};

// Guardar Cita
document.getElementById('modal-cita-save').addEventListener('click', async () => {
  const paciente = document.getElementById('cita-paciente').value.trim();
  const tel      = document.getElementById('cita-tel').value.trim();
  const servicioSel = document.getElementById('cita-servicio');
  const servicio = servicioSel.value;
  const fecha    = document.getElementById('cita-fecha').value;
  const hora     = document.getElementById('cita-hora').value;
  const sede     = document.getElementById('cita-sede').value;
  const estado   = document.getElementById('cita-estado').value;
  const notas    = document.getElementById('cita-notas').value.trim();

  if (!paciente || !servicio || !fecha || !hora) {
    Toast.warning('Completa todos los campos obligatorios.');
    return;
  }

  const btn = document.getElementById('modal-cita-save');
  Utils.setLoading(btn, true);

  const data = {
    cliente_nombre: paciente,
    cliente_telefono: tel,
    servicio_nombre: servicioSel.options[servicioSel.selectedIndex].text.split('—')[0].trim(),
    fecha_hora: `${fecha}T${hora}:00`,
    sede,
    estado,
    notas,
  };

  try {
    await CitasAPI.create(data);
    Toast.success('Cita agendada correctamente.');
    cerrarModales();
    cargarCitas();
  } catch (e) {
    Toast.error(e.message);
  } finally {
    Utils.setLoading(btn, false);
  }
});

// Detalle Cita
let citaActiva = null;

window.abrirDetalleCita = function(id) {
  const cita = citasCache.find(c => c.id === id);
  if (!cita) return;
  citaActiva = cita;

  let badge = '';
  if (cita.estado==='confirmed') badge='<span class="badge badge-ok">Confirmada</span>';
  if (cita.estado==='pending') badge='<span class="badge badge-warn">Pendiente</span>';
  if (cita.estado==='cancelled') badge='<span class="badge badge-danger">Cancelada</span>';

  const d = new Date(cita.fecha_hora);

  document.getElementById('modal-detalle-content').innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:var(--space-md);">
      <div>
        <div style="font-weight:700; font-size:1.2rem;">${cita.cliente_nombre}</div>
        <div style="color:var(--color-text-muted); font-size:0.9rem;"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align:text-bottom; margin-right:4px;"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> ${cita.cliente_telefono || '—'}</div>
      </div>
      <div>${badge}</div>
    </div>
    <div class="card" style="background:rgba(255,255,255,0.02); padding:var(--space-md); margin-bottom:var(--space-md);">
      <div style="margin-bottom:8px;"><span style="color:var(--color-text-muted);font-size:0.85rem;width:80px;display:inline-block;">Servicio</span> <strong>${cita.servicio_nombre}</strong></div>
      <div style="margin-bottom:8px;"><span style="color:var(--color-text-muted);font-size:0.85rem;width:80px;display:inline-block;">Sede</span> <strong>${cita.sede === 'tunja' ? 'Tunja' : cita.sede === 'turmeque' ? 'Turmequé' : 'Por definir'}</strong></div>
      <div style="margin-bottom:8px;"><span style="color:var(--color-text-muted);font-size:0.85rem;width:80px;display:inline-block;">Fecha</span> <strong>${d.toLocaleDateString('es-CO')}</strong></div>
      <div style="margin-bottom:8px;"><span style="color:var(--color-text-muted);font-size:0.85rem;width:80px;display:inline-block;">Hora</span> <strong style="color:var(--color-teal);">${d.toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit'})}</strong></div>
      <div style="margin-bottom:8px;"><span style="color:var(--color-text-muted);font-size:0.85rem;width:80px;display:inline-block;">Origen</span> <strong>${cita.origen === 'web' ? 'Página Web' : 'Interno'}</strong></div>
      ${cita.notas ? `<div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--color-border);"><span style="color:var(--color-text-muted);font-size:0.85rem;display:block;margin-bottom:4px;">Notas / Observaciones</span> <div style="font-size:0.9rem; line-height:1.4;">${cita.notas}</div></div>` : ''}
    </div>
  `;

  // Botones de acción según estado
  const btnCanc = document.getElementById('modal-detalle-cancelar');
  const btnConf = document.getElementById('modal-detalle-confirmar');
  
  btnCanc.style.display = cita.estado !== 'cancelled' ? 'inline-block' : 'none';
  btnConf.style.display = cita.estado !== 'confirmed' ? 'inline-block' : 'none';

  modalDetalle.classList.remove('hidden');
};

async function cambiarEstadoCita(nuevoEstado) {
  if (!citaActiva) return;
  try {
    await CitasAPI.update(citaActiva.id, { estado: nuevoEstado });
    Toast.success('Estado de la cita actualizado.');
    cerrarModales();
    cargarCitas();
  } catch (e) {
    Toast.error(e.message);
  }
}

document.getElementById('modal-detalle-cancelar').addEventListener('click', () => cambiarEstadoCita('cancelled'));
document.getElementById('modal-detalle-confirmar').addEventListener('click', () => cambiarEstadoCita('confirmed'));

// Inicializar
cargarCitas();
