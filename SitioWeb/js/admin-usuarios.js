document.addEventListener("DOMContentLoaded", () => {
  AuthAPI.me().catch(() => {}); // Validar JWT

  const tabla = document.querySelector("#tabla-usuarios tbody");
  const modal = document.getElementById("modal-usuario");
  
  let currentEditId = null;

  async function cargarUsuarios() {
    try {
      const res = await UsuariosAPI.list();
      const usuarios = res.usuarios || res;
      renderUsuarios(usuarios);
    } catch (e) {
      Toast.error("Error al cargar administradores");
    }
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
        <td>${u.rol === 'superadmin' ? '⭐ SuperAdmin' : '🛡️ Admin'}</td>
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

  // MODAL LOGIC
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
      if(!u) return;
      
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
    
    if(!username || !email) {
      Toast.warning("Llena los campos obligatorios");
      return;
    }

    if(!currentEditId && !password) {
      Toast.warning("Debes asignar una contraseña al nuevo usuario");
      return;
    }
    
    const payload = {
      username,
      email,
      rol: document.getElementById("u_rol").value,
      activo: document.getElementById("u_activo").checked
    };
    
    if(password) payload.password = password;
    
    Utils.setLoading(btnGuardar, true);
    try {
      if(currentEditId) {
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
    if(confirm("¿Estás seguro de que quieres eliminar este administrador? Perderá el acceso permanentemente.")) {
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
});
