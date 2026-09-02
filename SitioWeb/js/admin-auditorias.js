document.addEventListener("DOMContentLoaded", () => {
  AuthAPI.me().catch(() => {}); // Validar JWT

  const tabla = document.querySelector("#tabla-logs tbody");
  
  let currentPage = 1;
  let totalPages = 1;

  async function cargarLogs(page = 1) {
    const accion = document.getElementById("filter-accion").value.trim();
    const origen = document.getElementById("filter-origen").value;
    
    const params = { page, per_page: 20 };
    if (accion) params.accion = accion;
    if (origen) params.origen = origen;

    try {
      const res = await AdminAPI.logs(params);
      renderLogs(res.logs);
      
      currentPage = res.pagina;
      totalPages = res.paginas;
      
      document.getElementById("log-pagination-info").innerText = `Mostrando página ${currentPage} de ${totalPages || 1}`;
      document.getElementById("btn-prev").disabled = currentPage <= 1;
      document.getElementById("btn-next").disabled = currentPage >= totalPages;
    } catch (e) {
      Toast.error("Error al cargar historial de auditorías");
    }
  }

  function renderLogs(logs) {
    if (logs.length === 0) {
      tabla.innerHTML = '<tr><td colspan="6" class="text-center">No hay registros que coincidan con la búsqueda</td></tr>';
      return;
    }
    
    tabla.innerHTML = logs.map(l => {
      // Icono según origen
      let icon = '⚙️';
      if(l.origen === 'telegram') icon = '✈️';
      else if(l.origen === 'web_admin') icon = '🛡️';
      else if(l.origen === 'n8n') icon = '🤖';
      
      // Color según acción
      let colorClass = 'text-light';
      if(l.accion.startsWith('crear')) colorClass = 'text-blue';
      else if(l.accion.startsWith('eliminar') || l.accion.startsWith('cancelar')) colorClass = 'text-red';
      else if(l.accion.startsWith('actualizar') || l.accion.startsWith('confirmar')) colorClass = 'text-green';

      return `
      <tr>
        <td style="white-space:nowrap">${Utils.formatDate(l.timestamp)} <br><small class="text-light">${Utils.formatTime(l.timestamp)}</small></td>
        <td>${l.usuario ? `👤 ${l.usuario}` : '-'}</td>
        <td class="${colorClass}"><strong>${l.accion}</strong></td>
        <td>${l.entidad} <br><small class="text-light">ID: ${l.entidad_id}</small></td>
        <td>${icon} ${l.origen || 'Sistema'}</td>
        <td>${l.detalle || '-'}</td>
      </tr>
    `}).join('');
  }

  document.getElementById("btn-filtrar").addEventListener("click", () => cargarLogs(1));
  document.getElementById("btn-refresh").addEventListener("click", () => {
    document.getElementById("filter-accion").value = "";
    document.getElementById("filter-origen").value = "";
    cargarLogs(1);
  });
  
  document.getElementById("btn-prev").addEventListener("click", () => {
    if (currentPage > 1) cargarLogs(currentPage - 1);
  });
  
  document.getElementById("btn-next").addEventListener("click", () => {
    if (currentPage < totalPages) cargarLogs(currentPage + 1);
  });

  cargarLogs(1);
});
