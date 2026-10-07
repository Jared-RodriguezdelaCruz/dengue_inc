"use strict";

// ============================================================================
//  DENGUE: MULTIVERSO AGUASCALIENTES — v2
//  Sin dependencias salvo Three.js (CDN) para los niveles 3D.
//
//  Los scripts son clásicos, no módulos ES: comparten el ámbito global y se
//  cargan en el orden que fija index.html. Es deliberado — así el juego se
//  sigue abriendo con doble clic desde file:// sin levantar un servidor.
//
//  Mapa de archivos (js/):
//    01-nucleo.js           configuración, estado global, PRNG con semilla, entrada
//    01b-datos-dengue.js    hechos verificados con su fuente: envases, serotipos, fichas
//    02-efectos.js          pools de partículas/ondas/texto, cámara, audio, emisores
//    03-jugador.js          vida, estamina, dash, esquive y parry (compartido 2D/3D)
//    04-mundo2d-gen.js      estructuras, rejilla espacial, arquetipos, PCG por chunks
//    05-mundo2d-fisica.js   combate compartido y actualización del jugador 2D
//    06-mundo2d-ia.js       IA de enemigos, proyectiles, objetos y jefe
//    07-mundo2d-dibujo.js   todo el render 2D sobre canvas
//    08-mundo3d-gen.js      motor Three.js, partículas 3D, PCG por salas
//    09-mundo3d-jugador.js  pointer lock, movimiento y disparo en 3D
//    10-mundo3d-ia.js       IA 3D, proyectiles y objetos
//    11-flujo.js            tienda, HUD, menús y control de niveles
//    11b-educacion.js       verbos LTVT, casos en la colonia, fichero y reportes
//    12-bucle.js            overlay F3, bucle principal y arranque
//
//  css/estilos.css contiene todo el estilo del marco, HUD y menús.
// ============================================================================

// ---------------------------------------------------------------------------
//  1. CONFIGURACIÓN Y ESTADO GLOBAL
// ---------------------------------------------------------------------------
const ANCHO = 960, ALTO = 540;

// Sello de compilación. Se ve en el menú y en el overlay F3 para poder saber de
// un vistazo qué código se está ejecutando: el navegador cachea los .js y una
// recarga normal puede seguir sirviendo los viejos.
const BUILD = '2026-09-08 · b5';

// Todos los tiempos están en "frames a 60 fps" y se decrementan con dt,
// que está normalizado a 1.0 = un frame de 60 fps. Así las constantes de
// tuning siguen siendo legibles y el juego es independiente del framerate.
const CFG = {
    // Física 2D
    grav: 0.78, velMax: 4.7, acel: 0.95, fric: 0.80,
    salto: -13.6, saltoCorte: 0.42,       // al soltar salto, la velocidad se recorta
    coyote: 7, buffer: 8,                 // frames de gracia
    // Dash
    dashDur: 9, dashVel: 13.5, dashCd: 26, dashCoste: 25, dashIframesExtra: 4,
    // Esquive (roll): menos distancia, más invulnerabilidad, más recovery
    rollDur: 15, rollVel: 7.5, rollCd: 34, rollCoste: 20, rollIframesExtra: 8,
    // Parry con raqueta eléctrica. El arco golpea además de parear: una raqueta
    // que no mata mosquitos no es una raqueta. El coste y el castigo por fallar
    // no cambian — sigue siendo un riesgo, no un botón de barrer.
    parryActivo: 11, parryRecovery: 21, parryCd: 8, parryCoste: 15,
    parryDevuelve: 30, parryAturde: 72, parryRadio: 78,
    raquetaSwing: 22, raquetaGolpe: 1, raquetaAturde: 40,
    raquetaAlcance: 52, raquetaArco: 1.15,        // radianes a cada lado de la mirada
    raquetaAlcance3D: 3.1, raquetaDot3D: 0.55,
    // Vida / estamina
    vidaMax: 3, iframesGolpe: 62,
    estaminaMax: 100, estaminaRegen: 0.42, estaminaEspera: 36,
    // Combate
    maxAtacantes: 2,                      // token global: nunca más de 2 a la vez
    // 3D
    velCam: 0.115, dashVel3D: 0.42, gravedad3D: 0.021, salto3D: 0.34,
    sensibilidad: 0.0022, altoOjos: 1.65,
    velCamaraMando: 14,   // stick derecho a tope = 14 px de ratón por frame
};

const estados = { MENU:'menu', J2D:'2d', J3D:'3d', TRANSICION:'transicion', PAUSA:'pausa' };
let estado = estados.MENU;
let estadoPrevio = estados.J2D;

let nivelActual = 1;
let fichas = 0;
let inventario = ['botas'];
let armaActiva = 'botas';
let semillaRun = 0;
let mostrarDebug = false;
let audioActivo = true;
let debugMode = false;
let debugGodMode = false;
let debugEspada = false;

// Los niveles impares (1, 3) y el 4 son 2D; el 2 y el post-transición son 3D.
const NIVEL_ES_2D = n => n === 1 || n === 3 || n === 4;

// ---------------------------------------------------------------------------
//  2. UTILIDADES Y PRNG CON SEMILLA
// ---------------------------------------------------------------------------
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp  = (a, b, t) => a + (b - a) * t;
const aprox = (a, b, paso) => Math.abs(b - a) <= paso ? b : a + Math.sign(b - a) * paso;

/** mulberry32: PRNG de 32 bits, rápido y con estado explícito.
 *  Necesario para que una misma semilla produzca siempre el mismo nivel. */
