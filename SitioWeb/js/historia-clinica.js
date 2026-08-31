/* ===================================================
   FISIOTERAPEUTA LI — HISTORIA CLÍNICA
   Semáforos automáticos, EVA slider, guardado
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

// Leer clienteId de la URL
const params = new URLSearchParams(window.location.search);
const clienteId = params.get('id');

// ── Cargar datos del paciente si viene con ID ──
if (clienteId) {
  document.getElementById('paciente-breadcrumb').textContent = 'Cargando…';
  ClientesAPI.get(clienteId).then(res => {
    const p = res.cliente;
    document.getElementById('paciente-breadcrumb').textContent = p.nombre;
    document.getElementById('hc-nombre').value = p.nombre || '';
    document.getElementById('hc-tel').value    = p.telefono || '';
    document.getElementById('hc-email').value  = p.email || '';

    // Si hay HC guardada en notas_medicas
    if (p.notas_medicas) {
      try {
        const hc = JSON.parse(p.notas_medicas);
        rellenarFormulario(hc);
      } catch {}
    }
  }).catch(() => {
    document.getElementById('paciente-breadcrumb').textContent = 'Nueva Historia Clínica';
  });
}

/** Rellenar formulario desde datos guardados */
function rellenarFormulario(hc) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
  };

  // Módulo 1
  set('hc-tipo-doc', hc.tipo_doc);
  set('hc-num-doc', hc.num_doc);
  set('hc-fec-nac', hc.fec_nac);
  set('hc-genero', hc.genero);
  set('hc-eps', hc.eps);
  set('hc-eps-otro', hc.eps_otro);
  set('hc-ciudad', hc.ciudad);
  set('hc-ciudad-otro', hc.ciudad_otro);
  set('hc-ocupacion', hc.ocupacion);
  set('hc-emerg-nombre', hc.emerg_nombre);
  set('hc-emerg-parentesco', hc.emerg_parentesco);
  set('hc-emerg-tel', hc.emerg_tel);
  set('hc-referido-por', hc.referido_por);
  set('hc-num-referidos', hc.num_referidos || 0);
  actualizarReferidos();

  // Módulo 2
  set('hc-motivo-principal', hc.motivo_principal);
  set('hc-motivo-desc', hc.motivo_desc);
  set('hc-evolucion', hc.evolucion);
  set('hc-otros-antecedentes', hc.otros_antecedentes);
  if (hc.antecedentes) {
    hc.antecedentes.forEach(v => {
      const cb = document.querySelector(`input[name="antecedente"][value="${v}"]`);
      if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
    });
  }

  // Módulo 3
  set('vs-sistolica', hc.sistolica);
  set('vs-diastolica', hc.diastolica);
  set('vs-fc', hc.fc);
  set('vs-fr', hc.fr);
  set('vs-spo2', hc.spo2);
  set('vs-peso', hc.peso);
  set('vs-talla', hc.talla);
  calcularTA(); calcularFC(); calcularFR(); calcularSpO2(); calcularIMC();

  // Módulo 4
  const slider = document.getElementById('eva-slider');
  if (hc.eva !== undefined) { slider.value = hc.eva; actualizarEVA(); }
  set('hc-comportamiento-dolor', hc.comportamiento_dolor);
  if (hc.tipos_dolor) {
    hc.tipos_dolor.forEach(v => {
      const cb = document.querySelector(`input[name="tipo-dolor"][value="${v}"]`);
      if (cb) cb.checked = true;
    });
  }

  // Módulo 5
  set('hc-diagnostico', hc.diagnostico);
  set('hc-objetivos', hc.objetivos);

  if (hc.fec_nac) calcularEdad();
}

// ── Módulo 1: Fecha → Edad automática ──
document.getElementById('hc-fec-nac').addEventListener('change', calcularEdad);
function calcularEdad() {
  const edad = Utils.calcularEdad(document.getElementById('hc-fec-nac').value);
  document.getElementById('hc-edad').value = edad || '';
}

// EPS "Otro"
document.getElementById('hc-eps').addEventListener('change', function() {
  document.getElementById('eps-otro-group').style.display = this.value === 'Otro' ? 'block' : 'none';
});

// Ciudad "Otro"
document.getElementById('hc-ciudad').addEventListener('change', function() {
  document.getElementById('ciudad-otro-group').style.display = this.value === 'Otro' ? 'block' : 'none';
});

// ── Módulo 1: Referidos ──
document.getElementById('hc-num-referidos').addEventListener('input', actualizarReferidos);

