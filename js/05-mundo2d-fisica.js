"use strict";

// ---------------------------------------------------------------------------
//  8d. MUNDO 2D — combate compartido
// ---------------------------------------------------------------------------
function pedirToken(e) {
    if (e.token) return true;
    if (tokensAtaque >= CFG.maxAtacantes) return false;
    tokensAtaque++; e.token = true; return true;
}
function soltarToken(e) {
    if (e.token) { e.token = false; tokensAtaque = Math.max(0, tokensAtaque - 1); }
}

function nuevoProyectil(x, y, vx, vy, opts) {
    proyectiles.push({
        x, y, vx, vy,
        ancho: opts.ancho || 12, alto: opts.alto || 12,
        daño: opts.daño || 1, tipo: opts.tipo || 'generico',
        delJugador: !!opts.delJugador, pareable: !!opts.pareable,
        grav: opts.grav || 0, explota: opts.explota || 0,
        col: opts.col === undefined ? COL.BLANCO : opts.col,
        vida: opts.vida || 200, t: 0,
        serotipo: opts.serotipo || 0
    });
}

function dañarEnemigo(e, n, kx, ky) {
    if (!e.vivo) return;
    e.vida -= n;
    e.flash = 9;
    e.vx += (kx || 0) * 2.2; e.vy += (ky || 0) * 2.2;
    const cx = e.x + e.ancho / 2, cy = e.y + e.alto / 2;
    fxChispas(cx, cy, 10, e.arq.colorP, 3.4);
    emitirTexto(cx, cy - 14, '-' + n, COL.BLANCO, 14);
    sfx.golpe(); congelar(3); sacudir(3);
    if (e.vida <= 0) matarEnemigo(e);
}

function matarEnemigo(e) {
    if (!e.vivo) return;
    e.vivo = false;
    soltarToken(e);
    // El criadero que lo produjo recupera el hueco y volverá a llenarlo. Matar
    // adultos alivia un momento; mientras la fuente viva, la oferta no se acaba.
    if (e.origen) e.origen.vivos = Math.max(0, e.origen.vivos - 1);
    const cx = e.x + e.ancho / 2, cy = e.y + e.alto / 2;
    if (e.arq.explotaAlMorir) {
        explotar(cx, cy, e.arq.explotaAlMorir, 1, true);
    } else {
        fxExplosion(cx, cy, 26, e.arq.colorP, COL.BLANCO);
        sfx.golpe();
    }
    // Recompensa: monedas que salen despedidas y se recogen al vuelo. El que
    // salió de un criadero vivo no suelta ninguna (valorMosquito, 11b).
    const valor = valorMosquito(e);
    for (let i = 0; i < valor; i++)
        monedas.push({ x: cx + rndRango(-14, 14), y: cy, r: 9, recogida: false,
                       fase: rndRango(0, 6.28), vx: rndRango(-2, 2), vy: rndRango(-5, -2) });
    congelar(4);
}

/** Explosión con daño en área, empuje y reacción en cadena sobre los barriles. */
function explotar(x, y, radio, daño, sinDañoJugador) {
    fxExplosion(x, y, radio, COL.AMBAR, COL.NARANJA);
    sacudir(clamp(radio * 0.30, 6, 26));
    congelar(8); sfx.explosion();
    destellar('#ffd9a0', clamp(radio / 260, 0.08, 0.3), 300);

    for (const e of enemigos) {
        if (!e.vivo) continue;
        const dx = e.x + e.ancho / 2 - x, dy = e.y + e.alto / 2 - y;
        const d = Math.hypot(dx, dy);
        if (d < radio * 1.35) dañarEnemigo(e, daño + 1, dx / (d || 1) * 2, dy / (d || 1) * 2);
    }
    if (jefe && !jefe.muerto) {
        const d = Math.hypot(jefe.x + jefe.ancho / 2 - x, jefe.y + jefe.alto / 2 - y);
        if (d < radio * 1.4) dañarJefe(daño + 1);
    }
    // Cadena: los barriles cercanos encienden mecha en vez de explotar ya,
    // así se ve una secuencia en lugar de un único fogonazo.
    for (const b of barriles) {
        if (!b.vivo || b.fusible > 0) continue;
        const d = Math.hypot(b.x + b.ancho / 2 - x, b.y + b.alto / 2 - y);
        if (d < radio * 1.5) b.fusible = 8 + Math.random() * 10;
    }
    // El empuje se aplica siempre (se siente la onda); el daño solo si la
    // explosión es "hostil". Las de muerte de enemigo y las del jefe en
    // transición no restan vida, para que matar algo nunca te mate a ti.
    const jx = jugador.x + jugador.ancho / 2, jy = jugador.y + jugador.alto / 2;
    const d = Math.hypot(jx - x, jy - y);
    if (d < radio * 1.15) {
        if (sinDañoJugador || !dañarJugador(1, x, y)) {
            jugador.vx += (jx - x) / (d || 1) * 8;
            jugador.vy = -6;
        }
    } else if (d < radio * 2) {
        jugador.vx += (jx - x) / (d || 1) * 4;
    }
}