function mulberry32(a) {
    return function() {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
let rnd = mulberry32(1);
const rndRango  = (a, b) => a + rnd() * (b - a);
const rndEnt    = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const rndProb   = p      => rnd() < p;

/** Elige un elemento de una tabla [{peso, ...}] respetando los pesos. */
function rndPesos(tabla) {
    let total = 0;
    for (let i = 0; i < tabla.length; i++) total += tabla[i].peso;
    let r = rnd() * total;
    for (let i = 0; i < tabla.length; i++) { r -= tabla[i].peso; if (r <= 0) return tabla[i]; }
    return tabla[tabla.length - 1];
}

/** La semilla de cada nivel deriva de la del run: el nivel 3 de la semilla X
 *  es siempre idéntico, pero distinto del nivel 1 de la misma semilla. */
function sembrarNivel(n) { rnd = mulberry32((semillaRun * 2654435761 + n * 40503) | 0); }

// Colisión AABB genérica, usada en 2D por todo el juego.
function solapan(a, b) {
    return a.x < b.x + b.ancho && a.x + a.ancho > b.x &&
           a.y < b.y + b.alto  && a.y + a.alto  > b.y;
}
function solapanRect(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ---------------------------------------------------------------------------
//  3. ENTRADA
// ---------------------------------------------------------------------------
const teclas = {};          // estado sostenido
const teclasNuevas = {};    // flanco de bajada: true solo el frame en que se pulsó
let ratonNuevo = [false, false, false];
let ratonAbajo = [false, false, false];
let ratonX = ANCHO / 2, ratonY = ALTO / 2;
let ratonDX = 0, ratonDY = 0;
// El mando escribe en sus propios mapas (ver 01c-mando.js): así un keyup del
// teclado no suelta un botón que el mando sigue manteniendo, ni al revés.
const padTeclas = {};
const padNuevas = {};

const pulsada  = c => !!teclasNuevas[c] || !!padNuevas[c];
const abajo    = c => !!teclas[c] || !!padTeclas[c];
const cualqPulsada = (...cs) => cs.some(pulsada);
const cualqAbajo   = (...cs) => cs.some(abajo);

function limpiarFlancos() {
    for (const k in teclasNuevas) teclasNuevas[k] = false;
    for (const k in padNuevas) padNuevas[k] = false;
    ratonNuevo[0] = ratonNuevo[1] = ratonNuevo[2] = false;
    ratonDX = ratonDY = 0;
}

/** Acciones que no dependen del bucle: se disparan en el mismo instante de la
 *  pulsación. Las comparten teclado y mando. */
function activarModoDebug() {
    debugMode = !debugMode;
    debugGodMode = debugMode;
    debugEspada = debugMode;
    jugador.vida = debugMode ? CFG.vidaMax : Math.min(jugador.vida, CFG.vidaMax);
    jugador.estamina = debugMode ? CFG.estaminaMax : Math.min(jugador.estamina, CFG.estaminaMax);
    if (debugMode) {
        aviso('DEBUG MODE ON', 900);
        if (estado === estados.J2D || estado === estados.J3D) {
            sfx.nivel();
        }
    } else {
        aviso('DEBUG MODE OFF', 900);
    }
    return debugMode;
}

function accionGlobal(code) {
    if (code === 'KeyP') {
        activarModoDebug();
        return;
    }

    if (code === 'KeyM') {
        audioActivo = !audioActivo;
        musicaActiva = audioActivo;
        sfxActivo = audioActivo;
        if (typeof actualizarMusicaFondo === 'function') actualizarMusicaFondo();
        if (typeof actualizarBotonesAudioMenu === 'function') actualizarBotonesAudioMenu();
        aviso(audioActivo ? '🔊' : '🔇', 400);
    }

    if (code === 'KeyC' && (estado === estados.J2D || estado === estados.J3D)) alternarFichero();
    else if (code === 'KeyC' && estado === estados.PAUSA && ficheroAbierto()) cerrarFichero();

    if (code === 'KeyT' && (estado === estados.J2D || estado === estados.J3D)) alternarTienda();
    else if (code === 'KeyT' && estado === estados.PAUSA && tiendaAbierta()) cerrarTienda();

    if (code === 'Escape') {
        if (ficheroAbierto()) cerrarFichero();
        else if (tiendaAbierta()) cerrarTienda();
        else if (estado === estados.J2D || estado === estados.J3D) pausar();
        else if (estado === estados.PAUSA) reanudar();
    }
}

window.addEventListener('keydown', e => {
    if (!teclas[e.code]) teclasNuevas[e.code] = true;
    teclas[e.code] = true;

    // Evita que el navegador haga scroll con flechas y espacio.
    if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code)) e.preventDefault();

    if (e.code === 'F3') { e.preventDefault(); mostrarDebug = !mostrarDebug;
                           document.getElementById('debug').style.display = mostrarDebug ? 'block' : 'none'; }
    accionGlobal(e.code);
});
window.addEventListener('keyup', e => { teclas[e.code] = false; });
window.addEventListener('blur', () => { for (const k in teclas) teclas[k] = false; });

const contenedor = document.getElementById('game-container');
contenedor.addEventListener('mousedown', e => {
    if (e.button < 3) { ratonAbajo[e.button] = true; ratonNuevo[e.button] = true; }
});
window.addEventListener('mouseup',  e => { if (e.button < 3) ratonAbajo[e.button] = false; });
contenedor.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('mousemove', e => {
    const rect = contenedor.getBoundingClientRect();
    const px = (e.clientX - rect.left) / Math.max(rect.width, 1);
    const py = (e.clientY - rect.top) / Math.max(rect.height, 1);
    ratonX = clamp(px * ANCHO, 0, ANCHO);
    ratonY = clamp(py * ALTO, 0, ALTO);
    if (document.pointerLockElement) { ratonDX += e.movementX; ratonDY += e.movementY; }
});

