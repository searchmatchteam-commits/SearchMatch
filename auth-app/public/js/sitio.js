// Piezas compartidas por las páginas de React del sitio (registro y perfil):
// header, footer, botones, campos de formulario y la lista de posiciones.
// React se carga como módulo ES desde esm.sh; htm permite escribir plantillas tipo JSX sin compilar.
import React, { useState, useEffect, useRef, useId } from 'https://esm.sh/react@18.3.1';
import htm from 'https://esm.sh/htm@3.1.1';

export const html = htm.bind(React.createElement);
export { React, useState, useEffect, useRef, useId };

export const POSICIONES = [
  { id: 'delantero', texto: 'Delantero', icono: 'sprint' },
  { id: 'medio', texto: 'Medio', icono: 'swap_calls' },
  { id: 'defensa', texto: 'Defensa', icono: 'shield' },
  { id: 'arquero', texto: 'Arquero', icono: 'sports_handball' }
];

// Clases compartidas
export const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink';
export const ENLACE = `rounded font-semibold text-neon transition-colors duration-150 hover:text-white hover:underline underline-offset-4 ${FOCO}`;

// ===================== PIEZAS REUTILIZABLES =====================

export function Icono({ nombre, className = '', relleno = false }) {
  return html`
    <span aria-hidden="true"
      className=${`material-symbols-outlined leading-none ${className}`}
      style=${relleno ? { fontVariationSettings: "'FILL' 1" } : undefined}>${nombre}</span>`;
}

// Botón principal: verde, ancho automático, 44px de alto (className para ajustarlo, ej. ancho completo)
export function BotonPrincipal({ children, type = 'button', onClick, cargando = false, icono = 'arrow_forward', className = '' }) {
  return html`
    <button type=${type} onClick=${onClick} disabled=${cargando}
      className=${`group inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-neon px-6 text-[15px] font-bold text-black
        transition-all duration-150 hover:-translate-y-px hover:bg-neon-suave hover:shadow-boton active:translate-y-0
        disabled:cursor-wait disabled:opacity-80 ${FOCO} ${className}`}>
      ${cargando && html`<span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />`}
      ${children}
      ${!cargando && icono && html`
        <${Icono} nombre=${icono} className="text-[20px] transition-transform duration-150 group-hover:translate-x-0.5" />`}
    </button>`;
}

