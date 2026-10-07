"use strict";

// ===========================================================================
//  10. FLUJO DE NIVELES, TIENDA, HUD Y BUCLE PRINCIPAL
// ===========================================================================
let modoRender = '2d';
let cambiandoNivel = false;
let statsGen = '';

// --- Tienda ----------------------------------------------------------------
const elTienda = document.getElementById('tienda');
const tiendaAbierta = () => !elTienda.classList.contains('oculto');

function alternarTienda() { tiendaAbierta() ? cerrarTienda() : abrirTienda(); }
function abrirTienda() {
    if (estado !== estados.J2D && estado !== estados.J3D) return;
    estadoPrevio = estado; estado = estados.PAUSA;
    if (document.pointerLockElement) document.exitPointerLock();
    elTienda.classList.remove('oculto');
    refrescarTienda();
}
function cerrarTienda() {
    elTienda.classList.add('oculto');
    if (estado === estados.PAUSA) estado = estadoPrevio;
}

const PRECIOS = { repelente: 5, abate: 10, suero: 8, paracetamol: 4, aine: 3, vacuna: 20 };

function comprar(id) {
    const costo = PRECIOS[id];
    // --- Tratamiento -------------------------------------------------------
    if (id === 'paracetamol' || id === 'aine' || id === 'vacuna') {
        if (id === 'vacuna' && jugador.vacunado) { aviso('YA ESTÁS VACUNADO', 700); return; }
        // Un antifebril sin fiebre no enseña nada: el castigo del AINE llegaría
        // en una infección posterior, desconectado de la compra, y el aviso
        // ("LA FIEBRE BAJÓ…") no tendría sentido. Que espere a estar enfermo.
        if ((id === 'aine' || id === 'paracetamol') && !infectado()) {
            aviso('AÚN NO TIENES FIEBRE', 1100); sfx.parryFail(); return;
        }
        if (fichas < costo) { aviso('SIN MONEDAS', 700); sfx.parryFail(); return; }
        fichas -= costo;
        if (id === 'paracetamol') tomarParacetamol();
        else if (id === 'aine')   tomarAINE();
        else                      aplicarVacuna();
        actualizarHUD(); refrescarTienda();
        return;
    }
    if (id === 'suero') {
        if (jugador.vida >= CFG.vidaMax) { aviso('VIDA COMPLETA', 700); return; }
        if (fichas < costo) { aviso('SIN MONEDAS', 700); sfx.parryFail(); return; }
        fichas -= costo; jugador.vida++;
        sfx.moneda(); latirCorazones(); actualizarHUD(); refrescarTienda();
        return;
    }
    if (inventario.includes(id)) { armaActiva = id; actualizarHUD(); refrescarTienda(); return; }
    if (fichas < costo) { aviso('SIN MONEDAS', 700); sfx.parryFail(); return; }
    fichas -= costo; inventario.push(id); armaActiva = id;
    sfx.nivel(); actualizarHUD(); refrescarTienda();
}

function refrescarTienda() {
    for (const id of ['repelente', 'abate']) {
        const b = document.getElementById('btn-' + id);
        if (inventario.includes(id)) {
            b.textContent = armaActiva === id ? 'Equipado' : 'Equipar';
            b.className = armaActiva === id ? 'equipado' : '';
        } else {
            b.textContent = 'Comprar (' + PRECIOS[id] + ')';
            b.className = fichas >= PRECIOS[id] ? '' : 'caro';
        }
    }
    const bp = document.getElementById('btn-paracetamol');
    bp.textContent = 'Comprar (' + PRECIOS.paracetamol + ')';
    bp.className = fichas >= PRECIOS.paracetamol ? '' : 'caro';
    const ba = document.getElementById('btn-aine');
    ba.textContent = 'Comprar (' + PRECIOS.aine + ')';
    ba.className = fichas >= PRECIOS.aine ? '' : 'caro';
    const bv = document.getElementById('btn-vacuna');
    bv.textContent = jugador.vacunado ? 'Aplicada' : 'Comprar (' + PRECIOS.vacuna + ')';
    bv.className = jugador.vacunado ? 'equipado' : (fichas >= PRECIOS.vacuna ? '' : 'caro');
    const bs = document.getElementById('btn-suero');
    bs.textContent = jugador.vida >= CFG.vidaMax ? 'Vida llena' : 'Comprar (' + PRECIOS.suero + ')';
    bs.className = (jugador.vida < CFG.vidaMax && fichas >= PRECIOS.suero) ? '' : 'caro';
}