// ---------------------------------------------------------------------------
//  8e. MUNDO 2D — actualización del jugador
// ---------------------------------------------------------------------------
let ultimoSueloX = 90, ultimoSueloY = SUELO_Y - 60;

const entradaSalto  = () => cualqPulsada('KeyW', 'ArrowUp', 'Space');
const entradaSaltoM = () => cualqAbajo('KeyW', 'ArrowUp', 'Space');
const entradaDash   = () => cualqPulsada('ShiftLeft', 'ShiftRight', 'KeyL');
const entradaParry  = () => cualqPulsada('KeyF', 'KeyK') || ratonNuevo[2];
const entradaAtaque = () => cualqPulsada('KeyJ') || ratonNuevo[0];

/** Dirección del ratón medida desde el jugador EN PANTALLA. La cámara no lo
 *  centra: lo lleva al 42 % del ancho, con adelanto según la velocidad. */
function direccionRaton2D() {
    const dx = ratonX - (jugador.x + jugador.ancho / 2 - camX);
    const dy = ratonY - (jugador.y + jugador.alto / 2 - camY);
    if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return { x: jugador.dir, y: 0 };
    const largo = Math.hypot(dx, dy);
    return { x: dx / largo, y: dy / largo };
}

/** Mata lo que quede en el arco a ± `arco` a menos de `radio`. Al jefe lo daña
 *  solo si no tiene el escudo arriba: eso lo decide dañarJefe. */
function barridoDebug(cx, cy, a, radio, arco) {
    let matado = false;
    for (const e of enemigos) {
        if (!e.vivo) continue;
        const dx = e.x + e.ancho / 2 - cx, dy = e.y + e.alto / 2 - cy;
        if (Math.hypot(dx, dy) > radio) continue;
        if (Math.abs(difAngulo(Math.atan2(dy, dx), a)) < arco) { matarEnemigo(e); matado = true; }
    }
    if (jefe && !jefe.muerto &&
        Math.hypot(jefe.x + jefe.ancho / 2 - cx, jefe.y + jefe.alto / 2 - cy) < radio + 20) {
        dañarJefe(999); matado = true;
    }
    return matado;
}

/** Dash del Modo Coco. El movimiento lo aplica actualizarJugador2D a partir de
 *  dashDirX/Y: un vx/vy asignado aquí se sobrescribiría en el mismo frame. */
function dashDebugHacia(dirX, dirY, frames) {
    jugador.esRoll = false;
    jugador.dashT = frames;
    jugador.dashDirX = dirX;
    jugador.dashDirY = clamp(dirY * 0.9, -0.6, 0.6);
    jugador.dir = dirX >= 0 ? 1 : -1;
}

function debugDash2D() {
    if (!debugMode || jugador.muerto || jugador.dashT > 0) return;
    const aim = direccionRaton2D();
    const dirX = aim.x !== 0 ? aim.x : jugador.dir;
    const cx = jugador.x + jugador.ancho / 2;
    const cy = jugador.y + jugador.alto / 2;
    const matado = barridoDebug(cx, cy, Math.atan2(aim.y, dirX), 120, 1.15);
    dashDebugHacia(dirX, aim.y, 12);
    if (matado) {
        fxEstela(cx, cy, COL.ORO, 18);
        emitirOnda(cx, cy, 82, 8, COL.AMBAR);
        destellar('#ffd966', 0.18, 120);
        sfx.explosion();
    }
}

