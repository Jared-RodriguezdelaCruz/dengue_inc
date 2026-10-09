"use strict";

// ---------------------------------------------------------------------------
//  10f. PANTALLA DE TÍTULO Y SUBMENÚS (DI-469, DI-422, DI-423)
//
//  Estética de VHS y neón al atardecer: una lista vertical con una sola
//  selección que mueven por igual el teclado (↑↓, Enter, Esc), el ratón (pasar
//  por encima y clic) y el mando (01c-mando.js llama a navegarTitulo,
//  activarTitulo y volverTitulo). Los submenús se abren en el panel de la
//  derecha sin perder de vista la lista.
//
//  Lo demás sigue en #pantalla-mensaje: el quiz, Aprende, la intro del Modo
//  Patio, la pausa y los finales. mostrarMenu() oculta esta pantalla y
//  menuPrincipal() la vuelve a mostrar, así que todo «Volver» o «Menú
//  principal» ya existente llega aquí sin cambios.
// ---------------------------------------------------------------------------

const elTitulo = document.getElementById('titulo');
const elTLista = document.getElementById('t-lista');
const elTPanel = document.getElementById('t-panel');
const elTDesc  = document.getElementById('t-desc');

const ITEMS_TITULO = [
    { id: 'jugar',    txt: 'Jugar',      sub: true,
      desc: 'Cinco niveles que cambian con cada semilla: plataformas 2D y exploración 3D.' },
    { id: 'patio',    txt: 'Modo Patio', accion: () => abrirPatio(),
      desc: 'Sin mosquitos: encuentra los diez criaderos de una casa, contra reloj.' },
    { id: 'aprende',  txt: 'Aprende',    accion: () => abrirAprende('medidas'),
      desc: 'Todo lo que enseña el juego, con sus fuentes, sin tener que jugar.' },
    { id: 'opciones', txt: 'Opciones',   sub: true,
      desc: 'Volumen, sensibilidad 3D, destellos, sacudidas, tutorial y pantalla completa.' },
    { id: 'ayuda',    txt: 'Ayuda',      sub: true,
      desc: 'Controles de teclado, mando y pantalla táctil, y cómo se juega.' },
    { id: 'creditos', txt: 'Créditos',   sub: true,
      desc: 'El equipo, sus roles y las fuentes del contenido.' }
];

// Roles de docs/ROADMAP.md §2, resumidos.
const EQUIPO = [
    ['Ana',   'CEO y Project Manager',         'Visión, prioridades, contenido educativo y sus fuentes'],
    ['Jared', 'Backend',                       'Motor, generación procedural, IA, física, CI/CD y despliegue'],
    ['Gael',  'Música y sonido',               'Música, efectos de sonido y mezcla'],
    ['Mau',   'Frontend',                      'HUD, menús, render 2D, mundo 3D, efectos visuales y marca'],
    ['Ivan',  'QA, métricas y documentación',  'Pruebas, playtests, métricas, README y evidencias']
];

let tSub = null;          // submenú abierto, o null en la lista principal
let tSel = 0;             // índice de la selección entre los controles activos
let tItemPrevio = 0;      // a qué ítem vuelve la selección al cerrar un submenú

const tituloVisible = () => !elTitulo.classList.contains('oculto');

// --- Mostrar y ocultar -------------------------------------------------------
function mostrarTitulo() {
    estado = estados.MENU;
    tSub = null;
    pintarListaTitulo();
    elTPanel.classList.add('oculto');
    elTPanel.innerHTML = '';
    document.getElementById('t-build').textContent = 'build ' + BUILD;
    pintarAyudaTitulo();
    elTitulo.classList.remove('oculto');
    if (document.pointerLockElement) document.exitPointerLock();
    marcarTitulo(tItemPrevio);
}

function ocultarTitulo() { elTitulo.classList.add('oculto'); }

function pintarListaTitulo() {
    if (elTLista.children.length) {
        for (const b of elTLista.children) b.classList.remove('abierto');
        return;
    }
    ITEMS_TITULO.forEach((it, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 't-op t-item';
        b.textContent = it.txt;
        b.dataset.id = it.id;
        b.addEventListener('click', () => { tItemPrevio = i; elegirItemTitulo(it); });
        // Con un submenú abierto la selección vive en el panel: pasar por la
        // lista no se la quita (el clic sí abre el otro submenú).
        b.addEventListener('mouseenter', () => { if (!tSub) marcarTitulo(i, true); });
        elTLista.appendChild(b);
    });
}

