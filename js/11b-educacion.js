"use strict";

// ---------------------------------------------------------------------------
//  10b. CAPA EDUCATIVA — verbos, casos en la colonia, fichero y reportes
//
//  Aquí vive todo lo que convierte la epidemiología en regla de juego. La
//  lógica de los verbos la comparten 2D y 3D: un criadero es el mismo objeto en
//  las dos dimensiones ({ tipo, verbo, activo, neutralizado, vaciado, ... }).
// ---------------------------------------------------------------------------

// --- Marcador de la partida ------------------------------------------------
let casosColonia   = 0;     // contagios en el barrio mientras haya criaderos vivos
let casosEvitados  = 0;
let cerradosPorVerbo = { lava: 0, tapa: 0, voltea: 0, tira: 0, abate: 0 };
let atajosTomados  = 0;     // veces que un criadero revivió por no tallar
let erroresVerbo   = 0;
let tAcumColonia   = 0;
let mosquitosAplastados = 0;
let avisoSinPaga   = false;   // el «este no paga» se explica una vez por partida

// --- Lo que paga el juego --------------------------------------------------
// Las monedas tienen que premiar lo que el juego enseña. Antes salían solo de
// matar mosquitos y cerrar un criadero no daba nada: la estrategia ganadora era
// justo la que la ficha «Matar mosquitos no sirve» desmiente. Ahora cerrar la
// fuente paga, y el mosquito que acaba de salir de un criadero vivo no paga:
// el criadero lo repone solo.
const PREMIO = { verbo: 3, abate: 2 };

function reiniciarMarcador() {
    casosColonia = 0; casosEvitados = 0; atajosTomados = 0; erroresVerbo = 0; tAcumColonia = 0;
    mosquitosAplastados = 0; avisoSinPaga = false;
    cerradosPorVerbo = { lava: 0, tapa: 0, voltea: 0, tira: 0, abate: 0 };
    reiniciarGuero();
    fichasVistas.clear(); colaFichas.length = 0;
    fichaVisible = null; pintarAvisoFicha(null);
    fichasPorRepasar.length = 0;
    retosMostrados = 0; retosAcertados = 0; retosContestados = 0; triageMostrados = 0;
    ivanResultado = null;
}

/** El jugador entra en la estadística: una persona infectada alimenta la cadena. */
function contagioEnColonia() { casosColonia += 2; }

/** Los criaderos activos siguen contagiando gente aunque no la veas. Un jugador
 *  infectado acelera la curva: la persona es el huésped que amplifica. */
function actualizarColonia(dt) {
    if (estado !== estados.J2D && estado !== estados.J3D) return;
    const activos = criaderosVivos();
    if (activos === 0) return;
    tAcumColonia += dt * activos * (infectado() ? 2.2 : 1);
    while (tAcumColonia >= 260) {
        tAcumColonia -= 260;
        casosColonia++;
        if (casosColonia === 12) desbloquearFicha('colonia');
    }
}

/** Criaderos sin neutralizar en el mundo que esté corriendo. */
function criaderosVivos() {
    const lista = modoRender === '2d' ? criaderos : criaderos3D;
    let n = 0;
    for (const c of lista) if (!c.neutralizado) n++;
    return n;
}

/** Monedas que suelta un mosquito al morir (2D y 3D). Si salió de un criadero
 *  que sigue vivo, ninguna: matarlo solo le deja el hueco a la siguiente cría. */
function valorMosquito(e) {
    mosquitosAplastados++;
    if (!e.origen || e.origen.neutralizado) return e.arq.valor;
    if (!avisoSinPaga) {
        avisoSinPaga = true;
        aviso('ESE SALIÓ DEL CRIADERO · NO PAGA: CIERRA LA FUENTE', 2200);
    }
    return 0;
}

/** El premio por cerrar la fuente, y lo que se aprende al hacerlo. Devuelve el
 *  texto del premio para el aviso. */
function pagarCierre(c, n) {
    // Cerrado antes de su primera cría: ni un solo mosquito salió de ahí.
    const temprano = c.producidos === 0;
    if (temprano) n += PREMIO_TEMPRANO;
    fichas += n;
    actualizarHUD();
    if (modoRender === '2d')
        emitirTexto(c.x + c.ancho / 2, c.y - 54, '+' + n + ' 💰', COL.ORO, 15);
    // Si ya había criado, los mosquitos que rondaban nacieron justo aquí.
    if (c.producidos > 0) desbloquearFicha('vuelo');
    else desbloquearFicha('ciclo');
    return (temprano ? 'ANTES DE QUE NACIERA UNO · ' : '') + '+' + n + ' 💰';
}

// --- El ciclo de vida, visible en el criadero -------------------------------
//  Cada cría recorre huevos → larvas → pupas → mosquito. El juego lo comprime a
//  segundos; en la vida real son de 8 a 10 días (ficha «ciclo»). La primera
//  vuelta dura más: es la ventana para cerrarlo antes de que nazca uno solo.
const CICLO_PRIMERO = 330;            // frames de la primera cría
const PREMIO_TEMPRANO = 2;
const ETAPAS = [
    { hasta: 0.45, nombre: 'HUEVOS', color: '#d7c48a' },
    { hasta: 0.80, nombre: 'LARVAS', color: '#26a69a' },
    { hasta: 1.00, nombre: 'PUPAS',  color: '#e67e22' }
];

