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
        display: ['Montserrat', 'sans-serif']
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
        // Check de la confirmación (escala + fundido)
        aparecer: {
          '0%': { opacity: '0', transform: 'scale(.6)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      },
      animation: {
        entrar: 'entrar .2s ease-out both',
        aparecer: 'aparecer .4s cubic-bezier(.34,1.4,.64,1) both'
      }
    }
  }
};