function debugEspadazo2D() {
    if (!debugMode || jugador.ataqueCd > 0 || jugador.muerto) return;
    jugador.ataqueCd = 8;
    const aim = direccionRaton2D();
    const dirX = aim.x !== 0 ? aim.x : jugador.dir;
    const cx = jugador.x + jugador.ancho / 2;
    const cy = jugador.y + jugador.alto / 2;
    const radio = 120;
    const a = Math.atan2(aim.y, dirX);
    if (barridoDebug(cx, cy, a, radio, 1.1)) {
        dashDebugHacia(dirX, aim.y, 9);           // embestida tras el corte
        fxRaqueta(cx, cy, a, radio);
        emitirOnda(cx, cy, radio, 6, COL.ORO);
        destellar('#f1c40f', 0.3, 120);
        sacudir(16);
        congelar(6);
        sfx.explosion();
    }
    jugador.estamina = CFG.estaminaMax;
    jugador.vida = CFG.vidaMax;
    jugador.iframes = Math.max(jugador.iframes, 12);
    debugDash2D();                                // sin embestida, el espadazo también te mueve
}

function actualizarJugador2D(dt) {
    const izq = cualqAbajo('ArrowLeft', 'KeyA');
    const der = cualqAbajo('ArrowRight', 'KeyD');
    const agachado = cualqAbajo('ArrowDown', 'KeyS');

    if (!jugador.muerto) {
        // --- Dash / esquive -------------------------------------------------
        if (entradaDash()) {
            if (debugMode) debugDash2D();
            else {
                let dx = der ? 1 : (izq ? -1 : jugador.dir);
                if (agachado && jugador.enSuelo) {
                    intentarDash(dx, 0, true);                     // esquive rodando
                } else if (jugador.enSuelo || jugador.dashAereo) {
                    let dy = 0;
                    if (agachado) dy = 0.55;
                    if (entradaSaltoM()) dy = -0.5;
                    if (!jugador.enSuelo && intentarDash(dx, dy, false)) jugador.dashAereo = false;
                    else if (jugador.enSuelo) intentarDash(dx, dy, false);
                }
            }
        }
        // --- Parry con raqueta ----------------------------------------------
        if (entradaParry()) intentarParry();
        if (jugador.parryT > 0) golpeRaqueta2D();
        if (debugMode && entradaAtaque()) debugEspadazo2D();
        // --- Ataque ---------------------------------------------------------
        else if (entradaAtaque()) dispararArma();
        // --- Lava / Tapa / Voltea / Tira sobre el envase que tengas enfrente --
        leerVerbos(criaderoCercano2D());
    }

    // --- Movimiento horizontal ---------------------------------------------
    const lento = jugador.enAgua ? 0.62 : 1;
    if (jugador.dashT > 0) {
        const v = jugador.esRoll ? CFG.rollVel : CFG.dashVel;
        jugador.vx = jugador.dashDirX * v;
        jugador.vy = jugador.dashDirY * v * 0.55;
        if (jugador.dashDirX !== 0) jugador.dir = Math.sign(jugador.dashDirX);
        fxEstela(jugador.x + 12, jugador.y + 16, jugador.esRoll ? COL.TURQ : COL.AZUL, jugador.esRoll ? 6 : 9);
    } else if (!jugador.muerto) {
        let objetivo = 0;
        if (der) { objetivo =  CFG.velMax * lento; jugador.dir = 1; }
        if (izq) { objetivo = -CFG.velMax * lento; jugador.dir = -1; }
        if (objetivo !== 0) jugador.vx = aprox(jugador.vx, objetivo, CFG.acel * dt);
        else jugador.vx *= Math.pow(CFG.fric, dt);
    }

    // --- Salto: coyote time + buffer + altura variable ----------------------
    if (jugador.enSuelo) { jugador.coyote = CFG.coyote; jugador.dashAereo = true; }
    else jugador.coyote -= dt;

    if (entradaSalto()) jugador.buffer = CFG.buffer;
    else jugador.buffer -= dt;

    if (!jugador.muerto && jugador.buffer > 0 && jugador.coyote > 0 && jugador.dashT <= 0) {
        jugador.vy = CFG.salto * (jugador.enAgua ? 0.86 : 1);
        jugador.buffer = 0; jugador.coyote = 0;
        jugador.saltando = true; jugador.enSuelo = false;
        jugador.escX = 0.72; jugador.escY = 1.35;
        sfx.salto();
        for (let i = 0; i < 8; i++)
            emitir(jugador.x + 12 + rndRango(-8, 8), jugador.y + jugador.alto,
                   rndRango(-1.4, 1.4), rndRango(-0.4, 0.6), 16, 3, COL.HUESO, TP.CUADRO, 0.1, 0.9, 0);
    }
    // Soltar el salto antes de tiempo recorta la subida: control fino de altura.
    if (jugador.saltando && !entradaSaltoM() && jugador.vy < 0) {
        jugador.vy *= CFG.saltoCorte; jugador.saltando = false;
    }
    if (jugador.vy > 0) jugador.saltando = false;

    // --- Gravedad y colisión ------------------------------------------------
    if (jugador.dashT <= 0) jugador.vy += CFG.grav * dt * (jugador.enAgua ? 0.7 : 1);
    jugador.vy = clamp(jugador.vy, -22, 19);

    const estabaEnSuelo = jugador.enSuelo;
    moverYColisionar2D(dt);

    if (!estabaEnSuelo && jugador.enSuelo) {                  // aterrizaje
        jugador.escX = 1.35; jugador.escY = 0.68;
        const fuerza = clamp(Math.abs(jugador.vyPrev || 0) / 12, 0.2, 1);
        for (let i = 0; i < 4 + fuerza * 12; i++)
            emitir(jugador.x + 12 + rndRango(-12, 12), jugador.y + jugador.alto,
                   rndRango(-2.2, 2.2), rndRango(-1.6, -0.2), 18 + Math.random() * 10,
                   2 + Math.random() * 3, COL.HUESO, TP.CUADRO, 0.14, 0.9, 0);
        if (fuerza > 0.6) sacudir(3);
        ultimoSueloX = jugador.x; ultimoSueloY = jugador.y;
    }
    if (jugador.enSuelo && Math.abs(jugador.vx) > 2.4 && Math.random() < 0.4)
        emitir(jugador.x + 12, jugador.y + jugador.alto, -jugador.vx * 0.25, -0.4,
               13, 2.5, COL.HUESO, TP.CUADRO, 0.08, 0.92, 0);

    // Agua estancada: frena y salpica (además de ser donde nacen los mosquitos).
    jugador.enAgua = false;
    for (const c of charcos) {
        if (solapanRect(jugador.x, jugador.y + jugador.alto - 8, jugador.ancho, 10, c.x, c.y, c.ancho, c.alto)) {
            jugador.enAgua = true;
            if (Math.abs(jugador.vx) > 1.2 && Math.random() < 0.35)
                emitir(jugador.x + 12, c.y, rndRango(-1.6, 1.6), rndRango(-2.4, -0.6),
                       20, 2.5, COL.TURQ, TP.CIRCULO, 0.16, 0.94, 0);
            break;
        }
    }

    // Caída al vacío
    if (jugador.y > ALTO + 240) {
        jugador.x = ultimoSueloX; jugador.y = ultimoSueloY - 40;
        jugador.vx = jugador.vy = 0;
        dañarJugador(1, jugador.x, jugador.y + 200);
    }
    if (jugador.x < 0) { jugador.x = 0; jugador.vx = 0; }
    if (jugador.x > longitudNivel - jugador.ancho) { jugador.x = longitudNivel - jugador.ancho; jugador.vx = 0; }

    // Squash & stretch: vuelve suavemente a 1 tras cada impulso.
    jugador.escX = lerp(jugador.escX, 1, 0.16 * dt);
    jugador.escY = lerp(jugador.escY, 1, 0.16 * dt);
    jugador.rotVis = jugador.dashT > 0
        ? jugador.rotVis + (jugador.esRoll ? 0.42 : 0.16) * jugador.dir * dt
        : lerp(jugador.rotVis, 0, 0.25 * dt);
    jugador.vyPrev = jugador.vy;
}

