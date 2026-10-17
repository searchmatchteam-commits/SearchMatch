// Flujo "Soy equipo" del registro: 1) crea tu equipo, 2) configura tu equipo, 3) confirmación.
// El equipo queda ligado a la cuenta con sesión (ese usuario es el capitán): no se pide contraseña nueva.
// El estado vive en onboarding.js (App) para que el panel de marca muestre la vista previa en vivo.
import {
  html, useState, useEffect, useRef, FOCO, ENLACE, Icono, BotonPrincipal, BotonSecundario,
  OpcionTarjeta, CampoIcono, Aviso, FORMATO_CORREO
} from './sitio.js';

// Aún no existe la página de perfil de equipo ni la de buscar rivales: cambiar estas rutas cuando estén
const RUTA_PERFIL_EQUIPO = '/users/dashboard';
const RUTA_BUSCAR_RIVALES = '/users/dashboard';

const LADO_ESCUDO = 256;  // px: el escudo se achica en el navegador antes de subirlo

export const NIVELES_EQUIPO = [
  { id: 'Principiante', detalle: 'Conociendo las reglas' },
  { id: 'Intermedio', detalle: 'Juego regular y táctica' },
  { id: 'Avanzado', detalle: 'Alta intensidad y técnica' }
];
const TIPOS_FUTBOL = [5, 7, 11];

// Estado inicial del equipo (un solo objeto para todo el flujo)
export function equipoInicial(correo = '') {
  return {
    id: null,             // se llena al crearlo (para "Editar datos")
    clubName: '',
    email: correo,        // por defecto, el correo de la cuenta del capitán
    shield: null,         // { archivo, vista } del escudo elegido; vista = URL para mostrarlo
    level: 'Intermedio',
    footballType: 11,
    zone: ''
  };
}