/** En qué etapa va la cría actual de un criadero, y cuánto lleva (0..1). */
function etapaCriadero(c) {
    const p = clamp(1 - c.prod / (c.prodMax || CICLO_PRIMERO), 0, 1);
    for (const e of ETAPAS) if (p <= e.hasta) return { etapa: e, p: p };
    return { etapa: ETAPAS[ETAPAS.length - 1], p: 1 };
}

/** Nació un mosquito: arranca la siguiente cría. Lo llaman el 2D y el 3D. */
function reiniciarCiclo(c, frames) {
    c.prod = frames; c.prodMax = frames;
}

// --- La lluvia ---------------------------------------------------------------
//  Una vez por nivel llueve. Lo que se vació sin tallar revive al instante: la
//  lluvia vuelve a llenar lo que quedó boca arriba y despierta los huevos pegados
//  a la pared. No es azar contra el jugador: es la temporada de lluvias, y la
//  razón por la que el patio se revisa después de cada aguacero.
let lluvia = null;            // { espera, dura } en frames
let lloviendoDOM = false;

/** Al empezar cada nivel: la lluvia llega entre los 45 y los 70 s. */
function programarLluvia() {
    lluvia = { espera: 2700 + Math.random() * 1500, dura: 0 };
}

function actualizarLluvia(dt) {
    const enNivel = estado === estados.J2D || estado === estados.J3D;
    if (lluvia && enNivel) {
        if (lluvia.dura > 0) {
            lluvia.dura -= dt;
            if (lluvia.dura <= 0) {
                aviso('YA ESCAMPÓ · DESPUÉS DE LLOVER, REVISA EL PATIO', 2200);
                desbloquearFicha('lluvia');
            }
        } else if (lluvia.espera > 0) {
            lluvia.espera -= dt;
            if (lluvia.espera <= 0) empezarLluvia();
        }
    }
    // La clase solo se toca cuando cambia; en el menú no llueve.
    const ver = !!lluvia && lluvia.dura > 0 && (enNivel || estado === estados.PAUSA);
    if (ver !== lloviendoDOM) { lloviendoDOM = ver; contenedor.classList.toggle('lloviendo', ver); }
}

function empezarLluvia() {
    lluvia.dura = 480;                                   // ~8 s de aguacero
    aviso('LLUEVE · LO QUE QUEDÓ BOCA ARRIBA SE VUELVE A LLENAR', 2400);
    tono(90, 0.9, 'sawtooth', 0.03, 60);
    const lista = modoRender === '2d' ? criaderos : criaderos3D;
    for (const c of lista)
        if (c.vaciado && !c.neutralizado) c.tRevive = Math.min(c.tRevive, 40);
}

// --- Los cuatro verbos -----------------------------------------------------

/** Por qué falló, dicho en términos del envase que el jugador tiene enfrente. */
function explicarVerbo(c) {
    const d = CRIADEROS[c.tipo];
    switch (c.verbo) {
        case 'tapa':   return d.nombre + ' guarda agua que sí ocupas: TÁPALO.';
        case 'tira':   return d.nombre + ' ya no sirve para nada: TÍRALO.';
        case 'voltea': return d.nombre + ' vacío y boca arriba se vuelve a llenar: VOLTÉALO.';
        case 'lava':   return 'Cambiar el agua no basta. Talla la pared: LÁVALO.';
    }
    return '';
}

/**
 * La regla de las cuatro medidas, sin efectos: la comparten la partida y el
 * Modo Patio (11e). `correcto` es la medida que pide el envase.
 * La trampa: voltear o lavar algo que había que tirar (o lavar lo que había que
 * voltear) se lleva el agua, pero los huevos siguen pegados a la pared.
 */
function resultadoVerbo(correcto, verbo) {
    if (verbo === correcto) return 'ok';
    if (verbo === 'voltea' || (verbo === 'lava' && (correcto === 'tira' || correcto === 'voltea')))
        return 'trampa';
    return 'mal';
}

/**
 * Aplica un verbo a un criadero. Devuelve 'ok' | 'trampa' | 'mal' | 'ya'.
 *
 * La trampa es el corazón pedagógico: voltear un envase que había que tirar, o
 * lavar uno que había que tirar, SE VE como que funcionó — el agua desaparece —
 * pero los huevos siguen pegados a la pared y aguantan meses secos. A los ~20 s
 * el criadero vuelve solo, y ahí se entiende por qué vaciar nunca fue suficiente.
 */
