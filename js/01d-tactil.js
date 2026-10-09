"use strict";

// ---------------------------------------------------------------------------
//  TÁCTIL: JUGAR EN CELULAR (DI-430, DI-424)
// ---------------------------------------------------------------------------
//  Igual que el mando (01c-mando.js), lo táctil no toca el juego: el joystick y
//  los botones escriben los mismos códigos de tecla que ya lee el teclado
//  ('Space', 'KeyJ', 'ArrowLeft'…) en tactilTeclas / tactilNuevas (01-nucleo.js).
//  La física, la IA y el tutorial no saben de dónde vino la pulsación.
//
//  Aquí vive también lo que necesita una pantalla chica: la escala del marco de
//  960x540 (sirve a todos, no solo al celular), la pantalla completa en
//  horizontal y el aviso de girar el teléfono.
//
//  No usa rnd(): con o sin dedo, cada semilla genera los mismos niveles.

let modoTactil = false;
let tactilDisparo = false;     // Atacar mantenido en 3D: ráfaga, como el gatillo del mando
let escalaMarco = 1;
const tactilVisible = () => modoTactil && !mandoActivo;

const elMarco  = document.getElementById('marco');
const elTactil = document.getElementById('tactil');

const RADIO_JOY = 60;          // px reales: el pulgar no sabe de escalas
const ZONA_JOY = 0.4;          // fracción izquierda de la pantalla donde nace el joystick
const SENS_DEDO = 1.6;         // el dedo recorre menos que el ratón para el mismo giro
const ESCALA_MAX_TACTIL = 1.6; // una tablet se llena; en escritorio el tope es 1

// --- Escala del marco --------------------------------------------------------
//  El marco mide 960x540 y nada adentro cambia de tamaño: se escala entero. El
//  ratón no se entera porque 01-nucleo.js mide con getBoundingClientRect.
function ajustarEscala() {
    const w = window.innerWidth, h = window.innerHeight;
    const margen = modoTactil ? 0 : 16;
    let s = Math.min((w - margen) / ANCHO, (h - margen) / ALTO);
    s = clamp(s, 0.2, modoTactil ? ESCALA_MAX_TACTIL : 1);
    escalaMarco = s;
    elMarco.style.transform = s === 1 ? '' : 'scale(' + s.toFixed(4) + ')';
    if (typeof tituloVisible === 'function' && tituloVisible()) pintarAyudaTitulo();
}
window.addEventListener('resize', ajustarEscala);
window.addEventListener('orientationchange', () => { ajustarEscala(); revisarOrientacion(); });
if (window.visualViewport) window.visualViewport.addEventListener('resize', ajustarEscala);

// --- Detección ---------------------------------------------------------------
//  Una laptop con pantalla táctil cambia sola: un toque enciende los controles y
//  una tecla o mover el ratón los quita.
function fijarModoTactil(on) {
    if (on === modoTactil) return;
    modoTactil = on;
    document.body.classList.toggle('tactil', on);
    soltarTodoTactil();
    ajustarEscala();
    ajustarCalidad3D();
    revisarOrientacion();
    // Lo que nombra controles se vuelve a escribir con los del modo nuevo.
    const pc = document.getElementById('pm-controles');
    if (pc && pc.innerHTML && typeof tablaControles === 'function') pc.innerHTML = tablaControles();
    if (typeof promptVerbosPrev !== 'undefined') promptVerbosPrev = '';
}

/** En el celular la vista 3D a 2x es cara y no se nota: 1.5 basta. */
function ajustarCalidad3D() {
    if (typeof renderer === 'undefined' || !renderer) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, modoTactil ? 1.5 : 2));
    renderer.setSize(ANCHO, ALTO);
}

let audioTactilListo = false;
window.addEventListener('touchstart', () => fijarModoTactil(true), { capture: true, passive: true });
// iOS solo despierta el audio dentro de un gesto que termina: touchend, no touchstart.
window.addEventListener('touchend', () => {
    if (audioTactilListo) return;
    audioTactilListo = true;
    audio();
    actualizarMusicaFondo();
}, { capture: true, passive: true });
window.addEventListener('keydown', e => {
    // Escribiendo la semilla con el teclado del celular no se sale del modo táctil.
    if (e.target && e.target.tagName === 'INPUT') return;
    fijarModoTactil(false);
}, true);
window.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse' && (e.movementX || e.movementY)) fijarModoTactil(false);
});

