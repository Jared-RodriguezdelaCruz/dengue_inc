"use strict";

// ---------------------------------------------------------------------------
//  8f. MUNDO 2D — IA de enemigos
// ---------------------------------------------------------------------------
function actualizarEnemigos2D(dt) {
    const jx = jugador.x + jugador.ancho / 2, jy = jugador.y + jugador.alto / 2;
    const margen = 320;

    for (let i = enemigos.length - 1; i >= 0; i--) {
        const e = enemigos[i];
        if (!e.vivo) { soltarToken(e); enemigos.splice(i, 1); continue; }

        // Culling: lo que está fuera de la pantalla (con margen) no se simula.
        // Con niveles de 5000+ px esto es la diferencia entre 40 y 8 enemigos vivos por frame.
        if (e.x + e.ancho < camX - margen || e.x > camX + ANCHO + margen) {
            soltarToken(e);
            continue;
        }
        entidadesActualizadas++;

        const a = e.arq;
        const ex = e.x + e.ancho / 2, ey = e.y + e.alto / 2;
        if (e.flash > 0) e.flash -= dt;
        if (e.cd > 0) e.cd -= dt;
        e.fase += dt * 0.22;

        // --- Aturdido (por parry o por explosión) ---------------------------
        if (e.aturdido > 0) {
            e.aturdido -= dt;
            soltarToken(e);
            e.vx *= Math.pow(0.90, dt);
            e.vy += (a.vuela ? 0.14 : CFG.grav) * dt;
            e.x += e.vx * dt; e.y += e.vy * dt;
            if (Math.random() < 0.25)
                emitir(ex + rndRango(-10, 10), ey - 16, rndRango(-.6,.6), -0.5, 22, 3, COL.ORO, TP.CIRCULO, 0, 0.95, 0);
            if (e.aturdido <= 0) { e.est = 'persecucion'; e.cd = 30; }
            resolverEnemigoSuelo(e, dt);
            continue;
        }

        // --- Percepción: distancia + línea de vista + memoria ----------------
        const d = Math.hypot(jx - ex, jy - ey);
        const ve = d < a.vision && !jugador.muerto && !hayParedEntre(ex, ey, jx, jy);
        if (ve) { e.ultX = jx; e.ultY = jy; e.memT = 150; }
        else if (e.memT > 0) e.memT -= dt;

        switch (e.est) {
        case 'patrulla': {
            if (a.vel > 0) {
                const ox = e.hogarX + Math.sin(e.fase) * e.radioPatrulla;
                const oy = e.hogarY + Math.cos(e.fase * 0.7) * 22;
                e.vx = aprox(e.vx, (ox - ex) * 0.05, 0.25 * dt);
                e.vy = aprox(e.vy, (oy - ey) * 0.05, 0.25 * dt);
            }
            if (ve) {
                e.est = 'alerta'; e.t = 22;
                emitirTexto(ex, e.y - 16, '!', COL.ORO, 20);
                tono(880, 0.06, 'square', 0.03);
            }
            break;
        }
        case 'alerta': {
            e.t -= dt;
            e.vx *= Math.pow(0.86, dt); e.vy *= Math.pow(0.86, dt);
            if (Math.random() < 0.4) fxCarga(ex, ey, COL.ORO);
            if (e.t <= 0) e.est = 'persecucion';
            break;
        }
        case 'persecucion': {
            const tx = ve ? jx : e.ultX, ty = ve ? jy : e.ultY;
            const ddx = tx - ex, ddy = ty - ey;
            const dd = Math.hypot(ddx, ddy) || 1;

            if (a.vel > 0) {
                let deseoX = ddx / dd, deseoY = ddy / dd;
                // El picador orbita: si está demasiado cerca, retrocede.
                if (a.distOrbita) {
                    if (dd < a.distOrbita * 0.8) { deseoX *= -1; deseoY *= -1; }
                    else if (dd < a.distOrbita * 1.15) { const t = deseoX; deseoX = -deseoY; deseoY = t; }
                }
                e.vx = aprox(e.vx, deseoX * a.vel, 0.16 * dt);
                e.vy = aprox(e.vy, deseoY * a.vel, 0.16 * dt);
            }
            if (ve && d < a.rangoAtaque && e.cd <= 0 && pedirToken(e)) {
                e.est = 'telegrafia'; e.cargaT = a.carga;
                e.dirX = ddx / dd; e.dirY = ddy / dd;
                sfx.telegrafia();
            }
            if (!ve && e.memT <= 0) { e.est = 'patrulla'; e.hogarX = ex; e.hogarY = ey; }
            break;
        }
        case 'telegrafia': {
            // Ventana de aviso obligatoria: sin esto el parry sería adivinar.
            e.cargaT -= dt;
            e.vx *= Math.pow(0.88, dt); e.vy *= Math.pow(0.88, dt);
            e.escala = 1 + Math.sin(e.cargaT * 0.55) * 0.20;
            fxCarga(ex, ey, a.colorP);
            if (ve) { const dd = Math.hypot(jx - ex, jy - ey) || 1; e.dirX = (jx - ex) / dd; e.dirY = (jy - ey) / dd; }
            if (e.cargaT <= 0) { e.est = 'ataque'; e.t = a.dispara ? 12 : 20; iniciarAtaque(e, ex, ey); }
            break;
        }
        case 'ataque': {
            e.t -= dt;
            e.escala = lerp(e.escala, 1, 0.2 * dt);
            if (a.embiste) {
                e.x += e.vx * dt; e.y += e.vy * dt;
                fxEstela(ex, ey, a.colorP, e.ancho * 0.5);
                // Parry: si el jugador tiene la ventana abierta, la embestida se anula.
                if (parryAbierto() && d < CFG.parryRadio) {
                    parryExitoso(jx, jy);
                    aturdirEnemigosCerca(jx, jy, CFG.parryRadio * 1.6);
                    dañarEnemigo(e, 2, e.dirX * -1, -0.6);
                } else if (solapan(jugador, e) && !invulnerable()) {
                    picar(e.serotipo, ex, ey);
                }
            }
            if (a.areaAtaque && e.t > 14) {
                if (parryAbierto() && d < CFG.parryRadio * 1.4) {
                    parryExitoso(jx, jy);
                    aturdirEnemigosCerca(jx, jy, CFG.parryRadio * 1.8);
                    dañarEnemigo(e, 3, 0, -0.6);
                    e.t = 0;
                }
            }
            if (e.t <= 0) { e.est = 'reposicion'; e.t = 42; e.cd = a.cdAtaque; soltarToken(e); }
            break;
        }
        case 'reposicion': {
            e.t -= dt;
            if (a.vel > 0) {
                const ddx = ex - jx, ddy = ey - jy, dd = Math.hypot(ddx, ddy) || 1;
                e.vx = aprox(e.vx, (ddx / dd) * a.vel * 0.9, 0.14 * dt);
                e.vy = aprox(e.vy, (ddy / dd) * a.vel * 0.6 - 0.2, 0.14 * dt);
            }
            if (e.t <= 0) e.est = 'persecucion';
            break;
        }
        }

        // --- Separación tipo boids: el enjambre no se apila en un solo punto --
        if (a.radioSep > 0) {
            for (let j = 0; j < enemigos.length; j++) {
                const o = enemigos[j];
                if (o === e || !o.vivo) continue;
                const dx = ex - (o.x + o.ancho / 2), dy = ey - (o.y + o.alto / 2);
                const dd2 = dx * dx + dy * dy;
                if (dd2 > 1 && dd2 < a.radioSep * a.radioSep) {
                    const dd = Math.sqrt(dd2);
                    e.vx += (dx / dd) * 0.16 * dt;
                    e.vy += (dy / dd) * 0.16 * dt;
                }
            }
        }

        // --- Integración de movimiento --------------------------------------
        if (e.est !== 'ataque' || !a.embiste) {
            if (!a.vuela) e.vy += CFG.grav * dt;
            else e.vy += Math.sin(e.fase * 2.1) * 0.05 * dt;   // flotación
            e.x += e.vx * dt; e.y += e.vy * dt;
        }
        resolverEnemigoSuelo(e, dt);

        // Contacto pasivo: los que no embisten también hacen daño al tocarte.
        if (!a.embiste && e.est !== 'telegrafia' && solapan(jugador, e) && !invulnerable())
            picar(e.serotipo, ex, ey);

        // Pisar mosquitos sigue funcionando (es el gesto clásico del género).
        if (jugador.vy > 3 && solapan(jugador, e) &&
            jugador.y + jugador.alto - jugador.vy <= e.y + 12) {
            dañarEnemigo(e, 2, 0, 1);
            jugador.vy = CFG.salto * 0.72;
            jugador.escX = 1.3; jugador.escY = 0.7;
        }
    }
}