function aplicarVerbo(c, verbo) {
    if (c.neutralizado) return 'ya';
    const esc2D = modoRender === '2d';
    const cx = c.x + (c.ancho || 0) / 2, cy = c.y + (c.alto || 0) / 2;

    const r = resultadoVerbo(c.verbo, verbo);
    if (r === 'ok') {
        c.neutralizado = true; c.activo = false; c.vaciado = false; c.conVerbo = verbo;
        cerradosPorVerbo[verbo]++;
        casosEvitados += 8;
        const v = VERBOS[verbo];
        aviso(v.icono + ' ' + v.nombre + ' · CRIADERO CERRADO · ' + pagarCierre(c, PREMIO.verbo), 1700);
        destellar(v.color, 0.26, 380);
        sfx.nivel();
        if (esc2D) {
            fxExplosion(cx, cy, 34, COL.TURQ, COL.BLANCO);
            emitirTexto(cx, cy - 34, CRIADEROS[c.tipo].nombre, COL.TURQ, 14);
        } else if (c.malla) {
            fxExplosion3D(c.malla.position.x, 1.2, c.malla.position.z, 2.2, 0.3, 0.9, 0.7);
        }
        desbloquearFicha(verbo);
        desbloquearFicha('agua_limpia');
        if (criaderosVivos() === 0) avisarSalidaAbierta();
        return 'ok';
    }

    // ¿El verbo se llevó el agua pero dejó los huevos pegados? Eso es la trampa.
    if (r === 'trampa') {
        c.activo = false; c.vaciado = true; c.tRevive = 1200;   // ~20 s
        atajosTomados++;
        aviso('EL AGUA SE FUE… ESO PARECE', 1700);
        sfx.moneda();
        if (esc2D) fxHumo(cx, cy, 10, COL.GRIS_CL, 20);
        else if (c.malla) fxChispas3D(c.x, c.aguaY + 0.2, c.z, 10, 0.75, 0.78, 0.8, 0.05);
        return 'trampa';
    }

    erroresVerbo++;
    aviso(explicarVerbo(c), 2400);
    sfx.parryFail(); sacudir(3);
    return 'mal';
}

/**
 * El abate es larvicida: la medida para el agua que SÍ se guarda (tinaco,
 * cisterna, tambo: los que se tapan). Antes su explosión cerraba cualquier
 * envase del radio y con 10 monedas te saltabas las cuatro medidas. Una llanta
 * con larvicida sigue siendo una llanta en el patio: se tira.
 */
function aplicarAbate(c) {
    if (!c || c.neutralizado) return false;
    desbloquearFicha('abate');
    if (c.verbo !== 'tapa') {
        aviso('EL ABATE ES PARA EL AGUA QUE SE GUARDA · ' + CRIADEROS[c.tipo].nombre.toUpperCase() +
              ': ' + VERBOS[c.verbo].nombre, 2200);
        return false;
    }
    c.neutralizado = true; c.activo = false; c.vaciado = false; c.conVerbo = 'abate';
    cerradosPorVerbo.abate++;
    casosEvitados += 6;
    aviso('ABATE · LARVAS ELIMINADAS · ' + pagarCierre(c, PREMIO.abate), 1600);
    if (criaderosVivos() === 0) avisarSalidaAbierta();
    return true;
}

function avisarSalidaAbierta() {
    if (modoRender === '3d') metaAbierta = true;
    aviso('SIN CRIADEROS · LA SALIDA SE ABRIÓ', 2200);
    destellar('#2ecc71', 0.3, 520);
}

/** Criadero al alcance del jugador en 2D, o null. */
function criaderoCercano2D() {
    let mejor = null, mejorD = 98;
    const jx = jugador.x + jugador.ancho / 2, jy = jugador.y + jugador.alto / 2;
    for (const c of criaderos) {
        if (c.neutralizado) continue;
        const d = Math.hypot(c.x + c.ancho / 2 - jx, c.y + c.alto / 2 - jy);
        if (d < mejorD) { mejorD = d; mejor = c; }
    }
    return mejor;
}

/** Lee las teclas 1..4 y aplica el verbo al criadero que se tenga enfrente. */
function leerVerbos(c) {
    if (!c) return;
    if (pulsada('Digit1') || pulsada('Numpad1')) aplicarVerbo(c, 'lava');
    else if (pulsada('Digit2') || pulsada('Numpad2')) aplicarVerbo(c, 'tapa');
    else if (pulsada('Digit3') || pulsada('Numpad3')) aplicarVerbo(c, 'voltea');
    else if (pulsada('Digit4') || pulsada('Numpad4')) aplicarVerbo(c, 'tira');
}

// --- Fichero ---------------------------------------------------------------
const fichasVistas = new Set();
const colaFichas = [];
let fichaVisible = null, tFichaVisible = 0;
// Las que se abrieron desde el último repaso. En plena pelea casi nadie las lee:
// se repasan juntas en la pausa entre niveles, que es cuando sí se leen.
const fichasPorRepasar = [];

function desbloquearFicha(id) {
    if (fichasVistas.has(id)) return;
    const f = FICHAS.find(x => x.id === id);
    if (!f) return;
    fichasVistas.add(id);
    colaFichas.push(f);
    fichasPorRepasar.push(f);
    tono(880, 0.09, 'triangle', 0.05);
}

/** Hasta el primer punto: lo que cabe en un vistazo. */
function primeraFrase(t) {
    const i = t.search(/\.\s/);
    return i < 0 ? t : t.slice(0, i + 1);
}

