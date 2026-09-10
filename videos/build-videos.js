const fs = require('fs');
const path = require('path');
const Babel = require('/home/claude/ademicon-site/videos/vendor/babel.min.js');

const DIR = '/home/claude/ademicon-site/videos';
const read = (f) => fs.readFileSync(path.join(DIR, f), 'utf8');

// `</script` dentro de comentários/strings encerra a tag <script> mais cedo.
const esc = (js) => js.replace(/<\/script/gi, '<\\/script');

function compile(file) {
  const src = read(file);
  const js = Babel.transform(src, { presets: [['react', { runtime: 'classic' }]], filename: file }).code;
  // cada módulo em seu próprio escopo (evita colisão de nomes entre as cenas e o runtime)
  return esc('(function(){\n' + js + '\n})();');
}

const dsCss = read('ds-styles.css');

// runtime compartilhado, gravado uma vez e reaproveitado pelas três páginas
fs.mkdirSync(path.join(DIR, 'build'), { recursive: true });
fs.writeFileSync(path.join(DIR, 'build/animations-v3.js'), compile('animations-v3.jsx'));
fs.writeFileSync(path.join(DIR, 'build/tweaks-panel.js'), compile('tweaks-panel.jsx'));

// lê OM_SCENES / OM_PLAYBACK / TWEAK_DEFAULTS do .dc.html original
function meta(dcFile) {
  const s = read(dcFile);
  const scenes = s.match(/window\.OM_SCENES = '([^']*)'/)[1];
  const playback = s.match(/window\.OM_PLAYBACK = '([^']*)'/)[1];
  const tweaks = s.match(/window\.TWEAK_DEFAULTS = \/\*EDITMODE-BEGIN\*\/([\s\S]*?)\/\*EDITMODE-END\*\//)[1].trim();
  return { scenes, playback, tweaks };
}

const PECAS = [
  { out: 'passo-1.html', dc: 'Loan Simulator Cursor Demo.dc.html', scene: 'loan-scene.jsx',        app: 'LoanSimApp',     titulo: 'Etapa 1 — Solicite o crédito' },
  { out: 'passo-2.html', dc: 'Boleto Payment Cursor Demo.dc.html', scene: 'boleto-scene.jsx',      app: 'BoletoApp',      titulo: 'Etapa 2 — Pague as parcelas' },
  { out: 'passo-3.html', dc: 'Contemplado Result Demo.dc.html',    scene: 'contemplado-scene.jsx', app: 'ContempladoApp', titulo: 'Etapa 3 — Contemplação' },
];

for (const p of PECAS) {
  const m = meta(p.dc);
  const scene = compile(p.scene);
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${p.titulo}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800&display=swap">
<!--
  GERADO AUTOMATICAMENTE a partir de "${p.dc}" (Claude Design).
  Página autossuficiente: React, o runtime de animação e a cena já vêm embutidos
  e pré-compilados, então funciona em file:// e sem CDN.
  Para regerar depois de editar o .dc.html / .jsx: node build-videos.js
-->
<style>
${dsCss}
html, body { margin: 0; height: 100%; background: #F2F2F2; overflow: hidden; }
#root { position: relative; width: 100%; height: 100%; }
:root { --color-bg: #F2F2F2; }
[data-omelette-chrome] { display: none !important; }
[data-om-starter] { background: #F2F2F2 !important; }
svg[data-om-exportable-video-with-duration-secs] { box-shadow: none !important; }
</style>
</head>
<body>
<div id="root"></div>
<script>
window.OM_SCENES = ${JSON.stringify(m.scenes)};
window.OM_PLAYBACK = ${JSON.stringify(m.playback)};
window.TWEAK_DEFAULTS = ${m.tweaks};
</script>
<script src="./vendor/react.production.min.js"></script>
<script src="./vendor/react-dom.production.min.js"></script>
<script src="./build/animations-v3.js"></script>
<script src="./build/tweaks-panel.js"></script>
<script>${scene}</script>
<script>
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(window.${p.app}));
</script>
</body>
</html>`;
  fs.writeFileSync(path.join(DIR, p.out), html);
  console.log(p.out, (html.length / 1024).toFixed(0) + ' KB');
}
