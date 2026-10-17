// Registro de SearchMatch en React.
// Pantalla 0: elegir tipo de cuenta (jugador o equipo). Luego, el flujo de cada tipo:
//   Jugador: 1) datos personales, 2) perfil deportivo, 3) ¡Todo listo! → carta de jugador (/users/perfil)
//   Equipo:  1) crea tu equipo, 2) configura tu equipo, 3) confirmación (ver registro-equipo.js)
// Las piezas compartidas con el perfil (header, footer, botones, campos) están en sitio.js.
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client?deps=react@18.3.1';
import {
  html, useState, useEffect, useRef, FOCO, ENLACE, POSICIONES,
  Icono, BotonPrincipal, BotonSecundario, Header, Footer, Campo, OpcionTarjeta, GrupoOpciones, Cancha, PantallaTipoCuenta
} from './sitio.js';
import { FlujoEquipo, VistaPreviaEquipo, equipoInicial } from './registro-equipo.js';

const RAIZ = document.getElementById('onboarding');
const HOY = RAIZ.dataset.hoy;
const DASHBOARD = '/users/dashboard';
const RUTA_PERFIL = '/users/perfil';

// Tipo de cuenta: 'player' | 'team'. Al servidor se manda como rol 'jugador' | 'equipo'
const ROL_SERVIDOR = { player: 'jugador', team: 'equipo' };

const PASOS = {
  player: ['Datos personales', 'Perfil deportivo', 'Confirmación'],
  team: ['Crea tu equipo', 'Configura tu equipo', 'Confirmación']
};
const CAMPOS_DATOS = ['nombre', 'apellido', 'fecha_nacimiento', 'altura', 'peso'];

// Tarjetas de la pantalla 0 (la pantalla está en sitio.js, compartida con la de después del login)
const TIPOS_CUENTA = [
  {
    id: 'player', titulo: 'Soy jugador', icono: 'apparel', boton: 'Continuar como jugador',
    texto: 'Crea tu perfil, obtén tu carta de jugador y encuentra partidos cerca de ti.',
    beneficios: ['Tu propia carta de jugador', 'Únete a partidos de tu zona', 'Encuentra equipos que buscan jugadores']
  },
  {
    id: 'team', titulo: 'Soy equipo', icono: 'shield', boton: 'Continuar como equipo', insignia: 'CAPITÁN',
    texto: 'Registra tu escuadra, organiza partidos y encuentra rivales de tu nivel.',
    beneficios: ['Perfil e identidad de tu club', 'Rivales al instante según tu zona y nivel', 'Gestión de tu escuadra en un solo lugar']
  }
];

// ===================== PANEL DE MARCA (columna izquierda de cada flujo) =====================

const MARCA = {
  player: {
    titulo: 'Encuentra tu próximo partido',
    texto: 'Crea tu perfil en pocos pasos y empieza a jugar con gente de tu nivel.',
    beneficios: [
      { icono: 'groups', titulo: 'Encuentra jugadores de tu nivel', texto: 'Te conectamos con equipos y rivales parecidos a ti.' },
      { icono: 'schedule', titulo: 'Organiza partidos en minutos', texto: 'Cancha, hora y jugadores en un solo lugar.' },
      { icono: 'badge', titulo: 'Crea tu perfil deportivo', texto: 'Tu posición en cancha, lista para que te inviten.' }
    ]
  },
  team: {
    titulo: 'Lleva a tu equipo al siguiente nivel',
    texto: 'Registra tu escuadra y empieza a jugar contra equipos de tu zona.',
    beneficios: [
      { icono: 'shield', titulo: 'Perfil e identidad de tu club', texto: 'Nombre, escudo y colores de tu equipo.' },
      { icono: 'swords', titulo: 'Rivales al instante', texto: 'Según tu zona y tu nivel de juego.' },
      { icono: 'groups', titulo: 'Gestiona tu escuadra', texto: 'Jugadores, partidos y desafíos en un solo lugar.' }
    ]
  }
};