/** «Lo que aprendiste en este nivel»: las fichas nuevas, en corto. Vacía la lista. */
function repasoFichas(titulo) {
    if (!fichasPorRepasar.length) return '';
    let h = '<div class="repaso"><h3>' + titulo + '</h3>';
    for (const f of fichasPorRepasar)
        h += '<div class="rp-f"><b>' + f.titulo + '.</b> ' + primeraFrase(f.texto) + '</div>';
    fichasPorRepasar.length = 0;
    return h + '<div class="rp-pie">Completas, con su fuente, en el fichero (C).</div></div>';
}

/** Muestra las fichas nuevas de una en una, sin cortar la partida. */
function actualizarFichas(dt) {
    if (fichaVisible) {
        tFichaVisible -= dt;
        if (tFichaVisible <= 0) { fichaVisible = null; pintarAvisoFicha(null); }
        return;
    }
    if (!colaFichas.length) return;
    fichaVisible = colaFichas.shift();
    tFichaVisible = 470;                 // ~8 s, suficiente para leerla sin parar
    pintarAvisoFicha(fichaVisible);
}

function pintarAvisoFicha(f) {
    const el = document.getElementById('aviso-ficha');
    if (!el) return;
    if (!f) { el.classList.add('oculto'); return; }
    // En plena acción, solo lo que se lee de un vistazo. La ficha entera queda
    // en el fichero y vuelve en el repaso entre niveles.
    el.innerHTML = '<div class="af-cab">FICHA NUEVA · ' + f.cat + '</div>' +
                   '<div class="af-tit">' + f.titulo + '</div>' +
                   '<div class="af-txt">' + primeraFrase(f.texto) + '</div>' +
                   '<div class="af-src">C · leerla completa</div>';
    el.classList.remove('oculto');
}

const elFichero = () => document.getElementById('fichero');
const ficheroAbierto = () => !!elFichero() && !elFichero().classList.contains('oculto');

function alternarFichero() { ficheroAbierto() ? cerrarFichero() : abrirFichero(); }

function abrirFichero() {
    if (estado !== estados.J2D && estado !== estados.J3D) return;
    estadoPrevio = estado; estado = estados.PAUSA;
    if (document.pointerLockElement) document.exitPointerLock();
    const cats = ['Causas', 'Prevención', 'Enfermedad', 'Tratamiento'];
    let html = '';
    for (const cat of cats) {
        const grupo = FICHAS.filter(f => f.cat === cat);
        const abiertas = grupo.filter(f => fichasVistas.has(f.id)).length;
        html += '<h3>' + cat + ' <span class="cont">' + abiertas + '/' + grupo.length + '</span></h3>';
        for (const f of grupo) {
            if (fichasVistas.has(f.id))
                html += '<div class="ficha"><b>' + f.titulo + '</b><p>' + f.texto +
                        '</p><span class="src">' + f.fuente + '</span></div>';
            else
                html += '<div class="ficha bloq"><b>Sin descubrir</b>' +
                        '<p>Se abre cuando lo vivas en el juego.</p></div>';
        }
    }
    document.getElementById('fichero-lista').innerHTML = html;
    elFichero().classList.remove('oculto');
}

function cerrarFichero() {
    elFichero().classList.add('oculto');
    if (estado === estados.PAUSA) estado = estadoPrevio;
    capturarRaton3D();
}

// --- Botones de respuesta --------------------------------------------------
//  Los comparten «¿mito o realidad?» y el quiz. Se contestan con clic, con el
//  mando (foco + A: 01c-mando.js navega cualquier <button> del menú) o con las
//  teclas 1-4, las mismas de las cuatro medidas.
let opcionesActivas = null;

/** Crea una fila de opciones en `padre`. Se contesta una sola vez. */
function crearOpciones(padre, etiquetas, alElegir) {
    const fila = document.createElement('div');
    fila.className = 'r-ops';
    let hecho = false;
    const botones = etiquetas.map(function (txt, i) {
        const b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = '<span class="k">' + (i + 1) + '</span>' + txt;
        b.addEventListener('click', function () {
            if (hecho) return;
            hecho = true;
            for (const x of botones) x.disabled = true;
            if (opcionesActivas === botones) opcionesActivas = null;
            alElegir(i, botones);
        });
        fila.appendChild(b);
        return b;
    });
    padre.appendChild(fila);
    opcionesActivas = botones;
    return botones;
}

window.addEventListener('keydown', function (e) {
    // En el quiz, ya contestada la pregunta, Enter pasa a la siguiente.
    if (e.code === 'Enter' && quizEspera && estado === estados.MENU) { quizEspera = false; accionBotonMenu(); return; }
    if (!opcionesActivas || estado !== estados.MENU) return;
    const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
    const m = ['Numpad1', 'Numpad2', 'Numpad3', 'Numpad4'].indexOf(e.code);
    const b = opcionesActivas[n >= 0 ? n : m];
    if (!b || !document.body.contains(b)) return;
    // La misma pulsación no debe llegar al nivel que arranque después.
    teclasNuevas[e.code] = false;
    b.click();
});

