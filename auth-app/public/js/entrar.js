// Después de iniciar sesión: elegir si entrar como jugador o como equipo.
// Jugador → su carta (/users/perfil). Equipo → el perfil de equipo aún no existe: se muestra "muy pronto".
// La pantalla de las tarjetas está en sitio.js (es la misma del registro).
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client?deps=react@18.3.1';
import { html, useState, Icono, BotonSecundario, Header, Footer, PantallaTipoCuenta } from './sitio.js';

const RAIZ = document.getElementById('entrar');
const RUTA_JUGADOR = '/users/perfil';

const TIPOS = [
  {
    id: 'player', titulo: 'Soy jugador', icono: 'apparel', boton: 'Entrar como jugador',
    texto: 'Tu carta, tus partidos y los equipos que buscan jugadores.',
    beneficios: ['Tu carta de jugador', 'Partidos de tu zona', 'Equipos que buscan jugadores']
  },
  {
    id: 'team', titulo: 'Soy equipo', icono: 'shield', boton: 'Entrar como equipo', insignia: 'CAPITÁN',
    texto: 'El perfil de tu club, tu escuadra y los rivales de tu nivel.',
    beneficios: ['Perfil e identidad de tu club', 'Rivales según tu zona y nivel', 'Gestión de tu escuadra']
  }
];

const usaMenosMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function AvisoEquipo({ onComoJugador }) {
  return html`
    <div role="status" className="flex animate-deslizar flex-col gap-4 rounded-2xl border border-white/10 bg-superficie p-5 motion-reduce:animate-none sm:flex-row sm:items-center sm:p-6">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-neon/30 bg-neon/[0.06] text-neon">
        <${Icono} nombre="construction" className="text-[22px]" />
      </span>
      <div className="flex-1">
        <p className="font-semibold">El perfil de equipo llega muy pronto</p>
        <p className="mt-1 text-sm leading-relaxed text-[#a3a3a3]">Mientras tanto, puedes entrar como jugador.</p>
      </div>
      <div className="shrink-0">
        <${BotonSecundario} onClick=${onComoJugador}>Entrar como jugador<//>
      </div>
    </div>`;
}

function App() {
  const [tipoCuenta, setTipoCuenta] = useState(['player', 'team'].includes(RAIZ.dataset.tipo) ? RAIZ.dataset.tipo : null);
  const [avisoEquipo, setAvisoEquipo] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  // Jugador: la pantalla sale con fade + slide y abre su carta
  function entrarComoJugador() {
    setTipoCuenta('player');
    setSaliendo(true);
    setTimeout(() => { window.location.href = RUTA_JUGADOR; }, usaMenosMovimiento() ? 0 : 250);
  }

  function confirmar(id) {
    setTipoCuenta(id);
    if (id === 'player') entrarComoJugador();
    else setAvisoEquipo(true);
  }

  return html`
    <div className="flex min-h-screen flex-col">
      <${Header} />
      <main className=${`flex flex-1 flex-col animate-deslizar motion-reduce:animate-none ${saliendo ? '!animate-salir' : ''}`}>
        <${PantallaTipoCuenta} tipos=${TIPOS} tipoCuenta=${tipoCuenta}
          setTipoCuenta=${(id) => { setTipoCuenta(id); if (id === 'player') setAvisoEquipo(false); }}
          onConfirmar=${confirmar}
          etiqueta="SEARCH MATCH · ACCESO" titulo="¿Cómo quieres entrar?"
          subtitulo="Elige con qué perfil quieres usar Search Match hoy.">
          ${avisoEquipo && html`<${AvisoEquipo} onComoJugador=${entrarComoJugador} />`}
        <//>
      </main>
      <${Footer} />
    </div>`;
}

createRoot(RAIZ).render(html`<${App} />`);
