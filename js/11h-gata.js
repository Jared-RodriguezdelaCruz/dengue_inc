"use strict";

// ---------------------------------------------------------------------------
//  11h. LA GORDA — la gata aliada
//
//  Se compra una vez en la tienda y te acompaña el resto de la partida, en 2D y
//  en 3D. Caza a los mosquitos que vuelan bajo cerca de ti: los aturde y les
//  quita vida. No cierra criaderos, no toca a los jefes, y lo que caza paga lo
//  mismo que lo que matas tú (valorMosquito): el mosquito que salió de un
//  criadero vivo no deja nada. La tienda lo dice claro: ningún gato controla el
//  dengue.
//
//  Mientras llega la imagen de la Gorda, se dibuja con formas: en 2D con el
//  canvas y en 3D low poly. Para usar la imagen en 2D basta con cambiar
//  dibujarGata2D por un spriteHorneado. Nada de esto usa rnd().
// ---------------------------------------------------------------------------

let gataComprada = false;
let gata2D = null, gata3D = null;
const vGata = new THREE.Vector3();

const GATA = {
    // 2D (px y frames)
    ancho: 30, alto: 22, vel: 5.2, salto: -12.5, alcance: 180, cd: 70, lejos: 420,
    // 3D (unidades)
    vel3D: 0.13, radio3D: 0.35, alcance3D: 5, alturaCaza3D: 2.6, cd3D: 90, lejos3D: 12
};

function comprarGata() {
    gataComprada = true;
    aviso('🐈 LA GORDA VIENE CONTIGO', 1600);
    maullar();
    aparecerGata();
}

/** Partida nueva: hay que volver a comprarla. */
function reiniciarGata() {
    gataComprada = false;
    gata2D = null;
    if (gata3D && grupoNivel) grupoNivel.remove(gata3D.grupo);
    gata3D = null;
}

/** Al empezar cada nivel (y al comprarla): aparece junto al jugador. */
function aparecerGata() {
    if (!gataComprada) { gata2D = null; gata3D = null; return; }
    if (modoRender === '2d') { gata3D = null; crearGata2D(); }
    else { gata2D = null; crearGata3D(); }
}

function maullar() {
    tono(820, 0.09, 'triangle', 0.04, 560);
    setTimeout(() => tono(640, 0.12, 'triangle', 0.035, 420), 90);
}

// --- 2D ------------------------------------------------------------------------
function crearGata2D() {
    gata2D = { x: jugador.x - 40, y: jugador.y + jugador.alto - GATA.alto, ancho: GATA.ancho, alto: GATA.alto,
               vx: 0, vy: 0, dir: 1, enSuelo: false, choca: false, est: 'sigue', cd: 40, presa: null, paso: 0 };
}

function reaparecerGata2D(g) {
    g.x = jugador.x + jugador.ancho / 2 - jugador.dir * 34 - g.ancho / 2;
    g.y = jugador.y + jugador.alto - g.alto - 4;
    g.vx = 0; g.vy = 0; g.est = 'sigue'; g.presa = null;
    fxHumo(g.x + g.ancho / 2, g.y + g.alto / 2, 10, COL.GRIS_CL, 18);
}

function moverGata2D(g, dt) {
    g.choca = false;
    g.x += g.vx * dt;
    let c = candidatas(g.x - 4, g.ancho + 8);
    for (let i = 0; i < c.length; i++) {
        const p = c[i];
        if (!solapan(g, p)) continue;
        if (g.vx > 0) g.x = p.x - g.ancho;
        else if (g.vx < 0) g.x = p.x + p.ancho;
        g.vx = 0; g.choca = true;
    }
    g.enSuelo = false;
    g.y += g.vy * dt;
    c = candidatas(g.x - 4, g.ancho + 8);
    for (let i = 0; i < c.length; i++) {
        const p = c[i];
        if (!solapan(g, p)) continue;
        if (g.vy > 0) { g.y = p.y - g.alto; g.enSuelo = true; }
        else if (g.vy < 0) g.y = p.y + p.alto;
        g.vy = 0;
    }
    g.x = clamp(g.x, 0, longitudNivel - g.ancho);
}

/** El mosquito vivo más cercano al alcance de un salto, o null. */
function presaGata2D(g) {
    const gx = g.x + g.ancho / 2, gy = g.y + g.alto / 2;
    let mejor = null, mejorD = GATA.alcance;
    for (const e of enemigos) {
        if (!e.vivo) continue;
        const ex = e.x + e.ancho / 2, ey = e.y + e.alto / 2;
        if (ey < gy - 150 || ey > gy + 30) continue;
        const d = Math.abs(ex - gx);
        if (d < mejorD) { mejorD = d; mejor = e; }
    }
    return mejor;
}