function actualizarReferidos() {
  const n = parseInt(document.getElementById('hc-num-referidos').value) || 0;
  const dots = document.querySelectorAll('.referido-dot');
  dots.forEach((d, i) => d.classList.toggle('filled', i < n));
  document.getElementById('referidos-label').textContent = `${n} de 5 referidos`;
  const alertEl = document.getElementById('referidos-alert');
  if (n >= 5) {
    alertEl.classList.remove('hidden');
  } else {
    alertEl.classList.add('hidden');
  }
}

// ══════════════════════════════════════════
// MÓDULO 3 — Semáforos automáticos
// ══════════════════════════════════════════

/** Semáforo genérico: devuelve { badgeClass, label } */
function semaforo(badgeClass, label) { return { badgeClass, label }; }

/** Tensión Arterial */
function calcularTA() {
  const sis = parseInt(document.getElementById('vs-sistolica').value);
  const dia = parseInt(document.getElementById('vs-diastolica').value);
  const badge = document.getElementById('badge-ta');
  const alertBadge = document.getElementById('alerta-ta');

  if (!sis || !dia) {
    badge.className = 'badge badge-neutral';
    badge.textContent = '—';
    alertBadge.className = 'badge badge-neutral';
    alertBadge.textContent = '📊 TA: —';
    return;
  }

  let cls, lbl;
  if (sis < 90 || dia < 60) {
    cls = 'badge-info'; lbl = '🔵 Hipotensión';
  } else if (sis <= 120 && dia <= 80) {
    cls = 'badge-ok'; lbl = '✅ Normal';
  } else if (sis >= 120 && sis <= 129 && dia < 80) {
    cls = 'badge-warn'; lbl = '⚠️ Elevada';
  } else if ((sis >= 130 && sis <= 139) || (dia >= 80 && dia <= 89)) {
    cls = 'badge-orange'; lbl = '🟠 HTA Etapa 1';
  } else {
    cls = 'badge-danger'; lbl = '🔴 HTA Etapa 2';
  }

  badge.className = `badge ${cls}`;
  badge.textContent = `${sis}/${dia} — ${lbl}`;
  alertBadge.className = `badge ${cls}`;
  alertBadge.textContent = `📊 TA: ${sis}/${dia}`;
}

/** Frecuencia Cardíaca */
function calcularFC() {
  const fc = parseInt(document.getElementById('vs-fc').value);
  const badge = document.getElementById('badge-fc');
  const alertBadge = document.getElementById('alerta-fc');
  if (!fc) {
    badge.className = 'badge badge-neutral'; badge.textContent = '—';
    alertBadge.className = 'badge badge-neutral'; alertBadge.textContent = '❤️ FC: —';
    return;
  }
  let cls, lbl;
  if (fc < 60)       { cls = 'badge-info';   lbl = `${fc} bpm — Bradicardia`; }
  else if (fc <= 100) { cls = 'badge-ok';     lbl = `${fc} bpm — Normal`; }
  else               { cls = 'badge-danger';  lbl = `${fc} bpm — Taquicardia`; }
  badge.className = `badge ${cls}`; badge.textContent = lbl;
  alertBadge.className = `badge ${cls}`; alertBadge.textContent = `❤️ ${fc} bpm`;
}

/** Frecuencia Respiratoria */
function calcularFR() {
  const fr = parseInt(document.getElementById('vs-fr').value);
  const badge = document.getElementById('badge-fr');
  if (!fr) { badge.className = 'badge badge-neutral'; badge.textContent = '—'; return; }
  let cls, lbl;
  if (fr < 12)       { cls = 'badge-warn';   lbl = `${fr} rpm — Bradipnea`; }
  else if (fr <= 20) { cls = 'badge-ok';     lbl = `${fr} rpm — Eupnea`; }
  else               { cls = 'badge-danger'; lbl = `${fr} rpm — Taquipnea`; }
  badge.className = `badge ${cls}`; badge.textContent = lbl;
}

/** SpO2 */
function calcularSpO2() {
  const spo2 = parseInt(document.getElementById('vs-spo2').value);
  const badge = document.getElementById('badge-spo2');
  const alertBadge = document.getElementById('alerta-spo2');
  if (!spo2) {
    badge.className = 'badge badge-neutral'; badge.textContent = '—';
    alertBadge.className = 'badge badge-neutral'; alertBadge.textContent = '🌡️ SpO2: —';
    return;
  }
  let cls, lbl;
  if (spo2 >= 95)        { cls = 'badge-ok';       lbl = `${spo2}% — Normal`; }
  else if (spo2 >= 90)   { cls = 'badge-warn';     lbl = `${spo2}% — Hipoxia Leve`; }
  else                   { cls = 'badge-danger';   lbl = `${spo2}% — Hipoxia Severa`; }
  badge.className = `badge ${cls}`; badge.textContent = lbl;
  alertBadge.className = `badge ${cls}`; alertBadge.textContent = `🌡️ ${spo2}%`;
}