// --- La capa de controles ------------------------------------------------------
//  Una zona que se traga los toques (sin ella un toque en el 2D llegaría como
//  mousedown y atacaría), el joystick, los botones de acción, la fila de
//  medidas y la barra de arriba. Se mide en px reales, fuera del marco escalado.
const ACCIONES_TACTIL = [
    { cod: 'Space',     txt: 'Saltar',  cls: 'tc-saltar' },
    { cod: 'KeyJ',      txt: 'Atacar',  cls: 'tc-atacar' },
    { cod: 'KeyF',      txt: 'Raqueta', cls: 'tc-raqueta' },
    { cod: 'ShiftLeft', txt: 'Dash',    cls: 'tc-dash' },
    { cod: 'KeyQ',      txt: 'Gancho',  cls: 'tc-gancho' }       // solo 3D
];
const BARRA_TACTIL = [
    { cod: 'Escape', txt: '⏸', titulo: 'Pausa' },
    { cod: 'KeyT',   txt: '🛒', titulo: 'Tienda' },
    { cod: 'KeyC',   txt: '📖', titulo: 'Fichero' }
];
const ORDEN_MEDIDAS = ['lava', 'tapa', 'voltea', 'tira'];

function botonTactil(clase, cod, html, titulo) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = clase;
    b.dataset.cod = cod;
    b.innerHTML = html;
    if (titulo) b.setAttribute('aria-label', titulo);
    return b;
}

function montarTactil() {
    const zona = document.createElement('div'); zona.className = 'tc-zona';
    const fantasma = document.createElement('div'); fantasma.className = 'tc-fantasma';
    fantasma.innerHTML = '<span>MOVER</span>';
    const joy = document.createElement('div'); joy.className = 'tc-joy';
    joy.innerHTML = '<div class="tc-perilla"></div>';
    const acc = document.createElement('div'); acc.className = 'tc-acciones';
    for (const a of ACCIONES_TACTIL) acc.appendChild(botonTactil('tc-btn ' + a.cls, a.cod, '<span>' + a.txt + '</span>'));
    const barra = document.createElement('div'); barra.className = 'tc-barra';
    for (const b of BARRA_TACTIL) barra.appendChild(botonTactil('tc-sis', b.cod, b.txt, b.titulo));
    const med = document.createElement('div'); med.className = 'tc-medidas';
    ORDEN_MEDIDAS.forEach((v, i) => {
        const b = botonTactil('tc-med', 'Digit' + (i + 1), VERBOS[v].nombre);
        b.style.borderColor = b.style.color = VERBOS[v].color;
        med.appendChild(b);
    });
    elTactil.append(zona, fantasma, joy, acc, med, barra);
    return { zona, joy, perilla: joy.firstChild, acc, med, barra,
             dash: acc.querySelector('.tc-dash'), raqueta: acc.querySelector('.tc-raqueta') };
}
const capaT = montarTactil();

// --- Estado de los dedos -------------------------------------------------------
const dedoJoy = { id: null, x0: 0, y0: 0, dx: 0, dy: 0 };   // dx, dy en -1..1
const dedoMira = { id: null, x: 0, y: 0 };
const dedosEnBoton = new Map();                          // id de toque → botón
let imanT = 0;                                           // frames de imán tras un toque de Atacar

/** Mantiene una tecla virtual y marca su flanco, como hace el teclado. */
function fijarTecla(cod, on) {
    if (on && !tactilTeclas[cod]) tactilNuevas[cod] = true;
    tactilTeclas[cod] = on;
}