function actualizarGata2D(dt) {
    const g = gata2D;
    if (!g) return;
    const jx = jugador.x + jugador.ancho / 2;
    if (g.cd > 0) g.cd -= dt;

    // Se quedó muy atrás o se cayó: reaparece junto a ti.
    if (Math.abs(g.x - jugador.x) > GATA.lejos || g.y > ALTO + 200) reaparecerGata2D(g);

    if (g.est === 'salta') {
        const e = g.presa;
        if (e && e.vivo && solapanRect(g.x - 6, g.y - 6, g.ancho + 12, g.alto + 12, e.x, e.y, e.ancho, e.alto)) {
            dañarEnemigo(e, 1, g.dir, -0.5);
            if (e.vivo) { e.aturdido = Math.max(e.aturdido, 40); e.est = 'aturdido'; soltarToken(e); }
            emitirTexto(e.x + e.ancho / 2, e.y - 14, '¡ZAS!', COL.ORO, 13);
            maullar();
            g.presa = null;
        }
        if (g.enSuelo && g.vy >= 0) { g.est = 'sigue'; g.presa = null; }
    } else {
        // La caza: al mosquito que pase bajo y cerca, le salta encima.
        const e = g.enSuelo && g.cd <= 0 ? presaGata2D(g) : null;
        if (e) {
            const ex = e.x + e.ancho / 2, ey = e.y + e.alto / 2;
            const sube = Math.max(30, g.y + g.alto / 2 - ey + 24);
            g.vy = -Math.min(15, Math.sqrt(2 * CFG.grav * sube));
            const t = -g.vy / CFG.grav;
            g.vx = clamp((ex - (g.x + g.ancho / 2)) / Math.max(t, 8), -8, 8);
            g.dir = Math.sign(g.vx) || g.dir;
            g.est = 'salta'; g.presa = e; g.cd = GATA.cd;
        } else {
            // Te sigue un poco por detrás.
            const objetivo = jx - jugador.dir * 46 - g.ancho / 2;
            const dx = objetivo - g.x;
            if (Math.abs(dx) > 14) {
                g.vx = aprox(g.vx, Math.sign(dx) * Math.min(GATA.vel, Math.abs(dx) * 0.08 + 2), 0.6 * dt);
                g.dir = Math.sign(dx);
            } else {
                g.vx *= Math.pow(0.7, dt);
                g.dir = jx > g.x + g.ancho / 2 ? 1 : -1;
            }
            // Salta muros, huecos y hacia donde subiste.
            if (g.enSuelo) {
                const delante = g.vx > 0 ? g.x + g.ancho + 10 : g.x - 10;
                const sinPiso = Math.abs(g.vx) > 1 && !puntoSolido(delante, g.y + g.alto + 8);
                const subiste = jugador.y + jugador.alto < g.y - 30 && Math.abs(dx) < 140;
                if (g.choca || sinPiso || subiste) g.vy = GATA.salto;
            }
        }
    }

    g.vy = Math.min(g.vy + CFG.grav * dt, 18);
    moverGata2D(g, dt);
    g.paso += Math.abs(g.vx) * dt * 0.08;
}