/** Mantiene a los enemigos no voladores sobre el suelo y a todos dentro del nivel. */
function resolverEnemigoSuelo(e, dt) {
    if (!e.arq.vuela) {
        const c = candidatas(e.x, e.ancho);
        for (let i = 0; i < c.length; i++) {
            const p = c[i];
            if (solapan(e, p) && e.vy >= 0) { e.y = p.y - e.alto; e.vy = 0; }
        }
    } else if (e.y > SUELO_Y - e.alto - 6) {
        e.y = SUELO_Y - e.alto - 6; e.vy = Math.min(e.vy, 0);
    }
    if (e.y < 40) { e.y = 40; e.vy = Math.max(e.vy, 0); }
    e.x = clamp(e.x, 0, longitudNivel - e.ancho);
    e.escala = lerp(e.escala, 1, 0.12 * dt);
}

function iniciarAtaque(e, ex, ey) {
    const a = e.arq;
    if (a.embiste) {
        const v = a.vel * 3.6;
        e.vx = e.dirX * v; e.vy = e.dirY * v;
        fxChispas(ex, ey, 10, a.colorP, 2.6);
    }
    if (a.dispara) {
        nuevoProyectil(ex, ey, e.dirX * 5.4, e.dirY * 5.4,
            { daño: 1, col: COL.MORADO, tipo: 'picadura', pareable: true, ancho: 14, alto: 14,
              vida: 160, serotipo: e.serotipo });
        tono(420, 0.08, 'sawtooth', 0.05, 220);
    }
    if (a.areaAtaque) {
        explotar(ex, ey, a.areaAtaque, 1, false);
    }
}