function elegirItemTitulo(it) {
    if (it.sub) abrirSubTitulo(it.id);
    else it.accion();
}

/** La ayuda de abajo cambia con el mando: así nadie tiene que adivinar botones. */
function pintarAyudaTitulo() {
    const el = document.getElementById('t-ayuda');
    if (!el) return;
    if (mandoActivo) {
        const e = etiquetasMando();
        el.textContent = 'Cruceta elegir · ←→ ajustar · ' + e.A + ' aceptar · ' + e.B + ' volver';
    } else if (modoTactil) {
        el.textContent = 'Toca una opción para elegirla';
    } else if (escalaMarco < 0.75) {
        // DI-424: en una ventana chica todo se ve reducido; mejor decirlo.
        el.textContent = 'La ventana es chica: agrándala o activa la pantalla completa en Opciones';
    } else {
        el.textContent = '↑↓ elegir · ←→ ajustar · Enter aceptar · Esc volver';
    }
}

// --- Submenús ----------------------------------------------------------------
function abrirSubTitulo(id) {
    tSub = id;
    tItemPrevio = ITEMS_TITULO.findIndex(it => it.id === id);
    elTDesc.textContent = ITEMS_TITULO[tItemPrevio].desc;
    for (const b of elTLista.children) b.classList.toggle('abierto', b.dataset.id === id);
    let h = '';
    if (id === 'jugar') {
        h = '<h2>Jugar</h2>' +
            '<p class="t-txt">Aguascalientes tiene un problema de criaderos… y una grieta dimensional. ' +
            'Cinco niveles <b>generados por procedimientos</b> que cambian con cada semilla, alternando ' +
            'plataformas 2D y exploración 3D en primera persona.</p>' +
            '<p class="t-txt">El <b>dash</b> te vuelve invulnerable. La <b>raqueta</b> (F) achicharra lo que ' +
            'tengas delante, devuelve los proyectiles morados y abre el escudo del jefe.</p>' +
            '<label class="t-semilla">Semilla <span>(vacía = una nueva)</span>' +
            '<input id="in-semilla" class="t-op" type="text" autocomplete="off" spellcheck="false" value="' +
            semillaRun + '"></label>' +
            '<div><button type="button" class="t-op t-btn" data-acc="empezar">Empezar</button>' +
            '<button type="button" class="t-op t-btn sec" data-acc="volver">Volver</button></div>';
    } else if (id === 'opciones') {
        h = '<h2>Opciones</h2><div id="t-opciones"></div>' +
            '<button type="button" class="t-op t-btn sec" data-acc="volver">Volver</button>';
    } else if (id === 'ayuda') {
        h = '<h2>Ayuda</h2>' + htmlComoSeJuega() + tablaControles() +
            '<div><button type="button" class="t-op t-btn" data-acc="tutorial">Repetir tutorial</button>' +
            '<button type="button" class="t-op t-btn sec" data-acc="volver">Volver</button></div>' +
            '<div class="t-nota" id="t-nota-tutorial"></div>';
    } else if (id === 'creditos') {
        h = '<h2>Créditos</h2>' + htmlCreditos() +
            '<button type="button" class="t-op t-btn sec" data-acc="volver">Volver</button>';
    }
    elTPanel.innerHTML = h;
    elTPanel.classList.remove('oculto');
    elTPanel.scrollTop = 0;
    if (id === 'opciones') pintarOpciones(document.getElementById('t-opciones'));

    for (const b of elTPanel.querySelectorAll('[data-acc]'))
        b.addEventListener('click', () => accionPanelTitulo(b.dataset.acc));
    const inp = document.getElementById('in-semilla');
    if (inp) inp.addEventListener('keydown', e => {
        if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); e.stopPropagation(); empezarJuego(); }
    });
    for (const op of controlesTitulo())
        op.addEventListener('mouseenter', () => marcarTitulo(controlesTitulo().indexOf(op), true));
    // En la ayuda lo primero es leer: la selección empieza en el primer botón,
    // que está al final, pero el texto se queda arriba.
    marcarTitulo(0, id === 'ayuda' || id === 'creditos');
    if (id === 'ayuda' || id === 'creditos') elTPanel.scrollTop = 0;
}