// --- Retos entre niveles: ¿mito o realidad? y ¿a dónde lo llevo? ------------
//  Antes el mito se leía y ya. Ahora se contesta antes de ver la explicación:
//  recordar fija más que releer. Dos retos por pausa. Casi siempre son un mito y
//  una realidad en orden alterno, para que «mito» a ciegas no sirva; antes del
//  nivel 4 son dos vecinos con síntomas (TRIAGE): casa, centro de salud o urgencias.
const PREMIO_RETO = 2;
const NIVEL_TRIAGE = 4;            // la pausa que lleva a este nivel trae vecinos
let retosMostrados = 0, retosAcertados = 0, retosContestados = 0, triageMostrados = 0;

/** Los dos retos de la pausa que lleva al nivel `n`. */
function retosDelNivel(n) {
    if (n === NIVEL_TRIAGE) {
        const k = triageMostrados; triageMostrados += 2;
        return [TRIAGE[k % TRIAGE.length], TRIAGE[(k + 1) % TRIAGE.length]].map(t => ({
            cab: '¿A DÓNDE LO LLEVAS?', texto: t.pregunta, opciones: t.opciones, correcta: t.correcta,
            veredicto: 'Lo indicado: «' + t.opciones[t.correcta] + '».', explica: t.explica, fuente: t.fuente
        }));
    }
    const k = retosMostrados++;
    const m = MITOS[k % MITOS.length], r = REALIDADES[k % REALIDADES.length];
    const reto = (texto, esMito, explica, fuente) => ({
        cab: '¿MITO O REALIDAD?', texto: '&ldquo;' + texto + '&rdquo;', opciones: ['Mito', 'Realidad'],
        correcta: esMito ? 0 : 1, veredicto: 'Es ' + (esMito ? 'MITO' : 'REALIDAD') + '.',
        explica: explica, fuente: fuente
    });
    const a = reto(m.mito, true, m.real, m.fuente), b = reto(r.real, false, r.porque, r.fuente);
    return k % 2 ? [b, a] : [a, b];
}

/** Monta los retos en `caja`, uno tras otro. */
function montarRetos(caja, lista) {
    let i = 0;
    function siguiente() {
        if (i >= lista.length) return;
        const a = lista[i++];
        const el = document.createElement('div');
        el.className = 'reto';
        el.innerHTML = '<div class="r-cab">' + a.cab + ' · ' + i + '/' + lista.length + '</div>' +
                       '<div class="r-txt">' + a.texto + '</div>';
        caja.appendChild(el);
        crearOpciones(el, a.opciones, function (elegida, botones) {
            const acierto = elegida === a.correcta;
            retosContestados++;
            botones[elegida].classList.add(acierto ? 'bien' : 'mal');
            if (!acierto) botones[a.correcta].classList.add('era');
            const res = document.createElement('div');
            res.className = 'r-res ' + (acierto ? 'bien' : 'mal');
            res.innerHTML = '<b>' + (acierto ? '¡Bien! ' : 'No. ') + a.veredicto + '</b> ' + a.explica +
                            (acierto ? ' <span class="premio">+' + PREMIO_RETO + ' 💰</span>' : '') +
                            '<div class="r-src">' + a.fuente + '</div>';
            el.appendChild(res);
            if (acierto) { retosAcertados++; fichas += PREMIO_RETO; actualizarHUD(); sfx.moneda(); }
            else sfx.parryFail();
            siguiente();
        });
    }
    siguiente();
}

// --- Reportes --------------------------------------------------------------
function resumenSerotipos() {
    let s = '';
    for (let i = 1; i <= 4; i++) {
        const st = SEROTIPOS[i];
        s += jugador.inmunes[i]
            ? '<span class="pill on" style="background:' + st.color + '">' + st.nombre + '</span> '
            : '<span class="pill" style="border-color:' + st.color + '">' + st.nombre + '</span> ';
    }
    return s;
}

