// Registro de SearchMatch en React: 1) datos personales, 2) perfil deportivo, 3) confirmación.
// Diseño de página web: header, panel de marca + tarjeta con el formulario, footer.
// Se carga como módulo ES desde esm.sh y usa htm (plantillas tipo JSX) para no necesitar compilación.
import React, { useState, useEffect, useRef } from 'https://esm.sh/react@18.3.1';
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client?deps=react@18.3.1';
import htm from 'https://esm.sh/htm@3.1.1';

const html = htm.bind(React.createElement);

const RAIZ = document.getElementById('onboarding');
const HOY = RAIZ.dataset.hoy;
const DASHBOARD = '/users/dashboard';
// Aún no existe la página de perfil: cambiar esta ruta cuando esté lista
const RUTA_PERFIL = '/users/dashboard';

const PASOS = ['Datos personales', 'Perfil deportivo', 'Confirmación'];
const CAMPOS_PASO_1 = ['nombre', 'apellido', 'fecha_nacimiento', 'altura', 'peso'];

const POSICIONES = [
  { id: 'delantero', texto: 'Delantero', icono: 'sprint' },
  { id: 'medio', texto: 'Medio', icono: 'swap_calls' },
  { id: 'defensa', texto: 'Defensa', icono: 'shield' },
  { id: 'arquero', texto: 'Arquero', icono: 'sports_handball' }
];

const NIVELES = [
  { id: 'principiante', texto: 'Principiante', detalle: 'Juego por diversión o estoy empezando.' },
  { id: 'intermedio', texto: 'Intermedio', detalle: 'Juego seguido y manejo lo básico.' },
  { id: 'avanzado', texto: 'Avanzado', detalle: 'Compito o he jugado en ligas.' }
];

// Clases compartidas
const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink';
const ENLACE = `rounded font-semibold text-neon transition-colors duration-150 hover:text-white hover:underline underline-offset-4 ${FOCO}`;

// ===================== PIEZAS REUTILIZABLES =====================

function Icono({ nombre, className = '', relleno = false }) {
  return html`
    <span aria-hidden="true"
      className=${`material-symbols-outlined leading-none ${className}`}
      style=${relleno ? { fontVariationSettings: "'FILL' 1" } : undefined}>${nombre}</span>`;
}

// Botón principal: verde, ancho automático, 44px de alto
function BotonPrincipal({ children, type = 'button', onClick, cargando = false, icono = 'arrow_forward' }) {
  return html`
    <button type=${type} onClick=${onClick} disabled=${cargando}
      className=${`group inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-neon px-6 text-[15px] font-bold text-black
        transition-all duration-150 hover:-translate-y-px hover:bg-neon-suave hover:shadow-boton active:translate-y-0
        disabled:cursor-wait disabled:opacity-80 ${FOCO}`}>
      ${cargando && html`<span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />`}
      ${children}
      ${!cargando && icono && html`
        <${Icono} nombre=${icono} className="text-[20px] transition-transform duration-150 group-hover:translate-x-0.5" />`}
    </button>`;
}

