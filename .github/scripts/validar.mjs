// Revisa lo que ningún PR debe romper. Lo corre .github/workflows/validar.yml,
// y cualquiera puede correrlo antes de abrir su PR:  node .github/scripts/validar.mjs
// Sin dependencias: solo Node.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const enCI = !!process.env.GITHUB_ACTIONS;
const errores = [];
const mal = msg => {
  errores.push(msg);
  console.log(enCI ? `::error::${msg.replace(/\n/g, '%0A')}` : `❌ ${msg}`);
};
const bien = msg => console.log(`✅ ${msg}`);

// 1. Ningún script tiene errores de sintaxis
let antes = errores.length;
const scripts = readdirSync('js').filter(f => f.endsWith('.js')).sort();
for (const f of scripts) {
  const r = spawnSync(process.execPath, ['--check', `js/${f}`], { encoding: 'utf8' });
  if (r.status !== 0) mal(`js/${f} tiene un error de sintaxis:\n${r.stderr.trim()}`);
}
if (errores.length === antes) bien(`${scripts.length} scripts sin errores de sintaxis`);

// 2. index.html: todo lo que carga existe, todo js/ se carga y los ?v= coinciden con BUILD
antes = errores.length;
const html = readFileSync('index.html', 'utf8');
const locales = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map(m => m[1])
  .filter(u => !/^(https?:)?\/\//.test(u) && !u.startsWith('#') && !u.startsWith('data:'));
const versiones = new Set();
for (const ref of locales) {
  const [ruta, query = ''] = ref.split('?');
  if (!existsSync(ruta)) mal(`index.html carga "${ruta}", pero ese archivo no existe`);
  const v = new URLSearchParams(query).get('v');
  if (v) versiones.add(v);
}
const cargados = new Set(locales.map(r => r.split('?')[0]));
for (const f of scripts)
  if (!cargados.has(`js/${f}`)) mal(`js/${f} existe, pero index.html no lo carga`);
if (versiones.size > 1)
  mal(`Los ?v= de index.html no coinciden (${[...versiones].join(', ')}): usen el mismo en todos`);
const version = [...versiones][0];
const build = readFileSync('js/01-nucleo.js', 'utf8').match(/const BUILD = '([^']*)'/);
if (!build) mal('No encontré la constante BUILD en js/01-nucleo.js');
else if (version && !build[1].endsWith(version))
  mal(`BUILD ('${build[1]}') no termina en la versión de index.html (?v=${version}): súbanlos juntos`);
if (errores.length === antes) bien(`index.html carga ${locales.length} archivos locales, todos con ?v=${version}`);

// 3. Datos del dengue: cada ficha y cada mito cita una fuente de FUENTES
antes = errores.length;
let datos = null;
try {
  datos = vm.runInNewContext(readFileSync('js/01b-datos-dengue.js', 'utf8') + '\n;({ FUENTES, FICHAS, MITOS })');
} catch (e) {
  mal(`js/01b-datos-dengue.js no se pudo evaluar: ${e.message}`);
}
if (datos) {
  const fuentes = new Set(Object.values(datos.FUENTES));
  const ids = new Set();
  for (const f of datos.FICHAS) {
    const nombre = f.id || f.titulo || '(sin id)';
    for (const campo of ['id', 'cat', 'titulo', 'texto'])
      if (!f[campo]) mal(`La ficha "${nombre}" no tiene ${campo}`);
    if (!fuentes.has(f.fuente)) mal(`La ficha "${nombre}" no cita una fuente de FUENTES`);
    if (ids.has(f.id)) mal(`El id de ficha "${f.id}" está repetido`);
    ids.add(f.id);
  }
  for (const m of datos.MITOS) {
    if (!m.mito || !m.real) mal(`Hay un mito sin "mito" o sin "real": ${JSON.stringify(m)}`);
    if (!fuentes.has(m.fuente)) mal(`El mito "${m.mito}" no cita una fuente de FUENTES`);
  }
  if (errores.length === antes)
    bien(`${datos.FICHAS.length} fichas y ${datos.MITOS.length} mitos citan su fuente`);
}

if (errores.length) {
  console.log(`\n❌ ${errores.length} problema(s). Corrígelos y vuelve a subir tu rama.`);
  process.exit(1);
}
console.log('\n✅ Todo en orden');