function aturdirEnemigosCerca(x, y, radio) {
    for (const e of enemigos) {
        if (!e.vivo) continue;
        const d = Math.hypot(e.x + e.ancho / 2 - x, e.y + e.alto / 2 - y);
        if (d < radio) {
            e.aturdido = CFG.parryAturde;
            e.est = 'aturdido';
            e.vx = (e.x + e.ancho / 2 - x) / (d || 1) * 5;
            e.vy = -3;
            soltarToken(e);
            emitirTexto(e.x + e.ancho / 2, e.y - 12, 'ATURDIDO', COL.ORO, 11);
        }
    }
}

// ---------------------------------------------------------------------------
//  8g. MUNDO 2D — proyectiles, monedas, barriles, jefe
// ---------------------------------------------------------------------------
function actualizarProyectiles2D(dt) {
    const jx = jugador.x + jugador.ancho / 2, jy = jugador.y + jugador.alto / 2;

    for (let i = proyectiles.length - 1; i >= 0; i--) {
        const p = proyectiles[i];
        p.t += dt; p.vida -= dt;
        p.vy += p.grav * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;

        if (p.t > 1 && Math.random() < 0.7)
            emitir(p.x, p.y, -p.vx * 0.08, -p.vy * 0.08, 12, p.ancho * 0.42,
                   p.col, TP.BRILLO, 0, 0.9, 0);

        let muere = p.vida <= 0 || p.x < camX - 400 || p.x > camX + ANCHO + 400 || p.y > ALTO + 300;

        // --- Parry de proyectiles enemigos ----------------------------------
        if (!muere && !p.delJugador && p.pareable && parryAbierto()) {
            if (Math.hypot(p.x - jx, p.y - jy) < CFG.parryRadio) {
                p.delJugador = true; p.pareable = false;
                p.col = COL.ORO; p.daño *= 2;
                // El proyectil se devuelve al enemigo vivo más cercano.
                let mejor = null, mejorD = 1e9;
                for (const e of enemigos) {
                    if (!e.vivo) continue;
                    const dd = Math.hypot(e.x + e.ancho/2 - p.x, e.y + e.alto/2 - p.y);
                    if (dd < mejorD) { mejorD = dd; mejor = e; }
                }
                const v = Math.hypot(p.vx, p.vy) * 2;
                if (mejor) {
                    const dx = mejor.x + mejor.ancho/2 - p.x, dy = mejor.y + mejor.alto/2 - p.y;
                    const dd = Math.hypot(dx, dy) || 1;
                    p.vx = dx / dd * v; p.vy = dy / dd * v;
                } else { p.vx *= -2; p.vy *= -2; }
                p.grav = 0;
                parryExitoso(jx, jy);
                aturdirEnemigosCerca(jx, jy, CFG.parryRadio * 1.4);
            }
        }

        // --- Colisión con el mundo ------------------------------------------
        if (!muere) {
            const c = candidatas(p.x - p.ancho, p.ancho * 2);
            for (let k = 0; k < c.length; k++) {
                const pl = c[k];
                if (solapanRect(p.x - p.ancho/2, p.y - p.alto/2, p.ancho, p.alto, pl.x, pl.y, pl.ancho, pl.alto)) {
                    muere = true; break;
                }
            }
        }
        // --- Colisión con entidades -----------------------------------------
        if (!muere) {
            if (p.delJugador) {
                for (const e of enemigos) {
                    if (!e.vivo) continue;
                    if (solapanRect(p.x - p.ancho/2, p.y - p.alto/2, p.ancho, p.alto, e.x, e.y, e.ancho, e.alto)) {
                        if (!p.explota) dañarEnemigo(e, p.daño, Math.sign(p.vx), -0.3);
                        muere = true; break;
                    }
                }
                if (!muere && jefe && !jefe.muerto &&
                    solapanRect(p.x - p.ancho/2, p.y - p.alto/2, p.ancho, p.alto, jefe.x, jefe.y, jefe.ancho, jefe.alto)) {
                    if (!p.explota) dañarJefe(p.daño);
                    muere = true;
                }
                if (!muere) for (const b of barriles) {
                    if (!b.vivo) continue;
                    if (solapanRect(p.x - p.ancho/2, p.y - p.alto/2, p.ancho, p.alto, b.x, b.y, b.ancho, b.alto)) {
                        b.fusible = Math.max(b.fusible, 1); muere = true; break;
                    }
                }
            } else if (!invulnerable() &&
                       solapanRect(p.x - p.ancho/2, p.y - p.alto/2, p.ancho, p.alto,
                                   jugador.x, jugador.y, jugador.ancho, jugador.alto)) {
                if (p.tipo === 'picadura') picar(p.serotipo, p.x, p.y);
                else dañarJugador(p.daño, p.x, p.y);
                muere = true;
            }
        }

        if (muere) {
            if (p.explota) {
                explotar(p.x, p.y, p.explota, p.daño, false);
                // El abate mata larvas: cierra los criaderos dentro del radio.
                if (p.tipo === 'abate')
                    for (const c of criaderos)
                        if (!c.neutralizado &&
                            Math.hypot(c.x + c.ancho / 2 - p.x, c.y + c.alto / 2 - p.y) < p.explota + 26)
                            aplicarAbate(c);
            }
            else fxChispas(p.x, p.y, 7, p.col, 2.4);
            proyectiles[i] = proyectiles[proyectiles.length - 1];
            proyectiles.pop();
        }
    }
}

