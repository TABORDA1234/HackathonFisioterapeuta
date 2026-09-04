document.addEventListener("DOMContentLoaded", () => {
  AuthAPI.me().catch(() => { }); // Validar JWT

  const tabla = document.querySelector("#tabla-usuarios tbody");
  const modal = document.getElementById("modal-usuario");

  let currentEditId = null;

  // ===================================================
  // Carga principal
  // ===================================================
  async function cargarUsuarios() {
    try {
      const res = await UsuariosAPI.list();
      const usuarios = res.usuarios || res;
      renderUsuarios(usuarios);
      renderKPIs(usuarios);
    } catch (e) {
      Toast.error("Error al cargar administradores");
    }
  }

  function roleBadgeHTML(rol) {
    if (rol === 'superadmin') {
      return `<span class="role-badge role-superadmin">⭐ SuperAdmin</span>`;
    }
    return `<span class="role-badge role-admin">🛡️ Admin</span>`;
  }

  function renderUsuarios(usuarios) {
    if (usuarios.length === 0) {
      tabla.innerHTML = '<tr><td colspan="7" class="text-center">No hay administradores registrados</td></tr>';
      return;
    }

    tabla.innerHTML = usuarios.map(u => `
      <tr>
        <td>#${u.id}</td>
        <td><strong>${u.username}</strong></td>
        <td>${u.email}</td>
        <td>${roleBadgeHTML(u.rol)}</td>
        <td>
          <span class="badge ${u.activo ? 'badge-ok' : 'badge-danger'}">
            ${u.activo ? 'Activo' : 'Bloqueado'}
          </span>
        </td>
        <td>${Utils.formatDate(u.created_at)}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="editarUsuario(${u.id})" title="Editar">✏️</button>
          <button class="btn btn-ghost btn-sm text-red" onclick="eliminarUsuario(${u.id})" title="Eliminar">🗑️</button>
        </td>
      </tr>
    `).join('');
  }

  // ===================================================
  // KPIs
  // ===================================================
  function renderKPIs(usuarios) {
    const total = usuarios.length;
    const activos = usuarios.filter(u => u.activo).length;
    const superadmins = usuarios.filter(u => u.rol === 'superadmin').length;
    const bloqueados = total - activos;

    setText('kpi-total-admins', total);
    setText('kpi-admins-activos', activos);
    setText('kpi-superadmins', superadmins);
    setText('kpi-admins-bloqueados', bloqueados);
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  // ===================================================
  // Actividad reciente — reutiliza AdminAPI.logs() (mismo
  // endpoint que ya usa auditorias.html), solo pide 5.
  // ===================================================
  async function cargarActividadReciente() {
    const container = document.getElementById('actividad-reciente');
    if (!container) return;

    try {
      const res = await AdminAPI.logs({ page: 1, per_page: 5 });
      renderActividadReciente(res.logs || []);
    } catch (e) {
      container.innerHTML = `
        <div class="empty-state" style="padding:var(--space-lg);">
          <div class="empty-state-title">No se pudo cargar la actividad reciente</div>
        </div>`;
    }
  }

  function renderActividadReciente(logs) {
    const container = document.getElementById('actividad-reciente');
    if (!container) return;

    if (!logs.length) {
      container.innerHTML = `
        <div class="empty-state" style="padding:var(--space-lg);">
          <div class="empty-state-title">Sin actividad registrada todavía</div>
        </div>`;
      return;
    }

    container.innerHTML = logs.map(l => {
      let icon = '⚙️';
      if (l.origen === 'telegram') icon = '✈️';
      else if (l.origen === 'web_admin') icon = '🛡️';
      else if (l.origen === 'n8n') icon = '🤖';

      return `
        <div class="activity-row">
          <div class="activity-icon">${icon}</div>
          <div class="activity-body">
            <div class="activity-action">${l.accion}${l.entidad ? ` · ${l.entidad}` : ''}</div>
            <div class="activity-meta">${l.usuario ? `👤 ${l.usuario}` : 'Sistema'}</div>
          </div>
          <div class="activity-time">${Utils.formatDate(l.timestamp)} · ${Utils.formatTime(l.timestamp)}</div>
        </div>`;
    }).join('');
  }

  // ===================================================
  // MODAL LOGIC (sin cambios respecto a tu versión original)
  // ===================================================
  const btnNuevo = document.getElementById("btn-nuevo-usuario");
  const btnCerrar = document.getElementById("btn-cerrar-modal-usuario");
  const btnCancelar = document.getElementById("btn-cancelar-usuario");
  const btnGuardar = document.getElementById("btn-guardar-usuario");

  btnNuevo.addEventListener("click", () => {
    currentEditId = null;
    document.getElementById("form-usuario").reset();
    document.getElementById("modal-title-usuario").innerText = "Nuevo Administrador";
    document.getElementById("u_pass_hint").style.display = "none";
    document.getElementById("u_password").required = true;
    modal.style.display = "flex";
  });

  const cerrarModal = () => { modal.style.display = "none"; };
  btnCerrar.addEventListener("click", cerrarModal);
  btnCancelar.addEventListener("click", cerrarModal);

  window.editarUsuario = async (id) => {
    try {
      const res = await UsuariosAPI.list();
      const usuarios = res.usuarios || res;
      const u = usuarios.find(x => x.id === id);
      if (!u) return;

      currentEditId = id;
      document.getElementById("modal-title-usuario").innerText = "Editar Administrador";
      document.getElementById("u_pass_hint").style.display = "inline";
      document.getElementById("u_password").required = false;
      document.getElementById("u_password").value = "";

      document.getElementById("u_username").value = u.username;
      document.getElementById("u_email").value = u.email;
      document.getElementById("u_rol").value = u.rol;
      document.getElementById("u_activo").checked = u.activo;

      modal.style.display = "flex";
    } catch (e) {
      Toast.error("No se pudo cargar el usuario");
    }
  };

  btnGuardar.addEventListener("click", async () => {
    const username = document.getElementById("u_username").value;
    const email = document.getElementById("u_email").value;
    const password = document.getElementById("u_password").value;

    if (!username || !email) {
      Toast.warning("Llena los campos obligatorios");
      return;
    }

    if (!currentEditId && !password) {
      Toast.warning("Debes asignar una contraseña al nuevo usuario");
      return;
    }

    const payload = {
      username,
      email,
      rol: document.getElementById("u_rol").value,
      activo: document.getElementById("u_activo").checked
    };

    if (password) payload.password = password;

    Utils.setLoading(btnGuardar, true);
    try {
      if (currentEditId) {
        await UsuariosAPI.update(currentEditId, payload);
        Toast.success("Administrador actualizado");
      } else {
        await UsuariosAPI.create(payload);
        Toast.success("Administrador creado");
      }
      cerrarModal();
      cargarUsuarios();
    } catch (e) {
      Toast.error(e.message);
    } finally {
      Utils.setLoading(btnGuardar, false);
    }
  });

  window.eliminarUsuario = async (id) => {
    if (confirm("¿Estás seguro de que quieres eliminar este administrador? Perderá el acceso permanentemente.")) {
      try {
        await UsuariosAPI.delete(id);
        Toast.success("Administrador eliminado");
        cargarUsuarios();
      } catch (e) {
        Toast.error(e.message);
      }
    }
  };

  cargarUsuarios();
  cargarActividadReciente();
});