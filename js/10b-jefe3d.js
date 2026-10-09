"use strict";

// ---------------------------------------------------------------------------
//  10b. LA HEMBRA — el jefe 3D del nivel 4
//
//  El Núcleo Mutante del nivel 3 enseña que la raqueta abre el escudo. La Hembra
//  enseña lo que el juego entero repite: un mosquito no se acaba a golpes
//  mientras tenga dónde poner huevos. Vive en la arena del portal con tres
//  envases propios. Mientras alguno conserve agua tiene escudo y desova en
//  ellos; cerrarlos con su medida (las cuatro de siempre) la deja expuesta.
//  Uno solo vaciado, sin tallar, sigue contando: los huevos siguen pegados.
//
//  Cada ataque se avisa antes, como en el jefe 2D: la picada con un aro rojo en
//  el suelo, el desove con el envase que brilla y el anillo con un giro morado.
//  El modelo no usa rnd(); la elección de ataque sí, como el jefe 2D.
// ---------------------------------------------------------------------------

let jefe3D = null;

const JEFE3D = {
    nombre: 'LA HEMBRA',
    vida: 30,
    radio: 1.3,                 // para los golpes: es grande
    alturaVuelo: 3.3,
    velPicada: 0.55,            // unidades por frame
    // Fase 1 (escudo): la picada asusta pero no abre ninguna ventana.
    avisoPicada1: 50, sueloPicada1: 40, esperaPicada1: 110,
    // Fase 2 (expuesta): más seguida, y al fallar se queda en el suelo.
    avisoPicada2: 38, sueloPicada2: 90, esperaPicada2: 50,
    avisoAnillo: 40, balasAnillo: 12, andanadas: 2,
    aturdeParry: 110, dañoParry: 3, desplome: 120
};

function jefe3DListo() { return !jefe3D || jefe3D.muerto; }

/** Sus envases que todavía guardan agua (o huevos pegados). */
function envasesJefe3D() {
    let n = 0;
    for (const c of criaderos3D) if (c.deJefe && !c.neutralizado) n++;
    return n;
}

/** Distancia de un punto a la superficie de su cuerpo (negativa = dentro). */
const vJefe = new THREE.Vector3();
function distanciaJefe3D(p) {
    if (!jefe3D) return Infinity;
    return vJefe.set(jefe3D.x, jefe3D.y, jefe3D.z).distanceTo(p) - JEFE3D.radio;
}

/** ¿Cae dentro de un cono de golpe? Cuenta su radio: de cerca ocupa más vista. */
function jefe3DEnCono(origen, dir, alcance, dot) {
    const J = jefe3D;
    if (!J || J.muerto) return false;
    vJefe.set(J.x, J.y, J.z).sub(origen);
    const d = vJefe.length();
    if (d - JEFE3D.radio > alcance) return false;
    if (d < JEFE3D.radio) return true;
    const ang = Math.acos(clamp(vJefe.dot(dir) / d, -1, 1));
    return ang <= Math.acos(dot) + Math.atan2(JEFE3D.radio, d);
}

/** Al cambiar de nivel o de partida. Sus mallas viven en grupoNivel. */
function reiniciarJefe3D() {
    jefe3D = null;
    barraPrev = '';
    const el = document.getElementById('jefe3d');
    if (el) el.classList.add('oculto');
}

// --- La arena ---------------------------------------------------------------
/** Sus tres envases en las esquinas y ella al centro, dormida. */
function poblarArena3D(s) {
    const x0 = gx2x(s.gx), x1 = gx2x(s.gx + s.w), z0 = gz2z(s.gz), z1 = gz2z(s.gz + s.h);
    const m = CELDA3 * 1.5;
    for (const [x, z] of [[x0 + m, z0 + m], [x1 - m, z0 + m], [x0 + m, z1 - m]]) {
        const c = crearCriadero3D(envaseDeNivel(), x, z);
        c.deJefe = true;
    }
    crearJefe3D(s, x0, x1, z0, z1);
}

// --- Modelo -----------------------------------------------------------------
/** Una hembra de Aedes aegypti, enorme y low poly: negra con las bandas blancas
 *  en el abdomen y las patas, y la lira blanca en el tórax. El frente es +Z. */