// --- HUD -------------------------------------------------------------------
const elCorazones = document.getElementById('corazones');
const elEstamina  = document.getElementById('relleno-estamina');
const elHabDash   = document.getElementById('hab-dash');
const elHabParry  = document.getElementById('hab-parry');
const elObjetivo  = document.getElementById('ui-objetivo');
let vidaDibujada = -1;

function actualizarHUD() {
    if (jugador.vida !== vidaDibujada) {
        vidaDibujada = jugador.vida;
        let html = '';
        for (let i = 0; i < CFG.vidaMax; i++)
            html += '<span class="corazon' + (i < jugador.vida ? '' : ' vacio') + '">❤️</span>';
        elCorazones.innerHTML = html;
    }
    document.getElementById('ui-fichas').textContent = fichas;
    document.getElementById('ui-arma').textContent =
        armaActiva === 'botas' ? 'Botas' : (armaActiva === 'abate' ? 'Abate' : 'Repelente');
    document.getElementById('ui-nivel').textContent =
        'Nivel ' + nivelActual + (NIVEL_ES_2D(nivelActual) ? ' · 2D' : ' · 3D');
    document.getElementById('ui-semilla').textContent = 'semilla ' + semillaRun;
    pintarSerotipos();
}

/** Tarjeta de serotipos: cuatro casillas. La que enciende es inmunidad ganada;
 *  la que parpadea es la infección que estás cursando ahora. */
function pintarSerotipos() {
    const el = document.getElementById('serotipos');
    if (!el) return;
    const cursando = jugador.infeccion ? jugador.infeccion.serotipo : 0;
    let html = '';
    for (let i = 1; i <= 4; i++) {
        const st = SEROTIPOS[i];
        const cls = 'st' + (jugador.inmunes[i] ? ' inmune' : '') + (i === cursando ? ' activo' : '');
        const estilo = jugador.inmunes[i] ? ' style="background:' + st.color + '"'
                     : (i === cursando ? ' style="border-color:' + st.color + ';color:' + st.color + '"' : '');
        html += '<div class="' + cls + '"' + estilo + '>' + i + '</div>';
    }
    el.innerHTML = html;
}

/** El aviso de los cuatro verbos en 3D. En 2D se dibuja sobre el canvas. */
let promptVerbosPrev = '';

function pintarPromptVerbos() {
    const el = document.getElementById('prompt-verbos');
    if (!el) return;
    const c = (modoRender === '3d' && estado === estados.J3D) ? criaderoCercano3D() : null;
    if (!c) { el.classList.add('oculto'); promptVerbosPrev = ''; return; }
    // Se repintaba veinte veces por segundo para mostrar siempre lo mismo.
    if (c.tipo === promptVerbosPrev) { el.classList.remove('oculto'); return; }
    promptVerbosPrev = c.tipo;
    const orden = ['lava', 'tapa', 'voltea', 'tira'];
    let html = '<div class="pv-tit">' + CRIADEROS[c.tipo].nombre + '</div><div>';
    for (let i = 0; i < 4; i++) {
        const v = VERBOS[orden[i]];
        html += '<span class="pv-v" style="color:' + v.color + '">' + (i + 1) + ' ' + v.nombre + '</span>';
    }
    el.innerHTML = html + '</div>';
    el.classList.remove('oculto');
}

function latirCorazones() {
    const cs = elCorazones.children;
    for (let i = 0; i < cs.length; i++) {
        cs[i].classList.add('pulso');
        setTimeout(() => cs[i] && cs[i].classList.remove('pulso'), 130);
    }
}