/** Reporte final: tu desempeño y luego las cifras reales, cada una con su fuente. */
function reporteFinal() {
    const v = cerradosPorVerbo;
    const total = v.lava + v.tapa + v.voltea + v.tira + v.abate;

    let h = '<div class="rep">';
    h += '<div class="rep-fila"><b>Criaderos cerrados</b><span>' + total + '</span></div>';
    h += '<div class="rep-detalle">Lava ' + v.lava + ' · Tapa ' + v.tapa +
         ' · Voltea ' + v.voltea + ' · Tira ' + v.tira + ' · Abate ' + v.abate + '</div>';
    h += '<div class="rep-fila"><b>Mosquitos aplastados</b><span>' + mosquitosAplastados + '</span></div>';
    if (mosquitosAplastados > total)
        h += '<div class="rep-nota">Aplastaste ' + mosquitosAplastados + ' mosquitos y cerraste ' + total +
             ' criaderos. Mientras un criadero siga vivo repone a los suyos: lo que frena el dengue ' +
             'es cerrar la fuente, no perseguir mosquitos.</div>';
    h += '<div class="rep-fila"><b>Casos en tu colonia</b><span class="' +
         (casosColonia > 25 ? 'malo' : 'bueno') + '">' + casosColonia + '</span></div>';
    if (atajosTomados > 0)
        h += '<div class="rep-nota">Tomaste el atajo ' + atajosTomados +
             (atajosTomados === 1 ? ' vez' : ' veces') + ': tiraste el agua sin tallar la pared y ' +
             'el criadero volvió solo. Los huevos aguantan meses secos.</div>';
    if (jugador.tomoAINE)
        h += '<div class="rep-nota malo">Tomaste ibuprofeno o aspirina con dengue. Eso es lo que ' +
             'provoca la hemorragia: para la fiebre va <b>paracetamol</b>.</div>';
    if (erroresVerbo === 0 && total > 0)
        h += '<div class="rep-nota buena">No fallaste ni una medida: sabes qué se lava, qué se ' +
             'tapa, qué se voltea y qué se tira.</div>';
    h += '<div class="rep-fila"><b>Serotipos que pasaste</b><span>' + serotiposPasados() + '/4</span></div>';
    h += '<div class="rep-pills">' + resumenSerotipos() + '</div>';
    h += '<div class="rep-fila"><b>Fichas descubiertas</b><span>' +
         fichasVistas.size + '/' + FICHAS.length + '</span></div>';
    if (retosContestados > 0)
        h += '<div class="rep-fila"><b>Retos entre niveles</b><span>' +
             retosAcertados + '/' + retosContestados + '</span></div>';
    if (ivanResultado)
        h += '<div class="rep-fila"><b>Decisiones con Ivan (fase febril)</b><span class="' +
             (ivanResultado.aciertos === ivanResultado.de ? 'bueno' : 'malo') + '">' +
             ivanResultado.aciertos + '/' + ivanResultado.de + '</span></div>';
    h += '</div>';
    return h + bloqueCifras('Y esto es lo real');
}

/** Las cifras reales de Aguascalientes y México. Las usan el reporte y «Aprende». */
function bloqueCifras(titulo) {
    const d = DATOS_REALES;
    let h = '<div class="datos"><h3>' + titulo + '</h3><div class="serie">';
    for (const a of d.aguascalientes)
        h += '<div class="barra"><span class="n">' + a.casos + '</span>' +
             '<div class="b" style="height:' + Math.max(5, Math.round(a.casos * 0.85)) + 'px"></div>' +
             '<span class="y">' + a.anio + '</span></div>';
    h += '</div>';
    h += '<p><b>Aguascalientes.</b> ' + d.aguasNota + '</p>';
    h += '<p><b>México.</b> ' + d.mexicoNota + '</p>';
    h += '<div class="fuentes">Fuentes: ' + d.fuentes.join(' · ') + '</div></div>';
    return h;
}

// --- Quiz de antes y después -----------------------------------------------
//  Las mismas preguntas (QUIZ, en 01b) al empezar y antes de ver el final. Al
//  empezar no se dice qué era lo correcto: el quiz mediría lo que enseña él y no
//  lo que enseñó el juego. Al final sí, con su explicación y su fuente.
let quizAntes = null, quizDespues = null;      // aciertos; null = se saltó
let quizEspera = false;     // contestada y con su explicación: Enter avanza

/**
 * Preguntas de opción múltiple, una por pantalla. Las usan el quiz y la consulta
 * de Ivan (11d). `o`: { lista, titulo, intro, conRespuesta, saltable, fin }.
 * Con `conRespuesta` se ve la explicación y su fuente antes de seguir. Al acabar
 * llama a alTerminar(aciertos, bienPorPregunta), o a alTerminar(null) si se saltó.
 */
function correrPreguntas(o, alTerminar) {
    const lista = o.lista, bienes = [];
    let i = 0, aciertos = 0, saltado = false;
    function saltar() { saltado = true; quizEspera = false; alTerminar(null, bienes); }
    function paso() {
        quizEspera = false;
        if (i >= lista.length) return alTerminar(aciertos, bienes);
        const q = lista[i];
        mostrarMenu({
            titulo: o.titulo + ' · ' + (i + 1) + '/' + lista.length,
            desc: '<div class="quiz"><div class="q-intro">' + o.intro + '</div>' +
                  '<div class="q-preg">' + q.pregunta + '</div><div id="q-caja"></div></div>',
            boton: o.saltable ? 'Saltar el quiz' : 'Elige una respuesta',
            accion: o.saltable ? saltar : () => {}
        });
        const caja = document.getElementById('q-caja');
        crearOpciones(caja, q.opciones, function (k, botones) {
            if (saltado) return;
            const bien = k === q.correcta;
            bienes.push(bien);
            if (bien) aciertos++;
            i++;
            if (!o.conRespuesta) { paso(); return; }
            botones[k].classList.add(bien ? 'bien' : 'mal');
            if (!bien) botones[q.correcta].classList.add('era');
            const res = document.createElement('div');
            res.className = 'r-res ' + (bien ? 'bien' : 'mal');
            res.innerHTML = '<b>' + (bien ? '¡Bien!' : 'No: era «' + q.opciones[q.correcta] + '».') +
                            '</b> ' + q.explica + '<div class="r-src">' + q.fuente + '</div>';
            caja.appendChild(res);
            if (bien) sfx.moneda(); else sfx.parryFail();
            if (q.ficha) desbloquearFicha(q.ficha);
            cambiarBotonMenu(i < lista.length ? 'Siguiente' : o.fin, paso);
            quizEspera = true;
        });
    }
    paso();
}

