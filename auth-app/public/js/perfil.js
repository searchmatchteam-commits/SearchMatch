// Perfil del jugador en React: su carta (carta.js), datos, estadísticas y acciones.
// También muestra la carta de otro jugador (enlace de "Compartir carta"), sin las acciones de edición.
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client?deps=react@18.3.1';
import {
  html, useState, useEffect, useRef, FOCO, ENLACE, POSICIONES,
  Icono, BotonPrincipal, BotonSecundario, Header, Footer, Campo, OpcionTarjeta, GrupoOpciones
} from './sitio.js';
import {
  PlayerCard, calcularEstadisticas, clavesDe, NOMBRE_ESTADISTICA, usarMenosMovimiento
} from './carta.js';

const RAIZ = document.getElementById('perfil');
const PROPIO = RAIZ.dataset.propio === 'true';
const HOY = new Date().toISOString().slice(0, 10);
const DASHBOARD = '/users/dashboard';

const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
const LADO_MAX_FOTO = 800;                  // px: la foto se achica en el navegador antes de subirla
const PESO_MAX_ARCHIVO = 15 * 1024 * 1024;  // 15 MB antes de achicarla

// ===================== UTILIDADES =====================

function edad(fecha) {
  if (!fecha) return null;
  const [a, m, d] = fecha.split('-').map(Number);
  const hoy = new Date();
  let anios = hoy.getFullYear() - a;
  if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) anios -= 1;
  return anios;
}

// Botones de texto con ícono (descargar y compartir)
const ACCION_TEXTO = `inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg px-1 text-sm font-semibold text-[#d4d4d4] transition-colors duration-150 hover:text-neon disabled:cursor-wait disabled:opacity-60 ${FOCO}`;

const nombrePosicion = (id) => (POSICIONES.find((p) => p.id === id) || {}).texto || '—';
const formatoNumero = (n) => (n === null || n === undefined ? '—' : String(n).replace('.', ','));

// Lee la imagen, la achica y detecta si no tiene fondo (píxeles transparentes).
// Devuelve { blob, recortada }
async function prepararFoto(archivo) {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise((resolver, rechazar) => {
      const i = new Image();
      i.onload = () => resolver(i);
      i.onerror = () => rechazar(new Error('No pudimos leer la imagen.'));
      i.src = url;
    });
    const escala = Math.min(1, LADO_MAX_FOTO / Math.max(img.naturalWidth, img.naturalHeight));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(img.naturalWidth * escala);
    lienzo.height = Math.round(img.naturalHeight * escala);
    const ctx = lienzo.getContext('2d');
    ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);

    // Sin fondo = más del 3% de los píxeles son transparentes
    const { data } = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
    let transparentes = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 250) transparentes += 1;
    const recortada = transparentes / (data.length / 4) > 0.03;

    // WebP pesa menos; si el navegador no sabe crearlo, PNG (con transparencia) o JPG
    const crear = (tipo) => new Promise((r) => lienzo.toBlob(r, tipo, 0.86));
    let blob = await crear('image/webp');
    if (!blob || blob.type !== 'image/webp') blob = await crear(recortada ? 'image/png' : 'image/jpeg');
    return { blob, recortada };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ===================== PIEZAS =====================

function Aviso({ aviso }) {
  if (!aviso) return null;
  return html`
    <div role="status" className="fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100%-32px)] -translate-x-1/2 animate-entrar items-center gap-2 rounded-lg border border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm shadow-tarjeta">
      <${Icono} nombre=${aviso.error ? 'error' : 'check_circle'} relleno className=${`text-[20px] ${aviso.error ? 'text-red-400' : 'text-neon'}`} />
      <span className="break-all">${aviso.texto}</span>
    </div>`;
}

function Dato({ etiqueta, valor }) {
  return html`
    <div>
      <dt className="text-xs font-bold tracking-[0.12em] text-[#8f8f8f]">${etiqueta}</dt>
      <dd className="mt-1 text-[15px] font-semibold text-white">${valor}</dd>
    </div>`;
}

