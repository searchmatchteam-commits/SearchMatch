// Carta de jugador estilo FIFA con la identidad de Search Match.
// <PlayerCard player={...} /> se puede reutilizar en el perfil, listados y alineaciones.
//
// player: { nombre, apellido, posicion ('delantero' | 'medio' | 'defensa' | 'arquero'),
//           stats?, altura?, peso?, foto?, pais? ('CL') }
// Si no trae stats, se calculan con calcularEstadisticas (solo posición + altura/peso; el nivel no influye).
import { html, useState, useEffect, useRef, useId } from './sitio.js';

// ===================== ESTADÍSTICAS =====================

export const ABREVIATURA_POSICION = { delantero: 'DEL', medio: 'MED', defensa: 'DEF', arquero: 'ARQ' };

export const NOMBRE_ESTADISTICA = {
  RIT: 'Ritmo', TIR: 'Tiro', PAS: 'Pase', REG: 'Regate', DEF: 'Defensa', 'FÍS': 'Físico',
  EST: 'Estirada', MAN: 'Manejo', SAQ: 'Saque', REF: 'Reflejos', VEL: 'Velocidad', COL: 'Colocación'
};

// Orden en la carta: las 3 primeras van a la izquierda, las otras 3 a la derecha
const CLAVES_CAMPO = ['RIT', 'TIR', 'PAS', 'REG', 'DEF', 'FÍS'];
const CLAVES_ARQUERO = ['EST', 'MAN', 'SAQ', 'REF', 'VEL', 'COL'];

const BASE = 60;
const AJUSTES = {
  delantero: { TIR: 12, RIT: 10, REG: 6, PAS: 2, DEF: -10, 'FÍS': 2 },
  medio: { PAS: 12, REG: 10, TIR: 4, RIT: 2, DEF: 2, 'FÍS': 2 },
  defensa: { DEF: 12, 'FÍS': 10, PAS: 2, RIT: 2, REG: -4, TIR: -8 },
  arquero: { REF: 10, EST: 10 }
};

// Cuánto pesa cada estadística en la valoración general, según la posición (cada fila suma 1)
const PESOS = {
  delantero: { TIR: 0.3, RIT: 0.2, REG: 0.2, PAS: 0.1, 'FÍS': 0.1, DEF: 0.1 },
  medio: { PAS: 0.3, REG: 0.2, TIR: 0.15, DEF: 0.15, RIT: 0.1, 'FÍS': 0.1 },
  defensa: { DEF: 0.35, 'FÍS': 0.25, PAS: 0.15, RIT: 0.1, TIR: 0.1, REG: 0.05 },
  arquero: { REF: 0.25, EST: 0.25, MAN: 0.15, COL: 0.15, SAQ: 0.1, VEL: 0.1 }
};

const limitar = (n, min, max) => Math.max(min, Math.min(max, n));

// Más alto o pesado que 175 cm / 72 kg → positivo; más bajo o liviano → negativo (máx. ±5)
function ajusteFisico(altura, peso) {
  if (!altura || !peso) return 0;
  return limitar(Math.round((altura - 175) / 6 + (peso - 72) / 8), -5, 5);
}

export function clavesDe(posicion) {
  return posicion === 'arquero' ? CLAVES_ARQUERO : CLAVES_CAMPO;
}

// Promedio ponderado de las 6 estadísticas según la posición
export function valoracionGeneral(posicion, stats) {
  const pesos = PESOS[posicion] || PESOS.medio;
  return Math.round(Object.entries(pesos).reduce((suma, [clave, peso]) => suma + (stats[clave] || 0) * peso, 0));
}

// Estadísticas iniciales: base 60 + ajuste por posición + un poco por altura y peso.
// Devuelve { stats: { RIT: 70, ... }, general }
export function calcularEstadisticas(posicion, altura, peso) {
  const pos = AJUSTES[posicion] ? posicion : 'medio';
  const stats = {};
  clavesDe(pos).forEach((clave) => { stats[clave] = BASE + (AJUSTES[pos][clave] || 0); });

  // Físico: en jugadores de campo suma a FÍS o a RIT; en arqueros a EST (alcance) o a VEL
  const fisico = ajusteFisico(altura, peso);
  const [masGrande, masChico] = pos === 'arquero' ? ['EST', 'VEL'] : ['FÍS', 'RIT'];
  if (fisico > 0) stats[masGrande] += fisico;
  if (fisico < 0) stats[masChico] += -fisico;

  Object.keys(stats).forEach((clave) => { stats[clave] = limitar(stats[clave], 1, 99); });
  return { stats, general: valoracionGeneral(pos, stats) };
}

// ===================== ANIMACIÓN =====================