function quizInicio(alTerminar) {
    quizAntes = null; quizDespues = null;
    correrPreguntas({ lista: QUIZ, titulo: 'Antes de jugar', saltable: true, conRespuesta: false,
                      intro: 'Cinco preguntas rápidas, sin calificación. Al final te las vuelvo a ' +
                             'hacer para ver cuánto aprendiste. Contesta con clic o con las teclas 1-3.' },
                    function (n) { quizAntes = n; alTerminar(); });
}

function quizFinal(alTerminar) {
    correrPreguntas({ lista: QUIZ, titulo: 'Antes de ver el final', saltable: true, conRespuesta: true,
                      fin: 'Ver el final',
                      intro: '¿Qué pasó con Güero? Primero, las mismas cinco preguntas del principio. ' +
                             'Enter pasa a la siguiente.' },
                    function (n) { quizDespues = n; guardarQuiz(); alTerminar(); });
}

/** Se guarda en el navegador para sacar el promedio en los playtests (DI-485).
 *  Si el navegador no deja guardar, el juego sigue igual. */
function guardarQuiz() {
    if (quizDespues === null) return;
    try {
        const k = 'dengueinc.quiz';
        const lista = JSON.parse(localStorage.getItem(k) || '[]');
        lista.push({ antes: quizAntes, despues: quizDespues, de: QUIZ.length,
                     semilla: semillaRun, fecha: new Date().toISOString() });
        localStorage.setItem(k, JSON.stringify(lista.slice(-200)));
    } catch (e) { /* sin almacenamiento */ }
}

/** El bloque «antes → después» de la pantalla final. */
function resultadoQuiz() {
    if (quizDespues === null) return '';
    const de = QUIZ.length;
    const barra = (et, n, cls) =>
        '<div class="qb"><span class="qb-et">' + et + '</span>' +
        '<div class="qb-b"><div class="' + cls + '" style="width:' + (n / de * 100) + '%"></div></div>' +
        '<span class="qb-n">' + n + '/' + de + '</span></div>';
    let h = '<div class="quiz-res"><h3>Lo que sabías y lo que sabes</h3>';
    if (quizAntes !== null) h += barra('Antes', quizAntes, 'antes');
    h += barra('Después', quizDespues, 'despues');
    let nota;
    if (quizAntes === null) nota = 'Te saltaste el quiz del principio; la próxima vez contéstalo para comparar.';
    else if (quizDespues > quizAntes) nota = 'Subiste ' + (quizDespues - quizAntes) + ' de ' + de + '. Eso lo aprendiste jugando.';
    else if (quizDespues === de) nota = 'Ya lo sabías todo, y lo sigues sabiendo. Ahora llévalo a tu patio.';
    else nota = 'Repasa en el fichero las que fallaste: cada una cita su fuente.';
    return h + '<p>' + nota + '</p></div>';
}

// --- Revisa tu casa ---------------------------------------------------------
//  El juego no termina en el reporte: termina en el patio de verdad. La lista
//  sale de CRIADEROS y VERBOS, así que dice exactamente lo mismo que el juego.
const URL_JUEGO = 'https://jared-rodriguezdelacruz.github.io/dengue_inc/';

function listaRevisaTuCasa() {
    const orden = ['tapa', 'voltea', 'tira', 'lava'];
    return orden.map(function (v) {
        const envases = Object.keys(CRIADEROS).filter(k => CRIADEROS[k].verbo === v)
                              .map(k => CRIADEROS[k].nombre.toLowerCase());
        return { verbo: VERBOS[v], envases: envases };
    });
}

function revisaTuCasa() {
    let h = '<div class="revisa-casa"><h3>Revisa tu casa esta semana</h3>' +
            '<div class="rc-sub">Cada semana y después de cada lluvia. Toma 10 minutos.</div>';
    for (const g of listaRevisaTuCasa())
        h += '<div class="rc-g"><span class="rc-v" style="color:' + g.verbo.color + '">' +
             g.verbo.icono + ' ' + g.verbo.nombre + '</span>' +
             g.envases.map(e => '<label><span class="rc-box">☐</span>' + e + '</label>').join('') +
             '<div class="rc-p">' + g.verbo.accion + ': ' + g.verbo.porque + '.</div></div>';
    return h + '<div class="rc-acciones" id="rc-acciones"></div></div>';
}

