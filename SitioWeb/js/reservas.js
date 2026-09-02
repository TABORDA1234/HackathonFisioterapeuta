/* ===================================================
   FISIOTERAPEUTA LI — LÓGICA DE RESERVAS
   Formulario multi-paso de reserva pública
   =================================================== */

// Default icon for services loaded from API
const DEFAULT_ICON = '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9h8m-8 4h5" />';

// Se cargan dinámicamente desde la API; fallback vacío
let SERVICIOS = [];

/** Cargar servicios desde el backend */
async function loadServicios() {
  try {
    const data = await ServiciosAPI.list();
    SERVICIOS = (data.servicios || []).map(s => ({
      id: s.id,
      nombre: s.nombre,
      precio: s.precio || 0,
      duracion: s.duracion_min ? `${s.duracion_min} min` : '1 hora',
      icon: DEFAULT_ICON,
      nota: s.descripcion || '',
    }));
  } catch (e) {
    console.warn('No se pudieron cargar servicios desde la API:', e.message);
    Toast.warning('No se pudieron cargar los servicios. Intenta recargar la página.');
  }
}

const HORAS_DISPONIBLES = [
  '07:00', '08:00', '09:00', '10:00', '11:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
];

// Estado de la reserva
const state = {
  currentStep: 1,
  servicioId: null,
  fecha: null,
  hora: null,
  sede: null,
  nombre: '',
  documento: '',
  telefono: '',
  email: '',
  motivo: '',
};

// Elementos del DOM
const steps = {
  1: document.getElementById('step-1'),
  2: document.getElementById('step-2'),
  3: document.getElementById('step-3'),
  4: document.getElementById('step-4'),
  5: document.getElementById('step-5'),
};

const stepIndicators = {
  1: document.getElementById('step-ind-1'),
  2: document.getElementById('step-ind-2'),
  3: document.getElementById('step-ind-3'),
  4: document.getElementById('step-ind-4'),
};

function formatCOP(n) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
}

