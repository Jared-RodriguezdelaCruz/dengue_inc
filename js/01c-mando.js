"use strict";

// ---------------------------------------------------------------------------
//  MANDO (Gamepad API)
// ---------------------------------------------------------------------------
//  El navegador ya normaliza Xbox, DualShock/DualSense, Switch Pro y casi todos
//  los genéricos al layout "standard": los índices van por POSICIÓN, no por la
//  letra impresa. Por eso basta un solo mapeo; lo único que cambia entre marcas
//  son las etiquetas que se le enseñan al jugador.
//
//  El mando no toca el juego directamente: traduce sus botones a los mismos
//  códigos de tecla que ya lee el teclado ('Space', 'KeyJ'…) y los escribe en
//  padTeclas / padNuevas (01-nucleo.js). pulsada() y abajo() consultan ambos.

let mandoActivo = false;      // hay un mando conectado
let marcaMando = 'xbox';
let padDisparo = false;       // gatillo derecho sostenido: autofuego 3D

// Por posición en el layout standard. Nombres de posición = los de Xbox.
const BOTON = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7,
                BACK: 8, START: 9, L3: 10, R3: 11, ARRIBA: 12, ABAJO: 13, IZQ: 14, DER: 15 };

const ETIQUETAS_MANDO = {
    xbox:     { nombre: 'Xbox',        A: 'A', B: 'B', X: 'X', Y: 'Y', LB: 'LB', RB: 'RB', LT: 'LT', RT: 'RT', BACK: 'View',  START: 'Menu' },
    ps:       { nombre: 'PlayStation', A: '✕', B: '○', X: '□', Y: '△', LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2', BACK: 'Share', START: 'Options' },
    nintendo: { nombre: 'Nintendo',    A: 'B', B: 'A', X: 'Y', Y: 'X', LB: 'L',  RB: 'R',  LT: 'ZL', RT: 'ZR', BACK: '−',     START: '+' },
    generico: { nombre: 'Mando',       A: 'A', B: 'B', X: 'X', Y: 'Y', LB: 'LB', RB: 'RB', LT: 'LT', RT: 'RT', BACK: 'Select', START: 'Start' }
};
const etiquetasMando = () => ETIQUETAS_MANDO[marcaMando];

function detectarMarca(id) {
    const s = id.toLowerCase();
    if (/054c|playstation|dualshock|dualsense|wireless controller/.test(s)) return 'ps';
    if (/057e|nintendo|pro controller|joy-con/.test(s)) return 'nintendo';
    if (/xbox|xinput|045e/.test(s)) return 'xbox';
    return 'generico';
}

// Códigos que no esperan al bucle: se resuelven en accionGlobal() al instante.
const CODIGOS_GLOBALES = ['Escape', 'KeyC', 'KeyT', 'KeyM'];
const ZONA_MUERTA_MOV = 0.4;
const ZONA_MUERTA_CAM = 0.15;

const padPrev = {};           // estado del frame anterior, por código virtual
let indicePad = -1;
let avisadoNoEstandar = false;

window.addEventListener('gamepadconnected', e => {
    if (indicePad === -1) conectarPad(e.gamepad);
});
window.addEventListener('gamepaddisconnected', e => {
    if (e.gamepad.index !== indicePad) return;
    indicePad = -1; mandoActivo = false; padDisparo = false;
    for (const k in padTeclas) padTeclas[k] = false;
    aviso('🎮 Mando desconectado', 1200);
});

function conectarPad(gp) {
    indicePad = gp.index;
    mandoActivo = true;
    marcaMando = detectarMarca(gp.id);
    aviso('🎮 Mando conectado: ' + etiquetasMando().nombre, 1500);
    // Si el menú ya estaba abierto, que la tabla de controles enseñe los botones.
    const pc = document.getElementById('pm-controles');
    if (pc && pc.innerHTML) pc.innerHTML = tablaControles();
    if (gp.mapping !== 'standard' && !avisadoNoEstandar) {
        avisadoNoEstandar = true;
        console.warn('[mando] "' + gp.id + '" no usa el layout standard; los botones pueden no coincidir.');
    }
}

function padActual() {
    if (!navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    if (indicePad !== -1 && pads[indicePad]) return pads[indicePad];
    // Algunos navegadores no emiten 'gamepadconnected' si el mando ya estaba
    // enchufado al cargar: se busca a mano.
    for (const gp of pads) if (gp && gp.connected) { conectarPad(gp); return gp; }
    return null;
}

/** Vibración corta. Silenciosa si el mando o el navegador no la soportan. */
function vibrar(ms, fuerza) {
    const gp = mandoActivo ? padActual() : null;
    if (!gp || !gp.vibrationActuator) return;
    try {
        gp.vibrationActuator.playEffect('dual-rumble',
            { duration: ms, strongMagnitude: fuerza, weakMagnitude: fuerza * 0.6 });
    } catch (e) { /* sin vibración */ }
}

// --- Navegación de menús ---------------------------------------------------
//  Con un panel abierto, la cruceta (y el stick) mueven un foco entre sus
//  botones y A pulsa el que esté marcado. Los paneles a pantalla completa se
//  tragan todo lo demás; el de Güero se ve en plena partida, así que solo
//  captura la cruceta vertical y A: el jugador tiene que poder seguir moviéndose.
let focoPanel = null, focoIdx = 0, focoEl = null;
let navRepT = 0, navDirPrev = 0;

function panelConFoco() {
    const pm = document.getElementById('pantalla-mensaje');
    if (pm && !pm.classList.contains('oculto')) return { el: pm, completo: true };
    if (tiendaAbierta())  return { el: document.getElementById('tienda'),  completo: true };
    if (ficheroAbierto()) return { el: document.getElementById('fichero'), completo: true };
    const g = document.getElementById('panel-guero');
    if (g && !g.classList.contains('oculto') && estado === estados.J3D) return { el: g, completo: false };
    return null;
}

function botonesVisibles(panel) {
    return Array.from(panel.querySelectorAll('button')).filter(b => b.offsetParent !== null && !b.disabled);
}

function marcarFoco(botones) {
    const b = botones[focoIdx] || null;
    if (b === focoEl) return;
    if (focoEl) focoEl.classList.remove('foco-mando');
    focoEl = b;
    if (b) { b.classList.add('foco-mando'); b.scrollIntoView({ block: 'nearest' }); }
}

function soltarFoco() {
    if (focoEl) focoEl.classList.remove('foco-mando');
    focoEl = null; focoPanel = null;
}

/** -1 arriba, +1 abajo, 0 nada. Repite al mantener, como un teclado. */
function pasoNavegacion(dir, dtMs) {
    if (dir === 0) { navDirPrev = 0; return 0; }
    if (dir !== navDirPrev) { navDirPrev = dir; navRepT = 380; return dir; }
    navRepT -= dtMs;
    if (navRepT <= 0) { navRepT = 110; return dir; }
    return 0;
}

// --- Sondeo por frame ------------------------------------------------------
function actualizarMando(dtReal) {
    const gp = padActual();
    if (!gp) return;

    const bt = i => { const b = gp.buttons[i]; return !!b && (b.pressed || b.value > 0.5); };
    const ax = i => gp.axes[i] || 0;
    const lx = ax(0), ly = ax(1);

    // Estado sostenido de cada código virtual.
    const ahora = {
        Space:       bt(BOTON.A),
        ShiftLeft:   bt(BOTON.B),
        KeyJ:        bt(BOTON.X) || bt(BOTON.RT),
        KeyF:        bt(BOTON.Y) || bt(BOTON.LT),
        ControlLeft: bt(BOTON.L3),
        KeyT:        bt(BOTON.LB),
        KeyC:        bt(BOTON.RB),
        KeyM:        bt(BOTON.BACK),
        Escape:      bt(BOTON.START),
        Digit1:      bt(BOTON.ARRIBA),
        Digit2:      bt(BOTON.DER),
        Digit3:      bt(BOTON.ABAJO),
        Digit4:      bt(BOTON.IZQ),
        ArrowLeft:   lx < -ZONA_MUERTA_MOV,
        ArrowRight:  lx >  ZONA_MUERTA_MOV,
        ArrowDown:   ly >  ZONA_MUERTA_MOV,
        // Stick arriba NO es 'ArrowUp': en 2D eso salta, y con un stick se
        // saltaría sin querer. Solo el 3D lee 'PadArriba' (avanzar).
        PadArriba:   ly < -ZONA_MUERTA_MOV
    };
    const nuevo = c => ahora[c] && !padPrev[c];

    // --- Paneles con foco ---
    const p = panelConFoco();
    if (!p) soltarFoco();
    else {
        if (p.el !== focoPanel) { soltarFoco(); focoPanel = p.el; focoIdx = 0; }
        const botones = botonesVisibles(p.el);
        if (focoIdx >= botones.length) focoIdx = Math.max(0, botones.length - 1);

        let dir = 0;
        if (ahora.Digit1 || (p.completo && ly < -0.5) || (p.completo && ahora.Digit4)) dir = -1;
        else if (ahora.Digit3 || (p.completo && ly > 0.5) || (p.completo && ahora.Digit2)) dir = 1;
        const paso = pasoNavegacion(dir, dtReal * 16.667);
        if (paso && botones.length) focoIdx = (focoIdx + paso + botones.length) % botones.length;
        marcarFoco(botones);

        if (nuevo('Space') && focoEl) focoEl.click();
        else if (p.completo && estado === estados.MENU && nuevo('Escape') && focoEl) focoEl.click();

        if (p.completo && nuevo('ShiftLeft')) {
            if (tiendaAbierta()) cerrarTienda();
            else if (ficheroAbierto()) cerrarFichero();
            else if (estado === estados.PAUSA) reanudar();
        }
    }

    // --- Volcado a los mapas que lee el juego ---
    const completo = p && p.completo;
    for (const c in ahora) {
        // Sobre un panel del Güero, la cruceta vertical y A son del panel.
        const capturado = completo || (p && (c === 'Space' || c === 'Digit1' || c === 'Digit3'));
        padTeclas[c] = ahora[c] && !completo;
        if (nuevo(c)) {
            if (CODIGOS_GLOBALES.includes(c)) {
                // En un panel, B/Start ya se usaron arriba; T, C, M y Esc siguen
                // cerrando lo suyo igual que con teclado.
                if (!(completo && estado === estados.MENU)) accionGlobal(c);
            } else if (!capturado) padNuevas[c] = true;
        }
        padPrev[c] = ahora[c];
    }
    padDisparo = bt(BOTON.RT) && !completo;

    // --- Cámara 3D con el stick derecho ---
    if (estado === estados.J3D && !completo) {
        const cam = (v, dz) => {
            const a = Math.abs(v);
            if (a < dz) return 0;
            const n = (a - dz) / (1 - dz);
            return Math.sign(v) * n * n;       // curva cuadrática: precisión cerca del centro
        };
        const k = CFG.velCamaraMando * Math.min(dtReal, 3);
        ratonDX += cam(ax(2), ZONA_MUERTA_CAM) * k;
        ratonDY += cam(ax(3), ZONA_MUERTA_CAM) * k;
    }
}
