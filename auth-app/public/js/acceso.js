// Inicio de sesión de SearchMatch en React. Después de entrar se elige jugador o equipo (/users/entrar).
// Dentro de la misma tarjeta: iniciar sesión, recuperar contraseña y "revisa tu correo".
// Las piezas compartidas con el resto del sitio (header, footer, botones) están en sitio.js.
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client?deps=react@18.3.1';
import {
  html, useState, useEffect, useRef, FOCO, ENLACE, Icono, BotonPrincipal,
  FORMATO_CORREO, ERROR_CORREO, usaMenosMovimiento, enviarFormulario, Aviso, CampoIcono, BotonVerContrasena,
  SeparadorGoogle, PantallaAcceso
} from './sitio.js';

const RAIZ = document.getElementById('acceso');
// ===================== VISTAS DE LA TARJETA =====================

function VistaLogin({ correo, setCorreo, avisoInicial, onOlvido, onEntrar }) {
  const [contrasena, setContrasena] = useState('');
  const [verContrasena, setVerContrasena] = useState(false);
  const [recordar, setRecordar] = useState(true);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState(avisoInicial.error);
  const [enviando, setEnviando] = useState(false);
  const campoCorreo = useRef(null);

  useEffect(() => { campoCorreo.current && campoCorreo.current.focus({ preventScroll: true }); }, []);

  async function enviar(e) {
    e.preventDefault();
    if (enviando) return;

    // Validación al enviar
    const nuevos = {};
    if (!FORMATO_CORREO.test(correo.trim())) nuevos.correo = ERROR_CORREO;
    if (!contrasena) nuevos.contrasena = 'Ingresa tu contraseña.';
    setErrores(nuevos);
    setMensaje(null);
    if (Object.keys(nuevos).length > 0) return;

    setEnviando(true);
    try {
      const resultado = await enviarFormulario('/login', { correo: correo.trim(), contrasena, recordar: String(recordar) });
      if (!resultado) return;
      if (resultado.ok) {
        onEntrar(resultado.destino);
        return;  // el botón sigue en "Entrando…" mientras sale la pantalla
      }
      setErrores(resultado.errores || {});
      setMensaje(resultado.mensaje || null);
      setEnviando(false);
    } catch {
      setMensaje('Sin conexión con el servidor. Inténtalo de nuevo.');
      setEnviando(false);
    }
  }

  return html`
    <div>
      <p className="text-xs font-bold tracking-[0.22em] text-neon">SEARCH MATCH · ACCESO</p>
      <h2 id="titulo-tarjeta" className="mt-3 font-display text-[28px] font-extrabold leading-tight tracking-tight sm:text-[32px]">Inicia sesión</h2>
      <p className="mt-1.5 text-base text-[#b3b3b3]">Qué bueno verte de nuevo.</p>

      <form noValidate onSubmit=${enviar} className="mt-6 space-y-5">
        ${avisoInicial.exito && !mensaje && html`<${Aviso} tipo="exito">${avisoInicial.exito}<//>`}
        ${mensaje && html`<${Aviso} tipo="error">${mensaje}<//>`}

        <${CampoIcono} id="correo" label="CORREO ELECTRÓNICO" icono="mail" type="email" placeholder="tu@email.com"
          autoComplete="email" inputMode="email" value=${correo} inputRef=${campoCorreo} error=${errores.correo}
          onChange=${(e) => { setCorreo(e.target.value); setErrores((x) => ({ ...x, correo: undefined })); }} />

        <${CampoIcono} id="contrasena" label="CONTRASEÑA" icono="lock" type=${verContrasena ? 'text' : 'password'}
          placeholder="Tu contraseña" autoComplete="current-password" value=${contrasena} error=${errores.contrasena}
          onChange=${(e) => { setContrasena(e.target.value); setErrores((x) => ({ ...x, contrasena: undefined })); }}
          accion=${html`<${BotonVerContrasena} visible=${verContrasena} onCambiar=${() => setVerContrasena((v) => !v)} />`} />

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#d4d4d4]">
            <input type="checkbox" checked=${recordar} onChange=${(e) => setRecordar(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded accent-[#39FF14]" />
            Mantener sesión iniciada
          </label>
          <button type="button" onClick=${onOlvido} className=${`cursor-pointer text-sm ${ENLACE}`}>¿Olvidaste tu contraseña?</button>
        </div>

        <${BotonPrincipal} type="submit" cargando=${enviando} className="!h-[46px] w-full">
          ${enviando ? 'Entrando…' : 'Iniciar sesión'}
        <//>
      </form>

      <${SeparadorGoogle} texto="Continuar con Google" />

      <p className="mt-7 text-center text-sm text-[#a3a3a3]">
        ¿Aún no tienes cuenta?${' '}
        <a href="/register" className=${ENLACE}>Regístrate</a>
      </p>
    </div>`;
}

function VistaRecuperar({ correo, setCorreo, onVolver, onEnviado }) {
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const campo = useRef(null);

  useEffect(() => { campo.current && campo.current.focus({ preventScroll: true }); }, []);

  async function enviar(e) {
    e.preventDefault();
    if (enviando) return;
    if (!FORMATO_CORREO.test(correo.trim())) return setError(ERROR_CORREO);

    setError(null);
    setMensaje(null);
    setEnviando(true);
    try {
      const resultado = await enviarFormulario('/forgot-password', { correo: correo.trim() });
      if (!resultado) return;
      if (resultado.ok) return onEnviado();
      setError(resultado.errores && resultado.errores.correo);
      setMensaje(resultado.mensaje || null);
    } catch {
      setMensaje('Sin conexión con el servidor. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return html`
    <div>
      <button type="button" onClick=${onVolver}
        className=${`inline-flex cursor-pointer items-center gap-1.5 rounded text-sm font-semibold text-[#b3b3b3] transition-colors duration-150 hover:text-white ${FOCO}`}>
        <${Icono} nombre="arrow_back" className="text-[18px]" />Volver
      </button>

      <h2 id="titulo-tarjeta" className="mt-6 font-display text-[28px] font-extrabold leading-tight tracking-tight sm:text-[32px]">Recupera tu acceso</h2>
      <p className="mt-1.5 text-base text-[#b3b3b3]">Te enviaremos un enlace para crear una nueva contraseña.</p>

      <form noValidate onSubmit=${enviar} className="mt-7 space-y-5">
        ${mensaje && html`<${Aviso} tipo="error">${mensaje}<//>`}
        <${CampoIcono} id="correo-recuperar" label="CORREO ELECTRÓNICO" icono="mail" type="email" placeholder="tu@email.com"
          autoComplete="email" inputMode="email" value=${correo} inputRef=${campo} error=${error}
          onChange=${(e) => { setCorreo(e.target.value); setError(null); }} />
        <${BotonPrincipal} type="submit" cargando=${enviando} icono=${null} className="!h-[46px] w-full">
          ${enviando ? 'Enviando…' : 'Enviar enlace'}
        <//>
      </form>
    </div>`;
}

function VistaEnviado({ onVolver }) {
  return html`
    <div className="flex flex-col items-center py-4 text-center">
      <span className="grid h-[72px] w-[72px] animate-aparecer place-items-center rounded-full border border-neon/40 bg-neon/10 text-neon motion-reduce:animate-none">
        <${Icono} nombre="mark_email_read" className="text-[36px]" />
      </span>
      <h2 id="titulo-tarjeta" className="mt-6 font-display text-[28px] font-extrabold leading-tight tracking-tight sm:text-[32px]">Revisa tu correo</h2>
      <p className="mt-2 max-w-xs text-base leading-relaxed text-[#b3b3b3]">
        Si el correo está registrado, recibirás el enlace en unos minutos.
      </p>
      <div className="mt-8">
        <${BotonPrincipal} onClick=${onVolver} icono=${null}>Volver a iniciar sesión<//>
      </div>
    </div>`;
}

// ===================== APP =====================

function App() {
  const [vista, setVista] = useState('login');  // 'login' | 'recuperar' | 'enviado'
  const [direccion, setDireccion] = useState('adelante');
  const [correo, setCorreo] = useState('');
  const [saliendo, setSaliendo] = useState(false);
  // Mensajes que manda el servidor al llegar (ej. "Cuenta creada…"). Se muestran una sola vez
  const [avisoInicial, setAvisoInicial] = useState({ error: RAIZ.dataset.error || null, exito: RAIZ.dataset.exito || null });

  function irA(nueva, dir = 'adelante') {
    setDireccion(dir);
    setVista(nueva);
    setAvisoInicial({ error: null, exito: null });
  }

  // Éxito: la pantalla sale con fade + slide y luego abre la cuenta (la elección jugador / equipo)
  function entrar(destino) {
    setSaliendo(true);
    setTimeout(() => { window.location.href = destino || '/users/entrar'; }, usaMenosMovimiento() ? 0 : 250);
  }

  const animacion = `motion-reduce:animate-none ${direccion === 'atras' ? 'animate-deslizar-atras' : 'animate-deslizar'}`;

  return html`
    <${PantallaAcceso} saliendo=${saliendo}>
      <div key=${vista} className=${animacion}>
        ${vista === 'login' && html`
          <${VistaLogin} correo=${correo} setCorreo=${setCorreo}
            avisoInicial=${avisoInicial} onOlvido=${() => irA('recuperar')} onEntrar=${entrar} />`}
        ${vista === 'recuperar' && html`
          <${VistaRecuperar} correo=${correo} setCorreo=${setCorreo}
            onVolver=${() => irA('login', 'atras')} onEnviado=${() => irA('enviado')} />`}
        ${vista === 'enviado' && html`<${VistaEnviado} onVolver=${() => irA('login', 'atras')} />`}
      </div>
    <//>`;
}

createRoot(RAIZ).render(html`<${App} />`);
