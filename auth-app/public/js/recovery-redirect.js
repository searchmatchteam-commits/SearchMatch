// Si Supabase manda el enlace de recuperación a la portada (cuando /reset-password
// no está en sus "Redirect URLs"), lo reenviamos a la página correcta con los tokens.
// Vive en su propio archivo para que ningún EJS lleve etiquetas <script>.
if (window.location.hash.includes('type=recovery')) {
  window.location.replace('/reset-password' + window.location.hash);
}