/** Los botones van aparte, con listener: así el mando los alcanza y nada se recrea. */
function montarRevisaTuCasa() {
    const caja = document.getElementById('rc-acciones');
    if (!caja) return;
    const boton = (txt, fn) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'btn azul peq-linea'; b.textContent = txt;
        b.addEventListener('click', fn);
        caja.appendChild(b);
    };
    // Se imprime en una ventana aparte: imprimir la página entera sacaría el
    // marco del juego y los rieles.
    boton('🖨️ Imprimir la lista', () => {
        const w = window.open('', '_blank');
        if (!w) { aviso('EL NAVEGADOR BLOQUEÓ LA VENTANA', 1400); return; }
        let h = '<!doctype html><html lang="es"><meta charset="utf-8"><title>Revisa tu casa · Dengue Inc</title>' +
                '<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:32px auto;padding:0 16px;color:#111}' +
                'h1{font-size:22px;margin:0 0 4px}p{color:#444;margin:0 0 16px}h2{font-size:16px;margin:18px 0 4px}' +
                'li{list-style:none;font-size:15px;margin:6px 0}li:before{content:"☐  "}small{color:#555}</style>' +
                '<h1>Revisa tu casa esta semana</h1><p>Cada semana y después de cada lluvia. Toma 10 minutos.</p>';
        for (const g of listaRevisaTuCasa())
            h += '<h2>' + g.verbo.icono + ' ' + g.verbo.nombre + '</h2><small>' + g.verbo.accion + ': ' +
                 g.verbo.porque + '.</small><ul>' + g.envases.map(e => '<li>' + e + '</li>').join('') + '</ul>';
        h += '<p style="margin-top:24px"><small>Lo aprendí jugando Dengue Inc · ' + URL_JUEGO + '</small></p></html>';
        w.document.write(h);
        w.document.close();
        w.focus();
        w.print();
    });
    boton('📲 Mandarla por WhatsApp', () => {
        let t = 'Revisa tu patio esta semana contra el dengue 🦟\n';
        for (const g of listaRevisaTuCasa())
            t += '\n' + g.verbo.icono + ' ' + g.verbo.nombre + ': ' + g.envases.join(', ');
        t += '\n\nCada semana y después de cada lluvia. Lo aprendí jugando Dengue Inc: ' + URL_JUEGO;
        window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener');
    });
}

// --- Aprende: consultar sin jugar --------------------------------------------
//  Lo mismo que enseña la partida, de corrido y con sus fuentes, para quien
//  quiere repasarlo (o revisarlo) sin jugar. Todo sale de 01b: aquí no hay datos
//  nuevos, solo otro orden. En la partida las fichas se siguen abriendo jugando.
const SECCIONES_APRENDE = [
    { id: 'medidas',   nombre: 'Las 4 medidas' },
    { id: 'mosquito',  nombre: 'El mosquito',
      fichas: ['agua_limpia', 'ciclo', 'huevos_secos', 'vuelo', 'dia', 'lluvia'] },
    { id: 'sintomas',  nombre: 'Síntomas',
      fichas: ['fase_febril', 'fase_critica', 'senales_alarma', 'serotipos', 'dengue_grave'] },
    { id: 'que_hacer', nombre: 'Si te da dengue',
      fichas: ['hidratacion', 'sangrado', 'no_picar_enfermo', 'guero_alarma', 'guero_traslado', 'vacuna'] },
    { id: 'mitos',     nombre: 'Mitos y realidades' },
    { id: 'cifras',    nombre: 'Cifras' }
];

function fichaAprende(f, extra) {
    return '<div class="ap-ficha"><b>' + f.titulo + '</b>' + (extra || '') + '<p>' + f.texto +
           '</p><span class="src">' + f.fuente + '</span></div>';
}

function contenidoAprende(id) {
    const sec = SECCIONES_APRENDE.find(s => s.id === id) || SECCIONES_APRENDE[0];
    const ficha = k => FICHAS.find(f => f.id === k);
    if (sec.fichas) return sec.fichas.map(ficha).filter(Boolean).map(f => fichaAprende(f)).join('');
    if (sec.id === 'medidas') {
        let h = '';
        for (const g of listaRevisaTuCasa()) {
            const f = ficha(g.verbo.nombre.toLowerCase());
            h += fichaAprende(f, ' <span class="ap-env" style="color:' + g.verbo.color + '">' +
                                 g.verbo.icono + ' ' + g.envases.join(' · ') + '</span>');
        }
        return h + ['criadero_infinito', 'abate', 'repelente'].map(ficha).filter(Boolean)
                                                               .map(f => fichaAprende(f)).join('');
    }
    if (sec.id === 'mitos') {
        let h = '';
        for (const m of MITOS)
            h += '<div class="ap-ficha mito"><b>MITO: «' + m.mito + '»</b><p>' + m.real +
                 '</p><span class="src">' + m.fuente + '</span></div>';
        for (const r of REALIDADES)
            h += '<div class="ap-ficha real"><b>REALIDAD: ' + r.real + '.</b><p>' + r.porque +
                 '</p><span class="src">' + r.fuente + '</span></div>';
        return h;
    }
    return bloqueCifras('Dengue en Aguascalientes y en México');
}

function abrirAprende(id) {
    mostrarMenu({
        titulo: 'Aprende',
        desc: '<div class="ap-sub">Lo que enseña el juego, de corrido. Cada dato cita su fuente.</div>' +
              '<div class="ap-tabs" id="ap-tabs"></div>' +
              '<div class="ap-cont">' + contenidoAprende(id) + '</div>',
        boton: 'Volver', accion: menuPrincipal
    });
    elPantalla.scrollTop = 0;
    const tabs = document.getElementById('ap-tabs');
    for (const s of SECCIONES_APRENDE) {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = s.nombre;
        if (s.id === id) b.classList.add('activa');
        b.addEventListener('click', () => abrirAprende(s.id));
        tabs.appendChild(b);
    }
}
