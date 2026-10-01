"use strict";

// --- Jugador 3D ------------------------------------------------------------
// El bob y la sacudida son offsets VISUALES. Se deshacen al principio de cada
// frame: si se sumaran sin restarlos, la posición lógica derivaría sola y el
// jugador acabaría empujado dentro de un muro.
let offVisX = 0, offVisY = 0;

function actualizarJugador3D(dt) {
    const cam = camera3D;
    cam.position.x -= offVisX;
    cam.position.y -= offVisY;
    offVisX = offVisY = 0;

    // Con mando, el stick derecho escribe en ratonDX/DY y no hace falta capturar el ratón.
    if (document.pointerLockElement || mandoActivo) {
        jugador.yaw   -= ratonDX * CFG.sensibilidad;
        jugador.pitch -= ratonDY * CFG.sensibilidad;
        jugador.pitch = clamp(jugador.pitch, -1.48, 1.48);
    }
    cam.rotation.y = jugador.yaw;
    cam.rotation.x = jugador.pitch;

    // Base ortonormal en el plano XZ a partir del yaw.
    const fx = -Math.sin(jugador.yaw), fz = -Math.cos(jugador.yaw);
    const rx =  Math.cos(jugador.yaw), rz = -Math.sin(jugador.yaw);

    let av = 0, lat = 0;
    if (!jugador.muerto) {
        if (cualqAbajo('KeyW', 'ArrowUp', 'PadArriba')) av += 1;
        if (cualqAbajo('KeyS', 'ArrowDown'))  av -= 1;
        if (cualqAbajo('KeyD', 'ArrowRight')) lat += 1;
        if (cualqAbajo('KeyA', 'ArrowLeft'))  lat -= 1;

        if (entradaDash()) {
            let dx = fx * av + rx * lat, dz = fz * av + rz * lat;
            if (dx === 0 && dz === 0) { dx = fx; dz = fz; }
            const l = Math.hypot(dx, dz) || 1;
            if (intentarDash(dx / l, dz / l, cualqAbajo('ControlLeft'))) {
                jugador.dashDirX = dx / l; jugador.dashDirY = dz / l;   // dirY = eje Z en 3D
            }
        }
        if (entradaParry()) intentarParry();
        if (jugador.parryT > 0) golpeRaqueta3D();
        if (entradaAtaque() || ((ratonAbajo[0] || padDisparo) && jugador.ataqueCd <= 0)) disparar3D();
        // En 3D el salto es SOLO espacio: W y ↑ son avanzar.
        if (pulsada('Space') && jugador.enSuelo3) {
            jugador.vy3 = CFG.salto3D; jugador.enSuelo3 = false; sfx.salto();
        }
        // Lava / Tapa / Voltea / Tira sobre el envase que tengas delante.
        leerVerbos(criaderoCercano3D());
    }

    let dx, dz;
    if (jugador.dashT > 0) {
        dx = jugador.dashDirX * CFG.dashVel3D;
        dz = jugador.dashDirY * CFG.dashVel3D;
        emitir3D(cam.position.x, cam.position.y - 0.4, cam.position.z,
                 rndRango(-.02,.02), rndRango(-.01,.02), rndRango(-.02,.02),
                 16, 0.35, 0.75, 1, 0);
    } else {
        const l = Math.hypot(av, lat) || 1;
        dx = (fx * av + rx * lat) / l * CFG.velCam;
        dz = (fz * av + rz * lat) / l * CFG.velCam;
        if (av === 0 && lat === 0) { dx = 0; dz = 0; }
    }

    // Colisión por ejes separados contra la rejilla.
    const nx = cam.position.x + dx * dt;
    if (!chocaCirculo(nx, cam.position.z, RADIO_JUG)) cam.position.x = nx;
    else if (jugador.dashT > 0) jugador.dashT = 0;
    const nz = cam.position.z + dz * dt;
    if (!chocaCirculo(cam.position.x, nz, RADIO_JUG)) cam.position.z = nz;
    else if (jugador.dashT > 0) jugador.dashT = 0;

    // Salto y gravedad
    jugador.vy3 -= CFG.gravedad3D * dt;
    cam.position.y += jugador.vy3 * dt;
    if (cam.position.y <= CFG.altoOjos) {
        if (!jugador.enSuelo3 && jugador.vy3 < -0.1) {
            fxChispas3D(cam.position.x, 0.15, cam.position.z, 8, 0.85, 0.85, 0.7, 0.05);
        }
        cam.position.y = CFG.altoOjos; jugador.vy3 = 0; jugador.enSuelo3 = true;
    } else jugador.enSuelo3 = false;

    // Bob de cámara al caminar + retroceso al disparar + sacudida
    const moviendo = (av !== 0 || lat !== 0) && jugador.enSuelo3;
    bobCam += (moviendo ? 0.22 : 0) * dt;
    if (!moviendo) bobCam = lerp(bobCam, 0, 0.1 * dt);
    kickCam = lerp(kickCam, 0, 0.18 * dt);
    sacudida3D *= Math.pow(0.86, dt);
    offVisY = Math.sin(bobCam * 2) * 0.045 + (Math.random() - 0.5) * sacudida3D;
    offVisX = (Math.random() - 0.5) * sacudida3D;
    cam.position.x += offVisX;
    cam.position.y += offVisY;
    cam.rotation.x += Math.sin(bobCam) * 0.008 - kickCam;   // se recalcula cada frame desde pitch

    actualizarRaqueta3D(dt);
    document.getElementById('crosshair').classList.toggle('parry', parryAbierto());
}