const PROXIMOS_PASOS = [
  { titulo: 'Completa tu perfil con foto', texto: 'Así los equipos te reconocen en la cancha.' },
  { titulo: 'Explora partidos cerca de ti', texto: 'Únete a un partido o arma uno nuevo.' },
  { titulo: 'Invita a tus amigos', texto: 'Mientras más jueguen, más fácil es armar equipo.' }
];

// extra: contenido debajo de los beneficios (ej. la vista previa del equipo)
function PanelMarca({ tipoCuenta, listo, extra }) {
  const marca = MARCA[tipoCuenta];
  return html`
    <aside className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#0f1a0f] via-[#0c110c] to-[#0a0a0a] lg:sticky lg:top-24 lg:min-h-[620px]">
      <${Cancha} />
      <!-- Overlay para que el texto se lea sobre la cancha -->
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent" />
      <div aria-hidden="true" className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-neon/[0.07] blur-3xl" />

      <div className="relative flex h-full flex-col p-6 sm:p-8 lg:min-h-[620px] lg:p-10">
        <p className="text-xs font-bold tracking-[0.22em] text-neon">SEARCH MATCH · ${tipoCuenta === 'team' ? 'EQUIPOS' : 'REGISTRO'}</p>
        <h1 className="mt-3 font-display text-[28px] font-extrabold leading-[1.1] tracking-tight sm:text-[36px] lg:mt-5 lg:text-[48px] xl:text-[52px]">
          ${listo ? '¡Bienvenido a Search Match!' : marca.titulo}
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#b3b3b3] sm:text-base">
          ${listo ? 'Tu perfil ya está listo. Esto es lo que te recomendamos hacer ahora.' : marca.texto}
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
                ${marca.beneficios.map((b) => html`
                  <li key=${b.titulo} className="flex gap-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-neon">
                      <${Icono} nombre=${b.icono} className="text-[20px]" />
                    </span>
                    <div>
                      <p className="font-semibold text-white">${b.titulo}</p>
                      <p className="mt-0.5 text-sm text-[#a3a3a3]">${b.texto}</p>
                    </div>
                  </li>`)}
              </ul>
              ${extra}`}
        </div>
      </div>
    </aside>`;
}

// ===================== STEPPER =====================

// pasos: nombres de los pasos del flujo. indice: paso actual. En la confirmación todos quedan completados
function Stepper({ pasos, indice, todoListo = false }) {
  return html`
    <div>
      <ol className="flex" aria-label="Progreso del registro">
        ${pasos.map((texto, i) => {
          const hecho = todoListo || i < indice;
          const actual = !todoListo && i === indice;
          return html`
            <li key=${texto} className="relative flex flex-1 flex-col items-center" aria-current=${actual ? 'step' : undefined}>
              ${i < pasos.length - 1 && html`
                <span aria-hidden="true"
                  className=${`absolute left-[calc(50%+22px)] right-[calc(-50%+22px)] top-3.5 h-px transition-colors duration-200 ${hecho ? 'bg-neon/60' : 'bg-white/10'}`} />`}
              <span className=${`grid h-7 w-7 place-items-center rounded-full text-[13px] font-bold transition-colors duration-200
                ${hecho ? 'bg-neon text-black' : actual ? 'border-2 border-neon text-neon' : 'border border-white/20 text-[#8f8f8f]'}`}>
                ${hecho ? html`<${Icono} nombre="check" className="text-[16px] font-bold" />` : i + 1}
              </span>
              <span className=${`mt-2 hidden text-center text-xs font-semibold sm:block
                ${actual ? 'text-white' : hecho ? 'text-[#d4d4d4]' : 'text-[#8f8f8f]'}`}>${texto}</span>
            </li>`;
        })}
      </ol>
      <!-- En celular las etiquetas no caben: se muestra solo la del paso actual -->
      <p className="mt-3 text-xs font-semibold text-[#a3a3a3] sm:hidden">
        ${todoListo ? 'Registro completado' : `Paso ${indice + 1} de ${pasos.length} · ${pasos[indice]}`}
      </p>
    </div>`;
}

// ===================== FLUJO DE JUGADOR =====================

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
    <//>`;
}