/** Navegar a un paso */
function goToStep(n) {
  // Ocultar todos
  Object.values(steps).forEach(el => el.classList.add('hidden'));
  // Mostrar el actual
  if (steps[n]) steps[n].classList.remove('hidden');
  state.currentStep = n;

  // Actualizar stepper
  Object.entries(stepIndicators).forEach(([k, el]) => {
    const ki = parseInt(k);
    el.classList.toggle('active', ki === n);
    el.classList.toggle('done', ki < n);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** ── PASO 1: Renderizar servicios ── */
function renderServicios() {
  const container = document.getElementById('service-list');
  container.innerHTML = SERVICIOS.map(s => `
    <label class="service-option" style="
      display:flex; align-items:center; gap:var(--space-md);
      padding:var(--space-md) var(--space-lg);
      border:1.5px solid var(--color-border);
      border-radius:var(--radius-md);
      cursor:pointer;
      transition: all var(--transition-fast);
    " data-id="${s.id}">
      <input type="radio" name="servicio" value="${s.id}" style="display:none;" />
      <span style="display:flex; align-items:center; justify-content:center; width: 40px; height: 40px; border-radius: 8px; background: var(--teal-100); color: var(--teal-700);">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${s.icon}</svg>
      </span>
      <div style="flex:1;">
        <div style="font-weight:600; font-size:0.95rem;">${s.nombre}</div>
        ${s.nota ? `<div style="font-size:0.78rem; color:var(--teal-600);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-2px"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg> ${s.nota}</div>` : ''}
        <div style="font-size:0.78rem; color:var(--ink-500);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-2px"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${s.duracion}</div>
      </div>
      <div style="font-weight:700; color:var(--color-teal); white-space:nowrap;">${formatCOP(s.precio)}</div>
      <div class="radio-check" style="
        width:20px; height:20px; border-radius:50%;
        border:2px solid var(--color-border-light);
        flex-shrink:0; display:flex; align-items:center; justify-content:center;
        transition: all var(--transition-fast);
      "></div>
    </label>
  `).join('');

  container.querySelectorAll('.service-option').forEach(label => {
    label.addEventListener('click', () => {
      // Reset all
      container.querySelectorAll('.service-option').forEach(l => {
        l.style.borderColor = 'var(--color-border)';
        l.style.background = 'transparent';
        l.querySelector('.radio-check').style.borderColor = 'var(--color-border-light)';
        l.querySelector('.radio-check').innerHTML = '';
      });
      // Activate
      label.style.borderColor = 'var(--color-teal)';
      label.style.background = 'var(--color-teal-subtle)';
      label.querySelector('.radio-check').style.borderColor = 'var(--color-teal)';
      label.querySelector('.radio-check').style.background = 'var(--color-teal)';
      label.querySelector('.radio-check').innerHTML = '<span style="color:#fff;font-size:10px;font-weight:700;">✓</span>';
      label.querySelector('input').checked = true;

      state.servicioId = parseInt(label.dataset.id);
      document.getElementById('btn-step1-next').disabled = false;
    });
  });
}

/** ── PASO 2: Renderizar horarios ── */
function renderHorarios() {
  const fecha = document.getElementById('fecha-cita').value;
  const sede  = document.getElementById('sede-cita').value;
  const container = document.getElementById('horarios-container');
  const nextBtn = document.getElementById('btn-step2-next');

  if (!fecha || !sede) {
    container.innerHTML = '<p style="color:var(--color-text-muted); font-size:0.9rem;">Selecciona una fecha y sede para ver horarios disponibles.</p>';
    nextBtn.disabled = true;
    return;
  }

  // Validar días de la sede
  const dayOfWeek = new Date(fecha + 'T12:00:00').getDay(); // 0=Dom, 6=Sáb
  const esFinDeSemana = dayOfWeek === 0 || dayOfWeek === 6;
  if (sede === 'tunja' && esFinDeSemana) {
    container.innerHTML = '<div class="badge badge-warn" style="display:inline-flex;">⚠️ La sede Tunja atiende Lunes a Viernes. Elige otra fecha o la sede Turmequé para fin de semana.</div>';
    nextBtn.disabled = true;
    return;
  }
  if (sede === 'turmeque' && !esFinDeSemana) {
    container.innerHTML = '<div class="badge badge-warn" style="display:inline-flex;">⚠️ La sede Turmequé atiende Sábados y Domingos. Elige otra fecha o la sede Tunja para entre semana.</div>';
    nextBtn.disabled = true;
    return;
  }

  // Validar anticipación mínima (24h)
  const ahora = new Date();
  const fechaSel = new Date(fecha + 'T07:00:00');
  const diff = fechaSel - ahora;
  if (diff < 24 * 60 * 60 * 1000) {
    container.innerHTML = '<div class="badge badge-danger" style="display:inline-flex;">❌ Se requiere mínimo 24 horas de anticipación para reservar.</div>';
    nextBtn.disabled = true;
    return;
  }

  // Renderizar horarios
  state.hora = null;
  nextBtn.disabled = true;
  container.innerHTML = `
    <p style="font-size:0.85rem; color:var(--color-text-muted); margin-bottom:var(--space-md);">Selecciona un horario:</p>
    <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(100px,1fr)); gap:var(--space-sm);">
      ${HORAS_DISPONIBLES.map(h => `
        <button class="hora-btn" data-hora="${h}" style="
          padding:var(--space-sm) var(--space-md);
          border:1.5px solid var(--color-border);
          border-radius:var(--radius-md);
          background:transparent;
          color:var(--color-text);
          font-family:var(--font-primary);
          font-size:0.9rem; font-weight:600;
          cursor:pointer;
          transition:all var(--transition-fast);
        ">${h}</button>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('.hora-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.hora-btn').forEach(b => {
        b.style.borderColor = 'var(--color-border)';
        b.style.background  = 'transparent';
        b.style.color = 'var(--color-text)';
      });
      btn.style.borderColor = 'var(--color-teal)';
      btn.style.background  = 'var(--color-teal)';
      btn.style.color = '#fff';
      state.hora = btn.dataset.hora;
      nextBtn.disabled = false;
    });
  });
}