/** IMC */
function calcularIMC() {
  const peso  = parseFloat(document.getElementById('vs-peso').value);
  const talla = parseFloat(document.getElementById('vs-talla').value);
  const badge = document.getElementById('badge-imc');
  const imcVal = document.getElementById('imc-valor');
  const alertBadge = document.getElementById('alerta-imc');

  if (!peso || !talla) {
    badge.className = 'badge badge-neutral'; badge.textContent = '—';
    imcVal.textContent = '—';
    alertBadge.className = 'badge badge-neutral'; alertBadge.textContent = '⚖️ IMC: —';
    return;
  }
  const imc = Utils.calcularIMC(peso, talla);
  imcVal.textContent = imc;
  let cls, lbl;
  if (imc < 18.5)      { cls = 'badge-info';   lbl = `${imc} — Bajo Peso`; }
  else if (imc < 25)   { cls = 'badge-ok';     lbl = `${imc} — Normal`; }
  else if (imc < 30)   { cls = 'badge-warn';   lbl = `${imc} — Sobrepeso`; }
  else                 { cls = 'badge-danger'; lbl = `${imc} — Obesidad`; }
  badge.className = `badge ${cls}`; badge.textContent = lbl;
  alertBadge.className = `badge ${cls}`; alertBadge.textContent = `⚖️ IMC: ${imc}`;
}

// Event listeners signos vitales
['vs-sistolica','vs-diastolica'].forEach(id => document.getElementById(id)?.addEventListener('input', calcularTA));
document.getElementById('vs-fc')?.addEventListener('input', calcularFC);
document.getElementById('vs-fr')?.addEventListener('input', calcularFR);
document.getElementById('vs-spo2')?.addEventListener('input', calcularSpO2);
['vs-peso','vs-talla'].forEach(id => document.getElementById(id)?.addEventListener('input', calcularIMC));

// ══════════════════════════════════════════
// MÓDULO 4 — EVA Slider
// ══════════════════════════════════════════
const EVA_LABELS = [
  { max:0,  cls:'badge-ok',       label:'😊 Sin dolor',     color:'#00C9A7' },
  { max:3,  cls:'badge-ok',       label:'🙂 Leve',          color:'#00C9A7' },
  { max:6,  cls:'badge-warn',     label:'😐 Moderado',      color:'#F59E0B' },
  { max:9,  cls:'badge-danger',   label:'😣 Severo',        color:'#EF4444' },
  { max:10, cls:'badge-critical', label:'😭 Inaguantable',  color:'#A855F7' },
];

function actualizarEVA() {
  const val = parseInt(document.getElementById('eva-slider').value);
  const score = document.getElementById('eva-score');
  const label = document.getElementById('eva-label');
  const alertBadge = document.getElementById('alerta-eva');

  const tier = EVA_LABELS.find(t => val <= t.max) || EVA_LABELS[EVA_LABELS.length - 1];

  score.textContent = val;
  score.style.color = tier.color;
  label.className = `eva-label badge ${tier.cls}`;
  label.textContent = tier.label;

  // Thumb color
  document.getElementById('eva-slider').style.setProperty('--thumb-color', tier.color);

  alertBadge.className = `badge ${tier.cls}`;
  alertBadge.textContent = `🔴 EVA: ${val}/10`;
}

document.getElementById('eva-slider')?.addEventListener('input', actualizarEVA);

// ══════════════════════════════════════════
// Navegación lateral de la HC
// ══════════════════════════════════════════
const navItems = document.querySelectorAll('.hc-nav-item');
const sections = document.querySelectorAll('.hc-section');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navItems.forEach(ni => {
        ni.classList.toggle('active', ni.dataset.target === e.target.id);
      });
    }
  });
}, { threshold: 0.4, rootMargin: '-80px 0px -60% 0px' });

sections.forEach(s => sectionObserver.observe(s));

navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById(item.dataset.target);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// ══════════════════════════════════════════
// Guardar Historia Clínica
// ══════════════════════════════════════════
function recolectarDatos() {
  const antecedentes = [...document.querySelectorAll('input[name="antecedente"]:checked')].map(c => c.value);
  const tipos_dolor  = [...document.querySelectorAll('input[name="tipo-dolor"]:checked')].map(c => c.value);

  return {
    // Módulo 1
    nombre:          document.getElementById('hc-nombre').value.trim(),
    tipo_doc:        document.getElementById('hc-tipo-doc').value,
    num_doc:         document.getElementById('hc-num-doc').value.trim(),
    fec_nac:         document.getElementById('hc-fec-nac').value,
    edad:            document.getElementById('hc-edad').value,
    genero:          document.getElementById('hc-genero').value,
    telefono:        document.getElementById('hc-tel').value.trim(),
    email:           document.getElementById('hc-email').value.trim(),
    eps:             document.getElementById('hc-eps').value,
    eps_otro:        document.getElementById('hc-eps-otro').value.trim(),
    ciudad:          document.getElementById('hc-ciudad').value,
    ciudad_otro:     document.getElementById('hc-ciudad-otro').value.trim(),
    ocupacion:       document.getElementById('hc-ocupacion').value,
    emerg_nombre:    document.getElementById('hc-emerg-nombre').value.trim(),
    emerg_parentesco:document.getElementById('hc-emerg-parentesco').value.trim(),
    emerg_tel:       document.getElementById('hc-emerg-tel').value.trim(),
    referido_por:    document.getElementById('hc-referido-por').value.trim(),
    num_referidos:   parseInt(document.getElementById('hc-num-referidos').value) || 0,
    // Módulo 2
    motivo_principal:document.getElementById('hc-motivo-principal').value,
    motivo_desc:     document.getElementById('hc-motivo-desc').value.trim(),
    evolucion:       document.getElementById('hc-evolucion').value.trim(),
    antecedentes,
    otros_antecedentes: document.getElementById('hc-otros-antecedentes').value.trim(),
    // Módulo 3
    sistolica:  document.getElementById('vs-sistolica').value,
    diastolica: document.getElementById('vs-diastolica').value,
    fc:         document.getElementById('vs-fc').value,
    fr:         document.getElementById('vs-fr').value,
    spo2:       document.getElementById('vs-spo2').value,
    peso:       document.getElementById('vs-peso').value,
    talla:      document.getElementById('vs-talla').value,
    imc:        document.getElementById('imc-valor').textContent,
    // Módulo 4
    eva:                parseInt(document.getElementById('eva-slider').value),
    tipos_dolor,
    comportamiento_dolor: document.getElementById('hc-comportamiento-dolor').value,
    // Módulo 5
    diagnostico: document.getElementById('hc-diagnostico').value.trim(),
    objetivos:   document.getElementById('hc-objetivos').value.trim(),
    // Meta
    fecha_hc: new Date().toISOString(),
  };
}

async function guardarHC() {
  const btn = document.getElementById('btn-guardar-hc');
  const btn2 = document.getElementById('btn-guardar-hc-2');
  Utils.setLoading(btn, true);
  if (btn2) Utils.setLoading(btn2, true);

  const datos = recolectarDatos();

  if (!datos.nombre) {
    Toast.warning('El nombre del paciente es requerido (Módulo 1).');
    Utils.setLoading(btn, false);
    if (btn2) Utils.setLoading(btn2, false);
    document.getElementById('mod-1').scrollIntoView({ behavior: 'smooth' });
    return;
  }

  try {
    const payload = {
      nombre:        datos.nombre,
      telefono:      datos.telefono || undefined,
      email:         datos.email    || undefined,
      notas_medicas: JSON.stringify(datos),
    };

    if (clienteId) {
      await ClientesAPI.update(clienteId, payload);
    } else {
      const res = await ClientesAPI.create(payload);
      // Actualizar URL sin recargar
      const newId = res?.cliente?.id;
      if (newId) {
        history.replaceState({}, '', `?id=${newId}`);
        document.getElementById('paciente-breadcrumb').textContent = datos.nombre;
      }
    }
    Toast.success('Historia clínica guardada correctamente. ✅');
  } catch (e) {
    // Demo: guardar en localStorage
    const key = `hc_${datos.nombre}_${Date.now()}`;
    localStorage.setItem(key, JSON.stringify(datos));
    Toast.success('Historia clínica guardada en modo demo. ✅');
    console.warn('Backend no disponible, guardado en localStorage:', key);
  } finally {
    Utils.setLoading(btn, false);
    if (btn2) Utils.setLoading(btn2, false);
  }
}

document.getElementById('btn-guardar-hc')?.addEventListener('click', guardarHC);
document.getElementById('btn-guardar-hc-2')?.addEventListener('click', guardarHC);

// Inicializar valores visuales
actualizarEVA();
actualizarReferidos();
