// Comportamiento compartido de los formularios de acceso (login, registro y contraseña)
const form = document.getElementById('form-auth');
const boton = form.querySelector('button[type="submit"]');
const textoBoton = boton.querySelector('.btn-texto');

// Estado "cargando": deshabilita el botón para evitar envíos dobles y muestra el spinner
form.addEventListener('submit', () => {
  boton.disabled = true;
  boton.classList.add('cargando');
  textoBoton.textContent = form.dataset.textoCargando;
});

// Si el usuario vuelve con el botón "atrás", el navegador puede restaurar la página
// con el botón todavía deshabilitado: lo dejamos como al inicio
window.addEventListener('pageshow', () => {
  boton.disabled = false;
  boton.classList.remove('cargando');
  textoBoton.textContent = form.dataset.texto;
});

// Botones de ojo: muestran u ocultan la contraseña del input indicado en data-ver
document.querySelectorAll('.btn-ojo').forEach((botonOjo) => {
  const input = document.getElementById(botonOjo.dataset.ver);

  botonOjo.addEventListener('click', () => {
    const oculta = input.type === 'password';
    input.type = oculta ? 'text' : 'password';
    botonOjo.querySelector('.material-symbols-outlined').textContent = oculta ? 'visibility_off' : 'visibility';
    botonOjo.setAttribute('aria-label', oculta ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });
});
