// Registro de SearchMatch en React: la misma pantalla completa y tarjeta que el inicio de sesión.
// Después de crear la cuenta: si hay que confirmar el correo, se avisa; si no, entra directo al onboarding.
// Las piezas compartidas con el inicio de sesión están en sitio.js.
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client?deps=react@18.3.1';
import {
  html, useState, useEffect, useRef, ENLACE, Icono, BotonPrincipal,
  FORMATO_CORREO, ERROR_CORREO, usaMenosMovimiento, enviarFormulario, Aviso, CampoIcono, BotonVerContrasena,
  SeparadorGoogle, PantallaAcceso
} from './sitio.js';

const RAIZ = document.getElementById('registro');
const HOY = RAIZ.dataset.hoy;
const CONTRASENA_MIN = 8;
const CONTRASENA_MAX = 72;

// Celular chileno: 9 dígitos que empiezan con 9 (acepta "+56 9 1234 5678", "912345678", etc.)
const celularValido = (texto) => /^9\d{8}$/.test(texto.replace(/\D/g, '').replace(/^56/, ''));

// Revisión rápida en el navegador; el servidor vuelve a validar todo
function validar(d) {
  const errores = {};
  const correo = d.correo.trim().toLowerCase();
  const secundario = d.correo_secundario.trim().toLowerCase();
  if (!FORMATO_CORREO.test(correo)) errores.correo = ERROR_CORREO;
  if (secundario) {
    if (!FORMATO_CORREO.test(secundario)) errores.correo_secundario = 'El correo secundario no es válido.';
    else if (secundario === correo) errores.correo_secundario = 'Debe ser distinto al correo principal.';
  }
  if (!celularValido(d.telefono)) errores.telefono = 'Ingresa un celular chileno válido (ej. 9 1234 5678).';
  if (!d.fecha_nacimiento || d.fecha_nacimiento > HOY) errores.fecha_nacimiento = 'Ingresa una fecha de nacimiento válida.';
  if (d.contrasena.length < CONTRASENA_MIN || d.contrasena.length > CONTRASENA_MAX) {
    errores.contrasena = `Entre ${CONTRASENA_MIN} y ${CONTRASENA_MAX} caracteres.`;
  } else if (d.contrasena !== d.confirmar) {
    errores.confirmar = 'Las contraseñas no coinciden.';
  }
  if (!d.terminos) errores.terminos = 'Debes aceptar los Términos y la Política de Privacidad.';
  return errores;
}

// ===================== VISTAS DE LA TARJETA =====================