function BarrasEstadisticas({ posicion, stats }) {
  const reducir = usarMenosMovimiento();
  const [lleno, setLleno] = useState(reducir);
  useEffect(() => {
    if (reducir) return undefined;
    const t = setTimeout(() => setLleno(true), 120);
    return () => clearTimeout(t);
  }, [reducir]);

  return html`
    <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      ${clavesDe(posicion).map((clave) => html`
        <li key=${clave}>
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="text-[#d4d4d4]"><span className="mr-2 font-condensada text-[15px] font-bold tracking-wide text-white">${clave}</span>${NOMBRE_ESTADISTICA[clave]}</span>
            <span className="font-condensada text-lg font-bold tabular-nums text-white">${stats[clave]}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]" role="meter" aria-label=${NOMBRE_ESTADISTICA[clave]}
            aria-valuemin="0" aria-valuemax="99" aria-valuenow=${stats[clave]}>
            <div className="h-full rounded-full bg-gradient-to-r from-neon/70 to-neon shadow-[0_0_8px_rgba(57,255,20,.45)] transition-[width] duration-[800ms] ease-out"
              style=${{ width: lleno ? `${stats[clave]}%` : '0%' }} />
          </div>
        </li>`)}
    </ul>`;
}

// Ventana para editar los datos del perfil (posición incluida; el nivel no se usa en la carta)
function DialogoEditar({ abierto, jugador, onCerrar, onGuardado }) {
  const dialogo = useRef(null);
  const [datos, setDatos] = useState(null);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const el = dialogo.current;
    if (abierto && !el.open) {
      setDatos({
        nombre: jugador.nombre || '', apellido: jugador.apellido || '', fecha_nacimiento: jugador.fechaNacimiento || '',
        altura: jugador.altura ?? '', peso: jugador.peso ?? '', posicion: jugador.posicion
      });
      setErrores({});
      setMensaje(null);
      el.showModal();
    }
    if (!abierto && el.open) el.close();
  }, [abierto]);

  const cambiar = (campo, valor) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  };
  const alEscribir = (e) => cambiar(e.target.name, e.target.value);

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      const r = await fetch('/users/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(datos)
      });
      if (r.redirected) { window.location.href = r.url; return; }
      const resultado = await r.json();
      if (!resultado.ok) {
        setErrores(resultado.errores || {});
        setMensaje(resultado.mensaje);
        return;
      }
      onGuardado(resultado.jugador);
    } catch {
      setMensaje('Sin conexión con el servidor. Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return html`
    <dialog ref=${dialogo} onClose=${onCerrar} aria-labelledby="titulo-editar"
      className="w-[min(640px,calc(100%-32px))] rounded-2xl border border-white/10 bg-superficie p-0 text-white shadow-tarjeta backdrop:bg-black/70 backdrop:backdrop-blur-sm">
      ${datos && html`
        <form noValidate onSubmit=${guardar} className="p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="titulo-editar" className="font-display text-2xl font-extrabold">Editar perfil</h2>
              <p className="mt-1 text-sm text-[#a3a3a3]">Tu carta se actualiza con estos datos.</p>
            </div>
            <button type="button" onClick=${onCerrar} aria-label="Cerrar"
              className=${`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#a3a3a3] transition-colors duration-150 hover:bg-white/5 hover:text-white ${FOCO}`}>
              <${Icono} nombre="close" className="text-[22px]" />
            </button>
          </div>

          ${mensaje && html`
            <div role="alert" className="mt-5 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">${mensaje}</div>`}

          <div className="mt-6 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <${Campo} id="nombre" label="NOMBRE" maxLength=${100} autoComplete="given-name" value=${datos.nombre} onChange=${alEscribir} error=${errores.nombre} />
              <${Campo} id="apellido" label="APELLIDO" maxLength=${100} autoComplete="family-name" value=${datos.apellido} onChange=${alEscribir} error=${errores.apellido} />
            </div>
            <div className="grid gap-5 sm:grid-cols-[1.4fr_1fr_1fr]">
              <${Campo} id="fecha_nacimiento" label="NACIMIENTO" type="date" min="1900-01-01" max=${HOY} value=${datos.fecha_nacimiento} onChange=${alEscribir} error=${errores.fecha_nacimiento} />
              <${Campo} id="altura" label="ALTURA" inputMode="numeric" sufijo="cm" value=${datos.altura} onChange=${alEscribir} error=${errores.altura} />
              <${Campo} id="peso" label="PESO" inputMode="decimal" sufijo="kg" value=${datos.peso} onChange=${alEscribir} error=${errores.peso} />
            </div>
            <${GrupoOpciones} titulo="POSICIÓN EN CANCHA" error=${errores.posicion}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                ${POSICIONES.map((p) => html`
                  <${OpcionTarjeta} key=${p.id} nombre="posicion" valor=${p.id} seleccionado=${datos.posicion === p.id}
                    onElegir=${() => cambiar('posicion', p.id)} className="flex-col items-center gap-1.5 px-3 py-3">
                    <${Icono} nombre=${p.icono} className=${`text-[24px] ${datos.posicion === p.id ? 'text-neon' : 'text-[#a3a3a3]'}`} />
                    <span className="text-sm font-semibold">${p.texto}</span>
                  <//>`)}
              </div>
            <//>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-white/[0.06] pt-6">
            <${BotonSecundario} onClick=${onCerrar}>Cancelar<//>
            <${BotonPrincipal} type="submit" cargando=${guardando} icono=${null}>${guardando ? 'Guardando...' : 'Guardar cambios'}<//>
          </div>
        </form>`}
    </dialog>`;
}

// ===================== PÁGINA =====================

function NoEncontrado() {
  return html`
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <${Icono} nombre="style" className="text-[48px] text-[#6b6b6b]" />
      <h1 className="mt-4 font-display text-2xl font-extrabold">No encontramos esta carta</h1>
      <p className="mt-2 text-[#a3a3a3]">Puede que el enlace esté mal escrito o que el jugador ya no exista.</p>
      <a href=${DASHBOARD} className=${`mt-6 text-sm ${ENLACE}`}>Volver a mi panel</a>
    </div>`;
}

function Perfil({ inicial }) {
  const [jugador, setJugador] = useState(inicial);
  const [editando, setEditando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const selectorFoto = useRef(null);
  const cartaExportable = useRef(null);
  const tiempoAviso = useRef(null);

  const { stats } = calcularEstadisticas(jugador.posicion, jugador.altura, jugador.peso);
  const nombreCompleto = `${jugador.nombre || ''} ${jugador.apellido || ''}`.trim();
  const enlaceCarta = `${window.location.origin}/users/carta/${jugador.id}`;

  function avisar(texto, error = false) {
    clearTimeout(tiempoAviso.current);
    setAviso({ texto, error });
    tiempoAviso.current = setTimeout(() => setAviso(null), 3500);
  }

  async function alElegirFoto(e) {
    const archivo = e.target.files[0];
    e.target.value = '';  // permite volver a elegir el mismo archivo
    if (!archivo) return;
    if (!TIPOS_FOTO.includes(archivo.type)) return avisar('La foto debe ser JPG, PNG o WebP.', true);
    if (archivo.size > PESO_MAX_ARCHIVO) return avisar('La foto es muy pesada (máximo 15 MB).', true);

    setSubiendo(true);
    try {
      const { blob, recortada } = await prepararFoto(archivo);
      const r = await fetch('/users/perfil/foto', {
        method: 'POST',
        headers: { 'Content-Type': blob.type, 'X-Foto-Recortada': recortada ? '1' : '0' },
        body: blob
      });
      if (r.redirected) { window.location.href = r.url; return; }
      const resultado = await r.json().catch(() => ({ ok: false }));
      if (!resultado.ok) return avisar(resultado.mensaje || 'No pudimos subir tu foto.', true);
      setJugador((j) => ({ ...j, foto: resultado.foto }));
      avisar('Foto actualizada.');
    } catch (err) {
      avisar(err.message || 'No pudimos subir tu foto.', true);
    } finally {
      setSubiendo(false);
    }
  }

  async function descargar() {
    setDescargando(true);
    try {
      // Se carga solo cuando hace falta
      const { toPng } = await import('https://esm.sh/html-to-image@1.11.11');
      const png = await toPng(cartaExportable.current, { pixelRatio: 2.5 });
      const enlace = document.createElement('a');
      enlace.href = png;
      enlace.download = `carta-${(jugador.apellido || 'jugador').toLowerCase().replace(/\s+/g, '-')}.png`;
      enlace.click();
    } catch (err) {
      console.error('No se pudo generar la imagen de la carta:', err);
      avisar('No pudimos generar la imagen. Inténtalo de nuevo.', true);
    } finally {
      setDescargando(false);
    }
  }

  async function compartir() {
    // En celular, el menú nativo de compartir; en escritorio, copiar el enlace
    if (navigator.share && window.matchMedia('(hover: none)').matches) {
      try {
        await navigator.share({ title: `Carta de ${nombreCompleto} · SearchMatch`, url: enlaceCarta });
      } catch { /* el usuario cerró el menú */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(enlaceCarta);
      avisar('Enlace copiado al portapapeles.');
    } catch {
      avisar(`Copia este enlace: ${enlaceCarta}`);
    }
  }

  const titulo = PROPIO ? 'Tu carta de jugador' : `Carta de ${nombreCompleto}`;
  const subtitulo = PROPIO
    ? 'Así te verán otros jugadores al buscar partidos.'
    : 'Así se ve este jugador en Search Match.';

  return html`
    <main className="mx-auto grid w-full max-w-contenido flex-1 animate-entrar-pagina gap-8 px-4 py-6 motion-reduce:animate-none sm:px-6 sm:py-10 lg:grid-cols-[45fr_55fr] lg:items-start lg:gap-12 lg:px-8 lg:py-14">

      <!-- Izquierda: la carta sobre un resplandor verde -->
      <section aria-label="Carta" className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0c] px-6 pb-10 pt-6 lg:sticky lg:top-24 lg:min-h-[640px]">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(57,255,20,.14),transparent_62%)]" />
        <div className="relative w-full max-w-[300px] sm:max-w-[320px] lg:max-w-[360px]">
          <${PlayerCard} player=${jugador} onSubirFoto=${PROPIO ? () => selectorFoto.current.click() : undefined} />
        </div>
      </section>

      <!-- Derecha: información y acciones -->
      <section className="min-w-0">
        <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-tight sm:text-[32px]">${titulo}</h1>
        <p className="mt-1.5 text-[15px] text-[#a3a3a3] sm:text-base">${subtitulo}</p>

        <dl className="mt-7 grid grid-cols-2 gap-5 rounded-xl border border-white/[0.08] bg-superficie p-5 sm:grid-cols-4 sm:p-6">
          <div className="col-span-full"><${Dato} etiqueta="NOMBRE COMPLETO" valor=${nombreCompleto || '—'} /></div>
          <${Dato} etiqueta="POSICIÓN" valor=${nombrePosicion(jugador.posicion)} />
          ${PROPIO && html`
            <${Dato} etiqueta="EDAD" valor=${edad(jugador.fechaNacimiento) !== null ? `${edad(jugador.fechaNacimiento)} años` : '—'} />
            <${Dato} etiqueta="ALTURA" valor=${jugador.altura ? `${formatoNumero(jugador.altura)} cm` : '—'} />
            <${Dato} etiqueta="PESO" valor=${jugador.peso ? `${formatoNumero(jugador.peso)} kg` : '—'} />`}
        </dl>

        <div className="mt-6 rounded-xl border border-white/[0.08] bg-superficie p-5 sm:p-6">
          <h2 className="mb-5 text-xs font-bold tracking-[0.12em] text-[#b3b3b3]">ESTADÍSTICAS</h2>
          <${BarrasEstadisticas} key=${jugador.posicion} posicion=${jugador.posicion} stats=${stats} />
          <p className="mt-6 flex gap-2 border-t border-white/[0.06] pt-4 text-sm text-[#a3a3a3]">
            <${Icono} nombre="trending_up" className="text-[20px] text-neon" />
            ${PROPIO ? 'Tus' : 'Sus'} estadísticas mejorarán con los partidos jugados y las valoraciones de otros jugadores.
          </p>
        </div>

        <!-- Acciones principales y, debajo, las de la carta (más discretas) -->
        ${PROPIO && html`
          <div className="mt-6 flex flex-wrap gap-3">
            <${BotonPrincipal} onClick=${() => selectorFoto.current.click()} cargando=${subiendo} icono=${null}>
              ${!subiendo && html`<${Icono} nombre="photo_camera" className="text-[20px]" />`}
              ${subiendo ? 'Subiendo...' : jugador.foto ? 'Cambiar foto' : 'Subir foto'}
            <//>
            <${BotonSecundario} icono="edit" onClick=${() => setEditando(true)}>Editar perfil<//>
          </div>`}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          <button type="button" onClick=${descargar} disabled=${descargando} className=${ACCION_TEXTO}>
            <${Icono} nombre="download" className="text-[20px]" />${descargando ? 'Generando imagen...' : 'Descargar carta'}
          </button>
          <button type="button" onClick=${compartir} className=${ACCION_TEXTO}>
            <${Icono} nombre="share" className="text-[20px]" />Compartir carta
          </button>
        </div>
        <input ref=${selectorFoto} type="file" accept=${TIPOS_FOTO.join(',')} onChange=${alElegirFoto} className="hidden" />

        <!-- CTA final -->
        <div className="mt-10 flex flex-col gap-4 rounded-xl border border-neon/20 bg-gradient-to-r from-neon/[0.06] to-transparent p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="font-display text-lg font-extrabold">¿Listo para jugar?</p>
            <p className="mt-0.5 text-sm text-[#a3a3a3]">Encuentra partidos cerca de ti con jugadores de tu nivel.</p>
          </div>
          <div className="shrink-0">
            <${BotonPrincipal} onClick=${() => { window.location.href = DASHBOARD; }}>Buscar partidos<//>
          </div>
        </div>
      </section>

      ${PROPIO && html`
        <${DialogoEditar} abierto=${editando} jugador=${jugador} onCerrar=${() => setEditando(false)}
          onGuardado=${(j) => { setJugador(j); setEditando(false); avisar('Perfil actualizado.'); }} />`}

      <!-- Copia quieta de la carta (sin inclinación ni animación) para "Descargar carta" -->
      <div aria-hidden="true" className="pointer-events-none fixed left-[-10000px] top-0">
        <div ref=${cartaExportable} className="w-[420px] bg-[#0a0a0a] bg-[radial-gradient(circle_at_50%_45%,rgba(57,255,20,.14),transparent_62%)] px-[45px] pb-[26px] pt-[10px]">
          <${PlayerCard} player=${jugador} interactivo=${false} animar=${false} />
          <p className="mt-5 text-center font-display text-[13px] font-extrabold tracking-[0.3em] text-white/60">SEARCHMATCH</p>
        </div>
      </div>

      <${Aviso} aviso=${aviso} />
    </main>`;
}

function App() {
  const inicial = JSON.parse(RAIZ.dataset.jugador || 'null');
  return html`
    <div className="flex min-h-screen flex-col">
      <${Header} sesion />
      ${inicial ? html`<${Perfil} inicial=${inicial} />` : html`<${NoEncontrado} />`}
      <${Footer} />
    </div>`;
}

createRoot(RAIZ).render(html`<${App} />`);
