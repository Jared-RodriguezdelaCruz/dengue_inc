"use strict";

// ---------------------------------------------------------------------------
//  4. POOLS — partículas, ondas y texto flotante
//     Todo se preasigna una vez. Dentro del bucle no se crea ni un objeto,
//     así que el recolector de basura nunca provoca tirones de framerate.
// ---------------------------------------------------------------------------
const MAX_PART = 2400;

// Índices de color. Guardar un byte por partícula en lugar de un string
// evita 2400 referencias a cadenas y permite agrupar el dibujo por color.
const PALETA = [
    '#ffffff', '#f1c40f', '#f39c12', '#e67e22', '#e74c3c', '#c0392b',
    '#ecf0f1', '#bdc3c7', '#95a5a6', '#7f8c8d', '#2ecc71', '#1abc9c',
    '#3498db', '#9b59b6', '#34495e', '#d35400', '#16a085', '#8e44ad'
];
const COL = { BLANCO:0, ORO:1, AMBAR:2, NARANJA:3, ROJO:4, ROJO_OSC:5,
              HUESO:6, GRIS_CL:7, GRIS:8, GRIS_OSC:9, VERDE:10, TURQ:11,
              AZUL:12, MORADO:13, PIZARRA:14, CALABAZA:15, VERDE_OSC:16, MORADO_OSC:17 };

// Tipos de partícula: cómo se dibuja cada una.
const TP = { CUADRO:0, CIRCULO:1, HUMO:2, ESTELA:3, BRILLO:4 };

const Part = {
    x: new Float32Array(MAX_PART), y: new Float32Array(MAX_PART),
    vx: new Float32Array(MAX_PART), vy: new Float32Array(MAX_PART),
    vida: new Float32Array(MAX_PART), vidaMax: new Float32Array(MAX_PART),
    tam: new Float32Array(MAX_PART), rot: new Float32Array(MAX_PART),
    vrot: new Float32Array(MAX_PART), grav: new Float32Array(MAX_PART),
    fric: new Float32Array(MAX_PART), col: new Uint8Array(MAX_PART),
    tipo: new Uint8Array(MAX_PART),
    n: 0,                 // partículas activas: siempre en [0, n)
    descartadas: 0
};

/** Añade una partícula al pool. Si está lleno la descarta (nunca crece). */
function emitir(x, y, vx, vy, vida, tam, col, tipo, grav, fric, vrot) {
    const i = Part.n;
    if (i >= MAX_PART) { Part.descartadas++; return; }
    Part.x[i] = x; Part.y[i] = y; Part.vx[i] = vx; Part.vy[i] = vy;
    Part.vida[i] = vida; Part.vidaMax[i] = vida; Part.tam[i] = tam;
    Part.col[i] = col; Part.tipo[i] = tipo;
    Part.grav[i] = grav || 0; Part.fric[i] = fric === undefined ? 0.97 : fric;
    Part.rot[i] = 0; Part.vrot[i] = vrot || 0;
    Part.n++;
}

/** Swap-remove: mover la última partícula al hueco. O(1) y sin fragmentar. */
function matarParticula(i) {
    const u = Part.n - 1;
    if (i !== u) {
        Part.x[i]=Part.x[u]; Part.y[i]=Part.y[u]; Part.vx[i]=Part.vx[u]; Part.vy[i]=Part.vy[u];
        Part.vida[i]=Part.vida[u]; Part.vidaMax[i]=Part.vidaMax[u]; Part.tam[i]=Part.tam[u];
        Part.rot[i]=Part.rot[u]; Part.vrot[i]=Part.vrot[u]; Part.grav[i]=Part.grav[u];
        Part.fric[i]=Part.fric[u]; Part.col[i]=Part.col[u]; Part.tipo[i]=Part.tipo[u];
    }
    Part.n--;
}

function actualizarParticulas(dt) {
    for (let i = Part.n - 1; i >= 0; i--) {
        Part.vida[i] -= dt;
        if (Part.vida[i] <= 0) { matarParticula(i); continue; }
        Part.vy[i] += Part.grav[i] * dt;
        const f = Math.pow(Part.fric[i], dt);
        Part.vx[i] *= f; Part.vy[i] *= f;
        Part.x[i] += Part.vx[i] * dt;
        Part.y[i] += Part.vy[i] * dt;
        Part.rot[i] += Part.vrot[i] * dt;
    }
}
function limpiarParticulas() { Part.n = 0; Part.descartadas = 0; ondas.n = 0; textos.n = 0; }

