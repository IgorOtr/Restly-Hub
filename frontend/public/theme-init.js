/* Aplica o tema antes da renderização para evitar flash (arquivo externo: compatível com CSP sem 'unsafe-inline'). */
try {
  var t = localStorage.getItem('restly-theme') || 'system';
  var dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) document.documentElement.classList.add('dark');
} catch (e) {}