// ---------------------------------------------------------------------------
//  CRIADEROS — la causa. Mientras uno viva, repone mosquitos indefinidamente.
//  Ésa es la lección entera: fumigar adultos da alivio de días, cerrar la
//  fuente cierra el problema.
// ---------------------------------------------------------------------------
function actualizarCriaderos2D(dt) {
    const camCentro = camX + ANCHO / 2;
    for (const c of criaderos) {
        c.fase += dt * 0.05;
        if (c.sacude > 0) c.sacude -= dt;

        // Vaciado sin tallar: la superficie se ve limpia y los huevos siguen
        // pegados en la pared. Vuelven a eclosionar solos.
        if (c.vaciado && !c.neutralizado) {
            c.tRevive -= dt;
            if (c.tRevive <= 0) {
                c.vaciado = false; c.activo = true; c.sacude = 26;
                const cx = c.x + c.ancho / 2, cy = c.y + c.alto / 2;
                fxHumo(cx, cy, 16, COL.VERDE, 26);
                fxChispas(cx, cy, 12, COL.VERDE_OSC, 3);
                sacudir(8); sfx.parryFail();
                aviso('EL CRIADERO REVIVIÓ · LOS HUEVOS SOBREVIVEN SECOS', 2600);
                desbloquearFicha('huevos_secos');
            }
            continue;
        }
        if (!c.activo || c.neutralizado) continue;

        // Fuera del viewport no produce: el culling no debe cambiar la dificultad.
        if (Math.abs(c.x - camCentro) > ANCHO + 420) continue;

        c.prod -= dt;
        if (c.prod > 0) continue;
        c.prod = Math.max(70, 165 - nivelActual * 12);

        if (c.vivos >= 3 || enemigos.length > 26) continue;
        const tipo = rndProb(0.65) ? 'enjambre' : 'zumbador';
        const e = crearEnemigo(tipo, c.x + c.ancho / 2 - 8, c.y - 26);
        e.origen = c; e.hogarX = c.x + c.ancho / 2; e.hogarY = c.y - 40;
        enemigos.push(e);
        c.vivos++; c.producidos++;
        fxHumo(c.x + c.ancho / 2, c.y + 6, 7, COL.VERDE, 16);
        tono(150, 0.14, 'sawtooth', 0.035, 90);

        // A la sexta cría queda claro que esto no se acaba a tiros.
        if (c.producidos === 6) desbloquearFicha('criadero_infinito');
    }
}