function soltarBoton(id) {
    const b = dedosEnBoton.get(id);
    if (!b) return;
    dedosEnBoton.delete(id);
    // Otro dedo puede seguir en el mismo botón.
    for (const otro of dedosEnBoton.values()) if (otro === b) return;
    b.classList.remove('on');
    fijarTecla(b.dataset.cod, false);
    if (b.dataset.cod === 'KeyJ') tactilDisparo = false;
}

function soltarTodoTactil() {
    for (const id of Array.from(dedosEnBoton.keys())) soltarBoton(id);
    for (const k in tactilTeclas) tactilTeclas[k] = false;
    tactilDisparo = false;
    dedoJoy.id = dedoMira.id = null; dedoJoy.dx = dedoJoy.dy = 0;
    capaT.joy.classList.remove('on');
    elTactil.classList.remove('joy-on');
}

function moverJoystick(t) {
    let dx = t.clientX - dedoJoy.x0, dy = t.clientY - dedoJoy.y0;
    const l = Math.hypot(dx, dy);
    if (l > RADIO_JOY) { dx *= RADIO_JOY / l; dy *= RADIO_JOY / l; }
    dedoJoy.dx = dx / RADIO_JOY; dedoJoy.dy = dy / RADIO_JOY;
    capaT.perilla.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
}

function tocarInicio(e) {
    e.preventDefault();
    const en3D = estado === estados.J3D;
    for (const t of e.changedTouches) {
        const b = t.target && t.target.closest ? t.target.closest('[data-cod]') : null;
        if (b) {
            const cod = b.dataset.cod;
            if (CODIGOS_GLOBALES.includes(cod)) {
                // Pausa, tienda y fichero se resuelven al instante, como con el mando.
                b.classList.add('on');
                setTimeout(() => b.classList.remove('on'), 120);
                accionGlobal(cod);
                continue;
            }
            dedosEnBoton.set(t.identifier, b);
            b.classList.add('on');
            fijarTecla(cod, true);
            if (cod === 'KeyJ') { tactilDisparo = en3D; imanT = 20; }
            continue;
        }
        if (dedoJoy.id === null && t.clientX < window.innerWidth * ZONA_JOY) {
            dedoJoy.id = t.identifier; dedoJoy.x0 = t.clientX; dedoJoy.y0 = t.clientY; dedoJoy.dx = dedoJoy.dy = 0;
            capaT.joy.style.left = t.clientX + 'px'; capaT.joy.style.top = t.clientY + 'px';
            capaT.perilla.style.transform = '';
            capaT.joy.classList.add('on');
            elTactil.classList.add('joy-on');
        } else if (en3D && dedoMira.id === null) {
            dedoMira.id = t.identifier; dedoMira.x = t.clientX; dedoMira.y = t.clientY;
        }
    }
}

function tocarMovimiento(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
        if (t.identifier === dedoJoy.id) moverJoystick(t);
        else if (t.identifier === dedoMira.id) {
            ratonDX += (t.clientX - dedoMira.x) * SENS_DEDO;
            ratonDY += (t.clientY - dedoMira.y) * SENS_DEDO;
            dedoMira.x = t.clientX; dedoMira.y = t.clientY;
        } else if (dedosEnBoton.has(t.identifier)) {
            // El dedo que se sale del botón lo suelta, como al levantarlo.
            const r = dedosEnBoton.get(t.identifier).getBoundingClientRect();
            if (t.clientX < r.left - 12 || t.clientX > r.right + 12 ||
                t.clientY < r.top - 12 || t.clientY > r.bottom + 12) soltarBoton(t.identifier);
        }
    }
}

function tocarFin(e) {
    for (const t of e.changedTouches) {
        if (t.identifier === dedoJoy.id) {
            dedoJoy.id = null; dedoJoy.dx = dedoJoy.dy = 0;
            capaT.joy.classList.remove('on');
            elTactil.classList.remove('joy-on');
        } else if (t.identifier === dedoMira.id) dedoMira.id = null;
        else soltarBoton(t.identifier);
    }
}

