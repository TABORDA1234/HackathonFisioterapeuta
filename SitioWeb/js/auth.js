/* ===================================================
   FISIOTERAPEUTA LI — AUTENTICACIÓN
   Manejo de sesión JWT y guards de rutas admin
   =================================================== */

const Auth = {
  TOKEN_KEY: 'auth_token',
  USER_KEY:  'auth_user',

  /** Guarda token y datos de usuario */
  setSession(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  /** Limpia sesión */
  clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  /** Devuelve el token actual */
  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  /** Devuelve los datos del usuario autenticado */
  getUser() {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /** ¿Hay sesión activa? (verificación básica de presencia de token) */
  isLoggedIn() {
    const token = this.getToken();
    if (!token) return false;
    // Verificar expiración del JWT (payload.exp)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        this.clearSession();
        return false;
      }
    } catch {
      // Si no se puede parsear, asumir válido y dejar que el server valide
    }
    return true;
  },

  /**
   * Guard para páginas admin: si no hay sesión, redirige a login.
   * Llamar al inicio de cada página admin.
   */
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '/admin/login.html';
      return false;
    }
    return true;
  },

  /**
   * Guard para login: si ya hay sesión, redirige al dashboard.
   */
  redirectIfLoggedIn() {
    if (this.isLoggedIn()) {
      window.location.href = '/admin/dashboard.html';
    }
  },

  /** Cierra sesión y redirige */
  logout() {
    this.clearSession();
    window.location.href = '/admin/login.html';
  },

  /**
   * Rellena el nombre de usuario en la UI del sidebar
   */
  fillUserInfo() {
    const user = this.getUser();
    if (!user) return;
    const nameEl  = document.getElementById('sidebar-user-name');
    const roleEl  = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-avatar');
    if (nameEl) nameEl.textContent = user.nombre || user.username || 'Admin';
    if (roleEl) roleEl.textContent = user.rol || 'Administrador';
    if (avatarEl) avatarEl.textContent = Utils.iniciales(user.nombre || user.username || 'A');
  },
};

window.Auth = Auth;