function actualizarObjetos2D(dt) {
    const jx = jugador.x + jugador.ancho / 2, jy = jugador.y + jugador.alto / 2;
    actualizarCriaderos2D(dt);

    for (let i = monedas.length - 1; i >= 0; i--) {
        const m = monedas[i];
        m.fase += dt * 0.12;
        if (m.vx !== undefined) {                 // monedas soltadas por enemigos
            m.vy += 0.34 * dt;
            m.x += m.vx * dt; m.y += m.vy * dt;
            m.vx *= Math.pow(0.96, dt);
            if (m.y > SUELO_Y - 12) { m.y = SUELO_Y - 12; m.vy = -m.vy * 0.35; if (Math.abs(m.vy) < 1) m.vy = 0; }
        }
        // Imán suave: acercarse basta, no hace falta precisión milimétrica.
        const d = Math.hypot(jx - m.x, jy - m.y);
        if (d < 78) { m.x += (jx - m.x) * 0.10 * dt; m.y += (jy - m.y) * 0.10 * dt; }
        if (d < 26) {
            fichas++; actualizarHUD(); sfx.moneda(); fxRecoleccion(m.x, m.y);
            emitirTexto(m.x, m.y - 12, '+1', COL.ORO, 14);
            monedas[i] = monedas[monedas.length - 1]; monedas.pop();
        }
    }

    for (let i = barriles.length - 1; i >= 0; i--) {
        const b = barriles[i];
        if (!b.vivo) { barriles.splice(i, 1); continue; }
        b.t += dt * 0.1;
        if (b.fusible > 0) {
            b.fusible -= dt;
            fxChispas(b.x + b.ancho / 2, b.y, 2, COL.ORO, 1.6, 0, -1);
            if (b.fusible <= 0) {
                b.vivo = false;
                explotar(b.x + b.ancho / 2, b.y + b.alto / 2, 92, 2, false);
            }
        }
    }

    // Puerta de salida
    if (meta) {
        meta.t += dt;
        const abierta = criaderosVivos() === 0;
        if (abierta && solapanRect(jugador.x, jugador.y, jugador.ancho, jugador.alto,
                                   meta.x, meta.y, meta.ancho, meta.alto))
            completarNivel();
        if (Math.random() < 0.5)
            emitir(meta.x + rndRango(6, meta.ancho - 6), meta.y + meta.alto - 4,
                   rndRango(-.3,.3), -0.8, 34, 4, COL.MORADO, TP.BRILLO, 0, 0.96, 0);
    }
}