// --- Ondas de choque (pocas, pero muy visibles) ---
const MAX_ONDAS = 28;
const ondas = { x:new Float32Array(MAX_ONDAS), y:new Float32Array(MAX_ONDAS),
                r:new Float32Array(MAX_ONDAS), rMax:new Float32Array(MAX_ONDAS),
                gro:new Float32Array(MAX_ONDAS), col:new Uint8Array(MAX_ONDAS), n:0 };
function emitirOnda(x, y, rMax, grosor, col) {
    if (ondas.n >= MAX_ONDAS) return;
    const i = ondas.n++;
    ondas.x[i]=x; ondas.y[i]=y; ondas.r[i]=2; ondas.rMax[i]=rMax; ondas.gro[i]=grosor; ondas.col[i]=col;
}
function actualizarOndas(dt) {
    for (let i = ondas.n - 1; i >= 0; i--) {
        ondas.r[i] += (ondas.rMax[i] - ondas.r[i]) * 0.16 * dt + 1.4 * dt;
        if (ondas.r[i] >= ondas.rMax[i] - 1.5) {
            const u = --ondas.n;
            if (i !== u) { ondas.x[i]=ondas.x[u]; ondas.y[i]=ondas.y[u]; ondas.r[i]=ondas.r[u];
                           ondas.rMax[i]=ondas.rMax[u]; ondas.gro[i]=ondas.gro[u]; ondas.col[i]=ondas.col[u]; }
        }
    }
}

// --- Texto flotante (daño, monedas, "¡PARRY!") ---
const MAX_TEXTOS = 48;
const textos = { x:new Float32Array(MAX_TEXTOS), y:new Float32Array(MAX_TEXTOS),
                 vy:new Float32Array(MAX_TEXTOS), vida:new Float32Array(MAX_TEXTOS),
                 vidaMax:new Float32Array(MAX_TEXTOS), tam:new Float32Array(MAX_TEXTOS),
                 col:new Uint8Array(MAX_TEXTOS), txt:new Array(MAX_TEXTOS), n:0 };
function emitirTexto(x, y, txt, col, tam) {
    if (textos.n >= MAX_TEXTOS) return;
    const i = textos.n++;
    textos.x[i]=x; textos.y[i]=y; textos.vy[i]=-1.5; textos.vida[i]=52; textos.vidaMax[i]=52;
    textos.txt[i]=txt; textos.col[i]=col; textos.tam[i]=tam||16;
}
function actualizarTextos(dt) {
    for (let i = textos.n - 1; i >= 0; i--) {
        textos.vida[i] -= dt;
        textos.y[i] += textos.vy[i] * dt;
        textos.vy[i] *= Math.pow(0.93, dt);
        if (textos.vida[i] <= 0) {
            const u = --textos.n;
            if (i !== u) { textos.x[i]=textos.x[u]; textos.y[i]=textos.y[u]; textos.vy[i]=textos.vy[u];
                           textos.vida[i]=textos.vida[u]; textos.vidaMax[i]=textos.vidaMax[u];
                           textos.tam[i]=textos.tam[u]; textos.col[i]=textos.col[u]; textos.txt[i]=textos.txt[u]; }
        }
    }
}

// ---------------------------------------------------------------------------
//  5. CÁMARA: SACUDIDA, HITSTOP, DESTELLOS
// ---------------------------------------------------------------------------
let sacudida = 0;           // magnitud actual en píxeles
let hitstop = 0;            // frames congelados (el render sigue, la lógica no)
let camX = 0, camY = 0;     // cámara del mundo 2D

function sacudir(mag)  { if (!opciones.menosSacudidas) sacudida = Math.max(sacudida, mag); }
function congelar(fr)  { hitstop = Math.max(hitstop, fr); }

const elDestello = document.getElementById('destello');
const elVineta   = document.getElementById('vineta');
const elAviso    = document.getElementById('aviso-central');