export function usarMenosMovimiento() {
  const consulta = '(prefers-reduced-motion: reduce)';
  const [reducir, setReducir] = useState(() => window.matchMedia(consulta).matches);
  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const cambiar = () => setReducir(mq.matches);
    mq.addEventListener('change', cambiar);
    return () => mq.removeEventListener('change', cambiar);
  }, []);
  return reducir;
}

// Cuenta desde 0 hasta "objetivo" en "duracion" ms (si activo es false, muestra el valor final)
export function usarContador(objetivo, activo, duracion = 800) {
  const [valor, setValor] = useState(activo ? 0 : objetivo);
  useEffect(() => {
    if (!activo) { setValor(objetivo); return undefined; }
    let cuadro;
    const inicio = performance.now();
    const paso = (ahora) => {
      const t = Math.min(1, (ahora - inicio) / duracion);
      setValor(Math.round(objetivo * (1 - Math.pow(1 - t, 3))));  // frena al final
      if (t < 1) cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [objetivo, activo, duracion]);
  return valor;
}

// ===================== PIEZAS DE LA CARTA =====================

// Silueta de escudo con la esquina superior derecha recortada (viewBox 300 × 420)
const FORMA = 'M14 0 H232 L300 52 V352 Q300 364 289 369 L160 416 Q150 420 140 416 L11 369 Q0 364 0 352 V14 Q0 0 14 0 Z';
// La misma forma en % para recortar las capas de brillo con clip-path
const FORMA_POLIGONO = 'polygon(3% 0, 77.3% 0, 100% 12.4%, 100% 85%, 50% 100%, 0 85%, 0 3%)';

const BANDERAS = {
  CL: html`
    <svg viewBox="0 0 30 20" className="h-full w-full" aria-hidden="true">
      <rect width="30" height="10" fill="#fff" /><rect y="10" width="30" height="10" fill="#D52B1E" />
      <rect width="10" height="10" fill="#0039A6" />
      <path d="M5 2.2l.66 2.03h2.13L6.07 5.48l.66 2.03L5 6.26 3.27 7.51l.66-2.03-1.72-1.25h2.13z" fill="#fff" />
    </svg>`
};

function Bandera({ pais }) {
  return html`
    <span className="block aspect-[3/2] w-[11cqw] overflow-hidden rounded-[0.4cqw] ring-1 ring-white/20" title=${pais}>
      ${BANDERAS[pais] || html`<span className="grid h-full place-items-center bg-white/10 text-[3.5cqw] font-bold">${pais}</span>`}
    </span>`;
}

function LogoBalon({ className }) {
  return html`
    <svg viewBox="0 0 24 24" className=${className} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 7.2l4.2 3-1.6 4.9H9.4l-1.6-4.9z" fill="currentColor" stroke="none" />
      <path d="M12 2.5v4.7M16.2 10.2l4.4-1.6M14.6 15.1l2.8 3.9M9.4 15.1l-2.8 3.9M7.8 10.2 3.4 8.6" />
    </svg>`;
}

// Silueta gris cuando el jugador no tiene foto
function Silueta() {
  return html`
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="silueta-gris" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3a3a" /><stop offset="1" stopColor="#1c1c1c" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="70" r="38" fill="url(#silueta-gris)" />
      <path d="M28 200c0-46 32-78 72-78s72 32 72 78z" fill="url(#silueta-gris)" />
    </svg>`;
}

function FilaEstadistica({ clave, valor, animar }) {
  const mostrado = usarContador(valor, animar);
  return html`
    <div className="flex items-baseline gap-[2.2cqw]">
      <span className="w-[9cqw] text-right font-condensada text-[8cqw] font-bold leading-none text-white tabular-nums">${mostrado}</span>
      <span className="font-condensada text-[6.2cqw] font-semibold leading-none tracking-wide text-[#c8c8c8]">${clave}</span>
    </div>`;
}

// ===================== CARTA =====================

export function PlayerCard({ player, interactivo = true, animar = true, onSubirFoto, cartaRef }) {
  const reducir = usarMenosMovimiento();
  const conMovimiento = animar && !reducir;
  const conTilt = interactivo && !reducir;

  const ids = useId().replace(/:/g, '');
  const escena = useRef(null);
  const giro = useRef(null);

  const posicion = ABREVIATURA_POSICION[player.posicion] ? player.posicion : 'medio';
  const { stats, general } = player.stats
    ? { stats: player.stats, general: valoracionGeneral(posicion, player.stats) }
    : calcularEstadisticas(posicion, player.altura, player.peso);
  const claves = clavesDe(posicion);
  const generalMostrado = usarContador(general, conMovimiento);

  // Foto "recortada" (PNG/WebP sin fondo): sobresale por arriba. Foto normal: va dentro de la carta
  const recortada = Boolean(player.foto) && /[?&]recorte=1/.test(player.foto);
  const apellido = (player.apellido || player.nombre || '').toUpperCase();
  const tamanoApellido = Math.min(12, 118 / Math.max(apellido.length, 1));  // apellidos largos se achican

  // Inclinación 3D: sigue al mouse o al dedo (máx. ±12°) y mueve el brillo
  function inclinar(x, y) {
    const el = giro.current;
    if (!el) return;
    el.style.transform = `rotateX(${(0.5 - y) * 24}deg) rotateY(${(x - 0.5) * 24}deg)`;
    el.style.setProperty('--gx', `${x * 100}%`);
    el.style.setProperty('--gy', `${y * 100}%`);
    el.style.setProperty('--brillo', '1');
  }
  function soltar() {
    const el = giro.current;
    if (!el) return;
    el.style.transform = '';
    el.style.setProperty('--brillo', '0');
  }
  function alMover(e) {
    if (!conTilt) return;
    const r = escena.current.getBoundingClientRect();
    inclinar(limitar((e.clientX - r.left) / r.width, 0, 1), limitar((e.clientY - r.top) / r.height, 0, 1));
  }

  // En celulares con giroscopio (Android): la carta se inclina al mover el teléfono.
  // En iPhone hace falta pedir permiso con un toque, así que ahí solo se usa el dedo
  useEffect(() => {
    if (!conTilt || !window.matchMedia('(hover: none)').matches || !('DeviceOrientationEvent' in window)) return undefined;
    if (typeof DeviceOrientationEvent.requestPermission === 'function') return undefined;
    const alOrientar = (e) => {
      if (e.gamma === null || e.beta === null) return;
      inclinar(0.5 + limitar(e.gamma / 60, -0.5, 0.5), 0.5 + limitar((e.beta - 45) / 60, -0.5, 0.5));
    };
    window.addEventListener('deviceorientation', alOrientar);
    return () => window.removeEventListener('deviceorientation', alOrientar);
  }, [conTilt]);

  return html`
    <div ref=${escena} className="w-full select-none pt-[13%] [perspective:1100px]"
      onPointerMove=${alMover} onPointerLeave=${soltar} onPointerCancel=${soltar}>
      <div className=${conMovimiento ? 'animate-voltear' : ''}>
        <div ref=${giro} className="transition-transform duration-200 ease-out [transform-style:preserve-3d] will-change-transform">
          <div ref=${cartaRef} role="group"
            aria-label=${`Carta de ${player.nombre || ''} ${player.apellido || ''}: ${general} de valoración, ${ABREVIATURA_POSICION[posicion]}`}
            className="relative aspect-[300/420] w-full [container-type:inline-size]">

            <!-- Fondo, borde neón y textura -->
            <svg viewBox="0 0 300 420" preserveAspectRatio="none" aria-hidden="true"
              className="absolute inset-0 h-full w-full overflow-visible [filter:drop-shadow(0_0_10px_rgba(57,255,20,.35))]">
              <defs>
                <linearGradient id=${`${ids}-fondo`} x1="0" y1="0" x2="0.4" y2="1">
                  <stop offset="0" stopColor="#1A1A1A" /><stop offset="1" stopColor="#0B0B0B" />
                </linearGradient>
                <radialGradient id=${`${ids}-luz`} cx="0.6" cy="0.28" r="0.55">
                  <stop offset="0" stopColor="#39FF14" stopOpacity="0.16" /><stop offset="1" stopColor="#39FF14" stopOpacity="0" />
                </radialGradient>
                <pattern id=${`${ids}-trama`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="10" stroke="#39FF14" strokeOpacity="0.06" strokeWidth="1.2" />
                </pattern>
                <clipPath id=${`${ids}-forma`}><path d=${FORMA} /></clipPath>
              </defs>
              <path d=${FORMA} fill=${`url(#${ids}-fondo)`} />
              <g clipPath=${`url(#${ids}-forma)`}>
                <rect width="300" height="420" fill=${`url(#${ids}-trama)`} />
                <rect width="300" height="420" fill=${`url(#${ids}-luz)`} />
                <!-- Líneas de cancha muy tenues -->
                <g fill="none" stroke="#39FF14" strokeOpacity="0.08" strokeWidth="1.2">
                  <line x1="0" y1="250" x2="300" y2="250" />
                  <circle cx="150" cy="250" r="46" />
                  <rect x="70" y="340" width="160" height="90" />
                </g>
              </g>
              <path d=${FORMA} fill="none" stroke="#39FF14" strokeWidth="2.5" />
              <path d=${FORMA} fill="none" stroke="#39FF14" strokeOpacity="0.25" strokeWidth="1"
                transform="translate(150 210) scale(0.95) translate(-150 -210)" />
            </svg>

            <!-- Foto o silueta -->
            ${player.foto
              ? recortada
                ? html`
                  <img src=${player.foto} alt="" crossOrigin="anonymous" draggable="false"
                    className="absolute left-[24%] right-[3%] top-[-9%] h-[67%] w-[73%] object-contain object-bottom [filter:drop-shadow(0_6px_10px_rgba(0,0,0,.6))] [mask-image:linear-gradient(to_bottom,black_82%,transparent)]" />`
                : html`
                  <div className="absolute inset-0 overflow-hidden" style=${{ clipPath: FORMA_POLIGONO }}>
                    <img src=${player.foto} alt="" crossOrigin="anonymous" draggable="false"
                      className="absolute left-[22%] right-0 top-0 h-[62%] w-[78%] object-cover object-[50%_25%] [mask-image:radial-gradient(ellipse_62%_70%_at_58%_38%,black_55%,transparent_100%)]" />
                  </div>`
              : html`
                <div className="absolute left-[27%] right-[6%] top-[-4%] h-[60%] opacity-90">
                  <div className="h-full [mask-image:linear-gradient(to_bottom,black_75%,transparent)]"><${Silueta} /></div>
                  ${onSubirFoto && html`
                    <button type="button" onClick=${onSubirFoto}
                      className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-neon/50 bg-black/70 px-[4cqw] py-[1.8cqw] text-[4.4cqw] font-semibold text-neon backdrop-blur transition-colors duration-150 hover:bg-neon hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon">
                      Subir foto
                    </button>`}
                </div>`}

            <!-- Columna superior izquierda: valoración, posición, bandera y logo -->
            <div className="absolute left-[7%] top-[7%] flex w-[19%] flex-col items-center gap-[1.6cqw]">
              <span className="font-condensada text-[19cqw] font-extrabold leading-[0.82] text-neon tabular-nums [text-shadow:0_0_14px_rgba(57,255,20,.45)]">${generalMostrado}</span>
              <span className="font-condensada text-[7.4cqw] font-semibold leading-none tracking-wider text-white">${ABREVIATURA_POSICION[posicion]}</span>
              <span className="h-px w-[70%] bg-white/20" />
              <${Bandera} pais=${player.pais || 'CL'} />
              <${LogoBalon} className="w-[8cqw] text-neon" />
            </div>

            <!-- Apellido y línea divisoria -->
            <p className="absolute inset-x-[6%] top-[57.5%] truncate text-center font-condensada font-bold uppercase leading-none tracking-wide text-white"
              style=${{ fontSize: `${tamanoApellido}cqw` }}>${apellido}</p>
            <span className="absolute left-[14%] right-[14%] top-[69%] h-px bg-gradient-to-r from-transparent via-neon/80 to-transparent" />

            <!-- 6 estadísticas en 2 columnas -->
            <div className="absolute left-[15%] right-[13%] top-[71.5%] grid grid-cols-2">
              ${[claves.slice(0, 3), claves.slice(3)].map((columna, i) => html`
                <div key=${i} className=${`flex flex-col gap-[1.6cqw] ${i === 0 ? 'border-r border-white/15 pr-[4cqw]' : 'pl-[6cqw]'}`}>
                  ${columna.map((clave) => html`<${FilaEstadistica} key=${clave} clave=${clave} valor=${stats[clave]} animar=${conMovimiento} />`)}
                </div>`)}
            </div>

            <!-- Rayo en la base -->
            <svg viewBox="0 0 24 24" className="absolute bottom-[3.2%] left-1/2 w-[5cqw] -translate-x-1/2 text-neon" fill="currentColor" aria-hidden="true">
              <path d="M13.5 2 4 13.5h6.5L9.5 22 20 9.5h-6.5z" />
            </svg>

            <!-- Brillo que sigue al cursor (inclinación 3D) -->
            ${conTilt && html`
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 transition-opacity duration-300"
                style=${{
                  clipPath: FORMA_POLIGONO,
                  opacity: 'var(--brillo, 0)',
                  background: 'radial-gradient(circle at var(--gx, 50%) var(--gy, 30%), rgba(255,255,255,.18), rgba(57,255,20,.07) 30%, transparent 60%)'
                }} />`}

            <!-- Destello verde que cruza la carta al aparecer -->
            ${conMovimiento && html`
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" style=${{ clipPath: FORMA_POLIGONO }}>
                <div className="absolute inset-y-0 left-0 w-[45%] animate-destello bg-gradient-to-r from-transparent via-neon/30 to-transparent" />
              </div>`}
          </div>
        </div>
      </div>
    </div>`;
}
