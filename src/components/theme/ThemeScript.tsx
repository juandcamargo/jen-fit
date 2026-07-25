const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('jenfit-theme');
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
    }
  } catch (e) {}
})();
`;

/** Runs before paint to avoid a light/dark flash on load. */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
}