elTactil.addEventListener('touchstart', tocarInicio, { passive: false });
elTactil.addEventListener('touchmove', tocarMovimiento, { passive: false });
elTactil.addEventListener('touchend', tocarFin);
elTactil.addEventListener('touchcancel', tocarFin);
// Un clic de ratón sobre la barra también sirve (laptop táctil a medio cambio).
elTactil.addEventListener('click', e => {
    const b = e.target.closest ? e.target.closest('.tc-sis') : null;
    if (b) accionGlobal(b.dataset.cod);
});

// --- Por frame ---------------------------------------------------------------
let tactilModoPrev = '', medidasPrev = null, cdDashPrev = -1, cdRaqPrev = -1, gueroPrev = false;
const elPanelGueroT = document.getElementById('panel-guero');

/** Qué parte de la capa se ve: todo jugando, solo ⏸ en el Modo Patio, nada en
 *  los menús. Solo toca el DOM cuando algo cambia. */
function modoCapaTactil() {
    if (!tactilVisible()) return '';
    if (estado === estados.J2D) return 'd2';
    if (estado === estados.J3D) return 'd3';
    if (estado === estados.PATIO) return 'patio';
    return '';
}

function pintarCdTactil(b, f, prev) {
    const v = Math.round(f * 40) / 40;
    if (v !== prev) b.style.setProperty('--cd', v);
    return v;
}

function actualizarTactil(dtReal) {
    const m = modoCapaTactil();
    if (m !== tactilModoPrev) {
        tactilModoPrev = m;
        elTactil.classList.toggle('oculto', m === '');
        elTactil.dataset.modo = m;
        document.body.classList.toggle('jugando', m === 'd2' || m === 'd3');
        soltarTodoTactil();
        medidasPrev = null;
    }
    // Con el panel de Güero abierto los rieles cambian de forma (ver el CSS).
    const g = m === 'd3' && !elPanelGueroT.classList.contains('oculto');
    if (g !== gueroPrev) { gueroPrev = g; document.body.classList.toggle('guero-abierto', g); }
    if (m !== 'd2' && m !== 'd3') return;

    // Joystick → flechas. En 2D, abajo pide más inclinación: correr en diagonal
    // no debe agacharte. Arriba es 'PadArriba', que solo lee el 3D (en 2D el
    // stick no salta solo, igual que con el mando).
    const umbralY = m === 'd2' ? 0.6 : 0.38;
    fijarTecla('ArrowLeft',  dedoJoy.dx < -0.38);
    fijarTecla('ArrowRight', dedoJoy.dx >  0.38);
    fijarTecla('ArrowDown',  dedoJoy.dy >  umbralY);
    fijarTecla('PadArriba',  dedoJoy.dy < -0.38);

    // Las cuatro medidas, siempre las cuatro: nunca dicen cuál toca.
    const c = m === 'd2' ? criaderoCercano2D() : criaderoCercano3D();
    if (!!c !== medidasPrev) { medidasPrev = !!c; capaT.med.classList.toggle('on', !!c); }

    // Enfriamiento de Dash y Raqueta, con el mismo dato que el HUD.
    cdDashPrev = pintarCdTactil(capaT.dash, clamp(jugador.dashCd / CFG.dashCd, 0, 1), cdDashPrev);
    const cdP = jugador.parryRecovery > 0
        ? clamp(jugador.parryRecovery / CFG.parryRecovery, 0, 1)
        : clamp(jugador.parryCd / CFG.parryCd, 0, 1);
    cdRaqPrev = pintarCdTactil(capaT.raqueta, cdP, cdRaqPrev);
}

// --- Imán de la mira (solo táctil) ----------------------------------------------
//  Apuntar arrastrando el dedo cuesta más que con ratón. Mientras disparas, si
//  un mosquito o la Hembra está casi en la mira, la cámara se le acerca un poco.
//  No apunta sola desde lejos, no atraviesa muros y no toca los envases.
const IMAN = { cono: 0.14, dist: 24, fuerza: 0.25 };