function actualizarHUDContinuo() {
    // --- Enfermedad -------------------------------------------------------
    const inf = jugador.infeccion;
    const bloque = document.getElementById('bloque-fiebre');
    const cont = document.getElementById('game-container');
    if (inf) {
        bloque.classList.remove('oculto');
        const critica = inf.fase === 'critica';
        bloque.classList.toggle('critica', critica);
        // En fase crítica la barra se vacía: el HUD se ve sano justo cuando más
        // peligro hay. Es el punto entero de la lección.
        document.getElementById('relleno-fiebre').style.width =
            (critica ? 0 : clamp(inf.t / inf.tMax, 0, 1) * 100) + '%';
        document.getElementById('etiqueta-fiebre').textContent =
            critica ? (inf.grave ? 'FASE CRÍTICA · DENGUE GRAVE' : 'FASE CRÍTICA') : 'FIEBRE';
        cont.classList.toggle('febril', !critica);
        cont.classList.toggle('critica', critica);
    } else {
        bloque.classList.add('oculto');
        cont.classList.remove('febril', 'critica');
    }
    document.getElementById('ui-casos').textContent = casosColonia;
    pintarPromptVerbos();

    elEstamina.style.width = (jugador.estamina / CFG.estaminaMax * 100) + '%';
    elEstamina.classList.toggle('agotada', jugador.estamina < CFG.dashCoste);

    const cdD = clamp(jugador.dashCd / CFG.dashCd, 0, 1);
    elHabDash.firstElementChild.style.height = (cdD * 100) + '%';
    elHabDash.classList.toggle('listo', cdD <= 0 && jugador.estamina >= CFG.dashCoste);

    const cdP = jugador.parryRecovery > 0
        ? clamp(jugador.parryRecovery / CFG.parryRecovery, 0, 1)
        : clamp(jugador.parryCd / CFG.parryCd, 0, 1);
    elHabParry.firstElementChild.style.height = (cdP * 100) + '%';
    elHabParry.classList.toggle('listo', cdP <= 0 && jugador.estamina >= CFG.parryCoste);

    if (modoRender === '2d') {
        if (jefe && !jefe.muerto) {
            objetivo('Rompe el escudo con la RAQUETA y destruye el Núcleo',
                     jefe.fase === 1
                        ? 'Fase 1: parea el orbe turquesa. Es lo único que le baja el escudo.'
                        : 'Fase 2: el núcleo está expuesto. Esquiva la embestida — cuando se ' +
                          'estrelle contra la pared, pégale.');
        } else if (meta) {
            const quedan = criaderosVivos();
            if (quedan > 0) {
                objetivo('Cierra los criaderos — quedan ' + quedan,
                         'Acércate a un envase y pulsa 1-4. Cada uno pide su medida.');
            } else {
                const d = Math.max(0, Math.round((meta.x - jugador.x) / 10));
                objetivo('Alcanza la salida — ' + d + ' m',
                         'Sin criaderos activos, la puerta ya está abierta.');
            }
        } else objetivo('', '');
        brujula3D(null);
    } else {
        if (!document.pointerLockElement && !mandoActivo && estado === estados.J3D) {
            objetivo('🖱️ Haz clic para capturar el ratón', '');
        } else if (guero && guero.encontrado && !guero.resuelto) {
            objetivo('Decide qué hacer con Güero',
                     'Está en fase crítica. El panel de la derecha tiene las opciones.');
        } else if (criaderosVivos() > 0) {
            objetivo('Cierra los criaderos — quedan ' + criaderosVivos(),
                     'Acércate a un envase y pulsa 1-4. La flecha te lleva al más cercano.');
        } else if (!gueroListo()) {
            objetivo('Encuentra a Güero', 'La columna naranja marca dónde está.');
        } else {
            objetivo('Llega al portal morado', 'Ya cerraste todo. La flecha apunta a la salida.');
        }
        brujula3D(objetivo3D());
    }
}