// --- Cortina de pantalla completa ------------------------------------------
//  La animación la hace el NAVEGADOR, no el bucle del juego. Esa es la lección
//  de haberlo intentado al revés: al pasarla a frames, la cortina quedó atada al
//  requestAnimationFrame, que se congela en cuanto la pestaña pierde el foco o
//  el navegador desprioriza la página. Y como entre subirla y bajarla está a 1,
//  cualquier parón dejaba la pantalla en blanco tapando el juego, sin nada que
//  pudiera repararla: lo único capaz de bajarla era el bucle detenido.
//
//  Lo que SÍ se queda de aquel intento es el dueño explícito. Ése era el arreglo
//  de verdad del bug original —un destello de explosión se comía el fogonazo de
//  la grieta— y no tiene nada que ver con quién anima la opacidad. Mezclé las dos
//  cosas y tiré la buena.
const cortina = { dueno: null, limite: 0, velado: 0, tick: 0, limpiaGrieta: 0, opPrev: 0, grietaT: 0 };

// Duración de la animación .grieta en css/estilos.css. Si se cambia allí, aquí.
const MS_GRIETA = 1900;

function pintarCortina(op, ms) {
    elDestello.style.transition = 'opacity ' + Math.max(0, ms | 0) + 'ms';
    elDestello.style.opacity = op;
}

/** Un fogonazo corto. Sin requestAnimationFrame: el reflow forzado confirma el
 *  valor alto y el fundido arranca en el mismo tick, así que no hay carrera
 *  entre dos escritores y el navegador lo termina pase lo que pase con el JS. */
function destellar(color, opacidad, msFade) {
    if (cortina.dueno) return;                    // hay una secuencia mandando
    elDestello.classList.remove('grieta');
    elDestello.style.animation = '';              // limpia el 'none' del último recurso
    elDestello.style.background = color;
    pintarCortina(opciones.menosDestellos ? opacidad * 0.35 : opacidad, 0);
    void elDestello.offsetWidth;                  // commit síncrono del valor alto
    pintarCortina(0, msFade || 320);
}

/** La toma una secuencia para que ningún destello suelto la pise. Caduca sola:
 *  un dueño colgado dejaría destellar() muerto el resto de la partida. */
function cortinaTomar(dueno) {
    cortina.dueno = dueno;
    // Seis segundos, no quince: la grieta entera dura 3,9 s, y un velo pegado
    // más de eso ya es una pantalla que no deja jugar.
    cortina.limite = performance.now() + 6000;
}
function cortinaSoltar() {
    cortina.dueno = null;
    clearTimeout(cortina.limpiaGrieta);
    elDestello.classList.remove('grieta');
    pintarCortina(0, 260);
}

/** La grieta dimensional entera en UNA animación CSS: sube, aguanta mientras se
 *  carga el mundo nuevo, y baja. La reproduce el navegador de principio a fin,
 *  así que un parón del bucle como mucho te deja ver el corte —nunca te deja la
 *  pantalla tapada. */
function cortinaGrieta(color) {
    elDestello.style.background = color || '#ffffff';
    elDestello.classList.remove('grieta');
    elDestello.style.animation = '';              // limpia un 'none' del vigilante
    void elDestello.offsetWidth;                  // reinicia la animación
    pintarCortina(0, 0);
    elDestello.classList.add('grieta');

    // La limpieza va atada a quien puso la clase, no a que otra función llegue a
    // ejecutarse. Mientras .grieta esté puesta, la animación GANA al opacity
    // inline —las animaciones van por encima de los estilos en la cascada—, así
    // que nadie más puede bajar el velo hasta que esta clase se quite.
    cortina.grietaT = performance.now();
    clearTimeout(cortina.limpiaGrieta);
    cortina.limpiaGrieta = setTimeout(() => {
        elDestello.classList.remove('grieta');
        pintarCortina(0, 0);
    }, MS_GRIETA + 150);
}

/**
 * Vigilante. Lee la opacidad REAL del DOM, no una copia en JS, para poder
 * detectar también un velo que dejó ahí alguien que no pasó por aquí.
 *
 * Lo llama el setInterval de abajo, NO sólo el bucle del juego. Ese era el
 * agujero de la ronda anterior: la red de seguridad que existe para el caso
 * "el rAF se paró con el velo puesto" colgaba del propio rAF, así que en ese
 * escenario exacto no se ejecutaba nunca.
 */