function asistenciaMira3D(dt) {
    if (imanT > 0) imanT -= dt;
    if (!tactilVisible() || (!tactilDisparo && imanT <= 0) || jugador.muerto) return;
    const cam = camera3D.position;
    const cp = Math.cos(jugador.pitch);
    const fx = -Math.sin(jugador.yaw) * cp, fy = Math.sin(jugador.pitch), fz = -Math.cos(jugador.yaw) * cp;
    let mejor = null, mejorAng = IMAN.cono;
    const probar = p => {
        const dx = p.x - cam.x, dy = p.y - cam.y, dz = p.z - cam.z;
        const d = Math.hypot(dx, dy, dz);
        if (d < 0.5 || d > IMAN.dist) return;
        const ang = Math.acos(clamp((dx * fx + dy * fy + dz * fz) / d, -1, 1));
        if (ang < mejorAng && visible3D(cam.x, cam.z, p.x, p.z)) { mejorAng = ang; mejor = p; }
    };
    for (const e of mosquitos3D) if (e.vivo) probar(e.malla.position);
    if (jefe3D && jefe3D.despierta && !jefe3D.muerto) probar(jefe3D.grupo.position);
    if (!mejor) return;

    const dx = mejor.x - cam.x, dy = mejor.y - cam.y, dz = mejor.z - cam.z;
    const k = 1 - Math.pow(1 - IMAN.fuerza, dt);
    jugador.yaw += difAngulo(Math.atan2(-dx, -dz), jugador.yaw) * k;
    const pitch = Math.atan2(dy, Math.hypot(dx, dz));
    jugador.pitch = clamp(jugador.pitch + (pitch - jugador.pitch) * k, -1.48, 1.48);
}

// --- Pantalla completa y horizontal --------------------------------------------
//  El navegador solo lo permite dentro de un gesto: se pide al tocar «Empezar»,
//  «Modo Patio» o «Reintentar». Safari en iPhone no tiene la API para páginas;
//  ahí la Ayuda sugiere «Agregar a inicio».
const PANTALLA_COMPLETA_OK = !!(document.documentElement.requestFullscreen ||
                                document.documentElement.webkitRequestFullscreen);
const enPantallaCompleta = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

function bloquearHorizontal() {
    try {
        const p = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape');
        if (p && p.catch) p.catch(() => {});
    } catch (e) { /* sin bloqueo de orientación */ }
}

function pedirPantallaCompleta() {
    const el = document.documentElement;
    const pedir = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!pedir || enPantallaCompleta()) return;
    try {
        const p = pedir.call(el, { navigationUI: 'hide' });
        if (p && p.then) p.then(bloquearHorizontal, () => {});
    } catch (e) { /* fuera de un gesto: no pasa nada */ }
}

function salirPantallaCompleta() {
    const salir = document.exitFullscreen || document.webkitExitFullscreen;
    if (!salir || !enPantallaCompleta()) return;
    try { const p = salir.call(document); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ya salió */ }
}

function alternarPantallaCompleta() { enPantallaCompleta() ? salirPantallaCompleta() : pedirPantallaCompleta(); }

/** Al empezar a jugar desde el celular. Con ratón o teclado no se toca nada. */
function pantallaCompletaAlJugar() { if (tactilVisible()) pedirPantallaCompleta(); }

// --- Teléfono en vertical (DI-424) ----------------------------------------------
//  El aviso lo muestra el CSS; aquí solo se pausa la partida para que nadie
//  pierda vida mientras gira el teléfono. Una tablet en vertical sí cabe.
const mqVertical = window.matchMedia('(orientation: portrait) and (max-width: 700px)');

function revisarOrientacion() {
    if (modoTactil && mqVertical.matches && (estado === estados.J2D || estado === estados.J3D)) pausar();
}
if (mqVertical.addEventListener) mqVertical.addEventListener('change', revisarOrientacion);
else if (mqVertical.addListener) mqVertical.addListener(revisarOrientacion);

// --- Textos ------------------------------------------------------------------
/** Cómo se aplica una medida, para los objetivos del HUD. */
const txtMedidas = () => tactilVisible() ? 'toca su medida' : 'pulsa 1-4';

// --- Arranque ----------------------------------------------------------------
fijarModoTactil(window.matchMedia('(hover: none) and (pointer: coarse)').matches);
ajustarEscala();