// --- Jefe del nivel 4: el "Núcleo Mutante" ---------------------------------
function dañarJefe(n) {
    if (!jefe || jefe.muerto) return;
    if (jefe.escudo) {
        emitirTexto(jefe.x + jefe.ancho / 2, jefe.y - 10, 'ESCUDO', COL.TURQ, 15);
        emitirOnda(jefe.x + jefe.ancho / 2, jefe.y + jefe.alto / 2, 84, 3, COL.TURQ);
        tono(240, 0.08, 'square', 0.05);
        return;
    }
    jefe.vida -= n; jefe.flash = 10;
    fxChispas(jefe.x + jefe.ancho / 2, jefe.y + jefe.alto / 2, 14, COL.ROJO, 4);
    emitirTexto(jefe.x + jefe.ancho / 2, jefe.y - 10, '-' + n, COL.BLANCO, 16);
    sfx.golpe(); sacudir(5); congelar(3);
    actualizarHUD();
    if (jefe.vida <= 0) { jefe.vida = 0; matarJefe(); }
}

function matarJefe() {
    jefe.muerto = true;
    // Toda la secuencia (estallidos, grieta, carga del nivel 5) la lleva el
    // bucle en frames: ver actualizarTransicion en 11-flujo.js.
    iniciarTransicionFinal(jefe.x + jefe.ancho / 2, jefe.y + jefe.alto / 2);
}

/**
 * El Núcleo Mutante tiene dos fases, no tres, y no son la misma pelea con más
 * cosas encima: cambian el patrón entero.
 *
 *   FASE 1 · ORBE     — flota, telegrafía y dispara el orbe turquesa. El parry
 *                       es la ÚNICA forma de bajarle el escudo, y con el escudo
 *                       caído aprovecha para invocar enjambres. Enseña a parear.
 *   FASE 2 · EXPUESTO — a la mitad de vida se le rompe la coraza y alterna dos
 *                       ataques nuevos: una embestida telegrafiada que hay que
 *                       esquivar (y que al estrellarse lo deja aturdido, ventana
 *                       de daño sin parry) y un anillo de balas que gira en cada
 *                       andanada, para que no baste con quedarse quieto.
 */
function actualizarJefe(dt) {
    if (!jefe || jefe.muerto) return;
    entidadesActualizadas++;
    const jx = jugador.x + jugador.ancho / 2, jy = jugador.y + jugador.alto / 2;
    const cx = jefe.x + jefe.ancho / 2, cy = jefe.y + jefe.alto / 2;
    jefe.t += dt;
    if (jefe.flash > 0) jefe.flash -= dt;
    if (jefe.cd > 0) jefe.cd -= dt;

    if (jefe.fase === 1 && jefe.vida <= jefe.vidaMax * 0.5) entrarFase2(cx, cy);

    // --- Aturdido tras estrellarse: se le pega sin necesidad de parry --------
    if (jefe.aturdido > 0) {
        jefe.aturdido -= dt;
        jefe.escudo = false;
        jefe.y += Math.sin(jefe.t * 0.35) * 0.7 * dt;
        if (Math.random() < 0.3)
            fxChispas(cx + rndRango(-40, 40), cy + rndRango(-30, 30), 3, COL.ORO, 2.4);
        // En fase 2 el núcleo se queda expuesto: ésa es su identidad. El escudo
        // solo vuelve en fase 1, donde parear es la lección.
        if (jefe.aturdido <= 0) {
            jefe.escudo = jefe.fase === 1;
            jefe.cd = 70; jefe.patron = 0;
        }
        tocarJefe();
        return;
    }

    jefe.y += Math.sin(jefe.t * 0.03) * 0.5 * dt;

    // --- El parry rompe el escudo, en las dos fases -------------------------
    // parryGolpe es de un solo uso: si no, el escudo se rompería solo cada frame.
    if (jugador.parryGolpe > 0 && jefe.escudo && Math.hypot(jx - cx, jy - cy) < 420) {
        jugador.parryGolpe = 0;
        jefe.escudo = false;
        jefe.cd = jefe.fase === 1 ? 200 : 130;
        aviso('¡ESCUDO ROTO!', 900);
        emitirOnda(cx, cy, 220, 8, COL.ORO);
        destellar('#f1c40f', 0.4, 400);
        sacudir(14);
    }

    if (jefe.fase === 1) jefeFase1(dt, jx, jy, cx, cy);
    else                 jefeFase2(dt, jx, jy, cx, cy);

    tocarJefe();
}