// --- Panel de objetivo del riel derecho ------------------------------------
let objetivoPrev = '';
function objetivo(txt, detalle) {
    elObjetivo.textContent = txt;
    if (txt === objetivoPrev) return;
    objetivoPrev = txt;
    const a = document.getElementById('objetivo-txt');
    const b = document.getElementById('objetivo-detalle');
    if (a) a.textContent = txt || '—';
    if (b) b.textContent = detalle || '';
}

/**
 * A qué apunta la brújula: primero la fuente que falta por cerrar, luego Güero,
 * y al final la salida. Devuelve {x, z, txt, meta} o null.
 */
function objetivo3D() {
    if (!camera3D) return null;
    const cam = camera3D.position;
    let mejor = null, mejorD = 1e9;
    for (const c of criaderos3D) {
        if (c.neutralizado) continue;
        const d = Math.hypot(c.x - cam.x, c.z - cam.z);
        if (d < mejorD) { mejorD = d; mejor = c; }
    }
    if (mejor) return { x: mejor.x, z: mejor.z, txt: CRIADEROS[mejor.tipo].nombre, meta: false };
    if (guero && !guero.resuelto)
        return { x: guero.x, z: guero.z, txt: GUERO.nombre, meta: false };
    if (meta3D && metaAbierta)
        return { x: meta3D.position.x, z: meta3D.position.z, txt: 'Portal', meta: true };
    return null;
}

/**
 * La brújula. El mapa 3D mide 147 unidades de lado y la vista llega a 130: sin
 * una flecha, encontrar la siguiente fuente entre la niebla era cuestión de dar
 * vueltas. El ángulo es el que hay entre hacia dónde miras y dónde está.
 */
function brujula3D(obj) {
    const el = document.getElementById('brujula');
    if (!el) return;
    if (!obj || estado !== estados.J3D) { el.classList.add('oculto'); return; }

    const cam = camera3D.position;
    const fx = -Math.sin(jugador.yaw), fz = -Math.cos(jugador.yaw);
    const dx = obj.x - cam.x, dz = obj.z - cam.z;
    const ang = Math.atan2(fx * dz - fz * dx, fx * dx + fz * dz);
    const dist = Math.round(Math.hypot(dx, dz));

    document.getElementById('brujula-aguja').style.transform = 'rotate(' + ang + 'rad)';
    document.getElementById('brujula-txt').textContent = obj.txt + ' · ' + dist + ' m';
    el.classList.toggle('meta', !!obj.meta);
    el.classList.remove('oculto');
}

/** La legenda del riel izquierdo sale de VERBOS: una sola fuente de verdad. */
function pintarLegenda() {
    const el = document.getElementById('legenda-lista');
    if (!el) return;
    const orden = ['lava', 'tapa', 'voltea', 'tira'];
    let h = '';
    for (let i = 0; i < 4; i++) {
        const v = VERBOS[orden[i]];
        h += '<div class="lg-v">' +
             '<span class="lg-k" style="background:' + v.color + '">' + (i + 1) + '</span>' +
             '<span><span class="lg-n" style="color:' + v.color + '">' + v.nombre + '</span>' +
             '<div class="lg-p">' + v.accion + ' — ' + v.porque + '.</div></span></div>';
    }
    el.innerHTML = h;
}

// --- Menús -----------------------------------------------------------------
const elPantalla = document.getElementById('pantalla-mensaje');
let accionMenu = () => {};
let accionMenu2 = null;