function accionPanelTitulo(acc) {
    if (acc === 'empezar') empezarJuego();
    else if (acc === 'volver') volverTitulo();
    else if (acc === 'tutorial') {
        repetirTutorial();
        const n = document.getElementById('t-nota-tutorial');
        if (n) n.textContent = 'Listo: el tutorial saldrá en el nivel 1 y en el primer nivel 3D de tu próxima partida.';
    }
}

function volverTitulo() {
    if (!tSub) return;                 // en la lista principal, Esc no hace nada
    tSub = null;
    elTPanel.classList.add('oculto');
    elTPanel.innerHTML = '';
    for (const b of elTLista.children) b.classList.remove('abierto');
    marcarTitulo(tItemPrevio);
}

// --- Selección ---------------------------------------------------------------
function controlesTitulo() {
    const raiz = tSub ? elTPanel : elTLista;
    return Array.from(raiz.querySelectorAll('.t-op')).filter(el => el.offsetParent !== null);
}

/** `sinScroll`: el ratón ya está encima, no hace falta mover el panel. */
function marcarTitulo(i, sinScroll) {
    const ops = controlesTitulo();
    if (!ops.length) return;
    tSel = (i + ops.length) % ops.length;
    for (const el of elTitulo.querySelectorAll('.t-op.sel')) el.classList.remove('sel');
    const el = ops[tSel];
    el.classList.add('sel');
    if (!tSub) {
        tItemPrevio = tSel;
        elTDesc.textContent = ITEMS_TITULO[tSel].desc;
    }
    // El campo de semilla recibe el foco para poder escribir; lo demás no, para
    // que Espacio o Enter no lo activen dos veces (una el navegador, otra aquí).
    if (el.tagName === 'INPUT') el.focus();
    else if (document.activeElement && elTitulo.contains(document.activeElement)) document.activeElement.blur();
    if (!sinScroll) el.scrollIntoView({ block: 'nearest' });
}

function navegarTitulo(paso) {
    const ops = controlesTitulo();
    if (!ops.length) return;
    // En el borde, si al panel le queda texto en esa dirección, primero se
    // desplaza: la ayuda y los créditos son más altos que el marco.
    const enBorde = tSel === (paso < 0 ? 0 : ops.length - 1);
    if (tSub && enBorde && quedaScroll(elTPanel, paso)) { elTPanel.scrollTop += paso * 70; return; }
    marcarTitulo(tSel + paso);
    sfx.salto();
}

function activarTitulo() {
    const el = controlesTitulo()[tSel];
    if (!el) return;
    if (el.tagName === 'INPUT') { empezarJuego(); return; }
    if (el.dataset.tipo === 'rango') return;       // se ajusta con ← →
    el.click();
}

/** ← → : mueve un deslizador o cambia un ON/OFF. En la lista no hace nada. */
function ajustarTitulo(dir) {
    const el = controlesTitulo()[tSel];
    if (!el) return;
    if (el.dataset.tipo === 'rango') ajustarRango(el, dir);
    else if (el.dataset.tipo === 'toggle') el.click();
}

window.addEventListener('keydown', e => {
    if (!tituloVisible()) return;
    const enCampo = e.target && e.target.tagName === 'INPUT' && e.target.type === 'text';
    switch (e.code) {
        case 'ArrowUp':   navegarTitulo(-1); break;
        case 'ArrowDown': navegarTitulo(1); break;
        case 'KeyW': if (enCampo) return; navegarTitulo(-1); break;
        case 'KeyS': if (enCampo) return; navegarTitulo(1); break;
        case 'ArrowLeft': case 'KeyA':  if (enCampo) return; ajustarTitulo(-1); break;
        case 'ArrowRight': case 'KeyD': if (enCampo) return; ajustarTitulo(1); break;
        case 'Enter': case 'NumpadEnter': activarTitulo(); break;
        case 'Space': if (enCampo) return; activarTitulo(); break;
        case 'Escape': volverTitulo(); break;
        case 'Backspace': if (enCampo) return; volverTitulo(); break;
        default: return;
    }
    e.preventDefault();
});