// Botón secundario: contorno sobrio
export function BotonSecundario({ children, onClick, icono, type = 'button', disabled = false, className = '' }) {
  return html`
    <button type=${type} onClick=${onClick} disabled=${disabled}
      className=${`inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/15 px-5 text-[15px] font-semibold text-[#d4d4d4]
        transition-colors duration-150 hover:border-white/30 hover:bg-white/[0.04] hover:text-white disabled:cursor-wait disabled:opacity-60 ${FOCO} ${className}`}>
      ${icono && html`<${Icono} nombre=${icono} className="text-[20px]" />`}
      ${children}
    </button>`;
}

// Ilustración de una cancha vista desde arriba (líneas finas), para fondos
export function Cancha({ className = '', trazo = 'rgba(255,255,255,.09)' }) {
  return html`
    <svg viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true"
      className=${`absolute inset-0 h-full w-full ${className}`} fill="none" stroke=${trazo} strokeWidth="2">
      <rect x="30" y="30" width="340" height="540" rx="4" />
      <line x1="30" y1="300" x2="370" y2="300" />
      <circle cx="200" cy="300" r="58" />
      <circle cx="200" cy="300" r="3" fill=${trazo} />
      <rect x="100" y="30" width="200" height="90" />
      <rect x="150" y="30" width="100" height="36" />
      <path d="M160 120a48 48 0 0 0 80 0" />
      <rect x="100" y="480" width="200" height="90" />
      <rect x="150" y="534" width="100" height="36" />
      <path d="M160 480a48 48 0 0 1 80 0" />
    </svg>`;
}

// ===================== HEADER Y FOOTER =====================

export function Logo() {
  return html`
    <a href="/" className=${`flex items-center gap-2 rounded font-display text-[15px] font-extrabold tracking-[0.12em] ${FOCO}`}>
      <${Icono} nombre="sports_soccer" className="text-[24px] text-neon" />
      SEARCHMATCH
    </a>`;
}

// Barra superior: solo el logo. Con sesion=true (perfil) agrega "Cerrar sesión" y "Mi panel"
export function Header({ sesion = false }) {
  const enlace = `rounded text-sm font-medium text-[#b3b3b3] transition-colors duration-150 hover:text-white ${FOCO}`;
  return html`
    <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-ink/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-contenido items-center justify-between px-4 sm:px-6 lg:px-8">
        <${Logo} />
        ${sesion && html`
          <nav aria-label="Cuenta" className="flex items-center gap-6">
            <form action="/logout" method="POST" className="inline-flex">
              <button type="submit" className=${`cursor-pointer ${enlace}`}>Cerrar sesión</button>
            </form>
            <a href="/users/dashboard"
              className=${`hidden h-9 items-center rounded-lg border border-neon/40 px-3.5 text-sm font-semibold text-neon transition-colors duration-150 hover:bg-neon/10 sm:inline-flex ${FOCO}`}>
              Mi panel
            </a>
          </nav>`}
      </div>
    </header>`;
}

// Íconos de redes sociales (SVG simples)
const REDES = [
  { nombre: 'Instagram', d: 'M12 7.3A4.7 4.7 0 1 0 12 16.7 4.7 4.7 0 0 0 12 7.3Zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm6-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0ZM12 3.6c2.7 0 3 0 4.1.1 2.7.1 4 1.4 4.1 4.1.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c-.1 2.7-1.4 4-4.1 4.1-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-2.7-.1-4-1.4-4.1-4.1-.1-1.1-.1-1.4-.1-4.1s0-3 .1-4.1c.1-2.7 1.4-4 4.1-4.1 1.1-.1 1.4-.1 4.1-.1ZM12 2C9.3 2 8.9 2 7.9 2.1 4.2 2.2 2.2 4.2 2.1 7.9 2 8.9 2 9.3 2 12s0 3.1.1 4.1c.1 3.7 2.1 5.7 5.8 5.8 1 .1 1.4.1 4.1.1s3.1 0 4.1-.1c3.7-.1 5.7-2.1 5.8-5.8.1-1 .1-1.4.1-4.1s0-3.1-.1-4.1c-.1-3.7-2.1-5.7-5.8-5.8C15.1 2 14.7 2 12 2Z' },
  { nombre: 'X', d: 'M17.8 3h3.1l-6.7 7.7L22 21h-6.2l-4.8-6.3L5.5 21H2.4l7.2-8.2L2 3h6.3l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z' },
  { nombre: 'TikTok', d: 'M16.6 2h-3.3v13.4a2.9 2.9 0 1 1-2-2.8V9.2a6.2 6.2 0 1 0 5.3 6.1V8.6a7.6 7.6 0 0 0 4.4 1.4V6.7a4.4 4.4 0 0 1-4.4-4.4V2Z' }
];

export function Footer() {
  const enlace = `rounded text-sm text-[#a3a3a3] transition-colors duration-150 hover:text-white ${FOCO}`;
  return html`
    <footer className="border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-contenido flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p className="text-sm text-[#8f8f8f]">© ${new Date().getFullYear()} SearchMatch · Fútbol amateur en Chile</p>
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

// ===================== CAMPOS =====================

export function Campo({ id, label, ayuda, error, sufijo, inputRef, ...input }) {
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
export function OpcionTarjeta({ nombre, valor, seleccionado, onElegir, children, className = '' }) {
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

export function GrupoOpciones({ titulo, error, children }) {
  return html`
    <fieldset>
      <legend className="mb-2.5 text-xs font-bold tracking-[0.12em] text-[#b3b3b3]">${titulo}</legend>
      ${children}
      ${error && html`<p className="mt-2 text-xs text-red-400">${error}</p>`}
    </fieldset>`;
}

// ===================== ELEGIR TIPO DE CUENTA (jugador o equipo) =====================
// La usan el registro ("¿Cómo quieres empezar?") y la pantalla de después del login ("¿Cómo quieres entrar?").
// tipos: [{ id, titulo, icono, texto, beneficios: [3 textos], boton, insignia? }]

export function TarjetaTipo({ tipo, seleccionado, enfocable, radioRef, onElegir, onConfirmar, onTecla }) {
  return html`
    <div onClick=${onElegir}
      className=${`group relative flex cursor-pointer flex-col rounded-2xl border bg-[#101010] p-5 transition-all duration-200 ease-out
        hover:-translate-y-1 hover:border-neon/70 hover:shadow-[0_0_28px_-6px_rgba(57,255,20,.35)]
        motion-reduce:transition-none motion-reduce:hover:translate-y-0
        has-[[role=radio]:focus-visible]:ring-2 has-[[role=radio]:focus-visible]:ring-neon/70 has-[[role=radio]:focus-visible]:ring-offset-2 has-[[role=radio]:focus-visible]:ring-offset-ink
        sm:p-8 lg:min-h-[380px]
        ${seleccionado ? 'border-neon bg-gradient-to-b from-neon/[0.07] to-neon/[0.02] ring-1 ring-neon' : 'border-white/10'}`}>

      <!-- Check de seleccionada -->
      <span aria-hidden="true" className=${`absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full transition-all duration-200 sm:right-5 sm:top-5
        ${seleccionado ? 'scale-100 bg-neon text-black opacity-100' : 'scale-75 border border-white/15 opacity-100'}`}>
        ${seleccionado && html`<${Icono} nombre="check" className="text-[18px] font-bold" />`}
      </span>

      <!-- Zona de radio: ícono, título, descripción y beneficios -->
      <div ref=${radioRef} role="radio" aria-checked=${seleccionado} tabIndex=${enfocable ? 0 : -1}
        aria-label=${tipo.titulo} aria-describedby=${`tipo-${tipo.id}-texto`}
        onKeyDown=${onTecla} className="flex-1 rounded-lg outline-none">
        <span className="relative inline-grid">
          <span className=${`grid h-16 w-16 place-items-center rounded-full border-2 transition-transform duration-200 group-hover:scale-110 motion-reduce:group-hover:scale-100 sm:h-20 sm:w-20
            ${seleccionado ? 'border-neon bg-neon/10 text-neon' : 'border-neon/50 bg-white/[0.03] text-neon'}`}>
            <${Icono} nombre=${tipo.icono} relleno=${seleccionado} className="text-[34px] sm:text-[42px]" />
          </span>
          ${tipo.insignia && html`
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-neon/50 bg-ink px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-neon">
              ${tipo.insignia}
            </span>`}
        </span>

        <h2 className="mt-6 font-display text-2xl font-extrabold">${tipo.titulo}</h2>
        <p id=${`tipo-${tipo.id}-texto`} className="mt-2 text-[15px] leading-relaxed text-[#b3b3b3] sm:text-base">${tipo.texto}</p>

        <ul className="mt-5 space-y-2.5">
          ${tipo.beneficios.map((b, i) => html`
            <li key=${b} className=${`items-start gap-2.5 text-[15px] text-[#d4d4d4] ${i === 2 ? 'hidden sm:flex' : 'flex'}`}>
              <${Icono} nombre="check_circle" relleno className="mt-px text-[20px] text-neon" />${b}
            </li>`)}
        </ul>
      </div>

      <!-- Confirma y avanza (fuera del radio para no anidar controles) -->
      <div className="mt-7" onClick=${(e) => e.stopPropagation()}>
        ${seleccionado
          ? html`<${BotonPrincipal} onClick=${onConfirmar}>${tipo.boton}<//>`
          : html`<${BotonSecundario} onClick=${onConfirmar}>${tipo.boton}<//>`}
      </div>
    </div>`;
}

export function PantallaTipoCuenta({ tipos, tipoCuenta, setTipoCuenta, onConfirmar, etiqueta, titulo, subtitulo, children }) {
  const radios = useRef([]);

  // Flechas: cambia de tarjeta (y la selecciona). Espacio: selecciona. Enter: confirma
  function alTeclear(e, i) {
    const total = tipos.length;
    let destino = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') destino = (i + 1) % total;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') destino = (i - 1 + total) % total;
    if (destino !== null) {
      e.preventDefault();
      setTipoCuenta(tipos[destino].id);
      radios.current[destino].focus();
    } else if (e.key === ' ') {
      e.preventDefault();
      setTipoCuenta(tipos[i].id);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onConfirmar(tipos[i].id);
    }
  }

  // Si ninguna está elegida, la primera recibe el foco con Tab
  const indiceEnfocable = Math.max(0, tipos.findIndex((t) => t.id === tipoCuenta));

  return html`
    <div className="relative flex-1 overflow-hidden">
      <!-- Fondo: resplandor verde y líneas de cancha muy tenues -->
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,rgba(57,255,20,.08),transparent_70%)]" />
        <${Cancha} trazo="rgba(57,255,20,.06)" className="[mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      </div>

      <div className="relative mx-auto max-w-[1080px] px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:pt-20">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold tracking-[0.22em] text-neon">${etiqueta}</p>
          <h1 id="titulo-tipo" className="mt-4 font-display text-[34px] font-extrabold leading-[1.1] tracking-tight sm:text-[44px] lg:text-[56px]">
            ${titulo}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#b3b3b3]">
            ${subtitulo}
          </p>
        </header>

        <!-- Espacio para un aviso (ej. "Muy pronto" del perfil de equipo) -->
        ${children && html`<div className="mx-auto mt-8 max-w-[560px] lg:max-w-2xl">${children}</div>`}

        <div role="radiogroup" aria-labelledby="titulo-tipo"
          className="mx-auto mt-10 grid max-w-[560px] gap-6 sm:mt-12 lg:max-w-none lg:grid-cols-2">
          ${tipos.map((tipo, i) => html`
            <${TarjetaTipo} key=${tipo.id} tipo=${tipo} seleccionado=${tipoCuenta === tipo.id} enfocable=${i === indiceEnfocable}
              radioRef=${(el) => { radios.current[i] = el; }}
              onElegir=${() => setTipoCuenta(tipo.id)}
              onConfirmar=${() => onConfirmar(tipo.id)}
              onTecla=${(e) => alTeclear(e, i)} />`)}
        </div>
      </div>
    </div>`;
}

// ===================== ACCESO (inicio de sesión y registro) =====================

export const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const ERROR_CORREO = 'Ingresa un correo válido, por ejemplo tu@email.com.';

export const usaMenosMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Envía un formulario como application/x-www-form-urlencoded y devuelve la respuesta JSON
export async function enviarFormulario(url, datos) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(datos)
  });
  // Si ya tenía sesión abierta, el servidor redirige (ej. a la portada)
  if (r.redirected) {
    window.location.href = r.url;
    return null;
  }
  return r.json().catch(() => ({ ok: false, mensaje: 'Ocurrió un error. Inténtalo de nuevo.' }));
}

export function Aviso({ tipo, children }) {
  const error = tipo === 'error';
  return html`
    <div role=${error ? 'alert' : 'status'}
      className=${`flex items-start gap-2.5 rounded-lg border p-3 text-sm leading-relaxed
        ${error ? 'border-red-400/30 bg-red-400/10 text-red-300' : 'border-neon/30 bg-neon/[0.07] text-[#d9ffd0]'}`}>
      <${Icono} nombre=${error ? 'error' : 'check_circle'} className=${`mt-px text-[20px] ${error ? '' : 'text-neon'}`} />
      <span>${children}</span>
    </div>`;
}

// Campo con ícono a la izquierda; accion: botón a la derecha (ej. ojo); ayuda: texto gris debajo
export function CampoIcono({ id, label, icono, error, ayuda, accion, inputRef, ...input }) {
  return html`
    <div>
      <label htmlFor=${id} className="mb-1.5 block text-xs font-bold tracking-[0.12em] text-[#b3b3b3]">${label}</label>
      <div className="group relative">
        <${Icono} nombre=${icono}
          className=${`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] transition-colors duration-150 group-focus-within:text-neon
            ${error ? 'text-red-400' : 'text-[#8f8f8f]'}`} />
        <input id=${id} name=${id} ref=${inputRef} ...${input}
          aria-invalid=${Boolean(error)} aria-describedby=${error || ayuda ? `${id}-error` : undefined}
          className=${`h-[46px] w-full rounded-lg border bg-campo pl-11 text-[15px] text-white outline-none transition-[border-color,box-shadow] duration-150
            placeholder:text-[#6b6b6b] [color-scheme:dark] focus:ring-[3px] ${accion ? 'pr-12' : 'pr-3.5'}
            ${error
              ? 'border-red-400/70 focus:border-red-400 focus:ring-red-400/20'
              : 'border-white/10 hover:border-white/25 focus:border-neon focus:ring-neon/15'}`} />
        ${accion}
      </div>
      ${(error || ayuda) && html`
        <p id=${`${id}-error`} className=${`mt-1.5 text-xs ${error ? 'text-red-400' : 'text-[#8f8f8f]'}`}>${error || ayuda}</p>`}
    </div>`;
}

export function LogoGoogle() {
  return html`
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>`;
}

// Botón del ojo para mostrar u ocultar una contraseña (va en "accion" de CampoIcono)
export function BotonVerContrasena({ visible, onCambiar }) {
  return html`
    <button type="button" onClick=${onCambiar}
      aria-label=${visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed=${visible}
      className=${`absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-[#8f8f8f] transition-colors duration-150 hover:text-white ${FOCO}`}>
      <${Icono} nombre=${visible ? 'visibility_off' : 'visibility'} className="text-[20px]" />
    </button>`;
}

// Separador "o" + botón de Google (inicio de sesión y registro)
export function SeparadorGoogle({ texto }) {
  return html`
    <div className="my-6 flex items-center gap-4 text-sm text-[#8f8f8f]" aria-hidden="true">
      <span className="h-px flex-1 bg-white/10" />o<span className="h-px flex-1 bg-white/10" />
    </div>
    <a href="/auth/google"
      className=${`flex h-[46px] w-full items-center justify-center gap-3 rounded-lg border border-white/15 text-[15px] font-semibold text-[#e5e5e5]
        transition-colors duration-150 hover:border-white/30 hover:bg-white/[0.04] hover:text-white ${FOCO}`}>
      <${LogoGoogle} />${texto}
    </a>`;
}

// Pantalla completa de acceso (inicio de sesión y registro): header con el logo, la tarjeta centrada
// sobre el resplandor verde y las líneas de cancha, y el footer. saliendo: anima la salida al entrar
export function PantallaAcceso({ saliendo = false, ancho = 'max-w-[480px]', children }) {
  return html`
    <div className="flex min-h-screen flex-col">
      <${Header} />

      <main className=${`relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10 sm:px-6 sm:py-16
        ${saliendo ? 'animate-salir motion-reduce:animate-none' : ''}`}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(57,255,20,.09),transparent_70%)]" />
          <${Cancha} trazo="rgba(57,255,20,.06)" className="[mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        </div>

        <div className=${`relative w-full ${ancho}`}>
          <section aria-labelledby="titulo-tarjeta"
            className="w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-superficie/95 p-6 shadow-tarjeta backdrop-blur sm:p-10">
            ${children}
          </section>
        </div>
      </main>

      <${Footer} />
    </div>`;
}