function tablaControles() {
    const filas = [
        ['Mover', 'A / D · ←→'], ['Saltar', 'W · ↑ · Espacio'],
        ['Dash', 'Shift'],       ['Esquive', 'S + Shift'],
        ['Raqueta', 'F · clic der'], ['Atacar', 'J · clic izq'],
        ['Tienda', 'T'],         ['Pausa', 'Esc'],
        ['Medidas', '1 lava · 2 tapa · 3 voltea · 4 tira'],
        ['Fichero', 'C'],
        ['Debug', 'F3'],         ['Silencio', 'M'],
        ['Mirar (3D)', 'ratón'], ['Capturar (3D)', 'clic']
    ];
    const tabla = f => '<div class="tabla-controles">' +
        f.map(x => '<div>' + x[0] + ' <b>' + x[1] + '</b></div>').join('') + '</div>';
    if (!mandoActivo) return tabla(filas);

    const e = etiquetasMando();
    const filasMando = [
        ['Mover', 'stick izq.'],   ['Saltar', e.A],
        ['Dash', e.B],             ['Esquive', '↓ + ' + e.B],
        ['Raqueta', e.Y + ' · ' + e.LT], ['Atacar', e.X + ' · ' + e.RT],
        ['Tienda', e.LB],          ['Pausa', e.START],
        ['Medidas', 'cruceta ↑ lava · → tapa · ↓ voltea · ← tira'],
        ['Fichero', e.RB],
        ['Mirar (3D)', 'stick der.'], ['Silencio', e.BACK]
    ];
    return tabla(filas) +
        '<div style="margin-top:8px;font-size:12px;color:#4dd0e1">🎮 ' + e.nombre + '</div>' +
        tabla(filasMando);
}

function actualizarBotonesAudioMenu() {
    const m = document.getElementById('pm-musica');
    const s = document.getElementById('pm-sonidos');
    if (m) m.textContent = 'Música: ' + (musicaActiva ? 'ON' : 'OFF');
    if (s) s.textContent = 'Sonidos: ' + (sfxActivo ? 'ON' : 'OFF');
}

function alternarMusicaMenu() {
    musicaActiva = !musicaActiva;
    if (!musicaActiva) audioActivo = true;
    actualizarMusicaFondo();
    actualizarBotonesAudioMenu();
}

function alternarSonidosMenu() {
    sfxActivo = !sfxActivo;
    if (!sfxActivo) audioActivo = true;
    actualizarBotonesAudioMenu();
}

function mostrarMenu(o) {
    document.getElementById('pm-titulo').innerHTML = o.titulo;
    document.getElementById('pm-desc').innerHTML = o.desc || '';
    document.getElementById('pm-controles').innerHTML = o.controles ? tablaControles() : '';
    actualizarBotonesAudioMenu();
    document.getElementById('pm-semilla').innerHTML = o.semilla
        ? 'Semilla (deja vacío para una nueva): <input id="in-semilla" value="' + semillaRun + '">'
        : '';
    document.getElementById('pm-semilla').insertAdjacentHTML('beforeend', o.pie
        ? '<div style="margin-top:10px;font-size:10px;color:#546a7b">build ' + o.pie + '</div>' : '');
    document.getElementById('pm-boton').textContent = o.boton || 'Continuar';
    const b2 = document.getElementById('pm-boton2');
    if (o.boton2) { b2.textContent = o.boton2; b2.style.display = 'inline-block'; accionMenu2 = o.accion2; }
    else { b2.style.display = 'none'; accionMenu2 = null; }
    accionMenu = o.accion;
    elPantalla.classList.remove('oculto');
    if (document.pointerLockElement) document.exitPointerLock();
}
function ocultarMenu() { elPantalla.classList.add('oculto'); }
function accionBotonMenu()  { if (accionMenu) accionMenu(); }
function accionBotonMenu2() { if (accionMenu2) accionMenu2(); }

function hashSemilla(txt) {
    if (/^\d+$/.test(txt)) return parseInt(txt, 10) % 2147483647;
    let h = 2166136261;
    for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); }
    return Math.abs(h | 0);
}

function menuPrincipal() {
    estado = estados.MENU;
    abortarTransicion();
    mostrarMenu({
        titulo: 'Dengue: Multiverso',
        desc: 'Aguascalientes tiene un problema de criaderos… y una grieta dimensional.<br>' +
              'Cinco niveles <b>generados por procedimientos</b> que cambian con cada semilla, alternando ' +
              'plataformas 2D y exploración 3D en primera persona.<br><br>' +
              '<b>Dash</b> te vuelve invulnerable. La <b>raqueta</b> (F) achicharra lo que tengas ' +
              'delante, devuelve los proyectiles morados y aturde a lo que esté cerca — es la ' +
              'mecánica que abre el escudo del jefe.',
        controles: true, semilla: true,
        boton: 'Iniciar', accion: empezarJuego,
        pie: BUILD
    });
}