// --- Opciones (DI-423) ---------------------------------------------------------
// Las mismas filas sirven en el título y en la pausa. Cada deslizador lleva
// botones − y +: el mando de la pausa solo sabe pulsar botones.
const FILAS_OPCIONES = [
    { tipo: 'toggle', txt: 'Música',             leer: () => musicaActiva, cambiar: () => alternarMusicaMenu() },
    { tipo: 'rango',  txt: 'Volumen de música',  clave: 'volMusica', min: 0, max: 1, paso: 0.1, fmt: v => Math.round(v * 100) + '%' },
    { tipo: 'toggle', txt: 'Sonidos',            leer: () => sfxActivo, cambiar: () => alternarSonidosMenu() },
    { tipo: 'rango',  txt: 'Volumen de efectos', clave: 'volSfx',    min: 0, max: 1, paso: 0.1, fmt: v => Math.round(v * 100) + '%' },
    { tipo: 'rango',  txt: 'Sensibilidad 3D',    clave: 'sens',      min: 0.3, max: 2.5, paso: 0.1, fmt: v => '×' + v.toFixed(1) },
    { tipo: 'toggle', txt: 'Reducir destellos',  clave: 'menosDestellos' },
    { tipo: 'toggle', txt: 'Reducir sacudidas',  clave: 'menosSacudidas' },
    { tipo: 'toggle', txt: 'Tutorial en la primera partida', clave: 'tutorial' },
    // Solo si el navegador la tiene (Safari en iPhone no): 01d-tactil.js.
    { tipo: 'toggle', txt: 'Pantalla completa', leer: enPantallaCompleta, cambiar: alternarPantallaCompleta,
      si: () => PANTALLA_COMPLETA_OK, pantalla: true }
];

// Entrar o salir de pantalla completa tarda un instante (o lo hace el sistema,
// con Esc o el gesto de atrás): la fila se repinta cuando de verdad cambia.
function repintarFilasPantalla() {
    for (const b of document.querySelectorAll('.t-fila[data-pantalla]')) if (b._pintar) b._pintar();
}
document.addEventListener('fullscreenchange', repintarFilasPantalla);
document.addEventListener('webkitfullscreenchange', repintarFilasPantalla);

function pintarOpciones(cont) {
    if (!cont) return;
    cont.innerHTML = '';
    cont.classList.add('t-opciones');
    FILAS_OPCIONES.forEach(f => {
        if (f.si && !f.si()) return;
        if (f.tipo === 'toggle') {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 't-op t-fila';
            b.dataset.tipo = 'toggle';
            const pintar = () => {
                const on = f.leer ? f.leer() : opciones[f.clave];
                b.innerHTML = '<span class="t-et">' + f.txt + '</span><span class="t-val ' +
                              (on ? 'on' : 'off') + '">' + (on ? 'ON' : 'OFF') + '</span>';
            };
            if (f.pantalla) { b.dataset.pantalla = '1'; b._pintar = pintar; }
            b.addEventListener('click', () => {
                if (f.cambiar) f.cambiar();
                else { opciones[f.clave] = !opciones[f.clave]; guardarOpciones(); aplicarOpciones(); }
                pintar();
            });
            pintar();
            cont.appendChild(b);
            return;
        }
        const fila = document.createElement('div');
        fila.className = 't-op t-fila';
        fila.dataset.tipo = 'rango';
        fila.dataset.clave = f.clave;
        fila.innerHTML = '<span class="t-et">' + f.txt + '</span>' +
            '<button type="button" class="t-menos" aria-label="Menos">−</button>' +
            '<input type="range" tabindex="-1" min="' + f.min + '" max="' + f.max + '" step="' + f.paso + '">' +
            '<button type="button" class="t-mas" aria-label="Más">+</button>' +
            '<span class="t-val"></span>';
        const inp = fila.querySelector('input');
        inp.value = opciones[f.clave];
        fila._fila = f;
        fila.querySelector('.t-val').textContent = f.fmt(opciones[f.clave]);
        inp.addEventListener('input', () => fijarRango(fila, parseFloat(inp.value)));
        fila.querySelector('.t-menos').addEventListener('click', () => ajustarRango(fila, -1));
        fila.querySelector('.t-mas').addEventListener('click', () => ajustarRango(fila, 1));
        cont.appendChild(fila);
    });
}

function ajustarRango(fila, dir) {
    const f = fila._fila;
    fijarRango(fila, opciones[f.clave] + dir * f.paso);
}