function VistaFormulario({ onCreada }) {
  const [datos, setDatos] = useState({
    correo: '', correo_secundario: '', telefono: '', fecha_nacimiento: '', contrasena: '', confirmar: '', terminos: false
  });
  const [ver, setVer] = useState({ contrasena: false, confirmar: false });
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState(RAIZ.dataset.error || null);
  const [enviando, setEnviando] = useState(false);
  const primerCampo = useRef(null);

  useEffect(() => { primerCampo.current && primerCampo.current.focus({ preventScroll: true }); }, []);

  // Al escribir, se borra el error de ese campo
  const cambiar = (e) => {
    const { name, value, type, checked } = e.target;
    setDatos((d) => ({ ...d, [name]: type === 'checkbox' ? checked : value }));
    setErrores((x) => ({ ...x, [name]: undefined }));
  };

  async function enviar(e) {
    e.preventDefault();
    if (enviando) return;

    const nuevos = validar(datos);
    setErrores(nuevos);
    setMensaje(null);
    if (Object.keys(nuevos).length > 0) return;

    setEnviando(true);
    try {
      const resultado = await enviarFormulario('/register', {
        ...datos, terminos: String(datos.terminos), tipo: RAIZ.dataset.tipo || ''
      });
      if (!resultado) return;
      if (resultado.ok) {
        onCreada(resultado, datos.correo.trim().toLowerCase());
        return;  // el botón sigue en "Creando cuenta…" mientras cambia la pantalla
      }
      setErrores(resultado.errores || {});
      setMensaje(resultado.mensaje || null);
      setEnviando(false);
    } catch {
      setMensaje('Sin conexión con el servidor. Inténtalo de nuevo.');
      setEnviando(false);
    }
  }

  const ojo = (campo) => html`
    <${BotonVerContrasena} visible=${ver[campo]} onCambiar=${() => setVer((v) => ({ ...v, [campo]: !v[campo] }))} />`;

  return html`
    <div>
      <p className="text-xs font-bold tracking-[0.22em] text-neon">SEARCH MATCH · REGISTRO</p>
      <h2 id="titulo-tarjeta" className="mt-3 font-display text-[28px] font-extrabold leading-tight tracking-tight sm:text-[32px]">Crea tu cuenta</h2>
      <p className="mt-1.5 text-base text-[#b3b3b3]">Regístrate para encontrar partidos y unirte a la cancha.</p>

      <form noValidate onSubmit=${enviar} className="mt-6 space-y-5">
        ${mensaje && html`<${Aviso} tipo="error">${mensaje}<//>`}

        <${CampoIcono} id="correo" label="CORREO ELECTRÓNICO" icono="mail" type="email" placeholder="tu@email.com"
          autoComplete="email" inputMode="email" value=${datos.correo} onChange=${cambiar} error=${errores.correo} inputRef=${primerCampo} />

        <${CampoIcono} id="correo_secundario" label="CORREO SECUNDARIO (OPCIONAL)" icono="alternate_email" type="email"
          placeholder="otro@email.com" inputMode="email" value=${datos.correo_secundario} onChange=${cambiar} error=${errores.correo_secundario} />

        <div className="grid gap-5 sm:grid-cols-2">
          <${CampoIcono} id="telefono" label="CELULAR / WHATSAPP" icono="smartphone" type="tel" placeholder="9 1234 5678"
            autoComplete="tel" inputMode="tel" value=${datos.telefono} onChange=${cambiar} error=${errores.telefono} />
          <${CampoIcono} id="fecha_nacimiento" label="FECHA DE NACIMIENTO" icono="cake" type="date"
            min="1900-01-01" max=${HOY} autoComplete="bday" value=${datos.fecha_nacimiento} onChange=${cambiar} error=${errores.fecha_nacimiento} />
        </div>

        <${CampoIcono} id="contrasena" label="CONTRASEÑA" icono="lock" type=${ver.contrasena ? 'text' : 'password'}
          placeholder="Crea tu contraseña" autoComplete="new-password" maxLength=${CONTRASENA_MAX}
          value=${datos.contrasena} onChange=${cambiar} error=${errores.contrasena}
          ayuda=${`Entre ${CONTRASENA_MIN} y ${CONTRASENA_MAX} caracteres.`} accion=${ojo('contrasena')} />

        <${CampoIcono} id="confirmar" label="CONFIRMA TU CONTRASEÑA" icono="lock_reset" type=${ver.confirmar ? 'text' : 'password'}
          placeholder="Repite tu contraseña" autoComplete="new-password" maxLength=${CONTRASENA_MAX}
          value=${datos.confirmar} onChange=${cambiar} error=${errores.confirmar} accion=${ojo('confirmar')} />

        <div>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-relaxed text-[#d4d4d4]">
            <input type="checkbox" name="terminos" checked=${datos.terminos} onChange=${cambiar}
              aria-invalid=${Boolean(errores.terminos)} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-[#39FF14]" />
            <span>
              Acepto los <a href="/terminos" target="_blank" className=${ENLACE}>Términos y Condiciones</a>
              ${' '}y la <a href="/privacidad" target="_blank" className=${ENLACE}>Política de Privacidad</a>
            </span>
          </label>
          ${errores.terminos && html`<p className="mt-1.5 text-xs text-red-400">${errores.terminos}</p>`}
        </div>

        <${BotonPrincipal} type="submit" cargando=${enviando} className="!h-[46px] w-full">
          ${enviando ? 'Creando cuenta…' : 'Crear cuenta'}
        <//>
      </form>

      <${SeparadorGoogle} texto="Registrarse con Google" />

      <p className="mt-7 text-center text-sm text-[#a3a3a3]">
        ¿Ya tienes cuenta?${' '}
        <a href="/login" className=${ENLACE}>Inicia sesión</a>
      </p>
    </div>`;
}

// Con la confirmación por correo activa: hay que abrir el enlace antes de iniciar sesión
function VistaConfirmar({ correo }) {
  return html`
    <div className="flex flex-col items-center py-4 text-center">
      <span className="grid h-[72px] w-[72px] animate-aparecer place-items-center rounded-full border border-neon/40 bg-neon/10 text-neon motion-reduce:animate-none">
        <${Icono} nombre="mark_email_unread" className="text-[36px]" />
      </span>
      <h2 id="titulo-tarjeta" className="mt-6 font-display text-[28px] font-extrabold leading-tight tracking-tight sm:text-[32px]">Confirma tu correo</h2>
      <p className="mt-2 max-w-sm text-base leading-relaxed text-[#b3b3b3]">
        Te enviamos un enlace a <span className="font-semibold text-white">${correo}</span>.
        Ábrelo para activar tu cuenta y luego inicia sesión.
      </p>
      <div className="mt-8">
        <${BotonPrincipal} onClick=${() => { window.location.href = '/login'; }}>Ir a iniciar sesión<//>
      </div>
    </div>`;
}

// ===================== APP =====================

function App() {
  const [correoCreado, setCorreoCreado] = useState(null);
  const [saliendo, setSaliendo] = useState(false);

  function alCrear(resultado, correo) {
    if (resultado.confirmar) {
      setCorreoCreado(correo);
      return;
    }
    // Sin confirmación: entra directo (fade + slide de salida)
    setSaliendo(true);
    setTimeout(() => { window.location.href = resultado.destino || '/onboarding'; }, usaMenosMovimiento() ? 0 : 250);
  }

  return html`
    <${PantallaAcceso} saliendo=${saliendo} ancho="max-w-[520px]">
      <div key=${correoCreado ? 'confirmar' : 'formulario'} className="animate-deslizar motion-reduce:animate-none">
        ${correoCreado
          ? html`<${VistaConfirmar} correo=${correoCreado} />`
          : html`<${VistaFormulario} onCreada=${alCrear} />`}
      </div>
    <//>`;
}

createRoot(RAIZ).render(html`<${App} />`);