function empezarJuego() {
    const inp = document.getElementById('in-semilla');
    const txt = inp ? inp.value.trim() : '';
    semillaRun = txt !== '' ? hashSemilla(txt) : ((Math.random() * 2147483647) | 0);
    fichas = 0; inventario = ['botas']; armaActiva = 'botas';
    reiniciarJugador(true);
    reiniciarMarcador();
    jugador.vida = CFG.vidaMax; jugador.estamina = CFG.estaminaMax;
    vidaDibujada = -1;
    audio();                                    // desbloquea WebAudio con un gesto
    ocultarMenu();
    iniciarNivel(1);
}

function mostrarDerrota() {
    estado = estados.MENU;
    mostrarMenu({
        titulo: 'Te venció el dengue',
        desc: 'Caíste en el nivel ' + nivelActual + '.' + reporteFinal() +
              '<div style="color:#90a4ae;font-size:11px;margin-top:8px">El nivel se regenera con la ' +
              'misma semilla, así que el trazado será idéntico.</div>',
        boton: 'Reintentar nivel', accion: () => { ocultarMenu(); reiniciarJugador(true); vidaDibujada = -1; iniciarNivel(nivelActual); },
        boton2: 'Menú principal', accion2: menuPrincipal
    });
}

/** El final del juego. No lo decide cruzar el portal: lo decide Güero. */
function finalGuero() {
    estado = estados.MENU;
    const salvado = guero && guero.salvado;
    if (salvado) sfx.nivel(); else sfx.muerte();
    mostrarMenu({
        titulo: salvado ? 'Transmisión cortada' : 'Cortaste la transmisión… casi',
        desc: (salvado
                ? 'Cerraste los criaderos en las dos dimensiones. Sin criadero no hay mosquito; ' +
                  'sin mosquito no hay dengue.'
                : 'Llegaste al final, pero el dengue no se mide en niveles terminados.') +
              desenlaceGuero() + reporteFinal() +
              '<div style="color:#90a4ae;font-size:11px;margin-top:8px">Semilla jugada: ' + semillaRun + '</div>',
        boton: 'Jugar otra vez', accion: menuPrincipal
    });
}

function pausar() {
    if (estado !== estados.J2D && estado !== estados.J3D) return;
    estadoPrevio = estado;
    estado = estados.PAUSA;
    mostrarMenu({
        titulo: 'Pausa',
        desc: 'Nivel ' + nivelActual + ' · semilla ' + semillaRun + ' · ' + fichas + ' 💰',
        controles: true,
        boton: 'Continuar', accion: reanudar,
        boton2: 'Menú principal', accion2: menuPrincipal
    });
}
function reanudar() { ocultarMenu(); estado = estadoPrevio; }

// --- Control de niveles ----------------------------------------------------
function iniciarNivel(n) {
    nivelActual = n;
    cambiandoNivel = false;
    // Si arranca un nivel, no puede quedar ninguna pantalla encima. Sin esto una
    // derrota que se resuelve justo durante la transicion deja el menu colgado.
    ocultarMenu();
    if (ficheroAbierto()) cerrarFichero();
    if (tiendaAbierta()) cerrarTienda();
    tokensAtaque = 0;
    limpiarParticulas();

    if (NIVEL_ES_2D(n)) {
        modoRender = '2d';
        estado = estados.J2D;
        canvas.style.display = 'block';
        document.getElementById('container3d').style.display = 'none';
        document.getElementById('crosshair').style.display = 'none';
        if (document.pointerLockElement) document.exitPointerLock();
        const reparaciones = generarNivel2D(n);
        statsGen = plataformas.length + ' plat · ' + enemigos.length + ' enem · ' +
                   monedas.length + ' mon · ' + reparaciones + ' puentes';
    } else {
        modoRender = '3d';
        estado = estados.J3D;
        canvas.style.display = 'none';
        document.getElementById('container3d').style.display = 'block';
        document.getElementById('crosshair').style.display = 'block';
        if (!scene) iniciarMotor3D();
        const muros = generarNivel3D(n);
        statsGen = salas.length + ' salas · ' + muros + ' muros(1 draw) · ' + mosquitos3D.length + ' enem';
    }
    vidaDibujada = -1;
    actualizarHUD();
    sfx.nivel();
    aviso('NIVEL ' + n, 1100);
}

