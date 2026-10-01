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

function reiniciarMarcador() {
    casosColonia = 0; casosEvitados = 0; atajosTomados = 0; erroresVerbo = 0; tAcumColonia = 0;
    cerradosPorVerbo = { lava: 0, tapa: 0, voltea: 0, tira: 0, abate: 0 };
    reiniciarGuero();
    fichasVistas.clear(); colaFichas.length = 0;
    fichaVisible = null; pintarAvisoFicha(null);
    mitosMostrados = 0;
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

    if (verbo === c.verbo) {
        c.neutralizado = true; c.activo = false; c.vaciado = false; c.conVerbo = verbo;
        cerradosPorVerbo[verbo]++;
        casosEvitados += 8;
        const v = VERBOS[verbo];
        aviso(v.icono + ' ' + v.nombre + ' · CRIADERO CERRADO', 1500);
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
    const seLlevaElAgua = verbo === 'voltea' ||
                          (verbo === 'lava' && (c.verbo === 'tira' || c.verbo === 'voltea'));
    if (seLlevaElAgua) {
        c.activo = false; c.vaciado = true; c.tRevive = 1200;   // ~20 s
        atajosTomados++;
        aviso('EL AGUA SE FUE… ESO PARECE', 1700);
        sfx.moneda();
        if (esc2D) fxHumo(cx, cy, 10, COL.GRIS_CL, 20);
        else if (c.malla) fxChispas3D(c.x, 2.4, c.z, 10, 0.75, 0.78, 0.8, 0.05);
        return 'trampa';
    }

    erroresVerbo++;
    aviso(explicarVerbo(c), 2400);
    sfx.parryFail(); sacudir(3);
    return 'mal';
}

/** El abate es larvicida: la medida correcta para lo que debe seguir con agua. */
function aplicarAbate(c) {
    if (!c || c.neutralizado) return false;
    c.neutralizado = true; c.activo = false; c.vaciado = false; c.conVerbo = 'abate';
    cerradosPorVerbo.abate++;
    casosEvitados += 6;
    aviso('ABATE · LARVAS ELIMINADAS', 1400);
    desbloquearFicha('abate');
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

function desbloquearFicha(id) {
    if (fichasVistas.has(id)) return;
    const f = FICHAS.find(x => x.id === id);
    if (!f) return;
    fichasVistas.add(id);
    colaFichas.push(f);
    tono(880, 0.09, 'triangle', 0.05);
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
    el.innerHTML = '<div class="af-cab">FICHA NUEVA · ' + f.cat + '</div>' +
                   '<div class="af-tit">' + f.titulo + '</div>' +
                   '<div class="af-txt">' + f.texto + '</div>' +
                   '<div class="af-src">' + f.fuente + '</div>';
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
}

// --- Mitos entre niveles ---------------------------------------------------
let mitosMostrados = 0;

function mitoDelNivel() {
    const m = MITOS[mitosMostrados % MITOS.length];
    mitosMostrados++;
    return '<div class="mito"><div class="m-falso">MITO: &ldquo;' + m.mito + '&rdquo;</div>' +
           '<div class="m-real">' + m.real + '</div>' +
           '<div class="m-src">' + m.fuente + '</div></div>';
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
    const d = DATOS_REALES;

    let h = '<div class="rep">';
    h += '<div class="rep-fila"><b>Criaderos cerrados</b><span>' + total + '</span></div>';
    h += '<div class="rep-detalle">Lava ' + v.lava + ' · Tapa ' + v.tapa +
         ' · Voltea ' + v.voltea + ' · Tira ' + v.tira + ' · Abate ' + v.abate + '</div>';
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
    h += '</div>';

    h += '<div class="datos"><h3>Y esto es lo real</h3><div class="serie">';
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
