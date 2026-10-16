// El enlace del correo de Supabase trae los tokens después del "#":
//   /reset-password#access_token=...&refresh_token=...&type=recovery
// Esa parte de la URL nunca llega al servidor, así que la copiamos a los campos ocultos
(function () {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const form = document.getElementById('form-auth');
  const alerta = document.getElementById('error-reset');
  const campoAccess = document.getElementById('access_token');
  const campoRefresh = document.getElementById('refresh_token');

  // Sacamos los tokens de la barra de direcciones (no deben quedar en el historial)
  if (window.location.hash) {
    history.replaceState(null, '', window.location.pathname);
  }

  if (params.get('access_token') && params.get('refresh_token')) {
    campoAccess.value = params.get('access_token');
    campoRefresh.value = params.get('refresh_token');
    return;
  }

  // El servidor ya devolvió los tokens (hubo un error con la contraseña), o ya ocultó el formulario
  if (campoAccess.value || form.hidden) return;

  // Sin tokens: el enlace expiró, ya se usó, o se abrió la página directamente
  alerta.textContent = params.get('error_description')
    ? 'El enlace no es válido o ya expiró. Pide uno nuevo.'
    : 'Abre esta página desde el enlace que te enviamos por correo.';
  alerta.hidden = false;
  form.hidden = true;
})();