function actualizarCortina() {
    const ahora = performance.now();
    if (cortina.dueno && ahora > cortina.limite) cortinaSoltar();

    // Barra libre ACOTADA, no ciega. Antes bastaba con llevar la clase .grieta
    // para que el vigilante no tocara nada, y una animación pausada en su meseta
    // —la pestaña pierde el foco a mitad de la transición— se queda en blanco
    // pleno para siempre. Medido: 1.00 durante ocho segundos sin que nadie
    // interviniera. Ahora la grieta manda mientras dure su animación y ni un ms
    // más; pasado eso se mide y se barre como cualquier otro velo.
    const enGrieta = elDestello.classList.contains('grieta');
    if (enGrieta && ahora - cortina.grietaT < MS_GRIETA + 400) { cortina.velado = 0; return; }
    if (cortina.dueno) { cortina.velado = 0; return; }

    // Mira la opacidad COMPUTADA, no el estilo inline: un fundido a medias o una
    // animación colgada no aparecen en el inline, y son justo lo que puede dejar
    // la pantalla tapada. getComputedStyle fuerza recálculo de estilo, así que se
    // consulta cuatro veces por segundo — medido en RELOJ DE PARED, no contando
    // llamadas: si el bucle va famélico, un contador de frames no llega nunca, y
    // el bucle famélico es exactamente el caso que este vigilante debe cubrir.
    if (ahora - cortina.tick < 250) return;
    cortina.tick = ahora;
    const op = parseFloat(getComputedStyle(elDestello).opacity) || 0;
    if (op <= 0.05) { cortina.velado = 0; cortina.opPrev = op; return; }

    // Un fundido que AVANZA se deja en paz: hay destellos legítimos de hasta
    // 1,1 s y cortarlos se vería peor que el problema. Lo que se barre es lo
    // ATASCADO — el valor computado que no se mueve entre muestras.
    if (Math.abs(op - cortina.opPrev) > 0.01) {
        cortina.opPrev = op; cortina.velado = ahora; return;
    }
    if (!cortina.velado) { cortina.velado = ahora; return; }
    if (ahora - cortina.velado > 800) {
        cortina.velado = 0;
        cortinaAlSuelo();
    }
}

/**
 * Baja el velo a la fuerza. No basta con escribir opacity = 0: si hay un fundido
 * en vuelo que se quedó congelado —la página deja de repintar y la transición no
 * avanza— el inline YA vale 0 mientras el valor computado sigue a media altura,
 * y reescribir el mismo valor no cancela nada. Medido: 0.30 clavados durante
 * dieciséis segundos con el inline en 0.
 *
 * Lo que sí lo desatasca es cancelar transición y animación: al cancelarlas, el
 * valor computado salta de golpe al especificado.
 */
function cortinaAlSuelo() {
    elDestello.style.transition = 'none';
    elDestello.style.animation = 'none';
    elDestello.classList.remove('grieta');
    elDestello.style.opacity = '0';
    void elDestello.offsetWidth;                   // confirma el salto
}

// El reloj del vigilante. Va por setInterval a propósito: es lo único que sigue
// disparando cuando el requestAnimationFrame se congela —pestaña sin foco,
// página despriorizada—, que es justo cuando puede quedarse un velo puesto.
// El bucle también lo llama, para reaccionar antes cuando sí está corriendo,
// pero ya no es el único camino.
setInterval(actualizarCortina, 250);
let vinetaT = 0;
function pulsoVineta(fr) { vinetaT = Math.max(vinetaT, fr); }

let avisoTimer = null;
function aviso(texto, ms) {
    elAviso.textContent = texto;
    elAviso.classList.remove('mostrar');
    void elAviso.offsetWidth;              // fuerza reinicio de la animación
    elAviso.classList.add('mostrar');
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(() => elAviso.classList.remove('mostrar'), ms || 800);
}

// ---------------------------------------------------------------------------
//  6. AUDIO — SFX procedurales con osciladores WebAudio; la música de fondo y
//     los diálogos sí son archivos (assets/sounds/).
// ---------------------------------------------------------------------------
let ctxAudio = null;
let musicaFondo = null;
let musicaActiva = true;
let sfxActivo = true;