const sinTildes = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Lee el escudo y lo deja en un cuadrado de 256 px (sin deformarlo, con fondo transparente)
async function prepararEscudo(archivo) {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise((resolver, rechazar) => {
      const i = new Image();
      i.onload = () => resolver(i);
      i.onerror = () => rechazar(new Error('No pudimos leer la imagen del escudo.'));
      i.src = url;
    });
    const lienzo = document.createElement('canvas');
    lienzo.width = LADO_ESCUDO;
    lienzo.height = LADO_ESCUDO;
    const escala = Math.min(LADO_ESCUDO / img.naturalWidth, LADO_ESCUDO / img.naturalHeight);
    const w = img.naturalWidth * escala;
    const h = img.naturalHeight * escala;
    lienzo.getContext('2d').drawImage(img, (LADO_ESCUDO - w) / 2, (LADO_ESCUDO - h) / 2, w, h);
    const crear = (tipo) => new Promise((r) => lienzo.toBlob(r, tipo, 0.9));
    let blob = await crear('image/webp');
    if (!blob || blob.type !== 'image/webp') blob = await crear('image/png');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function enviarJson(url, opciones) {
  const r = await fetch(url, { ...opciones, headers: { Accept: 'application/json', ...opciones.headers } });
  if (r.redirected) {  // la sesión expiró: el servidor manda al login
    window.location.href = r.url;
    return null;
  }
  return r.json().catch(() => ({ ok: false, mensaje: 'Ocurrió un error. Inténtalo de nuevo.' }));
}

// ===================== PIEZAS =====================

function Escudo({ equipo, className = '' }) {
  return equipo.shield
    ? html`<img src=${equipo.shield.vista} alt="" className=${`object-contain ${className}`} />`
    : html`<${Icono} nombre="shield" relleno className=${`text-neon ${className}`} />`;
}

const resumenEquipo = (equipo) => [
  `Fútbol ${equipo.footballType}`, equipo.level, equipo.zone.trim()
].filter(Boolean).join(' · ');

// Vista previa en vivo para el panel de marca: así verán los rivales al equipo
export function VistaPreviaEquipo({ equipo }) {
  return html`
    <div className="mt-8 rounded-xl border border-white/10 bg-black/40 p-4 backdrop-blur">
      <p className="text-[11px] font-bold tracking-[0.2em] text-[#8f8f8f]">ASÍ TE VERÁN LOS RIVALES</p>
      <div className="mt-3 flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-neon/30 bg-neon/[0.06]">
          <${Escudo} equipo=${equipo} className="h-9 w-9 text-[26px]" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-extrabold">${equipo.clubName.trim() || 'Nombre del Club'}</p>
          <p className="truncate text-sm text-[#a3a3a3]">${resumenEquipo(equipo)}</p>
        </div>
      </div>
    </div>`;
}

// Zona habitual: input con autocompletado de comunas (combobox accesible: flechas, Enter y Escape)
function CampoZona({ valor, onCambiar, comunas, error, inputRef }) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const texto = sinTildes(valor.trim());
  const sugerencias = texto ? comunas.filter((c) => sinTildes(c).includes(texto)).slice(0, 6) : [];
  const visible = abierto && sugerencias.length > 0 && !(sugerencias.length === 1 && sugerencias[0] === valor);

  function elegir(comuna) {
    onCambiar(comuna);
    setAbierto(false);
  }

  function alTeclear(e) {
    if (!visible) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActivo((a) => (a + 1) % sugerencias.length); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((a) => (a - 1 + sugerencias.length) % sugerencias.length); }
    if (e.key === 'Enter') { e.preventDefault(); elegir(sugerencias[activo]); }
    if (e.key === 'Escape') setAbierto(false);
  }

  const lista = visible && html`
    <ul id="zona-opciones" role="listbox"
      className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-white/10 bg-[#1a1a1a] py-1 shadow-tarjeta">
      ${sugerencias.map((c, i) => html`
        <li key=${c} id=${`zona-opcion-${i}`} role="option" aria-selected=${i === activo}
          onMouseDown=${(e) => { e.preventDefault(); elegir(c); }} onMouseEnter=${() => setActivo(i)}
          className=${`flex cursor-pointer items-center gap-2 px-3.5 py-2 text-[15px] ${i === activo ? 'bg-neon/10 text-white' : 'text-[#d4d4d4]'}`}>
          <${Icono} nombre="location_on" className=${`text-[18px] ${i === activo ? 'text-neon' : 'text-[#6b6b6b]'}`} />${c}
        </li>`)}
    </ul>`;

  return html`
    <${CampoIcono} id="zone" label="ZONA HABITUAL DE JUEGO" icono="location_on" placeholder="Ej. Ñuñoa, Providencia o Maipú"
      autoComplete="off" value=${valor} inputRef=${inputRef} error=${error}
      ayuda="Usamos esta zona para sugerirte rivales cercanos."
      role="combobox" aria-autocomplete="list" aria-expanded=${visible} aria-controls="zona-opciones"
      aria-activedescendant=${visible ? `zona-opcion-${activo}` : undefined}
      onChange=${(e) => { onCambiar(e.target.value); setAbierto(true); setActivo(0); }}
      onFocus=${() => setAbierto(true)} onBlur=${() => setAbierto(false)} onKeyDown=${alTeclear}
      accion=${lista} />`;
}

// ===================== PASO 1: CREA TU EQUIPO =====================

function PasoCrear({ equipo, cambiar, errores, refs }) {
  const selector = useRef(null);

  function alElegirEscudo(e) {
    const archivo = e.target.files[0];
    e.target.value = '';
    if (!archivo || !archivo.type.startsWith('image/')) return;
    if (equipo.shield) URL.revokeObjectURL(equipo.shield.vista);
    cambiar('shield', { archivo, vista: URL.createObjectURL(archivo) });
  }

  return html`
    <div className="space-y-5">
      <!-- Identidad de club: nombre en vivo, escudo e insignia de capitán -->
      <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-campo p-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-neon/30 bg-neon/[0.06]">
          <${Escudo} equipo=${equipo} className="h-12 w-12 text-[34px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold tracking-[0.2em] text-[#8f8f8f]">IDENTIDAD DE CLUB</p>
          <p className=${`truncate font-display text-xl font-extrabold ${equipo.clubName.trim() ? 'text-white' : 'text-[#5a5a5a]'}`}>
            ${equipo.clubName.trim() || 'Nombre del Club'}
          </p>
          <button type="button" onClick=${() => selector.current.click()} className=${`mt-0.5 cursor-pointer text-sm ${ENLACE}`}>
            ${equipo.shield ? 'Cambiar escudo' : 'Subir escudo'}
          </button>
          <input ref=${selector} type="file" accept="image/png,image/jpeg,image/webp" onChange=${alElegirEscudo} className="hidden" />
        </div>
        <span className="hidden shrink-0 self-start rounded-full border border-neon/50 bg-neon/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-neon sm:block">
          CAPITÁN
        </span>
      </div>

      <${CampoIcono} id="clubName" label="NOMBRE DE LA ESCUADRA" icono="shield" placeholder="Ej. Los Titanes F.C." maxLength=${100}
        value=${equipo.clubName} inputRef=${refs.clubName} error=${errores.clubName}
        onChange=${(e) => cambiar('clubName', e.target.value)} />

      <${CampoIcono} id="email" label="CORREO DE CONTACTO DEL CLUB" icono="mail" type="email" placeholder="equipo@email.com"
        inputMode="email" autoComplete="email" value=${equipo.email} inputRef=${refs.email} error=${errores.email}
        ayuda="Por defecto, el correo de tu cuenta. Los rivales lo usarán para contactarte."
        onChange=${(e) => cambiar('email', e.target.value)} />
    </div>`;
}