function crearModeloHembra() {
    const g = new THREE.Group();
    const cuerpo = new THREE.MeshLambertMaterial({ color: 0x1b1b1f, emissive: 0x000000 });
    const blanco = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });

    const torax = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), cuerpo);
    torax.scale.set(1, 0.9, 1.15);
    g.add(torax);
    // La lira: dos arcos blancos sobre el tórax, la marca del Aedes aegypti.
    for (const s of [-1, 1]) {
        const arco = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 4, 10, Math.PI), blanco);
        arco.rotation.set(-Math.PI / 2, 0, s > 0 ? 0 : Math.PI);
        arco.position.set(s * 0.12, 0.47, 0);
        arco.scale.set(0.6, 1.4, 1);
        g.add(arco);
    }

    // Abdomen: un cono que sale hacia atrás, con tres bandas blancas.
    const abdomen = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.6, 7).translate(0, 0.8, 0).rotateX(-Math.PI / 2), cuerpo);
    abdomen.position.set(0, -0.08, -0.35);
    g.add(abdomen);
    for (const [z, r] of [[-0.6, 0.36], [-0.95, 0.27], [-1.3, 0.18]]) {
        const banda = new THREE.Mesh(new THREE.TorusGeometry(r, 0.045, 4, 12), blanco);
        banda.position.set(0, -0.08, z);
        g.add(banda);
    }

    const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), cuerpo);
    cabeza.position.set(0, 0.05, 0.68);
    g.add(cabeza);
    const ojo = new THREE.MeshBasicMaterial({ color: 0xff2e2e });
    for (const s of [-1, 1]) {
        const o = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), ojo);
        o.position.set(s * 0.18, 0.14, 0.86);
        g.add(o);
    }
    const trompa = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.012, 1.0, 5).rotateX(Math.PI / 2 + 0.25), cuerpo);
    trompa.position.set(0, -0.1, 1.38);
    g.add(trompa);

    // Seis patas: muslo negro y la parte baja blanca, como sus bandas.
    for (let i = 0; i < 6; i++) {
        const s = i < 3 ? -1 : 1, k = i % 3;
        const pata = new THREE.Group();
        const muslo = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 4).translate(0, -0.4, 0), cuerpo);
        const pie = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.9, 4).translate(0, -0.45, 0), blanco);
        pie.position.y = -0.8;
        pie.rotation.z = s * -0.5;
        muslo.add(pie);
        pata.add(muslo);
        pata.position.set(s * 0.3, -0.25, 0.25 - k * 0.3);
        pata.rotation.set((k - 1) * 0.35, 0, s * 1.0);
        g.add(pata);
    }

    // Alas: dos planos translúcidos que aletean.
    const matAla = new THREE.MeshBasicMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0.35,
                                                 side: THREE.DoubleSide, depthWrite: false });
    const alas = [-1, 1].map(s => {
        const a = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.45).rotateX(-Math.PI / 2).translate(s * 0.75, 0, 0), matAla);
        a.position.set(s * 0.15, 0.4, -0.25);
        g.add(a);
        return a;
    });

    // El escudo: una burbuja turquesa mientras tenga dónde poner huevos.
    const escudo = new THREE.Mesh(new THREE.SphereGeometry(2.1, 18, 12), new THREE.MeshBasicMaterial({
        color: 0x1abc9c, transparent: true, opacity: 0.18, side: THREE.DoubleSide,
        depthWrite: false, blending: THREE.AdditiveBlending
    }));
    escudo.position.z = -0.2;
    g.add(escudo);

    return { grupo: g, cuerpo, alas, escudo };
}