/** Cierre de nivel: qué hiciste y un mito derribado. Es la pausa donde el
 *  aprendizaje se asienta, y dura lo que el jugador quiera. */
function pantallaEntreNiveles(n) {
    estado = estados.MENU;
    const v = cerradosPorVerbo;
    const cerrados = v.lava + v.tapa + v.voltea + v.tira + v.abate;
    let d = '<div class="rep">';
    d += '<div class="rep-fila"><b>Criaderos cerrados en total</b><span>' + cerrados + '</span></div>';
    d += '<div class="rep-fila"><b>Casos en la colonia</b><span class="' +
         (casosColonia > 15 ? 'malo' : 'bueno') + '">' + casosColonia + '</span></div>';
    if (atajosTomados > 0)
        d += '<div class="rep-nota">Un criadero revivió porque tiraste el agua sin tallar la ' +
             'pared. Los huevos aguantan meses secos: por eso la campaña dice <b>LAVA</b>.</div>';
    d += '</div>';
    d += mitoDelNivel();
    mostrarMenu({
        titulo: 'Nivel ' + (n - 1) + ' cerrado',
        desc: d,
        boton: 'Nivel ' + n,
        accion: () => { ocultarMenu(); iniciarNivel(n); }
    });
}

function completarNivel() {
    if (cambiandoNivel || jugador.muerto || estado === estados.TRANSICION) return;
    cambiandoNivel = true;
    // Morado, el color del portal que acabas de cruzar, y corto. El velo BLANCO
    // es de la grieta dimensional del nivel 4 y de nada más: si cada cambio de
    // nivel lo usa, el salto entre dimensiones deja de significar algo.
    destellar('#8e44ad', 0.34, 300);
    sfx.nivel();
    if (modoRender === '2d') fxExplosion(jugador.x + 12, jugador.y + 16, 40, COL.MORADO, COL.BLANCO);
    setTimeout(() => {
        if (nivelActual >= 5) finalGuero();
        else pantallaEntreNiveles(nivelActual + 1);
    }, 520);
}

// ---------------------------------------------------------------------------
//  TRANSICIÓN DIMENSIONAL 2D → 3D (final del nivel 4)
//
//  Esto eran nueve setTimeout anidados escribiendo sobre la misma propiedad CSS
//  que destellar(). Dos dueños peleándose: el fogonazo del salto se lo comía
//  siempre la explosión anterior, y si un timer se estrangulaba la secuencia se
//  quedaba a medias. Ahora es una máquina de estados en frames, como el resto
//  del juego: una pestaña de fondo la retrasa, pero no puede romperla.
// ---------------------------------------------------------------------------
let transicion = null;

// ---------------------------------------------------------------------------
//  Reparto de responsabilidades, aprendido a base de romperlo dos veces:
//
//    · Lo CRÍTICO —abrir la grieta, cargar el mundo nuevo, quitar la cortina—
//      va por setTimeout, agendado entero en cuanto cae el jefe. setTimeout
//      sigue disparando aunque la pestaña pierda el foco; requestAnimationFrame
//      no. Atar esto al bucle es lo que dejaba la pantalla en blanco.
//    · Lo COSMÉTICO —estallidos, implosión de partículas— va en el bucle. Si el
//      bucle no corre no se ven los adornos, y no pasa nada más.
//    · El DUEÑO de la cortina impide que un destello de explosión se coma el
//      fogonazo. Eso sí era el arreglo bueno y se queda.
// ---------------------------------------------------------------------------
const T_GUERO  = 1230;   // ms desde que cae el jefe: aparece Güero en la grieta
const T_GRIETA = 1850;   // ms: se abre la grieta y arranca la animación CSS
const T_CARGA  = 2320;   // ms: la cortina está arriba, se carga el mundo detrás
const T_FIN    = 3900;   // ms: la animación ya bajó del todo