// --- Raqueta en primera persona --------------------------------------------
// El gesto entra de golpe y vuelve despacio. Ese contraste, con el hitstop y el
// fogonazo del impacto, es lo que hace que un swing se sienta como un swing.
// Las dos poses viven en 08, junto a la construcción del viewmodel.
const dirRaq = new THREE.Vector3();
const vRaq = new THREE.Vector3();

function actualizarRaqueta3D(dt) {
    if (!raqueta3D) return;
    let g = 0;
    if (jugador.raquetaT > 0) {
        const p = 1 - jugador.raquetaT / CFG.raquetaSwing;
        g = p < 0.22 ? Math.sin((p / 0.22) * 1.5708)          // chasquido de entrada
                     : Math.pow(1 - (p - 0.22) / 0.78, 1.6);  // regreso lento
    }
    const bob = Math.sin(bobCam * 2) * 0.022 * (1 - g);
    raqueta3D.position.set(
        lerp(RAQ_REPOSO.px, RAQ_GOLPE.px, g),
        lerp(RAQ_REPOSO.py, RAQ_GOLPE.py, g) + bob,
        lerp(RAQ_REPOSO.pz, RAQ_GOLPE.pz, g));
    raqueta3D.rotation.set(
        lerp(RAQ_REPOSO.rx, RAQ_GOLPE.rx, g),
        lerp(RAQ_REPOSO.ry, RAQ_GOLPE.ry, g),
        lerp(RAQ_REPOSO.rz, RAQ_GOLPE.rz, g));

    const viva = parryAbierto();
    mallaRaqueta.material.opacity = 0.14 + (viva ? 0.55 : 0.12) * g;
    mallaRaqueta.material.color.setHex(viva ? 0xf1c40f : 0x7bed9f);
    luzRaqueta.intensity = viva ? 3.2 * g : 0.4 * g;
}

/**
 * El arco en 3D: un cono delante de la mirada. Un impacto por mosquito y por
 * swing — con once frames de ventana, sin el sello la raqueta barrería la sala.
 */
function golpeRaqueta3D() {
    const cam = camera3D;
    dirRaq.set(0, 0, -1).applyQuaternion(cam.quaternion);
    const sello = jugador.selloRaqueta;
    let tocado = 0;

    for (const e of mosquitos3D) {
        if (!e.vivo || e.selloRaqueta === sello) continue;
        vRaq.copy(e.malla.position).sub(cam.position);
        const d = vRaq.length();
        if (d > CFG.raquetaAlcance3D) continue;
        if (vRaq.normalize().dot(dirRaq) < CFG.raquetaDot3D) continue;
        e.selloRaqueta = sello;
        e.aturdido = Math.max(e.aturdido, CFG.raquetaAturde);
        e.est = 'aturdido';
        dañarMosquito3D(e, CFG.raquetaGolpe);
        tocado++;
    }
    if (!tocado) return;

    // El golpe: hitstop, fogonazo, anillo y chispas en la punta de la raqueta.
    vRaq.copy(cam.position).addScaledVector(dirRaq, 1.5);
    fxChispas3D(vRaq.x, vRaq.y, vRaq.z, 22, 1, 0.85, 0.25, 0.12);
    anillo3D(vRaq.x, vRaq.y, vRaq.z, 4.5, 0xf1c40f);
    destellar('#f1c40f', 0.22, 170);
    congelar(6);
    sacudida3D = Math.max(sacudida3D, 0.16);
    kickCam = 0.05;
    tono(1900, 0.05, 'square', 0.06, 380);
    tono(120, 0.10, 'sawtooth', 0.05, 60);
}