function crearJefe3D(s, x0, x1, z0, z1) {
    const m = crearModeloHembra();
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    m.grupo.position.set(cx, JEFE3D.alturaVuelo, cz);
    grupoNivel.add(m.grupo);

    // El aro de la picada: se ve en el suelo ANTES de que baje.
    const aro = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.6, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.7,
                                      side: THREE.DoubleSide, depthWrite: false }));
    aro.visible = false;
    grupoNivel.add(aro);

    const luz = new THREE.PointLight(0xff3b3b, 0, 9);
    m.grupo.add(luz);

    jefe3D = {
        grupo: m.grupo, cuerpo: m.cuerpo, alas: m.alas, escudoM: m.escudo, aro, luz,
        x: cx, y: JEFE3D.alturaVuelo, z: cz,
        x0: x0 + 2, x1: x1 - 2, z0: z0 + 2, z1: z1 - 2, ax0: x0, ax1: x1, az0: z0, az1: z1,
        vida: JEFE3D.vida, vidaMax: JEFE3D.vida, fase: 1,
        despierta: false, muerto: false,
        est: 'duerme', t: 0, cd: 0, anim: 0, orbita: 0, flash: 0, selloRaqueta: -1,
        objX: cx, objY: 0, objZ: cz, vx: 0, vy: 0, vz: 0, tMax: 1,
        envase: null, andanadas: 0, giro: 0, ultimo: '', avisoEscudoT: 0,
        serotipo: serotipoDeNivel(nivelActual)
    };
    return jefe3D;
}

// --- Estados ------------------------------------------------------------------
function dentroArenaJefe3D(x, z) {
    const J = jefe3D;
    return x > J.ax0 && x < J.ax1 && z > J.az0 && z < J.az1;
}

function despertarJefe3D() {
    const J = jefe3D;
    J.despierta = true;
    J.est = 'flota'; J.cd = 80;
    aviso(J.fase === 1 ? 'LA HEMBRA · MIENTRAS SUS ENVASES TENGAN AGUA, NO CAE' : 'LA HEMBRA', 2600);
    sfx.telegrafia();
    tono(70, 0.9, 'sawtooth', 0.1, 140);
    sacudida3D = Math.max(sacudida3D, 0.25);
}

/** Ya no tiene dónde poner huevos: se le cae el escudo y se desploma un rato. */
function romperEscudoJefe3D() {
    const J = jefe3D;
    J.fase = 2;
    J.aro.visible = false;
    J.est = 'aturdida'; J.t = JEFE3D.desplome;
    aviso('SIN DÓNDE PONER HUEVOS · ¡SE LE CAYÓ EL ESCUDO!', 2600);
    anillo3D(J.x, J.y, J.z, 7, 0x1abc9c);
    fxChispas3D(J.x, J.y, J.z, 40, 0.1, 0.9, 0.75, 0.16);
    destellar('#1abc9c', 0.3, 520);
    sacudida3D = Math.max(sacudida3D, 0.35);
    sfx.nivel();
    desbloquearFicha('tapa');
}

function dañarJefe3D(n) {
    const J = jefe3D;
    if (!J || J.muerto) return false;
    if (!J.despierta) despertarJefe3D();
    if (J.fase === 1) {
        fxChispas3D(J.x, J.y, J.z, 10, 0.1, 0.9, 0.8, 0.08);
        anillo3D(J.x, J.y, J.z, 3.4, 0x1abc9c);
        tono(240, 0.08, 'square', 0.05);
        if (J.avisoEscudoT <= 0) {
            J.avisoEscudoT = 240;
            aviso('ESCUDO · CIERRA SUS ENVASES', 1600);
        }
        return false;
    }
    J.vida -= n; J.flash = 9;
    fxChispas3D(J.x, J.y, J.z, 16, 1, 0.3, 0.25, 0.1);
    sfx.golpe(); congelar(3);
    sacudida3D = Math.max(sacudida3D, 0.06);
    if (J.vida <= 0) matarJefe3D();
    return true;
}

function matarJefe3D() {
    const J = jefe3D;
    J.vida = 0; J.muerto = true;
    J.grupo.visible = false; J.aro.visible = false;
    fxExplosion3D(J.x, J.y, J.z, 4.5, 1, 0.5, 0.2);
    anillo3D(J.x, J.y, J.z, 9, 0xffb347);
    aviso('LA HEMBRA CAYÓ', 2400);
    destellar('#ffd9a0', 0.35, 520);
    sacudida3D = Math.max(sacudida3D, 0.45);
    congelar(12); sfx.explosion();
    if (criaderosVivos() === 0) avisarSalidaAbierta();
    else setTimeout(() => {
        if (estado === estados.J3D && criaderosVivos() > 0) aviso('CIERRA LOS CRIADEROS QUE FALTAN', 2200);
    }, 2600);
}