function Confirmacion({ datos }) {
  const posicion = POSICIONES.find((p) => p.id === datos.posicion);

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
          <p className="text-sm text-[#a3a3a3]">${posicion ? posicion.texto : ''}</p>
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
  } else if (!d.posicion) {
    errores.posicion = 'Elige tu posición.';
  }
  return errores;
}

const TITULOS_JUGADOR = [
  { titulo: 'Datos personales', sub: 'Cuéntanos quién eres. Solo te tomará un minuto.' },
  { titulo: 'Perfil deportivo', sub: '¿Dónde juegas? Así te mostramos partidos y equipos a tu medida.' }
];

// paso: 0 datos, 1 deportivo, 2 confirmación
function FlujoJugador({ paso, irAPaso, onVolverAlTipo, datos, setDatos }) {
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);

  // Al escribir o elegir, se borra el error de ese campo
  const cambiar = (campo, valor) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  function volver() {
    setMensaje(null);
    setErrores({});
    if (paso === 0) onVolverAlTipo();
    else irAPaso(paso - 1, 'atras');
  }

  async function enviar(e) {
    e.preventDefault();
    if (enviando) return;

    const erroresPaso = validarPaso(paso, datos);
    setErrores(erroresPaso);
    setMensaje(null);
    if (Object.keys(erroresPaso).length > 0) return;

    if (paso === 0) {
      irAPaso(1);
      return;
    }

    setEnviando(true);
    try {
      const respuesta = await fetch('/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ ...datos, rol: ROL_SERVIDOR.player })
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
        if (CAMPOS_DATOS.some((c) => erroresServidor[c])) irAPaso(0, 'atras');
        return;
      }
      irAPaso(2);
    } catch {
      setMensaje('Sin conexión con el servidor. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  if (paso === 2) return html`<${Confirmacion} datos=${datos} />`;

  return html`
    <form noValidate onSubmit=${enviar}>
      <h2 id="titulo-tarjeta" className="font-display text-[28px] font-extrabold leading-tight tracking-tight sm:text-[30px]">
        ${TITULOS_JUGADOR[paso].titulo}
      </h2>
      <p className="mt-1.5 text-[15px] text-[#a3a3a3]">${TITULOS_JUGADOR[paso].sub}</p>

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
        <${BotonSecundario} icono="arrow_back" onClick=${volver}>Volver<//>
        <${BotonPrincipal} type="submit" cargando=${enviando}>
          ${paso === 0 ? 'Continuar' : enviando ? 'Creando perfil...' : 'Crear perfil'}
        <//>
      </div>
    </form>`;
}

// ===================== APP =====================

function App() {
  const [pantalla, setPantalla] = useState('tipo');      // 'tipo' | 'flujo'
  // 'player' | 'team'. Llega preseleccionado si lo eligió en el login, y queda recordado al volver
  const [tipoCuenta, setTipoCuenta] = useState(['player', 'team'].includes(RAIZ.dataset.tipo) ? RAIZ.dataset.tipo : null);
  const [paso, setPaso] = useState(0);
  const [direccion, setDireccion] = useState('adelante');
  const [datos, setDatos] = useState({
    nombre: '', apellido: '', fecha_nacimiento: RAIZ.dataset.fecha || '', altura: '', peso: '', posicion: ''
  });
  const [equipo, setEquipo] = useState(() => equipoInicial(RAIZ.dataset.correo || ''));
  const comunas = useRef(JSON.parse(RAIZ.dataset.comunas || '[]')).current;
  const tarjeta = useRef(null);

  // Al cambiar de pantalla o paso: arriba del todo, o a la tarjeta si quedó fuera de vista (celular)
  useEffect(() => {
    if (pantalla === 'tipo') window.scrollTo({ top: 0 });
    else if (tarjeta.current && tarjeta.current.getBoundingClientRect().top < 0) {
      tarjeta.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [pantalla, paso]);

  function irA(nuevaPantalla, nuevoPaso, dir = 'adelante') {
    setDireccion(dir);
    setPantalla(nuevaPantalla);
    setPaso(nuevoPaso);
  }

  const confirmarTipo = (id) => { setTipoCuenta(id); irA('flujo', 0); };
  const volverAlTipo = () => irA('tipo', 0, 'atras');

  const animacion = `motion-reduce:animate-none ${direccion === 'atras' ? 'animate-deslizar-atras' : 'animate-deslizar'}`;
  const confirmado = paso === 2;                       // último paso de cualquiera de los dos flujos
  const listo = tipoCuenta === 'player' && confirmado;  // el panel de marca cambia a "¡Bienvenido…!"
  const irAPaso = (n, dir) => irA('flujo', n, dir);

  return html`
    <div className="flex min-h-screen flex-col">
      <${Header} />

      ${pantalla === 'tipo'
        ? html`
          <main key="tipo" className=${`flex flex-1 flex-col ${animacion}`}>
            <${PantallaTipoCuenta} tipos=${TIPOS_CUENTA} tipoCuenta=${tipoCuenta} setTipoCuenta=${setTipoCuenta} onConfirmar=${confirmarTipo}
              etiqueta="SEARCH MATCH · REGISTRO" titulo="¿Cómo quieres empezar?"
              subtitulo="Elige cómo vas a usar Search Match. Podrás cambiarlo más adelante." />
          </main>`
        : html`
          <main key=${`flujo-${tipoCuenta}`}
            className=${`mx-auto grid w-full max-w-contenido flex-1 gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-12 lg:items-start lg:gap-12 lg:px-8 lg:py-14 ${animacion}`}>
            <div className="lg:col-span-5">
              <${PanelMarca} tipoCuenta=${tipoCuenta} listo=${listo}
                extra=${tipoCuenta === 'team' && html`<${VistaPreviaEquipo} equipo=${equipo} />`} />
            </div>

            <div className="flex flex-col items-center lg:col-span-7 lg:min-h-[620px] lg:justify-center">
              <section ref=${tarjeta} aria-labelledby="titulo-tarjeta"
                className="w-full max-w-tarjeta scroll-mt-20 rounded-2xl border border-white/[0.08] bg-superficie p-5 shadow-tarjeta sm:p-8 lg:p-10">
                <${Stepper} pasos=${PASOS[tipoCuenta]} indice=${paso} todoListo=${confirmado} />

                <div key=${paso} className=${`mt-8 ${animacion}`}>
                  ${tipoCuenta === 'player'
                    ? html`<${FlujoJugador} paso=${paso} irAPaso=${irAPaso}
                        onVolverAlTipo=${volverAlTipo} datos=${datos} setDatos=${setDatos} />`
                    : html`<${FlujoEquipo} paso=${paso} irAPaso=${irAPaso} onVolverAlTipo=${volverAlTipo}
                        equipo=${equipo} setEquipo=${setEquipo} comunas=${comunas} />`}
                </div>
              </section>

              ${!confirmado && html`
                <p className="mt-6 text-center text-sm text-[#a3a3a3]">
                  ¿No es lo que buscabas?${' '}
                  <button type="button" onClick=${volverAlTipo} className=${`cursor-pointer ${ENLACE}`}>Cambiar tipo de cuenta</button>
                </p>`}
            </div>
          </main>`}

      <${Footer} />
    </div>`;
}

createRoot(RAIZ).render(html`<${App} />`);