/** Recalcula el centro: la embestida mueve al jefe DENTRO del frame, así que el
 *  que se calculó al principio ya no sirve para el empujón. */
function tocarJefe() {
    if (solapanRect(jugador.x, jugador.y, jugador.ancho, jugador.alto,
                    jefe.x, jefe.y, jefe.ancho, jefe.alto) && !invulnerable())
        dañarJugador(1, jefe.x + jefe.ancho / 2, jefe.y + jefe.alto / 2);
}

/** Altura de la carga, acotada para que el jefe no acabe medio enterrado: apunta
 *  al centro del jugador, y ése está a ras de suelo. */
function alturaEmbestida(y) {
    return Math.min(y, jefe.sueloY - jefe.alto / 2 - 6);
}

function entrarFase2(cx, cy) {
    jefe.fase = 2;
    jefe.escudo = false;
    jefe.cd = 90;
    jefe.patron = 0; jefe.patronT = 0; jefe.telegrafiaT = 0; jefe.cargaT = 0;
    aviso('FASE 2 · NÚCLEO EXPUESTO', 1600);
    explotar(cx, cy, 120, 0, true);
    emitirOnda(cx, cy, 320, 10, COL.ROJO);
    destellar('#c0392b', 0.45, 620);
    sacudir(22); congelar(10);
    tono(90, 0.8, 'sawtooth', 0.12, 40);
}

/**
 * Fase 1: el orbe pareable y los enjambres.
 *
 * El escudo VUELVE a subir al agotarse la ventana de daño. Sin eso bastaba un
 * único parry en toda la fase —nada lo reponía— y se evaporaba justo la lección
 * por la que este jefe existe: que parear es lo que abre el escudo.
 */
function jefeFase1(dt, jx, jy, cx, cy) {
    if (jefe.escudo && jefe.cargaT <= 0 && jefe.cd <= 0) {
        jefe.cargaT = 34;
        sfx.telegrafia();
    }
    if (jefe.cargaT > 0) {
        jefe.cargaT -= dt;
        fxCarga(cx, cy, COL.TURQ);
        if (jefe.cargaT <= 0) {
            const dx = jx - cx, dy = jy - cy, d = Math.hypot(dx, dy) || 1;
            nuevoProyectil(cx, cy, dx / d * 4.6, dy / d * 4.6,
                { daño: 1, col: COL.TURQ, tipo: 'orbe', pareable: true, ancho: 24, alto: 24, vida: 200 });
            jefe.cd = 105;
        }
        return;
    }

    // Con el escudo caído aprovecha para repoblar mientras dure la ventana...
    if (!jefe.escudo) {
        if (jefe.invocaCd > 0) jefe.invocaCd -= dt;
        else {
            // ...con el mismo tope que los criaderos: sin él la arena se llenaba
            // sin límite en una pelea larga.
            if (enemigos.length < 26)
                for (let i = 0; i < 2; i++)
                    addEnemigo('enjambre', cx + rndRango(-60, 60), cy + rndRango(-40, 40));
            fxHumo(cx, cy, 14, COL.ROJO_OSC, 40);
            jefe.invocaCd = 90;
        }
        // ...y al agotarse la ventana levanta el escudo otra vez.
        if (jefe.cd <= 0) {
            jefe.escudo = true;
            jefe.cd = 40;
            emitirTexto(cx, jefe.y - 30, 'ESCUDO RESTAURADO', COL.TURQ, 14);
            emitirOnda(cx, cy, 96, 4, COL.TURQ);
            tono(300, 0.22, 'triangle', 0.05, 620);
        }
    }
}