function moverYColisionar2D(dt) {
    // Eje X
    jugador.x += jugador.vx * dt;
    let c = candidatas(jugador.x - 4, jugador.ancho + 8);
    for (let i = 0; i < c.length; i++) {
        const p = c[i];
        if (!solapan(jugador, p)) continue;
        if (jugador.vx > 0) jugador.x = p.x - jugador.ancho;
        else if (jugador.vx < 0) jugador.x = p.x + p.ancho;
        jugador.vx = 0;
        if (jugador.dashT > 0) { jugador.dashT = 0; sacudir(3); }   // frenazo contra pared
    }
    // Eje Y
    jugador.enSuelo = false;
    jugador.y += jugador.vy * dt;
    c = candidatas(jugador.x - 4, jugador.ancho + 8);
    for (let i = 0; i < c.length; i++) {
        const p = c[i];
        if (!solapan(jugador, p)) continue;
        if (jugador.vy > 0) { jugador.y = p.y - jugador.alto; jugador.enSuelo = true; }
        else if (jugador.vy < 0) { jugador.y = p.y + p.alto; }
        jugador.vy = 0;
    }
}

function dispararArma() {
    if (jugador.ataqueCd > 0 || jugador.muerto) return;
    const cx = jugador.x + jugador.ancho / 2, cy = jugador.y + jugador.alto / 2;

    if (armaActiva === 'botas') {
        // Ataque cuerpo a cuerpo: patada corta con retroceso, siempre disponible.
        jugador.ataqueCd = 22;
        const hx = jugador.dir > 0 ? jugador.x + jugador.ancho : jugador.x - 34;
        fxChispas(hx + 17 * jugador.dir, cy, 8, COL.HUESO, 3, jugador.dir, 0);
        emitirOnda(hx + 17, cy, 30, 3, COL.BLANCO);
        sfx.disparo();
        let tocado = false;
        for (const e of enemigos) {
            if (e.vivo && solapanRect(hx, jugador.y, 34, jugador.alto, e.x, e.y, e.ancho, e.alto)) {
                dañarEnemigo(e, 1, jugador.dir, -0.4); tocado = true;
            }
        }
        for (const b of barriles)
            if (b.vivo && solapanRect(hx, jugador.y, 34, jugador.alto, b.x, b.y, b.ancho, b.alto))
                b.fusible = Math.max(b.fusible, 1);
        if (jefe && !jefe.muerto && solapanRect(hx, jugador.y, 34, jugador.alto, jefe.x, jefe.y, jefe.ancho, jefe.alto))
            { dañarJefe(1); tocado = true; }
        if (tocado) { jugador.vx = -jugador.dir * 2.5; sacudir(4); }
        return;
    }
    if (armaActiva === 'insecticida') {
        jugador.ataqueCd = 13;
        nuevoProyectil(cx, cy - 2, 10 * jugador.dir, 0,
            { delJugador: true, daño: 1, col: COL.HUESO, tipo: 'insecticida', ancho: 14, alto: 8, vida: 90 });
        jugador.vx -= jugador.dir * 0.6;
        sfx.disparo();
        fxChispas(cx + 16 * jugador.dir, cy, 5, COL.HUESO, 1.8, jugador.dir, 0);
        return;
    }
    if (armaActiva === 'abate') {
        jugador.ataqueCd = 34;
        nuevoProyectil(cx, cy - 6, 7.2 * jugador.dir, -5.2,
            { delJugador: true, daño: 2, col: COL.CALABAZA, tipo: 'abate',
              ancho: 13, alto: 13, grav: 0.32, explota: 62, vida: 220 });
        sfx.disparo();
        return;
    }
}


