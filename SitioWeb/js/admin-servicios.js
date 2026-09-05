document.addEventListener("DOMContentLoaded", () => {
  AuthAPI.me().catch(() => { }); // Validar JWT

  const tabla = document.querySelector("#tabla-servicios tbody");
  const modal = document.getElementById("modal-servicio");

  let currentEditId = null;

  // ===================================================
  // Categorización automática (sin tocar el backend)
  // Toma el nombre del servicio y detecta la categoría por
  // el prefijo antes de " — ". Si no hay guion, va a "Especiales".
  // ===================================================
  const CATEGORY_PALETTE = ['#0f766e', '#2f6f8f', '#c28a36', '#7a5b43', '#b45c4d', '#4a7c59'];

  function getCategoria(nombre) {
    if (!nombre) return 'Otros';
    const parts = nombre.split(' — ');
    return parts.length > 1 ? parts[0].trim() : 'Especiales';
  }

  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function getCategoriaColor(categoria) {
    return CATEGORY_PALETTE[hashString(categoria) % CATEGORY_PALETTE.length];
  }

  function categoryBadgeHTML(categoria) {
    const color = getCategoriaColor(categoria);
    return `
      <span class="category-badge" style="background:${color}1f;color:${color};">
        <span class="category-dot" style="background:${color};"></span>
        ${categoria}
      </span>`;
  }

  // ===================================================
  // Carga principal
  // ===================================================
  async function cargarServicios() {
    try {
      const res = await ServiciosAPI.list();
      const servicios = res.servicios || res;
      renderServicios(servicios);
      renderKPIs(servicios);
      renderCategoriaDonut(servicios);
      renderDestacados(servicios);
    } catch (e) {
      Toast.error("Error al cargar servicios");
    }
  }

  function renderServicios(servicios) {
    if (servicios.length === 0) {
      tabla.innerHTML = '<tr><td colspan="8" class="text-center">No hay servicios registrados</td></tr>';
      return;
    }

    tabla.innerHTML = servicios.map(s => {
      const categoria = getCategoria(s.nombre);
      return `
      <tr>
        <td>#${s.id}</td>
        <td><strong>${s.nombre}</strong></td>
        <td>${categoryBadgeHTML(categoria)}</td>
        <td>${s.descripcion ? s.descripcion.substring(0, 30) + '...' : '-'}</td>
        <td>${Utils.formatCOP(s.precio)}</td>
        <td>${s.duracion_minutos} min</td>
        <td>
          <span class="badge ${s.activo ? 'badge-ok' : 'badge-danger'}">
            ${s.activo ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="editarServicio(${s.id})" title="Editar">✏️</button>
          <button class="btn btn-ghost btn-sm text-red" onclick="eliminarServicio(${s.id})" title="Eliminar">🗑️</button>
        </td>
      </tr>
    `;
    }).join('');
  }

  // ===================================================
  // KPIs
  // ===================================================
  function renderKPIs(servicios) {
    const total = servicios.length;
    const activos = servicios.filter(s => s.activo).length;
    const promedio = total ? servicios.reduce((sum, s) => sum + Number(s.precio || 0), 0) / total : 0;
    const categorias = new Set(servicios.map(s => getCategoria(s.nombre))).size;

    setText('kpi-total-servicios', total);
    setText('kpi-servicios-activos', activos);
    setText('kpi-precio-promedio', Utils.formatCOP(Math.round(promedio)).replace('COP', '$'));
    setText('kpi-categorias', categorias);
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  // ===================================================
  // Donut de distribución por categoría
  // ===================================================
  function renderCategoriaDonut(servicios) {
    const el = document.getElementById('categoria-donut');
    if (!el) return;

    if (!servicios.length) {
      el.innerHTML = emptyMini('Sin servicios registrados todavía.');
      return;
    }

    const counts = {};
    servicios.forEach(s => {
      const cat = getCategoria(s.nombre);
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const data = Object.entries(counts).map(([label, value]) => ({
      label,
      value,
      color: getCategoriaColor(label),
    }));

    const total = data.reduce((s, d) => s + d.value, 0);
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    const segments = data
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
      .join('');

    const legend = data
      .map((d) => {
        const pct = Math.round((d.value / total) * 100);
        return `
          <div class="donut-legend-row">
            <span class="donut-legend-swatch" style="background:${d.color}"></span>
            <span class="donut-legend-label">${d.label}</span>
            <span class="donut-legend-value">${d.value}</span>
            <span class="donut-legend-pct">${pct}%</span>
          </div>`;
      })
      .join('');

    el.innerHTML = `
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

  // ===================================================
  // Servicios destacados (más caro, más económico, más reciente)
  // ===================================================
  function renderDestacados(servicios) {
    const el = document.getElementById('servicios-destacados');
    if (!el) return;

    if (!servicios.length) {
      el.innerHTML = emptyMini('Sin servicios registrados todavía.');
      return;
    }

    const masCaro = servicios.reduce((a, b) => (Number(b.precio) > Number(a.precio) ? b : a));
    const masEconomico = servicios.reduce((a, b) => (Number(b.precio) < Number(a.precio) ? b : a));
    const activos = servicios.filter(s => s.activo).length;
    const inactivos = servicios.length - activos;

    const rows = [
      ['Más premium', `${masCaro.nombre} · ${Utils.formatCOP(masCaro.precio)}`],
      ['Más económico', `${masEconomico.nombre} · ${Utils.formatCOP(masEconomico.precio)}`],
      ['Servicios inactivos', inactivos],
    ];

    el.innerHTML = rows
      .map(([label, value]) => `
        <div>
          <span>${label}</span>
          <strong style="font-size:0.85rem;text-align:right;max-width:60%;">${value}</strong>
        </div>`)
      .join('');
  }

  function emptyMini(text) {
    return `<div style="padding:var(--space-lg) 0;text-align:center;color:var(--color-text-muted);font-size:0.85rem;">${text}</div>`;
  }

  // ===================================================
  // MODAL LOGIC (sin cambios respecto a tu versión original)
  // ===================================================
  const btnNuevo = document.getElementById("btn-nuevo-servicio");
  const btnCerrar = document.getElementById("btn-cerrar-modal-servicio");
  const btnCancelar = document.getElementById("btn-cancelar-servicio");
  const btnGuardar = document.getElementById("btn-guardar-servicio");

  btnNuevo.addEventListener("click", () => {
    currentEditId = null;
    document.getElementById("form-servicio").reset();
    document.getElementById("modal-title-servicio").innerText = "Nuevo Servicio";
    modal.style.display = "flex";
  });

  const cerrarModal = () => { modal.style.display = "none"; };
  btnCerrar.addEventListener("click", cerrarModal);
  btnCancelar.addEventListener("click", cerrarModal);

  window.editarServicio = async (id) => {
    try {
      const res = await ServiciosAPI.list();
      const servicios = res.servicios || res;
      const s = servicios.find(x => x.id === id);
      if (!s) return;

      currentEditId = id;
      document.getElementById("modal-title-servicio").innerText = "Editar Servicio";

      document.getElementById("s_nombre").value = s.nombre;
      document.getElementById("s_descripcion").value = s.descripcion || "";
      document.getElementById("s_precio").value = s.precio;
      document.getElementById("s_duracion").value = s.duracion_minutos;
      document.getElementById("s_activo").checked = s.activo;

      modal.style.display = "flex";
    } catch (e) {
      Toast.error("No se pudo cargar el servicio");
    }
  };

  btnGuardar.addEventListener("click", async () => {
    const nombre = document.getElementById("s_nombre").value;
    const precio = document.getElementById("s_precio").value;
    const duracion = document.getElementById("s_duracion").value;

    if (!nombre || !precio || !duracion) {
      Toast.warning("Llena los campos obligatorios");
      return;
    }

    const payload = {
      nombre,
      descripcion: document.getElementById("s_descripcion").value,
      precio: parseFloat(precio),
      duracion_minutos: parseInt(duracion),
      activo: document.getElementById("s_activo").checked
    };

    Utils.setLoading(btnGuardar, true);
    try {
      if (currentEditId) {
        await ServiciosAPI.update(currentEditId, payload);
        Toast.success("Servicio actualizado");
      } else {
        await ServiciosAPI.create(payload);
        Toast.success("Servicio creado");
      }
      cerrarModal();
      cargarServicios();
    } catch (e) {
      Toast.error(e.message);
    } finally {
      Utils.setLoading(btnGuardar, false);
    }
  });

  window.eliminarServicio = async (id) => {
    if (confirm("¿Estás seguro de que quieres eliminar este servicio? No podrás recuperarlo.")) {
      try {
        await ServiciosAPI.delete(id);
        Toast.success("Servicio eliminado");
        cargarServicios();
      } catch (e) {
        Toast.error(e.message);
      }
    }
  };

  cargarServicios();
});