/** Fase 2: embestida y anillo espiral, alternándose. */
function jefeFase2(dt, jx, jy, cx, cy) {
    // --- Telegrafía de la embestida ----------------------------------------
    if (jefe.telegrafiaT > 0) {
        jefe.telegrafiaT -= dt;
        jefe.embisteY = alturaEmbestida(lerp(jefe.embisteY, jy, 0.05 * dt));
        fxCarga(cx, cy, COL.ROJO);
        if (Math.floor(jefe.telegrafiaT / 4) % 2 === 0)
            emitir(cx + rndRango(-50, 50), cy, rndRango(-1, 1), -1.6, 16, 3,
                   COL.ROJO, TP.BRILLO, 0, 0.9, 0);
        if (jefe.telegrafiaT <= 0) {
            jefe.patron = 1; jefe.patronT = 120;
            jefe.embisteVX = Math.sign(jx - cx) * 11.5 || 11.5;
            sfx.dash(); sacudir(10);
        }
        return;
    }

    // --- Patrón A: embestida ------------------------------------------------
    if (jefe.patron === 1) {
        jefe.patronT -= dt;
        jefe.x += jefe.embisteVX * dt;
        jefe.y = lerp(jefe.y, jefe.embisteY - jefe.alto / 2, 0.18 * dt);
        fxEstela(cx, cy, COL.ROJO, 14);
        const choca = jefe.x <= jefe.x0 || jefe.x + jefe.ancho >= jefe.x1;
        if (choca || jefe.patronT <= 0) {
            jefe.x = clamp(jefe.x, jefe.x0, jefe.x1 - jefe.ancho);
            if (choca) {
                jefe.aturdido = 95;
                aviso('SE ESTRELLÓ · ¡PÉGALE!', 1400);
                explotar(jefe.x + jefe.ancho / 2, cy, 110, 0, true);
                sacudir(20); congelar(9);
            }
            jefe.patron = 0; jefe.cd = 55;
        }
        return;
    }

    // --- Patrón B: anillo espiral -------------------------------------------
    if (jefe.patron === 2) {
        jefe.patronT -= dt;
        if (jefe.patronT <= 0) {
            for (let i = 0; i < 10; i++) {
                const a = (i / 10) * 6.283185 + jefe.giroAnillo;
                nuevoProyectil(cx, cy, Math.cos(a) * 3.5, Math.sin(a) * 3.5,
                    { daño: 1, col: COL.ROJO, tipo: 'onda', pareable: true,
                      ancho: 16, alto: 16, vida: 160 });
            }
            jefe.giroAnillo += 0.36;          // los huecos rotan en cada andanada
            tono(260, 0.14, 'square', 0.05, 130);
            sacudir(5);
            jefe.andanadas--;
            jefe.patronT = 34;
            if (jefe.andanadas <= 0) { jefe.patron = 0; jefe.cd = 80; }
        }
        return;
    }

    // --- El orbe de la fase 2, cuando toca ----------------------------------
    if (jefe.cargaT > 0) {
        jefe.cargaT -= dt;
        fxCarga(cx, cy, COL.TURQ);
        if (jefe.cargaT <= 0) {
            const dx = jx - cx, dy = jy - cy, d = Math.hypot(dx, dy) || 1;
            nuevoProyectil(cx, cy, dx / d * 5.2, dy / d * 5.2,
                { daño: 1, col: COL.TURQ, tipo: 'orbe', pareable: true,
                  ancho: 24, alto: 24, vida: 200 });
            jefe.cd = 75;
        }
        return;
    }

    // --- Elegir el siguiente ataque -----------------------------------------
    if (jefe.cd > 0) {
        // Deriva hacia el jugador mientras espera: nunca se queda quieto del todo.
        jefe.x = aprox(jefe.x, clamp(jx - jefe.ancho / 2, jefe.x0, jefe.x1 - jefe.ancho), 0.9 * dt);
        return;
    }
    const r = rnd();
    if (r < 0.45) {
        jefe.telegrafiaT = 40;
        jefe.embisteY = alturaEmbestida(jy);
        aviso('¡EMBESTIDA!', 800);
        sfx.telegrafia();
    } else if (r < 0.85) {
        jefe.patron = 2; jefe.andanadas = 3; jefe.patronT = 16;
        sfx.telegrafia();
    } else {
        jefe.cargaT = 26;
        sfx.telegrafia();
    }
}