function disparar3D() {
    if (jugador.ataqueCd > 0 || jugador.muerto) return;
    const cam = camera3D;
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);

    if (armaActiva === 'botas') {
        // Manotazo: hitscan corto delante de la cámara.
        jugador.ataqueCd = 22;
        kickCam = 0.03; sfx.disparo();
        for (const e of mosquitos3D) {
            if (!e.vivo) continue;
            const v = e.malla.position.clone().sub(cam.position);
            if (v.length() < 3.2 && v.normalize().dot(dir) > 0.72) { dañarMosquito3D(e, 1); break; }
        }
        return;
    }
    const esAbate = armaActiva === 'abate';
    jugador.ataqueCd = esAbate ? 34 : 13;
    const g = new THREE.SphereGeometry(esAbate ? 0.24 : 0.16, 8, 6);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: esAbate ? 0xd35400 : 0xecf0f1 }));
    m.position.copy(cam.position).addScaledVector(dir, 0.7);
    grupoNivel.add(m);
    proy3D.push({
        malla: m, vx: dir.x * 0.62, vy: dir.y * 0.62 + (esAbate ? 0.05 : 0), vz: dir.z * 0.62,
        grav: esAbate ? -0.0022 : 0, daño: esAbate ? 2 : 1,
        explota: esAbate ? 3.4 : 0, delJugador: true, pareable: false, vida: 190,
        col: esAbate ? [1, 0.55, 0.1] : [0.9, 0.95, 1]
    });
    kickCam = esAbate ? 0.045 : 0.022;
    sfx.disparo();
}

function proyectilEnemigo3D(x, y, z, dx, dy, dz, serotipo) {
    const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xb06ad6 })
    );
    m.position.set(x, y, z);
    grupoNivel.add(m);
    proy3D.push({
        malla: m, vx: dx * 0.24, vy: dy * 0.24, vz: dz * 0.24, grav: 0,
        daño: 1, explota: 0, delJugador: false, pareable: true, vida: 220, col: [0.7, 0.4, 0.9],
        tipo: 'picadura', serotipo: serotipo || 1
    });
    tono(420, 0.08, 'sawtooth', 0.05, 220);
}

function dañarMosquito3D(e, n) {
    if (!e.vivo) return;
    e.vida -= n; e.flash = 9;
    const p = e.malla.position;
    fxChispas3D(p.x, p.y, p.z, 12, 1, 0.4, 0.3, 0.09);
    sfx.golpe(); congelar(3); sacudida3D = Math.max(sacudida3D, 0.05);
    if (e.vida <= 0) matarMosquito3D(e);
}

function matarMosquito3D(e) {
    e.vivo = false;
    if (e.token) { e.token = false; tokensAtaque = Math.max(0, tokensAtaque - 1); }
    const p = e.malla.position;
    if (e.arq.explotaAlMorir) {
        explotar3D(p.x, p.y, p.z, e.tipo === 'mutante' ? 4.2 : 3.4, 1);
    } else {
        fxExplosion3D(p.x, p.y, p.z, 1.5, 1, 0.35, 0.25);
        sfx.golpe();
    }
    if (e.origen) e.origen.vivos = Math.max(0, e.origen.vivos - 1);
    fichas += e.arq.valor; actualizarHUD(); sfx.moneda();
    grupoNivel.remove(e.malla);
    // Las alas son hijos con recursos propios (compartidos entre las dos):
    // sin liberarlos se acumulan en la GPU tras varias oleadas.
    e.malla.geometry.dispose(); e.malla.material.dispose();
    e.alaI.geometry.dispose(); e.alaI.material.dispose();
    congelar(4);
}

function explotar3D(x, y, z, radio, daño) {
    fxExplosion3D(x, y, z, radio, 1, 0.6, 0.2);
    sfx.explosion();
    sacudida3D = Math.max(sacudida3D, clamp(radio * 0.045, 0.04, 0.22));
    congelar(8);
    destellar('#ffd9a0', 0.2, 300);
    tmpV.set(x, y, z);                       // vector reutilizado: cero asignaciones
    for (const e of mosquitos3D) {
        if (!e.vivo) continue;
        if (e.malla.position.distanceTo(tmpV) < radio * 1.3) dañarMosquito3D(e, daño + 1);
    }
    if (camera3D.position.distanceTo(tmpV) < radio * 1.15) dañarJugador(1, 0, 0);
}