/** ── PASO 4: Resumen ── */
function renderResumen() {
  const servicio = SERVICIOS.find(s => s.id === state.servicioId);
  const sedeLabel = { tunja: 'Sede Tunja', turmeque: 'Sede Turmequé' }[state.sede] || state.sede;
  const fechaStr = new Date(state.fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  const items = [
    { label: 'Servicio',          value: `${servicio?.nombre}` },
    { label: 'Sede',              value: `${sedeLabel}` },
    { label: 'Fecha',             value: `${fechaStr}` },
    { label: 'Hora',              value: `${state.hora}` },
    { label: 'Paciente',          value: `${state.nombre}` },
    { label: 'Documento',         value: state.documento },
    { label: 'Teléfono',          value: `${state.telefono}` },
    { label: 'Correo',            value: state.email || '—' },
    { label: 'Total a pagar',     value: `<strong style="color:var(--teal-600); font-size:1.1rem;">${formatCOP(servicio?.precio || 0)}</strong>` },
  ];

  document.getElementById('resumen-reserva').innerHTML = items.map(i => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:var(--space-sm) 0; border-bottom:1px solid var(--color-border);">
      <span style="font-size:0.85rem; color:var(--color-text-muted);">${i.label}</span>
      <span style="font-size:0.9rem;">${i.value}</span>
    </div>
  `).join('');
}

/** ── PASO 3: Validar datos ── */
function validateStep3() {
  const nombre = document.getElementById('nombre-p').value.trim();
  const doc    = document.getElementById('doc-p').value.trim();
  const tel    = document.getElementById('tel-p').value.trim();
  if (!nombre || !doc || !tel) {
    Toast.warning('Por favor completa Nombre, Documento y Teléfono.');
    return false;
  }
  if (tel.length < 7) {
    Toast.warning('Ingresa un número de teléfono válido.');
    return false;
  }
  state.nombre    = nombre;
  state.documento = doc;
  state.telefono  = tel;
  state.email     = document.getElementById('email-p').value.trim();
  state.motivo    = document.getElementById('motivo-p').value.trim();
  return true;
}

/** ── Enviar reserva ── */
async function confirmarReserva() {
  const btn = document.getElementById('btn-confirmar');
  Utils.setLoading(btn, true);
  try {
    const servicio = SERVICIOS.find(s => s.id === state.servicioId);
    const fechaHora = `${state.fecha}T${state.hora}:00`;

    const res = await CitasAPI.reservar({
      cliente_nombre: state.nombre,
      cliente_telefono: state.telefono,
      servicio_id: state.servicioId,
      fecha_hora: fechaHora,
      origen: 'web',
    });

    Toast.success('¡Cita reservada exitosamente!');
    goToStep(5);
  } catch (e) {
    if (e.message.includes('no está disponible') || e.message.includes('no disponible')) {
      Toast.error('Ese horario ya no está disponible. Por favor elige otro.');
    } else {
      Toast.error('Error al reservar: ' + e.message);
    }
  } finally {
    Utils.setLoading(btn, false);
  }
}

// ── Event listeners ──

document.getElementById('btn-step1-next').addEventListener('click', () => goToStep(2));
document.getElementById('btn-step2-back').addEventListener('click', () => goToStep(1));
document.getElementById('btn-step3-back').addEventListener('click', () => goToStep(2));
document.getElementById('btn-step4-back').addEventListener('click', () => goToStep(3));

document.getElementById('btn-step2-next').addEventListener('click', () => {
  state.fecha = document.getElementById('fecha-cita').value;
  state.sede  = document.getElementById('sede-cita').value;
  goToStep(3);
});

document.getElementById('btn-step3-next').addEventListener('click', () => {
  if (validateStep3()) {
    renderResumen();
    goToStep(4);
  }
});

document.getElementById('btn-confirmar').addEventListener('click', confirmarReserva);

document.getElementById('fecha-cita').addEventListener('change', renderHorarios);
document.getElementById('sede-cita').addEventListener('change', renderHorarios);

// Fecha mínima = mañana (24h de anticipación)
const mañana = new Date();
mañana.setDate(mañana.getDate() + 1);
document.getElementById('fecha-cita').min = mañana.toISOString().split('T')[0];

// Inicializar: cargar servicios desde la API y luego renderizar
loadServicios().then(() => renderServicios());