/** Se acerca a (x, y, z) a `vel` por frame. Devuelve true al llegar. */
function volarJefe3D(J, x, y, z, vel, dt) {
    const dx = x - J.x, dy = y - J.y, dz = z - J.z, d = Math.hypot(dx, dy, dz);
    if (d < vel * dt || d < 0.05) { J.x = x; J.y = y; J.z = z; return true; }
    const k = vel * dt / d;
    J.x += dx * k; J.y += dy * k; J.z += dz * k;
    return false;
}

function elegirAtaqueJefe3D(J) {
    if (J.fase === 1) {
        const conAgua = criaderos3D.filter(c => c.deJefe && !c.neutralizado);
        if (conAgua.length && J.ultimo !== 'desove' && rnd() < 0.45) {
            J.envase = conAgua[Math.floor(rnd() * conAgua.length)];
            J.est = 'vuelaDesove'; J.t = 0; J.ultimo = 'desove';
            aviso('VA A PONER HUEVOS · ' + CRIADEROS[J.envase.tipo].nombre.toUpperCase(), 1500);
            sfx.telegrafia();
            return;
        }
    } else if (J.ultimo !== 'anillo' && rnd() < 0.45) {
        J.est = 'avisoAnillo'; J.t = JEFE3D.avisoAnillo; J.ultimo = 'anillo';
        aviso('¡ANILLO!', 800);
        sfx.telegrafia();
        return;
    }
    J.est = 'avisoPicada';
    J.t = J.tMax = J.fase === 1 ? JEFE3D.avisoPicada1 : JEFE3D.avisoPicada2;
    J.ultimo = 'picada';
    aviso('¡PICADA!', 700);
    sfx.telegrafia();
}

/** La picada sobre el jugador: la pareas, te pica o pasa de largo. */
function contactoPicada(J, cam) {
    if (vJefe.set(J.x, J.y, J.z).distanceTo(cam) > 1.8) return false;
    if (parryAbierto()) {
        parryExitoso(0, 0);
        anillo3D(cam.x, cam.y, cam.z, 6, 0xf1c40f);
        J.est = 'aturdida'; J.t = JEFE3D.aturdeParry;
        J.aro.visible = false;
        if (J.fase === 2) dañarJefe3D(JEFE3D.dañoParry);
        return true;
    }
    if (!invulnerable()) picar(J.serotipo, 0, 0);
    return false;
}

