document.addEventListener("DOMContentLoaded", () => {
  AuthAPI.me().catch(() => {}); // Validar JWT

  const tabla = document.querySelector("#tabla-servicios tbody");
  const modal = document.getElementById("modal-servicio");
  
  let currentEditId = null;

  async function cargarServicios() {
    try {
      const res = await ServiciosAPI.list();
      const servicios = res.servicios || res;
      renderServicios(servicios);
    } catch (e) {
      Toast.error("Error al cargar servicios");
    }
  }

  function renderServicios(servicios) {
    if (servicios.length === 0) {
      tabla.innerHTML = '<tr><td colspan="7" class="text-center">No hay servicios registrados</td></tr>';
      return;
    }
    
    tabla.innerHTML = servicios.map(s => `
      <tr>
        <td>#${s.id}</td>
        <td><strong>${s.nombre}</strong></td>
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
    `).join('');
  }

  // MODAL LOGIC
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
      if(!s) return;
      
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
    
    if(!nombre || !precio || !duracion) {
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
      if(currentEditId) {
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
    if(confirm("¿Estás seguro de que quieres eliminar este servicio? No podrás recuperarlo.")) {
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