/** La llama matarJefe(). Aquí se agenda TODA la secuencia crítica. */
function iniciarTransicionFinal(cx, cy) {
    estado = estados.TRANSICION;
    transicion = { t: 0, cx: cx, cy: cy, hito: 0, estallidos: 0, timers: [] };
    contenedor.classList.add('temblor');
    sacudir(18);
    transicion.timers = [
        setTimeout(gueroEnLaGrieta,       T_GUERO),
        setTimeout(abrirGrieta,           T_GRIETA),
        setTimeout(cargarMundoTrasGrieta, T_CARGA),
        setTimeout(cerrarTransicion,      T_FIN)
    ];
}

function gueroEnLaGrieta() {
    if (!transicion || transicion.hito >= 1) return;
    transicion.hito = 1;
    aviso('¡GÜERO!', 1600);
    emitirTexto(transicion.cx, transicion.cy - 70, '¡GÜERO!', COL.ORO, 26);
    tono(60, 1.4, 'sawtooth', 0.14, 900);
    sacudir(26);
}

function abrirGrieta() {
    if (!transicion || transicion.hito >= 2) return;
    transicion.hito = 2;
    explotar(transicion.cx, transicion.cy, 210, 0, true);
    emitirOnda(transicion.cx, transicion.cy, 700, 12, COL.BLANCO);
    cortinaTomar('transicion');
    cortinaGrieta('#ffffff');
}

/** Carga el mundo nuevo detrás de la cortina. Idempotente. */
function cargarMundoTrasGrieta() {
    if (!transicion || transicion.hito >= 3) return;
    transicion.hito = 3;
    contenedor.classList.remove('temblor');
    try { iniciarNivel(5); }
    catch (e) { anotarErrorBucle('iniciarNivel(5)', e); }
}

function cerrarTransicion() {
    if (!transicion) return;
    cargarMundoTrasGrieta();            // por si el mundo no llegó a cargarse
    limpiarTimersTransicion();
    transicion = null;
    contenedor.classList.remove('temblor');
    cortinaSoltar();
}

function limpiarTimersTransicion() {
    if (!transicion) return;
    for (const id of transicion.timers) clearTimeout(id);
    transicion.timers.length = 0;
}

/** Corta la grieta a medias y suelta la cortina. Sin esto, salir al menú durante
 *  la transición dejaba a 'transicion' como dueña y destellar() se volvía un
 *  no-op el resto de la sesión. */
function abortarTransicion() {
    if (!transicion) return;
    limpiarTimersTransicion();
    transicion = null;
    contenedor.classList.remove('temblor');
    cortinaSoltar();
}

/** Solo adornos. Si el bucle no corre, la secuencia sigue su curso sin ellos. */
function actualizarTransicion(dt) {
    if (!transicion) return;
    const T = transicion;
    T.t += dt;

    if (T.estallidos < 7 && T.t >= T.estallidos * 10) {
        const i = T.estallidos++;
        explotar(T.cx + rndRango(-70, 70), T.cy + rndRango(-60, 60), 70 + i * 12, 0, true);
        sacudir(14 + i * 2);
    }

    // Implosión: todo cae hacia el punto de ruptura, una sola vez.
    if (T.hito === 1 && !T.implosion) {
        T.implosion = true;
        for (let i = 0; i < 160; i++) {
            const a = Math.random() * 6.283, r = 220 + Math.random() * 340;
            emitir(T.cx + Math.cos(a) * r, T.cy + Math.sin(a) * r,
                   -Math.cos(a) * (5 + Math.random() * 5), -Math.sin(a) * (5 + Math.random() * 5),
                   46, 3 + Math.random() * 4, Math.random() < 0.5 ? COL.MORADO : COL.TURQ,
                   TP.BRILLO, 0, 1.0, 0);
        }
    }
}

