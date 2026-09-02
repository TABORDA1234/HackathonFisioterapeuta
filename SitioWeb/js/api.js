/* ===================================================
   FISIOTERAPEUTA LI — API CLIENT
   Manejo de peticiones HTTP al backend Flask
   =================================================== */

const API_BASE = 'https://fisio-backend-s25s.onrender.com/api';

/**
 * Cliente HTTP centralizado con manejo de errores y JWT
 */
const api = {
  /**
   * Cabeceras base con JWT si existe
   */
  _headers() {
    const token = localStorage.getItem('auth_token');
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  },

  /**
   * Manejo centralizado de respuesta
   */
  async _handle(response) {
    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      if (!window.location.pathname.includes('login')) {
        window.location.href = '/admin/login.html';
      }
      throw new Error('No autorizado');
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.message || `Error ${response.status}`);
    }
    return data;
  },

  async get(endpoint, params = {}) {
    const url = new URL(`${API_BASE}${endpoint}`);
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== '') {
        url.searchParams.append(k, params[k]);
      }
    });
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: this._headers(),
    });
    return this._handle(res);
  },

  async post(endpoint, body = {}) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body),
    });
    return this._handle(res);
  },

  async put(endpoint, body = {}) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: this._headers(),
      body: JSON.stringify(body),
    });
    return this._handle(res);
  },

  async delete(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: this._headers(),
    });
    return this._handle(res);
  },
};

/* ── Endpoints específicos ── */

const AuthAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
};

const ClientesAPI = {
  list: (params) => api.get('/clientes', params),
  get: (id) => api.get(`/clientes/${id}`),
  create: (data) => api.post('/clientes', data),
  update: (id, data) => api.put(`/clientes/${id}`, data),
  delete: (id) => api.delete(`/clientes/${id}`),
  citas: (id) => api.get(`/clientes/${id}/citas`),
};

const CitasAPI = {
  list: (params) => api.get('/citas', params),
  get: (id) => api.get(`/citas/${id}`),
  create: (data) => api.post('/citas', data),
  update: (id, data) => api.put(`/citas/${id}`, data),
  disponibilidad: (fecha, servicio_id) => api.get('/citas/disponibilidad', { fecha, servicio_id }),
  reservar: (data) => api.post('/citas/reservar', data),
};

const ServiciosAPI = {
  list: () => api.get('/servicios'),
};

const AdminAPI = {
  resumen: () => api.get('/admin/resumen'),
  citasHoy: () => api.get('/admin/citas-hoy'),
};

/* ── Toast system ── */
const Toast = {
  _container: null,

  init() {
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.className = 'toast-container';
      document.body.appendChild(this._container);
    }
  },

  show(message, type = 'info', duration = 4000) {
    this.init();
    const icons = { success: '✓', error: '✕', warning: '!', info: 'i' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    this._container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'fadeIn 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success: (msg) => Toast.show(msg, 'success'),
  error:   (msg) => Toast.show(msg, 'error', 6000),
  warning: (msg) => Toast.show(msg, 'warning'),
  info:    (msg) => Toast.show(msg, 'info'),
};

/* ── Utilidades generales ── */
const Utils = {
  /**
   * Formatea número como moneda colombiana
   */
  formatCOP(value) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  },

  /**
   * Formatea fecha en español
   */
  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  },

  formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  },

  /**
   * Calcula edad desde fecha de nacimiento
   */
  calcularEdad(fechaNac) {
    if (!fechaNac) return '';
    const hoy = new Date();
    const nac = new Date(fechaNac);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  },

  /**
   * Calcula IMC
   */
  calcularIMC(peso, tallaCm) {
    if (!peso || !tallaCm) return null;
    const tallaM = tallaCm / 100;
    return parseFloat((peso / (tallaM * tallaM)).toFixed(1));
  },

  /**
   * Iniciales de un nombre
   */
  iniciales(nombre) {
    if (!nombre) return '?';
    return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  },

  /**
   * Debounce
   */
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  /**
   * Muestra / oculta spinner de carga
   */
  setLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      btn.dataset.originalText = btn.innerHTML;
      btn.innerHTML = '<span class="btn-spinner"></span>';
      btn.disabled = true;
      btn.classList.add('btn-loading');
    } else {
      btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
      btn.disabled = false;
      btn.classList.remove('btn-loading');
    }
  },
};

// Exponer globalmente
window.api = api;
window.AuthAPI = AuthAPI;
window.ClientesAPI = ClientesAPI;
window.CitasAPI = CitasAPI;
window.ServiciosAPI = ServiciosAPI;
window.AdminAPI = AdminAPI;
window.Toast = Toast;
window.Utils = Utils;