/** La Gorda con formas: cuerpo redondo, cabeza, orejas, cola que se mueve. */
function dibujarGata2D() {
    const g = gata2D;
    if (!g || g.x + g.ancho < camX - 40 || g.x > camX + ANCHO + 40) return;
    const t = performance.now() * 0.001;
    const enAire = !g.enSuelo;
    ctx.save();
    ctx.translate(g.x + g.ancho / 2, g.y + g.alto);
    if (g.dir < 0) ctx.scale(-1, 1);
    if (enAire) ctx.scale(0.92, 1.1);

    const piel = '#9a9aa3', raya = '#6c6c76', panza = '#d9d4cc';
    // Cola
    ctx.strokeStyle = raya; ctx.lineWidth = 5; ctx.lineCap = 'round';
    const ola = Math.sin(t * 4) * 4;
    ctx.beginPath(); ctx.moveTo(-13, -11);
    ctx.quadraticCurveTo(-27, -14 + ola, -22, -27 + ola); ctx.stroke();
    // Patas (se alternan al caminar)
    ctx.fillStyle = raya;
    const p = Math.sin(g.paso * 6) * 2.5;
    for (const [x, d] of [[-10, p], [-4, -p], [5, -p], [11, p]]) ctx.fillRect(x - 2, -6 + (enAire ? -2 : 0), 4, 6 + d * 0.3);
    // Cuerpo, gordo
    ctx.fillStyle = piel;
    ctx.beginPath(); ctx.ellipse(0, -11, 16, 10.5, 0, 0, 6.284); ctx.fill();
    ctx.fillStyle = panza;
    ctx.beginPath(); ctx.ellipse(1, -7.5, 10, 5, 0, 0, 6.284); ctx.fill();
    ctx.fillStyle = raya;
    for (const x of [-8, -3, 2]) ctx.fillRect(x, -21, 2.5, 6);
    // Cabeza
    ctx.fillStyle = piel;
    ctx.beginPath(); ctx.arc(13, -18, 8, 0, 6.284); ctx.fill();
    ctx.beginPath(); ctx.moveTo(7, -23); ctx.lineTo(9, -31); ctx.lineTo(13, -25); ctx.fill();
    ctx.beginPath(); ctx.moveTo(14, -25); ctx.lineTo(19, -31); ctx.lineTo(20, -22); ctx.fill();
    // Ojos (cerrados un instante cada tanto) y nariz
    const parpadea = (t % 3.2) < 0.12;
    ctx.fillStyle = '#c6e94a';
    if (parpadea) { ctx.fillRect(12, -19.5, 3, 1); ctx.fillRect(17, -19.5, 3, 1); }
    else {
        ctx.fillRect(12, -21, 3, 3.5); ctx.fillRect(17, -21, 3, 3.5);
        ctx.fillStyle = '#1b1b1b'; ctx.fillRect(13, -21, 1, 3.5); ctx.fillRect(18, -21, 1, 3.5);
    }
    ctx.fillStyle = '#e88a9a'; ctx.fillRect(19.5, -16.5, 2.5, 2);
    ctx.restore();
}

// --- 3D ------------------------------------------------------------------------
/** Low poly: icosaedros, conos y cilindros con sombreado plano. Frente: +Z. */
function crearModeloGata3D() {
    const g = new THREE.Group();
    // Más oscuros que en 2D: con las luces de la escena, el gris claro sale blanco.
    const piel = new THREE.MeshLambertMaterial({ color: 0x66666f, flatShading: true });
    const raya = new THREE.MeshLambertMaterial({ color: 0x3f3f47, flatShading: true });
    const cuerpo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), piel);
    cuerpo.scale.set(1, 0.78, 1.35);
    cuerpo.position.y = 0.4;
    g.add(cuerpo);
    const cabeza = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 1), piel);
    cabeza.position.set(0, 0.62, 0.55);
    g.add(cabeza);
    for (const s of [-1, 1]) {
        const oreja = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 4), raya);
        oreja.position.set(s * 0.13, 0.86, 0.52);
        g.add(oreja);
        const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), new THREE.MeshBasicMaterial({ color: 0xc6e94a }));
        ojo.position.set(s * 0.1, 0.67, 0.78);
        g.add(ojo);
    }
    const cola = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.65, 5).translate(0, 0.32, 0), raya);
    cola.position.set(0, 0.5, -0.5);
    cola.rotation.x = -0.7;
    g.add(cola);
    const patas = [];
    for (const [x, z] of [[-0.2, 0.32], [0.2, 0.32], [-0.2, -0.3], [0.2, -0.3]]) {
        const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.24, 5), raya);
        pata.position.set(x, 0.12, z);
        g.add(pata);
        patas.push(pata);
    }
    return { grupo: g, cola, patas };
}

function crearGata3D() {
    const m = crearModeloGata3D();
    const cam = camera3D.position;
    const g = { grupo: m.grupo, cola: m.cola, patas: m.patas,
                x: cam.x, z: cam.z, y: sueloBajo(cam.x, cam.z, GATA.radio3D, cam.y - CFG.altoOjos),
                vy: 0, est: 'sigue', cd: 60, presa: null, t: 0, x0: 0, y0: 0, z0: 0, paso: 0 };
    m.grupo.position.set(g.x, g.y, g.z);
    grupoNivel.add(m.grupo);
    gata3D = g;
}

/** A un lado y un poco por delante: así se ve sin tener que voltear. */
function puntoJuntoAlJugador() {
    const cam = camera3D.position;
    const fx = -Math.sin(jugador.yaw), fz = -Math.cos(jugador.yaw);
    const rx = Math.cos(jugador.yaw), rz = -Math.sin(jugador.yaw);
    return { x: cam.x + fx * 1.4 + rx * 1.1, z: cam.z + fz * 1.4 + rz * 1.1 };
}