// ===================== PASO 2: CONFIGURA TU EQUIPO =====================

function PasoConfigurar({ equipo, cambiar, errores, refs, comunas }) {
  return html`
    <div className="space-y-7">
      <fieldset>
        <legend className="mb-2.5 text-xs font-bold tracking-[0.12em] text-[#b3b3b3]">NIVEL DE JUEGO</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          ${NIVELES_EQUIPO.map((n, i) => html`
            <${OpcionTarjeta} key=${n.id} nombre="level" valor=${n.id} seleccionado=${equipo.level === n.id}
              onElegir=${() => cambiar('level', n.id)} className="flex-col gap-1.5 p-4 pr-8">
              <span aria-hidden="true" className="mb-1 flex items-end gap-0.5">
                ${[0, 1, 2].map((b) => html`
                  <span key=${b} className=${`w-1.5 rounded-sm ${['h-2', 'h-3', 'h-4'][b]}
                    ${b <= i ? (equipo.level === n.id ? 'bg-neon' : 'bg-[#d4d4d4]') : 'bg-white/15'}`} />`)}
              </span>
              <span className="text-sm font-semibold">${n.id}</span>
              <span className="text-xs leading-snug text-[#a3a3a3]">${n.detalle}</span>
            <//>`)}
        </div>
      </fieldset>

      <${CampoZona} valor=${equipo.zone} onCambiar=${(v) => cambiar('zone', v)} comunas=${comunas}
        error=${errores.zone} inputRef=${refs.zone} />

      <fieldset>
        <legend className="mb-2.5 flex w-full items-center justify-between text-xs font-bold tracking-[0.12em] text-[#b3b3b3]">
          TIPO DE FÚTBOL
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[#8f8f8f]">Aproximado</span>
        </legend>
        <div className="grid grid-cols-3 gap-3">
          ${TIPOS_FUTBOL.map((n) => html`
            <${OpcionTarjeta} key=${n} nombre="footballType" valor=${n} seleccionado=${equipo.footballType === n}
              onElegir=${() => cambiar('footballType', n)} className="flex-col items-center py-4">
              <span className=${`font-display text-3xl font-extrabold leading-none ${equipo.footballType === n ? 'text-neon' : 'text-white'}`}>${n}</span>
              <span className="mt-1.5 text-xs font-semibold tracking-wide text-[#a3a3a3]">Fútbol</span>
            <//>`)}
        </div>
      </fieldset>

      <div className="flex items-start gap-3 rounded-xl border border-neon/20 bg-neon/[0.05] p-4">
        <${Icono} nombre="bolt" relleno className="mt-px text-[22px] text-neon" />
        <div>
          <p className="text-sm font-semibold">Search Match activo</p>
          <p className="mt-0.5 text-sm text-[#a3a3a3]">Encontraremos rivales al instante con estos datos.</p>
        </div>
      </div>
    </div>`;
}

// ===================== PASO 3: CONFIRMACIÓN =====================

function Dato({ etiqueta, children }) {
  return html`
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      <dt className="text-[#8f8f8f]">${etiqueta}</dt>
      <dd className="truncate text-right font-semibold text-white">${children}</dd>
    </div>`;
}

function Confirmacion({ equipo, avisoEscudo, onEditar }) {
  const nombre = equipo.clubName.trim();
  return html`
    <div className="flex flex-col items-center text-center">
      <div className="grid h-[72px] w-[72px] animate-aparecer place-items-center rounded-full bg-neon text-black shadow-halo motion-reduce:animate-none">
        <${Icono} nombre="check" className="text-[40px] font-bold" />
      </div>
      <h2 id="titulo-tarjeta" className="mt-6 font-display text-[32px] font-extrabold leading-tight tracking-tight sm:text-[36px]">¡Equipo creado!</h2>
      <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-[#b3b3b3] sm:text-base">
        Ya estamos buscando rivales para <span className="font-semibold text-white">${nombre}</span>${nombre.endsWith('.') ? '' : '.'}
      </p>

      <!-- Resumen -->
      <div className="mt-7 w-full rounded-xl border border-white/10 bg-campo p-4 text-left">
        <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-neon/30 bg-neon/[0.06]">
            <${Escudo} equipo=${equipo} className="h-8 w-8 text-[24px]" />
          </span>
          <p className="min-w-0 flex-1 truncate font-display text-lg font-extrabold">${nombre}</p>
          <button type="button" onClick=${onEditar} className=${`shrink-0 cursor-pointer text-sm ${ENLACE}`}>Editar datos</button>
        </div>
        <dl className="pt-1">
          <${Dato} etiqueta="Correo de contacto">${equipo.email.trim()}<//>
          <${Dato} etiqueta="Nivel de juego">${equipo.level}<//>
          <${Dato} etiqueta="Tipo de fútbol">Fútbol ${equipo.footballType}<//>
          <${Dato} etiqueta="Zona habitual">${equipo.zone.trim()}<//>
        </dl>
      </div>

      ${avisoEscudo && html`<p className="mt-4 text-xs text-[#d9a441]">${avisoEscudo}</p>`}

      <div className="mt-8 flex flex-col items-center gap-3">
        <${BotonPrincipal} onClick=${() => { window.location.href = RUTA_PERFIL_EQUIPO; }} className="!h-[46px]">Ir al perfil del equipo<//>
        <a href=${RUTA_BUSCAR_RIVALES}
          className=${`rounded px-2 py-1 text-sm font-semibold text-[#b3b3b3] transition-colors duration-150 hover:text-white ${FOCO}`}>
          Buscar rivales
        </a>
      </div>
    </div>`;
}

// ===================== FLUJO =====================

const TITULOS = [
  { titulo: 'Crea tu equipo', sub: 'Nombre, escudo, zona y nivel de tu escuadra.' },
  { titulo: 'Configura tu equipo', sub: 'Solo necesitamos algunos datos para empezar.' }
];
const CAMPOS_PASO_1 = ['clubName', 'email'];

// Revisión rápida en el navegador; el servidor vuelve a validar todo
function validarPaso(paso, equipo, comunas) {
  const errores = {};
  if (paso === 0) {
    if (equipo.clubName.trim().length < 3) errores.clubName = 'Al menos 3 caracteres.';
    if (!FORMATO_CORREO.test(equipo.email.trim())) errores.email = 'Ingresa un correo válido, por ejemplo equipo@email.com.';
  } else {
    const zona = sinTildes(equipo.zone.trim());
    if (!zona) errores.zone = 'Ingresa la zona donde juegan.';
    else if (comunas.length && !comunas.some((c) => sinTildes(c) === zona)) errores.zone = 'Elige una comuna de la lista.';
  }
  return errores;
}

// paso: 0 crear, 1 configurar, 2 confirmación
export function FlujoEquipo({ paso, irAPaso, onVolverAlTipo, equipo, setEquipo, comunas }) {
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [avisoEscudo, setAvisoEscudo] = useState(null);
  const refs = { clubName: useRef(null), email: useRef(null), zone: useRef(null) };

  // Al entrar a un paso, foco en su primer campo
  useEffect(() => {
    const primero = paso === 0 ? refs.clubName : null;
    if (primero && primero.current) primero.current.focus({ preventScroll: true });
  }, [paso]);

  // Al escribir o elegir, se borra el error de ese campo
  const cambiar = (campo, valor) => {
    setEquipo((e) => ({ ...e, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  // Foco automático en el primer campo con error
  function enfocarError(errs) {
    const campo = ['clubName', 'email', 'zone'].find((c) => errs[c]);
    if (campo && refs[campo].current) refs[campo].current.focus();
  }

  function volver() {
    setMensaje(null);
    setErrores({});
    if (paso === 0) onVolverAlTipo();
    else irAPaso(paso - 1, 'atras');
  }

  async function enviar(e) {
    e.preventDefault();
    if (enviando) return;

    const errs = validarPaso(paso, equipo, comunas);
    setErrores(errs);
    setMensaje(null);
    if (Object.keys(errs).length > 0) {
      enfocarError(errs);
      return;
    }
    if (paso === 0) {
      irAPaso(1);
      return;
    }

    setEnviando(true);
    try {
      // 1. Crear (o actualizar, si viene de "Editar datos") el equipo
      const resultado = await enviarJson('/onboarding/equipo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          id: equipo.id || '', clubName: equipo.clubName, email: equipo.email,
          level: equipo.level, footballType: String(equipo.footballType), zone: equipo.zone
        })
      });
      if (!resultado) return;
      if (!resultado.ok) {
        const errs2 = resultado.errores || {};
        setErrores(errs2);
        setMensaje(resultado.mensaje || 'No pudimos guardar tu equipo.');
        // Si el problema está en el paso 1, vuelve ahí (sin perder lo escrito)
        if (CAMPOS_PASO_1.some((c) => errs2[c])) irAPaso(0, 'atras');
        else enfocarError(errs2);
        return;
      }
      setEquipo((e) => ({ ...e, id: resultado.id }));

      // 2. El escudo, si eligió uno nuevo. Si falla, el equipo igual queda creado
      setAvisoEscudo(null);
      if (equipo.shield && equipo.shield.archivo) {
        try {
          const blob = await prepararEscudo(equipo.shield.archivo);
          const subida = await enviarJson(`/onboarding/equipo/${resultado.id}/escudo`, {
            method: 'POST', headers: { 'Content-Type': blob.type }, body: blob
          });
          if (subida && subida.ok) setEquipo((e) => ({ ...e, shield: { ...e.shield, archivo: null } }));
          else setAvisoEscudo('No pudimos subir el escudo. Podrás subirlo después desde el perfil del equipo.');
        } catch {
          setAvisoEscudo('No pudimos subir el escudo. Podrás subirlo después desde el perfil del equipo.');
        }
      }
      irAPaso(2);
    } catch {
      setMensaje('Sin conexión con el servidor. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  if (paso === 2) return html`<${Confirmacion} equipo=${equipo} avisoEscudo=${avisoEscudo} onEditar=${() => irAPaso(0, 'atras')} />`;

  const editando = Boolean(equipo.id);
  return html`
    <form noValidate onSubmit=${enviar}>
      ${mensaje && html`<div className="mb-6"><${Aviso} tipo="error">${mensaje}<//></div>`}

      <h2 id="titulo-tarjeta" className="font-display text-[28px] font-extrabold leading-tight tracking-tight sm:text-[30px]">
        ${TITULOS[paso].titulo}
      </h2>
      <p className="mt-1.5 text-[15px] text-[#a3a3a3]">${TITULOS[paso].sub}</p>

      <div className="mt-7">
        ${paso === 0
          ? html`<${PasoCrear} equipo=${equipo} cambiar=${cambiar} errores=${errores} refs=${refs} />`
          : html`<${PasoConfigurar} equipo=${equipo} cambiar=${cambiar} errores=${errores} refs=${refs} comunas=${comunas} />`}
      </div>

      <div className="mt-9 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-6">
        <${BotonSecundario} icono="arrow_back" onClick=${volver} className="!h-[46px]">Volver<//>
        <${BotonPrincipal} type="submit" cargando=${enviando} icono=${paso === 0 ? 'arrow_forward' : 'check'} className="!h-[46px]">
          ${paso === 0 ? 'Continuar' : enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear equipo'}
        <//>
      </div>
      ${paso === 1 && html`<p className="mt-3 text-right text-xs text-[#8f8f8f]">Podrás completar más información después.</p>`}
    </form>`;
}