/**
 * El arco de la raqueta. Se llama cada frame de la ventana activa, pero cada
 * enemigo solo puede recibir un impacto por swing: sin el sello, once frames de
 * ventana serían once golpes y el parry se volvería el arma dominante.
 */
function golpeRaqueta2D() {
    const cx = jugador.x + jugador.ancho / 2, cy = jugador.y + jugador.alto / 2;
    const centro = jugador.dir > 0 ? 0 : Math.PI;
    const sello = jugador.selloRaqueta;
    let tocado = false;

    const enArco = (ox, oy) => {
        const dx = ox - cx, dy = oy - cy;
        if (Math.hypot(dx, dy) > CFG.raquetaAlcance) return false;
        return Math.abs(difAngulo(Math.atan2(dy, dx), centro)) <= CFG.raquetaArco;
    };

    for (const e of enemigos) {
        if (!e.vivo || e.selloRaqueta === sello) continue;
        if (!enArco(e.x + e.ancho / 2, e.y + e.alto / 2)) continue;
        e.selloRaqueta = sello;
        e.aturdido = Math.max(e.aturdido, CFG.raquetaAturde);
        e.est = 'aturdido';
        dañarEnemigo(e, CFG.raquetaGolpe, jugador.dir, -0.5);
        tocado = true;
    }
    for (const b of barriles)
        if (b.vivo && b.fusible <= 0 && enArco(b.x + b.ancho / 2, b.y + b.alto / 2))
            b.fusible = Math.max(b.fusible, 1);

    // Contra el jefe la raqueta no es la vía: dañarJefe ya avisa si hay escudo.
    if (jefe && !jefe.muerto && jefe.selloRaqueta !== sello &&
        enArco(jefe.x + jefe.ancho / 2, jefe.y + jefe.alto / 2)) {
        jefe.selloRaqueta = sello;
        dañarJefe(CFG.raquetaGolpe);
        tocado = true;
    }

    if (tocado) {
        fxRaqueta(cx, cy, centro, CFG.raquetaAlcance);
        tono(1900, 0.05, 'square', 0.05, 400);
        congelar(4); sacudir(4);
    }
}