function reaparecerGata3D(g) {
    const p = puntoJuntoAlJugador(), cam = camera3D.position;
    const libre = !chocaConAltura(p.x, p.z, GATA.radio3D, cam.y - CFG.altoOjos);
    g.x = libre ? p.x : cam.x; g.z = libre ? p.z : cam.z;
    g.y = sueloBajo(g.x, g.z, GATA.radio3D, cam.y - CFG.altoOjos);
    g.vy = 0; g.est = 'sigue'; g.presa = null;
    fxChispas3D(g.x, g.y + 0.4, g.z, 12, 0.8, 0.8, 0.85, 0.05);
}

/** El mosquito más cercano que vuela bajo, a la vista y a su alcance, o null. */
function presaGata3D(g) {
    let mejor = null, mejorD = GATA.alcance3D;
    for (const e of mosquitos3D) {
        if (!e.vivo) continue;
        const p = e.malla.position;
        if (p.y > g.y + GATA.alturaCaza3D) continue;
        const d = Math.hypot(p.x - g.x, p.z - g.z);
        if (d < mejorD && visible3D(g.x, g.z, p.x, p.z)) { mejorD = d; mejor = e; }
    }
    return mejor;
}

function actualizarGata3D(dt) {
    const g = gata3D;
    if (!g) return;
    const cam = camera3D.position;
    if (g.cd > 0) g.cd -= dt;
    if (Math.hypot(cam.x - g.x, cam.z - g.z) > GATA.lejos3D) reaparecerGata3D(g);

    let mirarX = cam.x, mirarZ = cam.z;
    if (g.est === 'salta') {
        // Brinco en arco hacia el mosquito, que se sigue moviendo.
        const e = g.presa;
        g.t += dt / 24;
        const s = Math.min(g.t, 1);
        if (e && e.vivo) {
            const p = e.malla.position;
            g.x = lerp(g.x0, p.x, s); g.z = lerp(g.z0, p.z, s);
            g.y = lerp(g.y0, p.y - 0.4, s) + Math.sin(s * Math.PI) * 0.6;
            mirarX = p.x; mirarZ = p.z;
            if (vGata.set(g.x, g.y + 0.4, g.z).distanceTo(p) < 0.9) {
                dañarMosquito3D(e, 1);
                if (e.vivo) { e.aturdido = Math.max(e.aturdido, 40); e.est = 'aturdido'; }
                maullar();
                g.presa = null;
            }
        }
        if (s >= 1 || !g.presa) { g.est = 'cae'; g.presa = null; }
        if (chocaCirculo(g.x, g.z, GATA.radio3D)) { g.x = g.x0; g.z = g.z0; g.est = 'cae'; }
    } else {
        const e = g.est === 'sigue' && g.cd <= 0 ? presaGata3D(g) : null;
        if (e) {
            g.est = 'salta'; g.presa = e; g.t = 0; g.cd = GATA.cd3D;
            g.x0 = g.x; g.y0 = g.y; g.z0 = g.z;
        } else {
            // Camina junto al jugador; las losas altas la frenan como a ti.
            const p = puntoJuntoAlJugador();
            const dx = p.x - g.x, dz = p.z - g.z, d = Math.hypot(dx, dz);
            if (d > 0.4) {
                const v = Math.min(GATA.vel3D * dt, d);
                const nx = g.x + dx / d * v, nz = g.z + dz / d * v;
                if (!chocaConAltura(nx, g.z, GATA.radio3D, g.y)) g.x = nx;
                if (!chocaConAltura(g.x, nz, GATA.radio3D, g.y)) g.z = nz;
                g.paso += v * 2.2;
                mirarX = p.x; mirarZ = p.z;
            }
        }
        // Gravedad: cae del borde de una losa o al terminar el brinco.
        const suelo = sueloBajo(g.x, g.z, GATA.radio3D, g.y);
        if (g.y > suelo) {
            g.vy -= CFG.gravedad3D * dt;
            g.y = Math.max(suelo, g.y + g.vy * dt);
        } else { g.y = suelo; g.vy = 0; if (g.est === 'cae') g.est = 'sigue'; }
    }

    g.grupo.position.set(g.x, g.y, g.z);
    g.grupo.lookAt(mirarX, g.y, mirarZ);
    g.cola.rotation.z = Math.sin(performance.now() * 0.004) * 0.35;
    for (let i = 0; i < g.patas.length; i++)
        g.patas[i].position.y = 0.12 + Math.max(0, Math.sin(g.paso + i * Math.PI / 2)) * 0.06;
}