function actualizarJefe3D(dt) {
    const J = jefe3D;
    if (!J || J.muerto) return;
    const cam = camera3D.position;
    J.anim += dt;
    if (J.flash > 0) J.flash -= dt;
    if (J.avisoEscudoT > 0) J.avisoEscudoT -= dt;

    // Aleteo, escudo y el color de cada aviso.
    const al = 0.25 + Math.abs(Math.sin(J.anim * 0.9)) * 0.7;
    J.alas[0].rotation.z = al; J.alas[1].rotation.z = -al;
    J.escudoM.visible = J.fase === 1;
    J.escudoM.material.opacity = 0.14 + Math.sin(J.anim * 0.12) * 0.05;
    const aviso1 = J.est === 'avisoPicada' || J.est === 'picada';
    const parpadeo = Math.floor(J.anim / 4) % 2 === 0;
    const em = J.flash > 0 ? 0xffffff
             : aviso1 && parpadeo ? 0xb01010
             : J.est === 'avisoAnillo' && parpadeo ? 0x6a1b9a : 0x000000;
    if (J.cuerpo.emissive.getHex() !== em) J.cuerpo.emissive.setHex(em);
    J.luz.intensity = aviso1 || J.est === 'avisoAnillo' ? 1.6 : 0;

    if (!J.despierta) {
        // Flota sobre el portal hasta que entras a su arena.
        J.y = JEFE3D.alturaVuelo + Math.sin(J.anim * 0.03) * 0.25;
        J.grupo.rotation.y += 0.004 * dt;
        J.grupo.position.set(J.x, J.y, J.z);
        if (dentroArenaJefe3D(cam.x, cam.z)) despertarJefe3D();
        return;
    }
    if (J.fase === 1 && envasesJefe3D() === 0) romperEscudoJefe3D();

    let mira = true;          // de frente al jugador, salvo en la picada
    switch (J.est) {
    case 'flota': {
        // Orbita la arena a media altura mientras espera.
        J.orbita += 0.006 * dt;
        const cx = (J.x0 + J.x1) / 2, cz = (J.z0 + J.z1) / 2;
        const r = Math.min(J.x1 - J.x0, J.z1 - J.z0) * 0.3;
        volarJefe3D(J, cx + Math.cos(J.orbita) * r, JEFE3D.alturaVuelo + Math.sin(J.anim * 0.05) * 0.3,
                    cz + Math.sin(J.orbita) * r, 0.07, dt);
        J.cd -= dt;
        if (J.cd <= 0) elegirAtaqueJefe3D(J);
        break;
    }
    case 'avisoPicada': {
        // Sube y marca el suelo: el aro sigue al jugador y al final se fija.
        J.t -= dt;
        volarJefe3D(J, J.x, 4.0, J.z, 0.04, dt);
        if (J.t > J.tMax * 0.4) {
            J.objX = clamp(cam.x, J.x0, J.x1); J.objZ = clamp(cam.z, J.z0, J.z1);
            J.objY = alturaMundo(J.objX, J.objZ);
        }
        J.aro.visible = true;
        J.aro.position.set(J.objX, J.objY + 0.06, J.objZ);
        J.aro.scale.setScalar(0.8 + (J.t / J.tMax) * 0.9);
        J.aro.material.opacity = 0.45 + (Math.floor(J.t / 3) % 2) * 0.35;
        if (J.t <= 0) {
            J.est = 'picada';
            const dx = J.objX - J.x, dy = J.objY + 0.9 - J.y, dz = J.objZ - J.z;
            const d = Math.hypot(dx, dy, dz) || 1;
            J.vx = dx / d * JEFE3D.velPicada; J.vy = dy / d * JEFE3D.velPicada; J.vz = dz / d * JEFE3D.velPicada;
            J.t = d / JEFE3D.velPicada;
            tono(160, 0.25, 'sawtooth', 0.08, 60);
        }
        break;
    }
    case 'picada': {
        J.t -= dt;
        J.x += J.vx * dt; J.y += J.vy * dt; J.z += J.vz * dt;
        emitir3D(J.x, J.y, J.z, 0, 0, 0, 14, 1, 0.3, 0.25, 0);
        J.grupo.lookAt(J.x + J.vx, J.y + J.vy, J.z + J.vz);
        mira = false;
        if (contactoPicada(J, cam)) break;
        if (J.t <= 0) {
            // Se estrelló contra el suelo.
            J.x = J.objX; J.y = J.objY + 0.7; J.z = J.objZ;
            J.aro.visible = false;
            J.est = 'suelo';
            J.t = J.fase === 1 ? JEFE3D.sueloPicada1 : JEFE3D.sueloPicada2;
            fxExplosion3D(J.x, J.objY + 0.3, J.z, 1.6, 0.75, 0.7, 0.55);
            sacudida3D = Math.max(sacudida3D, 0.22);
            sfx.explosion();
            if (J.fase === 2) aviso('SE ESTRELLÓ · ¡PÉGALE!', 1300);
        }
        break;
    }
    case 'suelo':
    case 'aturdida': {
        // En el suelo, aturdida: en fase 2 es la ventana para pegarle.
        J.t -= dt;
        const piso = alturaMundo(J.x, J.z);
        J.y = lerp(J.y, piso + 0.7, 0.12 * dt);
        if (Math.random() < 0.3) emitir3D(J.x, J.y + 1.1, J.z, 0, 0.01, 0, 20, 1, 0.85, 0.2, 0);
        if (J.t <= 0) {
            J.est = 'flota';
            J.cd = J.fase === 1 ? JEFE3D.esperaPicada1 : JEFE3D.esperaPicada2;
        }
        break;
    }
    case 'vuelaDesove': {
        const c = J.envase;
        J.t += dt;
        if (c.malla && Math.random() < 0.5)
            emitir3D(c.x + rndRango(-0.8, 0.8), c.aguaY + 0.2, c.z + rndRango(-0.8, 0.8),
                     0, 0.03, 0, 26, 0.95, 0.3, 0.3, 0);
        const llego = volarJefe3D(J, c.x, c.aguaY + 1.4, c.z, 0.11, dt);
        if (llego || J.t > 240) {
            if (c.neutralizado) {
                aviso('SIN AGUA · NO PUEDE PONER HUEVOS', 1600);
                J.est = 'duda'; J.t = 30;
            } else { J.est = 'desova'; J.t = 40; }
        }
        break;
    }
    case 'desova': {
        const c = J.envase;
        J.t -= dt;
        J.y = c.aguaY + 1.2 + Math.sin(J.anim * 0.4) * 0.08;
        if (Math.random() < 0.6)
            emitir3D(c.x + rndRango(-0.5, 0.5), c.aguaY + 0.1, c.z + rndRango(-0.5, 0.5),
                     0, 0.01, 0, 22, 0.85, 0.8, 0.5, 0);
        if (c.neutralizado) { J.est = 'duda'; J.t = 30; break; }
        if (J.t <= 0) {
            // Pone los huevos: la cría siguiente sale ya, con su tope de siempre.
            // Si solo la vaciaste, los huevos de la pared despiertan.
            if (c.vaciado) c.tRevive = Math.min(c.tRevive, 30);
            else c.prod = Math.min(c.prod, 30);
            J.est = 'flota'; J.cd = 90;
        }
        break;
    }
    case 'duda':
        J.t -= dt;
        J.grupo.rotation.z = Math.sin(J.anim * 0.5) * 0.2;
        if (J.t <= 0) { J.grupo.rotation.z = 0; J.est = 'flota'; J.cd = 40; }
        break;
    case 'avisoAnillo': {
        // Baja a la altura de los ojos y gira: lo que viene es horizontal.
        J.t -= dt;
        volarJefe3D(J, J.x, alturaMundo(J.x, J.z) + CFG.altoOjos, J.z, 0.09, dt);
        J.grupo.rotation.y += 0.32 * dt;
        mira = false;
        if (J.t <= 0) { J.est = 'anillo'; J.andanadas = JEFE3D.andanadas; J.t = 0; }
        break;
    }
    case 'anillo': {
        J.t -= dt;
        mira = false;
        J.grupo.rotation.y += 0.1 * dt;
        if (J.t <= 0) {
            // Doce picaduras en círculo, con un hueco de dos que gira en cada andanada.
            const n = JEFE3D.balasAnillo, hueco = Math.floor(J.giro) % n;
            for (let i = 0; i < n; i++) {
                if (i === hueco || i === (hueco + 1) % n) continue;
                const a = (i / n) * 6.283 + J.giro * 0.15;
                proyectilEnemigo3D(J.x + Math.cos(a) * 1.4, J.y, J.z + Math.sin(a) * 1.4,
                                   Math.cos(a), 0, Math.sin(a), J.serotipo);
            }
            J.giro += 3;
            sacudida3D = Math.max(sacudida3D, 0.08);
            J.andanadas--;
            J.t = 34;
            if (J.andanadas <= 0) { J.est = 'flota'; J.cd = 60; }
        }
        break;
    }
    }

    // Nunca sale de su arena.
    J.x = clamp(J.x, J.x0, J.x1); J.z = clamp(J.z, J.z0, J.z1);
    J.grupo.position.set(J.x, J.y, J.z);
    if (mira) J.grupo.lookAt(cam.x, J.y, cam.z);
}

// --- Barra de vida ---------------------------------------------------------------
let barraPrev = '';
function pintarBarraJefe3D() {
    const el = document.getElementById('jefe3d');
    if (!el) return;
    const J = jefe3D;
    const ver = !!J && J.despierta && !J.muerto && modoRender === '3d' &&
                (estado === estados.J3D || estado === estados.PAUSA);
    if (!ver) {
        if (barraPrev !== '') { barraPrev = ''; el.classList.add('oculto'); }
        return;
    }
    const quedan = envasesJefe3D();
    const sub = J.fase === 1 ? 'ESCUDO · envases con agua: ' + quedan + '/3' : 'SIN ESCUDO · FASE 2';
    const clave = J.vida + '|' + sub;
    if (clave === barraPrev) return;
    barraPrev = clave;
    el.innerHTML = '<div class="j3-nombre">' + JEFE3D.nombre + '</div>' +
                   '<div class="j3-barra' + (J.fase === 1 ? ' escudo' : '') + '"><div style="width:' +
                   (J.vida / J.vidaMax * 100) + '%"></div></div>' +
                   '<div class="j3-sub">' + sub + '</div>';
    el.classList.remove('oculto');
}