// Las preferencias de audio sobreviven a la recarga. localStorage puede no
// existir o lanzar (modo privado, file:// en algunos navegadores): sin él
// simplemente se arranca con todo encendido.
const CLAVE_AUDIO = 'dengue.audio';
try {
    const p = JSON.parse(localStorage.getItem(CLAVE_AUDIO) || 'null');
    if (p) { musicaActiva = p.musica !== false; sfxActivo = p.sfx !== false; }
} catch (e) { /* sin preferencias guardadas */ }

function guardarPrefsAudio() {
    try { localStorage.setItem(CLAVE_AUDIO, JSON.stringify({ musica: musicaActiva, sfx: sfxActivo })); }
    catch (e) { /* no se pudo guardar: no pasa nada */ }
}

// Opciones del jugador (menú Opciones, DI-423). Música y sonido ON/OFF siguen en
// CLAVE_AUDIO para no perder lo que ya tenía guardado quien jugó antes.
const CLAVE_OPCIONES = 'dengueinc.opciones';
const OPCIONES_BASE = { volMusica: 1, volSfx: 1, sens: 1,
                        menosDestellos: false, menosSacudidas: false, tutorial: true };
const opciones = Object.assign({}, OPCIONES_BASE);
try {
    const o = JSON.parse(localStorage.getItem(CLAVE_OPCIONES) || 'null');
    if (o) for (const k in OPCIONES_BASE)
        if (typeof o[k] === typeof OPCIONES_BASE[k]) opciones[k] = o[k];
} catch (e) { /* sin opciones guardadas: valores por defecto */ }

function guardarOpciones() {
    try { localStorage.setItem(CLAVE_OPCIONES, JSON.stringify(opciones)); }
    catch (e) { /* no se pudo guardar: valen hasta que se cierre la pestaña */ }
}

const VOL_MUSICA_BASE = 0.45;
const SENS_BASE = CFG.sensibilidad, CAM_MANDO_BASE = CFG.velCamaraMando;

/** Lleva las opciones a donde se usan. Se llama al cargar y en cada cambio. */
function aplicarOpciones() {
    CFG.sensibilidad = SENS_BASE * opciones.sens;
    CFG.velCamaraMando = CAM_MANDO_BASE * opciones.sens;
    if (musicaFondo) musicaFondo.volume = VOL_MUSICA_BASE * opciones.volMusica;
    // El diálogo de Güero vive en 11c, que carga después: al arrancar aún no existe.
    if (typeof audioGueroDialogue1 !== 'undefined') audioGueroDialogue1.volume = clamp(opciones.volSfx, 0, 1);
    document.body.classList.toggle('menos-destellos', opciones.menosDestellos);
}