function fijarRango(fila, v) {
    const f = fila._fila;
    // Redondeo al paso: sumar 0.1 diez veces no da 1 exacto.
    v = Math.round(clamp(v, f.min, f.max) / f.paso) * f.paso;
    opciones[f.clave] = parseFloat(v.toFixed(2));
    fila.querySelector('input').value = opciones[f.clave];
    fila.querySelector('.t-val').textContent = f.fmt(opciones[f.clave]);
    guardarOpciones();
    aplicarOpciones();
    if (f.clave === 'volSfx') sfx.moneda();       // para oír cómo queda
}

// --- Ayuda y créditos ------------------------------------------------------------
function htmlComoSeJuega() {
    return '<ul class="t-lista-txt">' +
        '<li>Los mosquitos salen de <b>criaderos</b>: envases con agua. Mientras uno siga abierto, repone ' +
        'a los que mates. Cierra todos y se abre la salida.</li>' +
        '<li>Cada envase pide su medida: <b>1 lava · 2 tapa · 3 voltea · 4 tira</b>. La legenda de la ' +
        'izquierda explica cada una; cuál va con cuál, lo aprendes jugando.</li>' +
        '<li>Si te pican, te da fiebre. Cuando baja empieza la fase crítica: ahí un golpe pega el doble. ' +
        'Cada mosquito porta uno de los cuatro serotipos.</li>' +
        '<li>Con <b>T</b> abres la tienda y con <b>C</b> el fichero, donde se guarda lo que vas aprendiendo.</li>' +
        '</ul>';
}

function htmlCreditos() {
    let h = '<div class="t-creditos">';
    for (const p of EQUIPO)
        h += '<div class="t-cred"><b>' + p[0] + '</b><span class="t-rol">' + p[1] + '</span>' +
             '<span class="t-que">' + p[2] + '</span></div>';
    h += '</div>';
    h += '<p class="t-txt"><b>Tecnología:</b> HTML5 Canvas, Three.js r128 (licencia MIT), Web Audio y ' +
         'Gamepad API. Los efectos de sonido se generan en el navegador. Se abre con doble clic, sin servidor.</p>';
    h += '<p class="t-txt"><b>Contenido:</b> cada dato sobre el dengue cita su fuente:</p><ul class="t-lista-txt">';
    for (const k in FUENTES) h += '<li>' + FUENTES[k] + '</li>';
    h += '</ul>';
    return h;
}

// --- Fondo ---------------------------------------------------------------------
// El skyline se calcula a partir de la x, sin rnd(): el título no debe mover la
// secuencia que genera los niveles de cada semilla.
function skylineTitulo() {
    const hash = (x, s) => { const v = Math.sin(x * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };
    const capa = (sem, base, alto, conTinaco, ventanas) => {
        let r = '', luces = '';
        for (let x = -20; x < 980;) {
            const a = hash(x, sem), b = hash(x + 7, sem + 3);
            const w = 44 + Math.floor(a * 56), h = base + Math.floor(b * alto);
            r += '<rect x="' + x + '" y="' + (170 - h) + '" width="' + (w - 3) + '" height="' + h + '"/>';
            if (conTinaco && b > 0.3) {
                const tx = x + 6 + Math.floor(a * (w - 28));
                r += '<rect x="' + tx + '" y="' + (170 - h - 13) + '" width="15" height="13" rx="3"/>';
            }
            if (ventanas)
                for (let k = 0; k < 3; k++)
                    if (hash(x + k * 13, sem + 9) > 0.62)
                        luces += '<rect x="' + (x + 8 + k * 13) + '" y="' + (178 - h + 12 + k * 9) +
                                 '" width="6" height="7"/>';
            x += w;
        }
        return { r, luces };
    };
    const atras = capa(1, 70, 60, true, false), frente = capa(2, 34, 50, true, true);
    return '<g fill="#3a0d52">' + atras.r + '</g><g fill="#12031f">' + frente.r + '</g>' +
           '<g fill="#ffcf6b" opacity=".8">' + frente.luces + '</g>';
}

document.getElementById('t-skyline').innerHTML = skylineTitulo();

// El contador de cinta: «SP 00:00:07» desde que abriste el juego.
const tInicioCinta = performance.now();
setInterval(() => {
    if (!tituloVisible()) return;
    const s = Math.floor((performance.now() - tInicioCinta) / 1000);
    const dos = n => String(n).padStart(2, '0');
    document.getElementById('t-cinta').textContent =
        'SP ' + dos(Math.floor(s / 3600)) + ':' + dos(Math.floor(s / 60) % 60) + ':' + dos(s % 60);
}, 1000);