// Botón secundario: contorno sobrio
function BotonSecundario({ children, onClick, icono }) {
  return html`
    <button type="button" onClick=${onClick}
      className=${`inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/15 px-5 text-[15px] font-semibold text-[#d4d4d4]
        transition-colors duration-150 hover:border-white/30 hover:bg-white/[0.04] hover:text-white ${FOCO}`}>
      ${icono && html`<${Icono} nombre=${icono} className="text-[20px]" />`}
      ${children}
    </button>`;
}

// "Iniciar sesión" estando ya con sesión abierta: la cierra y lleva al login
function FormIniciarSesion({ children, className }) {
  return html`
    <form action="/logout" method="POST" className="inline-flex">
      <input type="hidden" name="siguiente" value="login" />
      <button type="submit" className=${`cursor-pointer ${className}`}>${children}</button>
    </form>`;
}

// ===================== HEADER Y FOOTER =====================

function Logo() {
  return html`
    <a href="/" className=${`flex items-center gap-2 rounded font-display text-[15px] font-extrabold tracking-[0.12em] ${FOCO}`}>
      <${Icono} nombre="sports_soccer" className="text-[24px] text-neon" />
      SEARCHMATCH
    </a>`;
}

function Header() {
  const enlace = `rounded text-sm font-medium text-[#b3b3b3] transition-colors duration-150 hover:text-white ${FOCO}`;
  return html`
    <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-ink/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-contenido items-center justify-between px-4 sm:px-6 lg:px-8">
        <${Logo} />
        <nav aria-label="Principal" className="flex items-center gap-6">
          <div className="hidden items-center gap-6 md:flex">
            <a href="/" className=${enlace}>Inicio</a>
            <a href="/#como-funciona" className=${enlace}>Cómo funciona</a>
            <a href="/users/dashboard" className=${enlace}>Partidos</a>
          </div>
          <${FormIniciarSesion} className=${enlace}>Iniciar sesión<//>
          <a href="/onboarding" aria-current="page"
            className=${`hidden h-9 items-center rounded-lg border border-neon/40 px-3.5 text-sm font-semibold text-neon transition-colors duration-150 hover:bg-neon/10 sm:inline-flex ${FOCO}`}>
            Registrarse
          </a>
        </nav>
      </div>
    </header>`;
}

// Íconos de redes sociales (SVG simples)
const REDES = [
  { nombre: 'Instagram', d: 'M12 7.3A4.7 4.7 0 1 0 12 16.7 4.7 4.7 0 0 0 12 7.3Zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm6-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0ZM12 3.6c2.7 0 3 0 4.1.1 2.7.1 4 1.4 4.1 4.1.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c-.1 2.7-1.4 4-4.1 4.1-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-2.7-.1-4-1.4-4.1-4.1-.1-1.1-.1-1.4-.1-4.1s0-3 .1-4.1c.1-2.7 1.4-4 4.1-4.1 1.1-.1 1.4-.1 4.1-.1ZM12 2C9.3 2 8.9 2 7.9 2.1 4.2 2.2 2.2 4.2 2.1 7.9 2 8.9 2 9.3 2 12s0 3.1.1 4.1c.1 3.7 2.1 5.7 5.8 5.8 1 .1 1.4.1 4.1.1s3.1 0 4.1-.1c3.7-.1 5.7-2.1 5.8-5.8.1-1 .1-1.4.1-4.1s0-3.1-.1-4.1c-.1-3.7-2.1-5.7-5.8-5.8C15.1 2 14.7 2 12 2Z' },
  { nombre: 'X', d: 'M17.8 3h3.1l-6.7 7.7L22 21h-6.2l-4.8-6.3L5.5 21H2.4l7.2-8.2L2 3h6.3l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z' },
  { nombre: 'TikTok', d: 'M16.6 2h-3.3v13.4a2.9 2.9 0 1 1-2-2.8V9.2a6.2 6.2 0 1 0 5.3 6.1V8.6a7.6 7.6 0 0 0 4.4 1.4V6.7a4.4 4.4 0 0 1-4.4-4.4V2Z' }
];

function Footer() {
  const enlace = `rounded text-sm text-[#a3a3a3] transition-colors duration-150 hover:text-white ${FOCO}`;
  return html`
    <footer className="border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-contenido flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p className="text-sm text-[#8f8f8f]">© ${RAIZ.dataset.anio} SearchMatch · Fútbol amateur en Chile</p>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2">
          <a href="/terminos" className=${enlace}>Términos</a>
          <a href="/privacidad" className=${enlace}>Privacidad</a>
          <a href="#" className=${enlace}>Contacto</a>
        </nav>
        <div className="flex gap-2">
          ${REDES.map((r) => html`
            <a key=${r.nombre} href="#" aria-label=${r.nombre}
              className=${`grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-[#a3a3a3] transition-colors duration-150 hover:border-neon/40 hover:text-neon ${FOCO}`}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d=${r.d} /></svg>
            </a>`)}
        </div>
      </div>
    </footer>`;
}

// ===================== PANEL DE MARCA (columna izquierda) =====================

// Ilustración de una cancha vista desde arriba (líneas finas)
function Cancha() {
  return html`
    <svg viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true"
      className="absolute inset-0 h-full w-full" fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="2">
      <rect x="30" y="30" width="340" height="540" rx="4" />
      <line x1="30" y1="300" x2="370" y2="300" />
      <circle cx="200" cy="300" r="58" />
      <circle cx="200" cy="300" r="3" fill="rgba(255,255,255,.12)" />
      <rect x="100" y="30" width="200" height="90" />
      <rect x="150" y="30" width="100" height="36" />
      <path d="M160 120a48 48 0 0 0 80 0" />
      <rect x="100" y="480" width="200" height="90" />
      <rect x="150" y="534" width="100" height="36" />
      <path d="M160 480a48 48 0 0 1 80 0" />
    </svg>`;
}

const BENEFICIOS = [
  { icono: 'groups', titulo: 'Encuentra jugadores de tu nivel', texto: 'Te conectamos con equipos y rivales parecidos a ti.' },
  { icono: 'schedule', titulo: 'Organiza partidos en minutos', texto: 'Cancha, hora y jugadores en un solo lugar.' },
  { icono: 'badge', titulo: 'Crea tu perfil deportivo', texto: 'Tu posición y nivel, listos para que te inviten.' }
];

const PROXIMOS_PASOS = [
  { titulo: 'Completa tu perfil con foto', texto: 'Así los equipos te reconocen en la cancha.' },
  { titulo: 'Explora partidos cerca de ti', texto: 'Únete a un partido o arma uno nuevo.' },
  { titulo: 'Invita a tus amigos', texto: 'Mientras más jueguen, más fácil es armar equipo.' }
];

function PanelMarca({ listo }) {
  return html`
    <aside className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#0f1a0f] via-[#0c110c] to-[#0a0a0a] lg:sticky lg:top-24 lg:min-h-[620px]">
      <${Cancha} />
      <!-- Overlay para que el texto se lea sobre la cancha -->
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent" />
      <div aria-hidden="true" className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-neon/[0.07] blur-3xl" />

      <div className="relative flex h-full flex-col p-6 sm:p-8 lg:min-h-[620px] lg:p-10">
        <p className="text-xs font-bold tracking-[0.22em] text-neon">SEARCH MATCH • REGISTRO</p>
        <h1 className="mt-3 font-display text-[28px] font-extrabold leading-[1.1] tracking-tight sm:text-[36px] lg:mt-5 lg:text-[48px] xl:text-[52px]">
          ${listo ? '¡Bienvenido a Search Match!' : 'Encuentra tu próximo partido'}
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#b3b3b3] sm:text-base">
          ${listo
            ? 'Tu perfil ya está listo. Esto es lo que te recomendamos hacer ahora.'
            : 'Crea tu perfil en dos pasos y empieza a jugar con gente de tu nivel.'}
        </p>

        <!-- En celular el panel va reducido: sin la lista -->
        <div className="mt-auto hidden pt-10 lg:block">
          ${listo
            ? html`
              <h2 className="mb-5 text-xs font-bold tracking-[0.2em] text-[#8f8f8f]">PRÓXIMOS PASOS</h2>
              <ol className="space-y-5">
                ${PROXIMOS_PASOS.map((p, i) => html`
                  <li key=${p.titulo} className="flex gap-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-neon/30 bg-neon/[0.06] text-sm font-bold text-neon">${i + 1}</span>
                    <div>
                      <p className="font-semibold text-white">${p.titulo}</p>
                      <p className="mt-0.5 text-sm text-[#a3a3a3]">${p.texto}</p>
                    </div>
                  </li>`)}
              </ol>`
            : html`
              <ul className="space-y-5">
                ${BENEFICIOS.map((b) => html`
                  <li key=${b.titulo} className="flex gap-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-neon">
                      <${Icono} nombre=${b.icono} className="text-[20px]" />
                    </span>
                    <div>
                      <p className="font-semibold text-white">${b.titulo}</p>
                      <p className="mt-0.5 text-sm text-[#a3a3a3]">${b.texto}</p>
                    </div>
                  </li>`)}
              </ul>`}
        </div>
      </div>
    </aside>`;
}

// ===================== STEPPER =====================

// indice: 0, 1 o 2. En la confirmación todos quedan completados
function Stepper({ indice, todoListo = false }) {
  return html`
    <div>
      <ol className="flex items-center" aria-label="Progreso del registro">
        ${PASOS.map((texto, i) => {
          const hecho = todoListo || i < indice;
          const actual = !todoListo && i === indice;
          return html`
            <li key=${texto} className=${`flex items-center ${i < PASOS.length - 1 ? 'flex-1' : ''}`}
              aria-current=${actual ? 'step' : undefined}>
              <span className="flex items-center gap-2.5">
                <span className=${`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold transition-colors duration-200
                  ${hecho ? 'bg-neon text-black' : actual ? 'border-2 border-neon text-neon' : 'border border-white/20 text-[#8f8f8f]'}`}>
                  ${hecho ? html`<${Icono} nombre="check" className="text-[16px] font-bold" />` : i + 1}
                </span>
                <span className=${`hidden whitespace-nowrap text-[13px] font-semibold sm:inline
                  ${actual ? 'text-white' : hecho ? 'text-[#d4d4d4]' : 'text-[#8f8f8f]'}`}>${texto}</span>
              </span>
              ${i < PASOS.length - 1 && html`
                <span aria-hidden="true" className=${`mx-3 h-px flex-1 transition-colors duration-200 ${hecho ? 'bg-neon/60' : 'bg-white/10'}`} />`}
            </li>`;
        })}
      </ol>
      <!-- En celular las etiquetas no caben: se muestra solo la del paso actual -->
      <p className="mt-3 text-xs font-semibold text-[#a3a3a3] sm:hidden">
        ${todoListo ? 'Registro completado' : `Paso ${indice + 1} de ${PASOS.length} · ${PASOS[indice]}`}
      </p>
    </div>`;
}

// ===================== CAMPOS =====================

function Campo({ id, label, ayuda, error, sufijo, inputRef, ...input }) {
  return html`
    <div>
      <label htmlFor=${id} className="mb-1.5 block text-xs font-bold tracking-[0.12em] text-[#b3b3b3]">${label}</label>
      <div className="relative">
        <input id=${id} name=${id} ref=${inputRef} ...${input}
          aria-invalid=${Boolean(error)} aria-describedby=${error || ayuda ? `${id}-ayuda` : undefined}
          className=${`h-11 w-full rounded-lg border bg-campo px-3.5 text-[15px] text-white outline-none transition-[border-color,box-shadow] duration-150
            placeholder:text-[#6b6b6b] [color-scheme:dark] focus:ring-[3px] ${sufijo ? 'pr-11' : ''}
            ${error
              ? 'border-red-400/70 focus:border-red-400 focus:ring-red-400/20'
              : 'border-white/10 hover:border-white/25 focus:border-neon focus:ring-neon/15'}`} />
        ${sufijo && html`
          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-[#8f8f8f]">${sufijo}</span>`}
      </div>
      ${(error || ayuda) && html`
        <p id=${`${id}-ayuda`} className=${`mt-1.5 text-xs ${error ? 'text-red-400' : 'text-[#8f8f8f]'}`}>${error || ayuda}</p>`}
    </div>`;
}

// Tarjeta seleccionable (radio real, oculto, para que funcione con teclado)
function OpcionTarjeta({ nombre, valor, seleccionado, onElegir, children, className = '' }) {
  return html`
    <label className=${`relative flex cursor-pointer rounded-lg border bg-campo transition-all duration-150
      has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-neon/60 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-superficie
      ${seleccionado
        ? 'border-neon bg-neon/[0.06] ring-1 ring-neon/30'
        : 'border-white/10 hover:-translate-y-px hover:border-white/25 hover:bg-white/[0.03]'} ${className}`}>
      <input type="radio" name=${nombre} value=${valor} checked=${seleccionado} onChange=${onElegir} className="sr-only" />
      ${seleccionado && html`
        <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-neon text-black">
          <${Icono} nombre="check" className="text-[14px] font-bold" />
        </span>`}
      ${children}
    </label>`;
}

function GrupoOpciones({ titulo, error, children }) {
  return html`
    <fieldset>
      <legend className="mb-2.5 text-xs font-bold tracking-[0.12em] text-[#b3b3b3]">${titulo}</legend>
      ${children}
      ${error && html`<p className="mt-2 text-xs text-red-400">${error}</p>`}
    </fieldset>`;
}

// ===================== PASOS =====================

function PasoDatos({ datos, errores, onCambiar }) {
  const primerCampo = useRef(null);
  useEffect(() => { primerCampo.current && primerCampo.current.focus({ preventScroll: true }); }, []);
  const cambiar = (e) => onCambiar(e.target.name, e.target.value);

  return html`
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <${Campo} id="nombre" label="NOMBRE" placeholder="Ej. Alexis" autoComplete="given-name" maxLength=${100}
          value=${datos.nombre} onChange=${cambiar} error=${errores.nombre} inputRef=${primerCampo} />
        <${Campo} id="apellido" label="APELLIDO" placeholder="Ej. Sánchez" autoComplete="family-name" maxLength=${100}
          value=${datos.apellido} onChange=${cambiar} error=${errores.apellido} />
      </div>
      <div className="grid gap-5 sm:grid-cols-[1.4fr_1fr_1fr]">
        <${Campo} id="fecha_nacimiento" label="NACIMIENTO" type="date" min="1900-01-01" max=${HOY} autoComplete="bday"
          value=${datos.fecha_nacimiento} onChange=${cambiar} error=${errores.fecha_nacimiento} />
        <${Campo} id="altura" label="ALTURA" placeholder="175" inputMode="numeric" sufijo="cm" ayuda="Entre 100 y 250"
          value=${datos.altura} onChange=${cambiar} error=${errores.altura} />
        <${Campo} id="peso" label="PESO" placeholder="70" inputMode="decimal" sufijo="kg" ayuda="Entre 30 y 250"
          value=${datos.peso} onChange=${cambiar} error=${errores.peso} />
      </div>
    </div>`;
}

function PasoDeportivo({ datos, errores, onCambiar }) {
  return html`
    <div className="space-y-7">
      <${GrupoOpciones} titulo="POSICIÓN EN CANCHA" error=${errores.posicion}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          ${POSICIONES.map((p) => {
            const sel = datos.posicion === p.id;
            return html`
              <${OpcionTarjeta} key=${p.id} nombre="posicion" valor=${p.id} seleccionado=${sel}
                onElegir=${() => onCambiar('posicion', p.id)} className="flex-col items-center gap-2 px-3 py-4">
                <${Icono} nombre=${p.icono} relleno=${sel}
                  className=${`text-[28px] transition-colors duration-150 ${sel ? 'text-neon' : 'text-[#a3a3a3]'}`} />
                <span className="text-sm font-semibold">${p.texto}</span>
              <//>`;
          })}
        </div>
      <//>

      <${GrupoOpciones} titulo="NIVEL" error=${errores.nivel}>
        <div className="grid gap-3 sm:grid-cols-3">
          ${NIVELES.map((n, i) => {
            const sel = datos.nivel === n.id;
            return html`
              <${OpcionTarjeta} key=${n.id} nombre="nivel" valor=${n.id} seleccionado=${sel}
                onElegir=${() => onCambiar('nivel', n.id)} className="flex-col gap-1.5 p-4 pr-8">
                <!-- Barritas de nivel (1, 2 o 3 llenas) -->
                <span aria-hidden="true" className="mb-1 flex items-end gap-0.5">
                  ${[0, 1, 2].map((b) => html`
                    <span key=${b} className=${`w-1.5 rounded-sm ${['h-2', 'h-3', 'h-4'][b]}
                      ${b <= i ? (sel ? 'bg-neon' : 'bg-[#d4d4d4]') : 'bg-white/15'}`} />`)}
                </span>
                <span className="text-sm font-semibold">${n.texto}</span>
                <span className="text-xs leading-snug text-[#a3a3a3]">${n.detalle}</span>
              <//>`;
          })}
        </div>
      <//>
    </div>`;
}

function Confirmacion({ datos }) {
  const posicion = POSICIONES.find((p) => p.id === datos.posicion);
  const nivel = NIVELES.find((n) => n.id === datos.nivel);

  return html`
    <div className="flex flex-col items-center text-center">
      <div className="grid h-[72px] w-[72px] animate-aparecer place-items-center rounded-full bg-neon text-black shadow-halo motion-reduce:animate-none">
        <${Icono} nombre="check" className="text-[40px] font-bold" />
      </div>

      <h2 id="titulo-tarjeta" className="mt-6 font-display text-[32px] font-extrabold leading-tight tracking-tight sm:text-[36px]">¡Todo listo!</h2>
      <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-[#b3b3b3] sm:text-base">
        Tu cuenta ha sido creada correctamente. Ya puedes empezar a buscar partidos.
      </p>

      <!-- Resumen del perfil -->
      <div className="mt-7 flex w-full items-center gap-4 rounded-lg border border-white/10 bg-campo p-4 text-left">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-neon/40 font-bold text-neon">
          ${(datos.nombre.trim().charAt(0) || 'J').toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">${`${datos.nombre.trim()} ${datos.apellido.trim()}`}</p>
          <p className="text-sm text-[#a3a3a3]">${posicion ? posicion.texto : ''} · ${nivel ? nivel.texto : ''}</p>
        </div>
        <a href=${RUTA_PERFIL} className=${`shrink-0 text-sm ${ENLACE}`}>Editar perfil</a>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <${BotonPrincipal} onClick=${() => { window.location.href = DASHBOARD; }}>Empezar<//>
        <a href=${RUTA_PERFIL}
          className=${`rounded px-2 py-1 text-sm font-semibold text-[#b3b3b3] transition-colors duration-150 hover:text-white ${FOCO}`}>
          Ir a mi perfil
        </a>
      </div>
    </div>`;
}

// ===================== APP =====================

// Revisión rápida en el navegador; el servidor vuelve a validar todo
function validarPaso(paso, d) {
  const errores = {};
  if (paso === 0) {
    if (!d.nombre.trim()) errores.nombre = 'Ingresa tu nombre.';
    if (!d.apellido.trim()) errores.apellido = 'Ingresa tu apellido.';
    if (!d.fecha_nacimiento) errores.fecha_nacimiento = 'Elige tu fecha de nacimiento.';
    else if (d.fecha_nacimiento > HOY) errores.fecha_nacimiento = 'La fecha no puede ser futura.';
    const altura = Number(String(d.altura).replace(',', '.'));
    const peso = Number(String(d.peso).replace(',', '.'));
    if (!d.altura || !(altura >= 100 && altura <= 250)) errores.altura = 'Entre 100 y 250 cm.';
    if (!d.peso || !(peso >= 30 && peso <= 250)) errores.peso = 'Entre 30 y 250 kg.';
  } else {
    if (!d.posicion) errores.posicion = 'Elige tu posición.';
    if (!d.nivel) errores.nivel = 'Elige tu nivel.';
  }
  return errores;
}

const TITULOS = [
  { titulo: 'Datos personales', sub: 'Cuéntanos quién eres. Solo te tomará un minuto.' },
  { titulo: 'Perfil deportivo', sub: 'Así te mostramos partidos y equipos a tu medida.' }
];

function App() {
  const [paso, setPaso] = useState(0);   // 0 datos, 1 deportivo, 2 confirmación
  const [datos, setDatos] = useState({
    nombre: '', apellido: '', fecha_nacimiento: RAIZ.dataset.fecha || '', altura: '', peso: '',
    posicion: '', nivel: ''
  });
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const tarjeta = useRef(null);

  // Al cambiar de paso, si la tarjeta quedó fuera de vista (celular), vuelve a ella
  useEffect(() => {
    if (paso > 0 && tarjeta.current && tarjeta.current.getBoundingClientRect().top < 0) {
      tarjeta.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [paso]);

  // Al escribir o elegir, se borra el error de ese campo
  const cambiar = (campo, valor) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  async function enviar(e) {
    e.preventDefault();
    if (enviando) return;

    const erroresPaso = validarPaso(paso, datos);
    setErrores(erroresPaso);
    setMensaje(null);
    if (Object.keys(erroresPaso).length > 0) return;

    if (paso === 0) {
      setPaso(1);
      return;
    }

    setEnviando(true);
    try {
      const respuesta = await fetch('/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(datos)
      });
      // Si la sesión expiró, el servidor redirige al login
      if (respuesta.redirected) {
        window.location.href = respuesta.url;
        return;
      }
      const resultado = await respuesta.json();
      if (!resultado.ok) {
        const erroresServidor = resultado.errores || {};
        setErrores(erroresServidor);
        setMensaje(resultado.mensaje || 'No pudimos guardar tu perfil.');
        // Si el problema está en los datos personales, vuelve a ese paso
        if (CAMPOS_PASO_1.some((c) => erroresServidor[c])) setPaso(0);
        return;
      }
      setPaso(2);
    } catch {
      setMensaje('Sin conexión con el servidor. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  const listo = paso === 2;

  return html`
    <div className="flex min-h-screen flex-col">
      <${Header} />

      <main className="mx-auto grid w-full max-w-contenido flex-1 gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-12 lg:items-start lg:gap-12 lg:px-8 lg:py-14">
        <div className="lg:col-span-5">
          <${PanelMarca} listo=${listo} />
        </div>

        <div className="flex flex-col items-center lg:col-span-7 lg:min-h-[620px] lg:justify-center">
          <section ref=${tarjeta} aria-labelledby="titulo-tarjeta"
            className="w-full max-w-tarjeta scroll-mt-20 rounded-2xl border border-white/[0.08] bg-superficie p-5 shadow-tarjeta sm:p-8 lg:p-10">
            <${Stepper} indice=${paso} todoListo=${listo} />

            <div key=${paso} className="mt-8 animate-entrar motion-reduce:animate-none">
              ${listo
                ? html`<${Confirmacion} datos=${datos} />`
                : html`
                  <form noValidate onSubmit=${enviar}>
                    <h2 id="titulo-tarjeta" className="font-display text-[28px] font-extrabold leading-tight tracking-tight sm:text-[30px]">
                      ${TITULOS[paso].titulo}
                    </h2>
                    <p className="mt-1.5 text-[15px] text-[#a3a3a3]">${TITULOS[paso].sub}</p>

                    ${mensaje && html`
                      <div role="alert" className="mt-6 flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
                        <${Icono} nombre="error" className="text-[20px]" />${mensaje}
                      </div>`}

                    <div className="mt-7">
                      ${paso === 0
                        ? html`<${PasoDatos} datos=${datos} errores=${errores} onCambiar=${cambiar} />`
                        : html`<${PasoDeportivo} datos=${datos} errores=${errores} onCambiar=${cambiar} />`}
                    </div>

                    <div className="mt-9 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-6">
                      ${paso === 1
                        ? html`<${BotonSecundario} icono="arrow_back" onClick=${() => { setMensaje(null); setPaso(0); }}>Volver<//>`
                        : html`<span />`}
                      <${BotonPrincipal} type="submit" cargando=${enviando}>
                        ${paso === 0 ? 'Continuar' : enviando ? 'Creando perfil...' : 'Crear perfil'}
                      <//>
                    </div>
                  </form>`}
            </div>
          </section>

          ${!listo && html`
            <p className="mt-6 text-center text-sm text-[#a3a3a3]">
              ¿Ya tienes cuenta?${' '}
              <${FormIniciarSesion} className=${ENLACE}>Inicia sesión<//>
            </p>`}
        </div>
      </main>

      <${Footer} />
    </div>`;
}

createRoot(RAIZ).render(html`<${App} />`);
