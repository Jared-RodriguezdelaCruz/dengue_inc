// Felicita en Discord cada PR fusionado. Lo corre .github/workflows/kudos.yml.
// Prueba local (sin DISCORD_WEBHOOK solo imprime el mensaje):
//   AUTOR=tu-usuario TITULO="feat(audio): tema del menú" NUM=1 URL=https://github.com BASE=develop node .github/scripts/kudos.mjs
import { readFileSync, existsSync } from 'node:fs';

const env = process.env;
const equipo = existsSync('.github/equipo.json')
  ? JSON.parse(readFileSync('.github/equipo.json', 'utf8'))
  : {};

/** Usuario de GitHub → mención de Discord si hay ID; si no, su nombre en negritas. */
const nombre = login => {
  const p = equipo[login] || {};
  return p.discord ? `<@${p.discord}>` : `**${p.nombre || login}**`;
};

// Quién aprobó el PR. Si la API falla, el mensaje sale igual, sin esa línea.
let revisores = [];
if (env.REPO && env.GH_TOKEN) {
  try {
    const r = await fetch(`https://api.github.com/repos/${env.REPO}/pulls/${env.NUM}/reviews`, {
      headers: { Authorization: `Bearer ${env.GH_TOKEN}`, Accept: 'application/vnd.github+json' }
    });
    const reviews = await r.json();
    if (Array.isArray(reviews))
      revisores = [...new Set(reviews.filter(x => x.state === 'APPROVED').map(x => x.user.login))];
  } catch (e) {
    console.log('No pude leer las revisiones:', e.message);
  }
}

const frases = ['¡Otro criadero menos! 🦟', '¡Así se trabaja en equipo! 💪',
  '¡La colonia te lo agradece! 🏘️', '¡Cero mosquitos a la vista! ✨'];
const encabezado = env.BASE === 'main' ? '🚀 **¡Nueva versión publicada!**' : '🎉 **¡PR fusionado!**';
const lineas = [`${encabezado} ${nombre(env.AUTOR)} sumó *${env.TITULO}* ([#${env.NUM}](<${env.URL}>))`];
if (revisores.length) lineas.push(`👀 Revisó: ${revisores.map(nombre).join(', ')}`);
lineas.push(`✅ CI en verde · ${frases[Math.floor(Math.random() * frases.length)]}`);
const contenido = lineas.join('\n');

if (!env.DISCORD_WEBHOOK) {
  console.log(contenido);
  process.exit(0);
}

const res = await fetch(env.DISCORD_WEBHOOK, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'Dengue Inc Bot', content: contenido })
});
if (!res.ok) {
  console.error(`Discord respondió ${res.status}: ${await res.text()}`);
  process.exit(1);
}
console.log(`Mensaje enviado:\n${contenido}`);
