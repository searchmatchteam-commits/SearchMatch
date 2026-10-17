// Configuración de Tailwind (CDN) para el registro: verde neón solo como acento, transiciones cortas
tailwind.config = {
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0a',          // fondo de la página
        superficie: '#111111',   // tarjetas
        campo: '#161616',        // inputs
        neon: '#39FF14',         // acento: botón principal, enlaces, estados activos
        'neon-suave': '#2fd610'  // hover del botón principal
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Montserrat', 'sans-serif'],
        condensada: ['"Barlow Condensed"', 'sans-serif']  // carta de jugador
      },
      maxWidth: {
        contenido: '1280px',
        tarjeta: '560px'
      },
      boxShadow: {
        tarjeta: '0 24px 48px -24px rgba(0,0,0,.8)',
        boton: '0 8px 20px -8px rgba(57,255,20,.55)',
        halo: '0 0 0 8px rgba(57,255,20,.08), 0 0 28px rgba(57,255,20,.3)'
      },
      keyframes: {
        // Cambio de paso dentro de la tarjeta
        entrar: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        // Cambio de pantalla del registro: fade + slide horizontal (adelante / atrás)
        deslizar: {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        'deslizar-atras': {
          '0%': { opacity: '0', transform: 'translateX(-24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        // Salida de la pantalla de acceso al entrar a la cuenta
        salir: {
          '0%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(-24px)' }
        },
        // Entrada de una página (ej. el perfil al venir desde la confirmación)
        'entrar-pagina': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        // Carta de jugador: se da vuelta al aparecer
        voltear: {
          '0%': { opacity: '0', transform: 'rotateY(90deg)' },
          '100%': { opacity: '1', transform: 'rotateY(0)' }
        },
        // Destello verde que cruza la carta una vez
        destello: {
          '0%': { transform: 'translateX(-130%) skewX(-18deg)', opacity: '0' },
          '15%': { opacity: '1' },
          '100%': { transform: 'translateX(230%) skewX(-18deg)', opacity: '0' }
        },
        // Check de la confirmación (escala + fundido)
        aparecer: {
          '0%': { opacity: '0', transform: 'scale(.6)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      },
      animation: {
        entrar: 'entrar .2s ease-out both',
        aparecer: 'aparecer .4s cubic-bezier(.34,1.4,.64,1) both',
        'entrar-pagina': 'entrar-pagina .3s ease-out both',
        deslizar: 'deslizar .25s ease-out both',
        salir: 'salir .25s ease-in both',
        'deslizar-atras': 'deslizar-atras .25s ease-out both',
        voltear: 'voltear .7s cubic-bezier(.22,1,.36,1) both',
        destello: 'destello .9s .55s ease-out both'
      }
    }
  }
};