function audio() {
    if (!ctxAudio) { try { ctxAudio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctxAudio.state === 'suspended') ctxAudio.resume();
    return ctxAudio;
}

function actualizarMusicaFondo() {
    if (!musicaFondo) return;
    const habilitada = musicaActiva;
    musicaFondo.muted = !habilitada;
    if (!habilitada) {
        if (!musicaFondo.paused) musicaFondo.pause();
        return;
    }
    if (document.visibilityState === 'hidden') {
        if (!musicaFondo.paused) musicaFondo.pause();
        return;
    }
    if (musicaFondo.paused) {
        musicaFondo.play().catch(() => {});
    }
}

function inicializarMusicaFondo() {
    if (musicaFondo) return musicaFondo;
    const sonido = new Audio('assets/sounds/dg_song.mp3');
    sonido.loop = true;
    sonido.preload = 'auto';
    sonido.volume = VOL_MUSICA_BASE * opciones.volMusica;
    sonido.muted = !musicaActiva;
    musicaFondo = sonido;

    // El navegador bloquea el autoplay hasta el primer gesto del usuario. Cada
    // reintento pasa por actualizarMusicaFondo, que respeta las preferencias: si
    // ya apagaste la música, una tecla posterior no debe volver a encenderla.
    window.addEventListener('pointerdown', actualizarMusicaFondo, { once: true });
    window.addEventListener('keydown', actualizarMusicaFondo, { once: true });
    window.addEventListener('touchstart', actualizarMusicaFondo, { once: true });
    document.addEventListener('visibilitychange', actualizarMusicaFondo);
    window.addEventListener('load', actualizarMusicaFondo, { once: true });
    setTimeout(actualizarMusicaFondo, 200);

    return sonido;
}

inicializarMusicaFondo();
aplicarOpciones();
/** Un tono simple con envolvente exponencial. Barato y suficiente para SFX. */
function tono(freq, dur, tipoOsc, vol, barridoA) {
    // Con el volumen en 0 no se toca nada: la rampa exponencial no admite 0.
    if (!sfxActivo || opciones.volSfx <= 0) return;
    const ac = audio(); if (!ac) return;
    const t = ac.currentTime;
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = tipoOsc || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (barridoA) osc.frequency.exponentialRampToValueAtTime(Math.max(30, barridoA), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime((vol || 0.08) * opciones.volSfx, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(ac.destination);
    osc.start(t); osc.stop(t + dur + 0.02);
}
/** Ruido blanco filtrado: la base de explosiones e impactos. */
function ruido(dur, vol, freqFiltro) {
    if (!sfxActivo || opciones.volSfx <= 0) return;
    const ac = audio(); if (!ac) return;
    const n = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2);
    const src = ac.createBufferSource(); src.buffer = buf;
    const filtro = ac.createBiquadFilter(); filtro.type = 'lowpass';
    filtro.frequency.setValueAtTime(freqFiltro || 1200, ac.currentTime);
    const g = ac.createGain(); g.gain.value = (vol || 0.16) * opciones.volSfx;
    src.connect(filtro); filtro.connect(g); g.connect(ac.destination);
    src.start();
}
const sfx = {
    salto:    () => tono(340, 0.10, 'square', 0.05, 620),
    dash:     () => { ruido(0.16, 0.09, 2600); tono(180, 0.12, 'sawtooth', 0.04, 520); },
    parry:    () => { tono(1180, 0.09, 'square', 0.10, 1750); tono(760, 0.22, 'triangle', 0.08, 1500); },
    parryFail:() => tono(150, 0.16, 'sawtooth', 0.05, 80),
    golpe:    () => { ruido(0.12, 0.14, 900); tono(110, 0.14, 'square', 0.06, 55); },
    daño:     () => { tono(220, 0.24, 'sawtooth', 0.10, 70); ruido(0.18, 0.12, 600); },
    explosion:() => { ruido(0.55, 0.30, 700); tono(70, 0.45, 'sawtooth', 0.12, 28); },
    moneda:   () => { tono(880, 0.07, 'square', 0.05); setTimeout(() => tono(1320, 0.09, 'square', 0.05), 55); },
    disparo:  () => { ruido(0.07, 0.07, 3200); tono(520, 0.06, 'square', 0.03, 300); },
    telegrafia:()=> tono(300, 0.30, 'triangle', 0.035, 640),
    nivel:    () => { [523,659,784,1046].forEach((f,i) => setTimeout(() => tono(f, 0.16, 'square', 0.06), i*90)); },
    muerte:   () => { [400,320,240,160].forEach((f,i) => setTimeout(() => tono(f, 0.24, 'sawtooth', 0.08), i*130)); }
};

// ---------------------------------------------------------------------------
//  6b. EMISORES COMPUESTOS — recetas de partículas reutilizables
// ---------------------------------------------------------------------------
function fxExplosion(x, y, radio, colA, colB) {
    const n = Math.min(90, 26 + Math.floor(radio * 0.55));
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
        const v = (radio / 22) * (0.7 + Math.random() * 1.5);
        emitir(x, y, Math.cos(a) * v, Math.sin(a) * v,
               22 + Math.random() * 24, 3 + Math.random() * 5,
               Math.random() < 0.5 ? colA : colB, TP.CUADRO, 0.16, 0.93, (Math.random()-0.5)*0.5);
    }
    for (let i = 0; i < n * 0.5; i++) {          // humo que sube y se expande
        const a = Math.random() * Math.PI * 2, v = Math.random() * (radio / 30);
        emitir(x, y, Math.cos(a) * v, Math.sin(a) * v - 0.6,
               40 + Math.random() * 40, radio * 0.16 + Math.random() * 8,
               Math.random() < 0.5 ? COL.GRIS : COL.GRIS_OSC, TP.HUMO, -0.012, 0.95, 0);
    }
    for (let i = 0; i < 8; i++)                   // núcleo brillante
        emitir(x, y, (Math.random()-0.5)*2, (Math.random()-0.5)*2, 10 + Math.random()*8,
               radio * 0.35, COL.BLANCO, TP.BRILLO, 0, 0.86, 0);
    emitirOnda(x, y, radio * 2.1, 5, COL.AMBAR);
    emitirOnda(x, y, radio * 1.4, 3, COL.BLANCO);
}
function fxChispas(x, y, n, col, fuerza, dirX, dirY) {
    for (let i = 0; i < n; i++) {
        const a = Math.atan2(dirY || 0, dirX || 0) + (Math.random() - 0.5) * (dirX || dirY ? 1.6 : 6.28);
        const v = fuerza * (0.4 + Math.random());
        emitir(x, y, Math.cos(a) * v, Math.sin(a) * v, 14 + Math.random() * 16,
               2 + Math.random() * 3, col, TP.CUADRO, 0.22, 0.92, (Math.random()-0.5)*0.6);
    }
}
function fxHumo(x, y, n, col, disp) {
    for (let i = 0; i < n; i++)
        emitir(x + (Math.random()-0.5)*disp, y + (Math.random()-0.5)*disp,
               (Math.random()-0.5)*0.7, -0.35 - Math.random()*0.6,
               34 + Math.random()*30, 5 + Math.random()*8, col, TP.HUMO, -0.006, 0.96, 0);
}
function fxEstela(x, y, col, tam) {
    emitir(x + (Math.random()-0.5)*10, y + (Math.random()-0.5)*14,
           (Math.random()-0.5)*0.5, (Math.random()-0.5)*0.5,
           15 + Math.random()*10, tam || 7, col, TP.BRILLO, 0, 0.90, 0);
}
function fxRecoleccion(x, y) {
    for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2, v = 1 + Math.random() * 2.4;
        emitir(x, y, Math.cos(a)*v, Math.sin(a)*v - 1, 20 + Math.random()*14,
               2 + Math.random()*3, COL.ORO, TP.CIRCULO, 0.06, 0.93, 0);
    }
    emitirOnda(x, y, 34, 2, COL.ORO);
}
function fxCarga(x, y, col) {                     // partículas que convergen: telegrafía
    for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2, r = 34 + Math.random() * 22;
        emitir(x + Math.cos(a)*r, y + Math.sin(a)*r,
               -Math.cos(a) * 2.2, -Math.sin(a) * 2.2,
               14, 2.5 + Math.random()*2, col, TP.CIRCULO, 0, 0.99, 0);
    }
}
function fxParry(x, y) {
    emitirOnda(x, y, CFG.parryRadio * 1.5, 6, COL.ORO);
    emitirOnda(x, y, CFG.parryRadio,       3, COL.BLANCO);
    for (let i = 0; i < 34; i++) {
        const a = (i / 34) * Math.PI * 2, v = 3.5 + Math.random() * 3;
        emitir(x, y, Math.cos(a)*v, Math.sin(a)*v, 18 + Math.random()*14,
               3 + Math.random()*3, i % 2 ? COL.ORO : COL.BLANCO, TP.CUADRO, 0.05, 0.90, 0.4);
    }
}


/** Chispazo de la raqueta: descarga a lo largo del arco, no una bola de luz. */
function fxRaqueta(x, y, ang, alcance) {
    for (let i = 0; i < 16; i++) {
        const a = ang + (Math.random() - 0.5) * CFG.raquetaArco * 2;
        const r = alcance * (0.45 + Math.random() * 0.6);
        emitir(x + Math.cos(a) * r, y + Math.sin(a) * r,
               Math.cos(a) * 1.8, Math.sin(a) * 1.8 - 0.6,
               10 + Math.random() * 10, 2 + Math.random() * 2.5,
               i % 3 ? COL.TURQ : COL.BLANCO, TP.BRILLO, 0.05, 0.88, 0);
    }
    emitirOnda(x, y, alcance * 1.25, 4, COL.TURQ);
}
