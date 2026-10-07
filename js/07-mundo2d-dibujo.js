"use strict";

// ---------------------------------------------------------------------------
//  8h. MUNDO 2D — dibujo
// ---------------------------------------------------------------------------
const canvas = document.getElementById('canvas2d');
const ctx = canvas.getContext('2d', { alpha: false });
const texturaJugador = new Image();
texturaJugador.src = 'assets/textures/player.png';
let gradCielo = null;

function actualizarCamara2D(dt) {
    const objX = jugador.x + jugador.ancho / 2 - ANCHO * 0.42 + jugador.vx * 16;
    const maxX = Math.max(0, longitudNivel - ANCHO);
    camX = clamp(lerp(camX, clamp(objX, 0, maxX), 0.13 * dt), 0, maxX);

    let objY = 0;
    if (jugador.y > 470) objY = Math.min(190, jugador.y - 470);
    else if (jugador.y < 140) objY = Math.max(-130, jugador.y - 140);
    camY = lerp(camY, objY, 0.07 * dt);
}

function dibujar2D() {
    if (!gradCielo) {
        gradCielo = ctx.createLinearGradient(0, 0, 0, ALTO);
        gradCielo.addColorStop(0,   '#4a90d9');
        gradCielo.addColorStop(0.45,'#87CEEB');
        gradCielo.addColorStop(1,   '#cfe9f5');
    }
    ctx.fillStyle = gradCielo;
    ctx.fillRect(0, 0, ANCHO, ALTO);

    // Sol
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath(); ctx.arc(ANCHO - 130 - camX * 0.03, 92, 46, 0, 6.284); ctx.fill();
    ctx.globalAlpha = 0.25;
    ctx.beginPath(); ctx.arc(ANCHO - 130 - camX * 0.03, 92, 76, 0, 6.284); ctx.fill();
    ctx.restore();

    dibujarNubes();
    dibujarSkyline();

    // --- Mundo desplazado por la cámara (+ sacudida) ------------------------
    ctx.save();
    const sx = sacudida > 0.2 ? (Math.random() - 0.5) * sacudida : 0;
    const sy = sacudida > 0.2 ? (Math.random() - 0.5) * sacudida : 0;
    ctx.translate(Math.round(-camX + sx), Math.round(-camY + sy));

    dibujarPlataformas();
    dibujarCharcos();
    dibujarCriaderos();
    dibujarDecoraciones();
    dibujarBarriles();
    dibujarMonedas();
    if (meta) dibujarMeta();
    if (jefe && !jefe.muerto) dibujarJefe();
    dibujarEnemigos();
    dibujarProyectiles();
    if (!jugador.muerto) dibujarJugador();
    dibujarParticulas();
    dibujarOndas();
    dibujarTextos();

    ctx.restore();
}

function dibujarNubes() {
    const factores = [0.10, 0.22, 0.38];
    ctx.save();
    for (let i = 0; i < nubes.length; i++) {
        const n = nubes[i];
        const f = factores[n.capa];
        const x = n.x - camX * f;
        if (x < -260 || x > ANCHO + 260) continue;
        ctx.globalAlpha = 0.30 + n.capa * 0.22;
        ctx.fillStyle = '#ffffff';
        const y = n.y - camY * f * 0.5;
        ctx.beginPath();
        ctx.ellipse(x, y, n.w * 0.5, n.h * 0.5, 0, 0, 6.284);
        ctx.ellipse(x + n.w * 0.26, y - n.h * 0.18, n.w * 0.33, n.h * 0.42, 0, 0, 6.284);
        ctx.ellipse(x - n.w * 0.27, y + n.h * 0.06, n.w * 0.29, n.h * 0.36, 0, 0, 6.284);
        ctx.fill();
    }
    ctx.restore();
}

/** Silueta de ciudad procedural sin almacenar nada: la altura sale de la propia x. */
function dibujarSkyline() {
    const f = 0.32, base = 452 - camY * f * 0.4;
    ctx.save();
    ctx.globalAlpha = 0.20; ctx.fillStyle = '#1f3b57';
    const inicio = Math.floor((camX * f) / 88) * 88;
    for (let bx = inicio - 88; bx < camX * f + ANCHO + 88; bx += 88) {
        const h = 58 + (Math.sin(bx * 0.0131) * 0.5 + 0.5) * 74 + (Math.sin(bx * 0.041) * 0.5 + 0.5) * 34;
        const x = bx - camX * f;
        ctx.fillRect(x, base - h, 74, h);
        ctx.fillRect(x + 26, base - h - 22, 20, 22);      // tinaco en la azotea
    }
    ctx.restore();
}

function dibujarPlataformas() {
    const c = candidatas(camX - 60, ANCHO + 120);
    for (let i = 0; i < c.length; i++) {
        const p = c[i];
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.ancho, p.alto);
        ctx.fillStyle = p.tope;
        ctx.fillRect(p.x, p.y, p.ancho, 6);
        ctx.fillStyle = 'rgba(0,0,0,0.16)';
        ctx.fillRect(p.x, p.y + p.alto - 5, p.ancho, 5);
        if (p.tipo === 'suelo') {                          // pasto
            ctx.fillStyle = p.tope;
            for (let x = p.x + 7; x < p.x + p.ancho - 4; x += 17)
                ctx.fillRect(x, p.y - 5, 3, 5);
        } else if (p.tipo === 'muro') {                    // juntas de ladrillo
            ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1;
            for (let y = p.y + 16; y < p.y + p.alto; y += 16) {
                ctx.beginPath(); ctx.moveTo(p.x, y); ctx.lineTo(p.x + p.ancho, y); ctx.stroke();
            }
        }
    }
}

// --- Criaderos: la fuente, dibujada como el envase real que es --------------
function dibujarCriaderos() {
    const t = performance.now() * 0.002;
    const cercano = criaderoCercano2D();

    for (const c of criaderos) {
        if (c.x < camX - 260 || c.x > camX + ANCHO + 260) continue;
        const cx = c.x + c.ancho / 2, base = c.y + c.alto;
        const sx = c.sacude > 0 ? (Math.random() - 0.5) * 5 : 0;

        // Radio de vuelo: su descendencia no se aleja de aquí. En la vida real un
        // Aedes aegypti no pasa de ~100 m en toda su vida, así que el mosquito que
        // te pica nació en tu patio o en el de junto.
        if (!c.neutralizado) {
            ctx.save();
            ctx.globalAlpha = 0.085 + Math.sin(t + c.fase) * 0.02;
            ctx.fillStyle = c.activo ? '#16a085' : '#7f8c8d';
            ctx.beginPath(); ctx.arc(cx, base - 14, c.radio, 0, 6.284); ctx.fill();
            ctx.globalAlpha = 0.2;
            ctx.strokeStyle = c.activo ? '#1abc9c' : '#95a5a6';
            ctx.lineWidth = 2; ctx.stroke();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(sx, 0);
        if (c.neutralizado) ctx.globalAlpha = 0.55;
        dibujarEnvase(c, cx, base, t);

        // Agua con larvas: solo mientras produzca.
        if (c.activo && !c.neutralizado) {
            const wy = c.y + c.alto * 0.32;
            ctx.fillStyle = 'rgba(38,166,154,.75)';
            ctx.fillRect(cx - c.ancho * 0.34, wy, c.ancho * 0.68, 5);
            ctx.fillStyle = '#0e3d38';
            for (let i = 0; i < 3; i++) {
                const lx = cx - c.ancho * 0.22 + i * (c.ancho * 0.22);
                ctx.fillRect(lx + Math.sin(t * 3 + i + c.fase) * 3,
                             wy + 1 + Math.cos(t * 2 + i) * 1.5, 4, 2);
            }
        }
        // Vaciado sin tallar: se ve seco, pero los huevos siguen en la línea del agua.
        if (c.vaciado && !c.neutralizado) {
            const wy = c.y + c.alto * 0.32;
            ctx.fillStyle = 'rgba(210,190,130,.95)';
            for (let i = 0; i < 5; i++)
                ctx.fillRect(cx - c.ancho * 0.3 + i * (c.ancho * 0.15), wy, 2, 2);
        }
        ctx.restore();

        ctx.textAlign = 'center';
        if (c.neutralizado) {
            ctx.fillStyle = '#2ecc71'; ctx.font = 'bold 17px Segoe UI';
            ctx.fillText('OK', cx, c.y - 8);
        } else if (c.producidos > 0) {
            ctx.fillStyle = '#e74c3c'; ctx.font = 'bold 11px Segoe UI';
            ctx.fillText('x' + c.producidos, cx, c.y - 7);
        }
        ctx.textAlign = 'left';

        if (c === cercano) dibujarMenuVerbos(c, cx, c.y - 62);
    }
}

/** El aviso de los cuatro verbos. Nunca dice cuál toca: eso es lo que se aprende. */
function dibujarMenuVerbos(c, cx, cy) {
    const orden = ['lava', 'tapa', 'voltea', 'tira'];
    const w = 236, h = 52;
    ctx.save();
    ctx.fillStyle = 'rgba(12,20,28,.9)';
    ctx.strokeStyle = '#1abc9c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(cx - w / 2, cy - h, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ecf0f1'; ctx.font = 'bold 12px Segoe UI'; ctx.textAlign = 'center';
    ctx.fillText(CRIADEROS[c.tipo].nombre, cx, cy - h + 16);
    ctx.font = 'bold 11px Segoe UI';
    for (let i = 0; i < 4; i++) {
        const v = VERBOS[orden[i]];
        ctx.fillStyle = v.color;
        ctx.fillText((i + 1) + ' ' + v.nombre, cx - w / 2 + 30 + i * 57, cy - 13);
    }
    ctx.textAlign = 'left';
    ctx.restore();
}

/** Cada envase con su silueta: reconocerlo es media lección. */
function dibujarEnvase(c, cx, base, t) {
    const w = c.ancho, h = c.alto, x = c.x, y = c.y;
    switch (c.tipo) {
        case 'tinaco':
        case 'tambo':
            ctx.fillStyle = c.tipo === 'tinaco' ? '#2c3e50' : '#7f6a3d';
            ctx.fillRect(x, y + 4, w, h - 4);
            ctx.fillStyle = c.tipo === 'tinaco' ? '#34495e' : '#96803f';
            ctx.beginPath(); ctx.ellipse(cx, y + 5, w / 2, 7, 0, 0, 6.284); ctx.fill();
            if (c.neutralizado) {                       // tapado
                ctx.fillStyle = '#bdc3c7'; ctx.fillRect(x - 3, y - 3, w + 6, 9);
            }
            break;
        case 'cisterna':
            ctx.fillStyle = '#4a3f35'; ctx.fillRect(x, y + 8, w, h - 8);
            ctx.fillStyle = '#5d5147'; ctx.fillRect(x - 4, y + 2, w + 8, 8);
            if (c.neutralizado) { ctx.fillStyle = '#bdc3c7'; ctx.fillRect(x - 6, y - 4, w + 12, 10); }
            break;
        case 'cubeta':
            ctx.fillStyle = c.neutralizado ? '#7f8c8d' : '#2980b9';
            ctx.beginPath();
            if (c.neutralizado) {                       // volteada, boca abajo
                ctx.moveTo(x + 4, y); ctx.lineTo(x + w - 4, y);
                ctx.lineTo(x + w, base); ctx.lineTo(x, base);
            } else {
                ctx.moveTo(x, y); ctx.lineTo(x + w, y);
                ctx.lineTo(x + w - 4, base); ctx.lineTo(x + 4, base);
            }
            ctx.closePath(); ctx.fill();
            break;
        case 'maceta':
            ctx.fillStyle = c.neutralizado ? '#7f8c8d' : '#b1552f';
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(x + w, y);
            ctx.lineTo(x + w - 5, base); ctx.lineTo(x + 5, base);
            ctx.closePath(); ctx.fill();
            break;
        case 'carretilla':
            ctx.fillStyle = c.neutralizado ? '#7f8c8d' : '#c0392b';
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(x + w, y + 3);
            ctx.lineTo(x + w - 8, base - 6); ctx.lineTo(x + 6, base - 6);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#22282e';
            ctx.beginPath(); ctx.arc(x + 12, base - 3, 6, 0, 6.284); ctx.fill();
            break;
        case 'llanta':
            if (c.neutralizado) break;                  // tirada: ya no está en el patio
            ctx.fillStyle = '#22282e';
            ctx.beginPath(); ctx.ellipse(cx, y + h * 0.55, w / 2, h * 0.42, 0, 0, 6.284); ctx.fill();
            ctx.fillStyle = '#141a1f';
            ctx.beginPath(); ctx.ellipse(cx, y + h * 0.55, w * 0.24, h * 0.2, 0, 0, 6.284); ctx.fill();
            break;
        case 'botella':
            if (c.neutralizado) break;                  // tirada
            ctx.fillStyle = 'rgba(120,190,140,.85)';
            ctx.fillRect(x + w * 0.22, y, w * 0.56, h * 0.72);
            ctx.fillRect(x + w * 0.38, y - 8, w * 0.24, 10);
            ctx.fillStyle = 'rgba(90,150,110,.9)';
            ctx.fillRect(x + w * 0.04, base - 12, w * 0.4, 12);
            break;
        case 'florero':
            ctx.fillStyle = c.neutralizado ? '#95a5a6' : '#8e6fb5';
            ctx.beginPath();
            ctx.moveTo(x + w * 0.28, y); ctx.lineTo(x + w * 0.72, y);
            ctx.quadraticCurveTo(x + w, y + h * 0.6, cx, base);
            ctx.quadraticCurveTo(x, y + h * 0.6, x + w * 0.28, y);
            ctx.fill();
            ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx - 5, y - 15); ctx.stroke();
            break;
        case 'bebedero':
            ctx.fillStyle = c.neutralizado ? '#95a5a6' : '#d35400';
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(x + w, y);
            ctx.lineTo(x + w - 6, base); ctx.lineTo(x + 6, base);
            ctx.closePath(); ctx.fill();
            break;
        default:
            ctx.fillStyle = '#16a085'; ctx.fillRect(x, y, w, h);
    }
}

function dibujarCharcos() {
    const t = performance.now() * 0.002;
    for (const c of charcos) {
        if (c.x + c.ancho < camX - 60 || c.x > camX + ANCHO + 60) continue;
        ctx.save();
        ctx.globalAlpha = 0.72;
        ctx.fillStyle = '#2a7f8f';
        ctx.beginPath();
        ctx.ellipse(c.x + c.ancho / 2, c.y + 6, c.ancho / 2, 9, 0, 0, 6.284);
        ctx.fill();
        ctx.globalAlpha = 0.35; ctx.fillStyle = '#9fe8f5';
        for (let i = 0; i < 4; i++) {
            const ox = Math.sin(t + c.fase + i * 1.7) * c.ancho * 0.28;
            ctx.fillRect(c.x + c.ancho / 2 + ox - 12, c.y + 3 + i, 24, 1.6);
        }
        ctx.restore();
    }
}

function dibujarDecoraciones() {
    const t = performance.now() * 0.0016;
    for (const d of decoraciones) {
        if (d.x < camX - 90 || d.x > camX + ANCHO + 90) continue;
        if (d.tipo === 'arbusto') {
            ctx.fillStyle = '#1e6b41';
            ctx.beginPath();
            ctx.ellipse(d.x, d.y - 12, 24, 16, Math.sin(t + d.fase) * 0.04, 0, 6.284);
            ctx.ellipse(d.x - 16, d.y - 7, 15, 11, 0, 0, 6.284);
            ctx.ellipse(d.x + 16, d.y - 7, 15, 11, 0, 0, 6.284);
            ctx.fill();
        } else if (d.tipo === 'llanta') {
            ctx.fillStyle = '#22282e';
            ctx.beginPath(); ctx.ellipse(d.x, d.y - 13, 22, 14, 0, 0, 6.284); ctx.fill();
            ctx.fillStyle = '#2a7f8f';
            ctx.beginPath(); ctx.ellipse(d.x, d.y - 13, 11, 6, 0, 0, 6.284); ctx.fill();
        } else if (d.tipo === 'cubeta') {
            ctx.fillStyle = '#2980b9';
            ctx.beginPath(); ctx.moveTo(d.x - 15, d.y - 30); ctx.lineTo(d.x + 15, d.y - 30);
            ctx.lineTo(d.x + 11, d.y); ctx.lineTo(d.x - 11, d.y); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#2a7f8f'; ctx.fillRect(d.x - 13, d.y - 26, 26, 5);
        } else if (d.tipo === 'cartel') {
            ctx.fillStyle = '#6d4c2f'; ctx.fillRect(d.x - 3, d.y - 60, 6, 60);
            ctx.fillStyle = '#f1c40f'; ctx.fillRect(d.x - 62, d.y - 96, 124, 40);
            ctx.fillStyle = '#1b2430'; ctx.font = 'bold 12px Segoe UI'; ctx.textAlign = 'center';
            ctx.fillText('ELIMINA', d.x, d.y - 80);
            ctx.fillText('CRIADEROS', d.x, d.y - 66);
            ctx.textAlign = 'left';
        }
    }
}

function dibujarBarriles() {
    for (const b of barriles) {
        if (b.x < camX - 60 || b.x > camX + ANCHO + 60) continue;
        const parpadeo = b.fusible > 0 && Math.floor(b.fusible / 2) % 2 === 0;
        ctx.fillStyle = parpadeo ? '#ffffff' : '#b34a1f';
        ctx.fillRect(b.x, b.y, b.ancho, b.alto);
        ctx.fillStyle = parpadeo ? '#ffe08a' : '#8a3616';
        ctx.fillRect(b.x, b.y + 8, b.ancho, 4);
        ctx.fillRect(b.x, b.y + b.alto - 12, b.ancho, 4);
        ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 15px Segoe UI'; ctx.textAlign = 'center';
        ctx.fillText('☣', b.x + b.ancho / 2, b.y + 25);
        ctx.textAlign = 'left';
    }
}

function dibujarMonedas() {
    for (const m of monedas) {
        if (m.x < camX - 40 || m.x > camX + ANCHO + 40) continue;
        const bob = Math.sin(m.fase * 3) * 3.5;
        const anchoM = Math.abs(Math.cos(m.fase * 2)) * m.r + 2;   // giro sobre su eje
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath(); ctx.ellipse(m.x, m.y + bob, anchoM, m.r, 0, 0, 6.284); ctx.fill();
        ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.fillRect(m.x - anchoM * 0.3, m.y + bob - 4, Math.max(1, anchoM * 0.3), 5);
    }
}

function dibujarMeta() {
    const t = meta.t * 0.05;
    const cx = meta.x + meta.ancho / 2, cy = meta.y + meta.alto / 2;
    ctx.save();
    ctx.globalAlpha = 0.30 + Math.sin(t) * 0.12;
    ctx.fillStyle = '#9b59b6';
    ctx.beginPath(); ctx.arc(cx, cy, 62 + Math.sin(t * 1.4) * 7, 0, 6.284); ctx.fill();
    ctx.restore();
    const abierta = criaderosVivos() === 0;
    ctx.fillStyle = '#4a235a'; ctx.fillRect(meta.x - 6, meta.y - 6, meta.ancho + 12, meta.alto + 6);
    ctx.fillStyle = abierta ? '#8e44ad' : '#3d3d46';
    ctx.fillRect(meta.x, meta.y, meta.ancho, meta.alto);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 5; i++) {
        const yy = meta.y + 8 + ((t * 24 + i * 18) % (meta.alto - 14));
        ctx.globalAlpha = 0.5;
        ctx.fillRect(meta.x + 6, yy, meta.ancho - 12, 3);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = abierta ? '#f1c40f' : '#95a5a6';
    ctx.font = 'bold 13px Segoe UI'; ctx.textAlign = 'center';
    ctx.fillText(abierta ? 'SALIDA' : 'CIERRA LOS CRIADEROS', cx, meta.y - 16);
    ctx.textAlign = 'left';
}

function dibujarJefe() {
    const cx = jefe.x + jefe.ancho / 2, cy = jefe.y + jefe.alto / 2;
    const t = jefe.t * 0.04;
    const f2 = jefe.fase === 2;

    // Carril de la embestida: el aviso tiene que verse ANTES, no durante.
    if (jefe.telegrafiaT > 0) {
        const p = 1 - jefe.telegrafiaT / 40;
        ctx.save();
        ctx.globalAlpha = 0.18 + p * 0.30;
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(jefe.x0, jefe.embisteY - 30, jefe.x1 - jefe.x0, 60);
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = '#ff5252'; ctx.lineWidth = 2;
        ctx.setLineDash([14, 10]); ctx.lineDashOffset = -jefe.t * 2;
        ctx.beginPath();
        ctx.moveTo(jefe.x0, jefe.embisteY); ctx.lineTo(jefe.x1, jefe.embisteY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    // Escudo (solo mientras exista): en fase 2 se dibuja agrietado.
    if (jefe.escudo) {
        ctx.save();
        ctx.globalAlpha = 0.28 + Math.sin(t * 2) * 0.10;
        ctx.fillStyle = '#1abc9c';
        ctx.beginPath(); ctx.arc(cx, cy, 86, 0, 6.284); ctx.fill();
        ctx.globalAlpha = 0.8; ctx.strokeStyle = '#7bed9f'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, 86, t, t + 2.2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, 86, t + 3.14, t + 5.34); ctx.stroke();
        ctx.restore();
    }

    const aturdido = jefe.aturdido > 0;
    ctx.save();
    if (aturdido) {                                  // se tambalea tras el choque
        ctx.translate(cx, cy);
        ctx.rotate(Math.sin(jefe.t * 0.5) * 0.10);
        ctx.translate(-cx, -cy);
    }
    ctx.fillStyle = jefe.flash > 0 ? '#ffffff' : (f2 ? '#4a1210' : '#7b241c');
    ctx.fillRect(jefe.x, jefe.y, jefe.ancho, jefe.alto);
    ctx.fillStyle = jefe.flash > 0 ? '#ffffff' : (f2 ? '#8e2b22' : '#c0392b');
    ctx.fillRect(jefe.x + 8, jefe.y + 8, jefe.ancho - 16, jefe.alto - 16);

    // En fase 2 la coraza está rota y se ve el núcleo latir por las grietas.
    if (f2) {
        ctx.strokeStyle = 'rgba(255,120,60,.85)'; ctx.lineWidth = 2.5;
        for (let i = 0; i < 4; i++) {
            const y0 = jefe.y + 16 + i * 22;
            ctx.beginPath();
            ctx.moveTo(jefe.x + 6, y0);
            ctx.lineTo(cx + Math.sin(i * 2.1) * 16, y0 + 9);
            ctx.lineTo(jefe.x + jefe.ancho - 6, y0 + 3);
            ctx.stroke();
        }
    }

    // Núcleo pulsante: más grande y más brillante cuando está expuesto.
    const r = (f2 ? 24 : 18) + Math.sin(t * (f2 ? 5 : 3)) * (f2 ? 6 : 4);
    ctx.fillStyle = f2 ? '#ff7043' : '#f1c40f';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.284); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - 4, cy - 4, r * 0.35, 0, 6.284); ctx.fill();
    ctx.restore();

    if (aturdido) {
        ctx.fillStyle = '#f1c40f'; ctx.font = '15px Segoe UI'; ctx.textAlign = 'center';
        for (let i = 0; i < 3; i++) {
            const a = jefe.t * 0.12 + i * 2.1;
            ctx.fillText('✦', cx + Math.cos(a) * 34, jefe.y - 12 + Math.sin(a) * 7);
        }
        ctx.textAlign = 'left';
    }

    // Barra de vida con la marca del cambio de fase a la mitad. El jefe flota
    // alto, así que la barra se ancla por debajo del HUD en vez de encimarse:
    // camY + 78 es el primer renglón libre bajo los marcadores de arriba.
    const bw = 180;
    const barY = Math.max(jefe.y - 34, camY + 78);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(cx - bw / 2 - 2, barY, bw + 4, 14);
    ctx.fillStyle = f2 ? '#e74c3c' : '#c0392b';
    ctx.fillRect(cx - bw / 2, barY + 2, bw * (jefe.vida / jefe.vidaMax), 10);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillRect(cx - 1, barY, 2, 14);                       // marca del 50 %
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Segoe UI'; ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.lineWidth = 3;
    const etiqueta = 'NÚCLEO MUTANTE · FASE ' + jefe.fase + (f2 ? ' · EXPUESTO' : '');
    ctx.strokeText(etiqueta, cx, barY - 6);
    ctx.fillText(etiqueta, cx, barY - 6);
    ctx.textAlign = 'left';
}

function dibujarEnemigos() {
    const t = performance.now() * 0.001;
    for (const e of enemigos) {
        if (!e.vivo) continue;
        if (e.x + e.ancho < camX - 60 || e.x > camX + ANCHO + 60) continue;
        const cx = e.x + e.ancho / 2, cy = e.y + e.alto / 2;
        const s = e.escala;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(s, s);

        // Aviso de telegrafía: aro que se cierra alrededor del enemigo.
        if (e.est === 'telegrafia') {
            const p = 1 - e.cargaT / e.arq.carga;
            ctx.globalAlpha = 0.75;
            ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0, 0, 46 - p * 22, -1.57, -1.57 + p * 6.284); ctx.stroke();
            ctx.globalAlpha = 1;
        }
        // Alas (aleteo rápido con seno)
        if (e.arq.vuela) {
            const al = Math.sin(t * 22 + e.fase) * 0.55 + 1;
            ctx.fillStyle = 'rgba(255,255,255,.55)';
            ctx.beginPath();
            ctx.ellipse(-e.ancho * 0.3, -e.alto * 0.55, e.ancho * 0.30, e.alto * 0.42 * al, -0.5, 0, 6.284);
            ctx.ellipse( e.ancho * 0.3, -e.alto * 0.55, e.ancho * 0.30, e.alto * 0.42 * al,  0.5, 0, 6.284);
            ctx.fill();
        }
        // Cuerpo
        const flash = e.flash > 0 || (e.est === 'telegrafia' && Math.floor(e.cargaT / 3) % 2 === 0);
        ctx.fillStyle = flash ? '#ffffff' : e.arq.color;
        ctx.fillRect(-e.ancho / 2, -e.alto / 2, e.ancho, e.alto);
        {
            // Trompa (el aparato picador del Aedes)
            ctx.fillStyle = flash ? '#fff' : '#2c1810';
            ctx.fillRect(e.dirX >= 0 ? e.ancho / 2 : -e.ancho / 2 - 9, -2, 9, 3);
            // Rayas del Aedes, teñidas con el serotipo que porta. Leer el color
            // es saber si ya eres inmune a ese virus o si te va a costar caro.
            const st = SEROTIPOS[e.serotipo] || SEROTIPOS[1];
            const yaInmune = jugador.inmunes[e.serotipo];
            ctx.fillStyle = yaInmune ? 'rgba(255,255,255,.55)' : st.color;
            ctx.fillRect(-e.ancho / 2 + 3, -e.alto / 2 + 4, e.ancho - 6, 2);
            ctx.fillRect(-e.ancho / 2 + 3, -e.alto / 2 + 9, e.ancho - 6, 2);
            if (yaInmune) {                       // ya no puede contagiarte
                ctx.globalAlpha = 0.5;
                ctx.strokeStyle = '#1abc9c'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(0, 0, e.ancho * 0.8, 0, 6.284); ctx.stroke();
                ctx.globalAlpha = 1;
            }
            // Ojos
            ctx.fillStyle = e.aturdido > 0 ? '#f1c40f' : '#ffffff';
            ctx.fillRect(-6, -e.alto / 2 + 2, 4, 4);
            ctx.fillRect( 2, -e.alto / 2 + 2, 4, 4);
        }
        ctx.restore();

        // Estrellitas de aturdido
        if (e.aturdido > 0) {
            ctx.fillStyle = '#f1c40f'; ctx.font = '13px Segoe UI'; ctx.textAlign = 'center';
            for (let i = 0; i < 3; i++) {
                const a = t * 4 + i * 2.1;
                ctx.fillText('✦', cx + Math.cos(a) * 17, e.y - 8 + Math.sin(a) * 5);
            }
            ctx.textAlign = 'left';
        }
        // Barra de vida solo si está dañado
        if (e.vida < e.vidaMax) {
            ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(e.x - 1, e.y - 9, e.ancho + 2, 5);
            ctx.fillStyle = '#e74c3c'; ctx.fillRect(e.x, e.y - 8, e.ancho * (e.vida / e.vidaMax), 3);
        }
    }
}

function dibujarProyectiles() {
    for (const p of proyectiles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.fillStyle = PALETA[p.col];
        if (p.pareable) {
            // Los proyectiles pareables tienen un halo distintivo: se leen de un vistazo.
            ctx.globalAlpha = 0.35;
            ctx.beginPath(); ctx.arc(0, 0, p.ancho * 1.15, 0, 6.284); ctx.fill();
            ctx.globalAlpha = 1;
        }
        ctx.fillRect(-p.ancho / 2, -p.alto / 2, p.ancho, p.alto);
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        ctx.fillRect(-p.ancho / 2 + 2, -p.alto / 2 + 2, p.ancho * 0.35, p.alto * 0.3);
        ctx.restore();
    }
}

function dibujarJugador() {
    if (jugador.parpadeo) return;
    const cx = jugador.x + jugador.ancho / 2, cy = jugador.y + jugador.alto / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(jugador.rotVis);
    ctx.scale(jugador.escX, jugador.escY);

    const w = jugador.ancho, h = jugador.alto;
    if (texturaJugador && texturaJugador.complete && texturaJugador.naturalWidth > 0) {
        ctx.save();
        ctx.translate(-w / 2, -h / 2);
        const escala = Math.min(w / texturaJugador.width, h / texturaJugador.height);
        const iw = texturaJugador.width * escala;
        const ih = texturaJugador.height * escala;
        ctx.drawImage(texturaJugador, (w - iw) / 2, (h - ih) / 2, iw, ih);
        ctx.restore();
    } else {
        // Cuerpo
        ctx.fillStyle = jugador.dashT > 0 ? '#7fdbff' : '#2e86de';
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.fillStyle = '#54a0ff';
        ctx.fillRect(-w / 2, -h / 2, w, 8);
        // Gorra
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(-w / 2 - 2, -h / 2 - 6, w + 4, 7);
        ctx.fillRect(jugador.dir > 0 ? 0 : -w / 2 - 8, -h / 2 - 5, w / 2 + 8, 4);
        // Ojo
        ctx.fillStyle = '#fff';
        ctx.fillRect(jugador.dir > 0 ? 2 : -8, -h / 2 + 12, 6, 6);
        ctx.fillStyle = '#111';
        ctx.fillRect(jugador.dir > 0 ? 4 : -6, -h / 2 + 14, 3, 3);
    }
    ctx.restore();

    if (jugador.raquetaT > 0) dibujarRaqueta2D(cx, cy);

    // Aro de parry: la ventana activa es visible, por eso el timing es justo.
    if (jugador.parryT > 0) {
        const p = jugador.parryT / CFG.parryActivo;
        ctx.save();
        ctx.globalAlpha = 0.35 + p * 0.5;
        ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 3 + p * 3;
        ctx.beginPath(); ctx.arc(cx, cy, CFG.parryRadio * (0.55 + (1 - p) * 0.5), 0, 6.284); ctx.stroke();
        ctx.restore();
    }
    // Recovery de parry fallido
    if (jugador.parryRecovery > 0) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#e74c3c'; ctx.font = 'bold 11px Segoe UI'; ctx.textAlign = 'center';
        ctx.fillText('×', cx, jugador.y - 8);
        ctx.textAlign = 'left';
        ctx.restore();
    }
}

/** Dos pasadas: normal y aditiva. Agrupar por modo de mezcla evita
 *  cientos de cambios de estado del contexto por frame. */
function dibujarParticulas() {
    let colAct = -1;
    ctx.save();
    for (let i = 0; i < Part.n; i++) {
        const tp = Part.tipo[i];
        if (tp === TP.BRILLO || tp === TP.ESTELA) continue;
        const t = Part.vida[i] / Part.vidaMax[i];
        const c = Part.col[i];
        if (c !== colAct) { ctx.fillStyle = PALETA[c]; colAct = c; }
        const x = Part.x[i], y = Part.y[i];
        if (tp === TP.HUMO) {
            ctx.globalAlpha = t * 0.42;
            const r = Part.tam[i] * (1.6 - t * 0.6);
            ctx.beginPath(); ctx.arc(x, y, r, 0, 6.284); ctx.fill();
        } else if (tp === TP.CIRCULO) {
            ctx.globalAlpha = t;
            ctx.beginPath(); ctx.arc(x, y, Part.tam[i] * t, 0, 6.284); ctx.fill();
        } else {
            ctx.globalAlpha = t;
            const s = Part.tam[i] * (0.4 + t * 0.6);
            if (Part.vrot[i] !== 0) {
                ctx.save(); ctx.translate(x, y); ctx.rotate(Part.rot[i]);
                ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore();
            } else ctx.fillRect(x - s / 2, y - s / 2, s, s);
        }
    }
    // Pasada aditiva: cuadrados con 'lighter' leen como destellos y cuestan
    // una fracción de lo que costaría un gradiente radial por partícula.
    ctx.globalCompositeOperation = 'lighter';
    colAct = -1;
    for (let i = 0; i < Part.n; i++) {
        const tp = Part.tipo[i];
        if (tp !== TP.BRILLO && tp !== TP.ESTELA) continue;
        const t = Part.vida[i] / Part.vidaMax[i];
        const c = Part.col[i];
        if (c !== colAct) { ctx.fillStyle = PALETA[c]; colAct = c; }
        ctx.globalAlpha = t * 0.8;
        const s = Part.tam[i] * t;
        ctx.fillRect(Part.x[i] - s / 2, Part.y[i] - s / 2, s, s);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
}

function dibujarOndas() {
    ctx.save();
    for (let i = 0; i < ondas.n; i++) {
        const t = 1 - ondas.r[i] / ondas.rMax[i];
        ctx.globalAlpha = t * 0.85;
        ctx.strokeStyle = PALETA[ondas.col[i]];
        ctx.lineWidth = Math.max(1, ondas.gro[i] * t);
        ctx.beginPath(); ctx.arc(ondas.x[i], ondas.y[i], ondas.r[i], 0, 6.284); ctx.stroke();
    }
    ctx.restore();
}

function dibujarTextos() {
    ctx.save();
    ctx.textAlign = 'center';
    for (let i = 0; i < textos.n; i++) {
        const t = textos.vida[i] / textos.vidaMax[i];
        ctx.globalAlpha = Math.min(1, t * 2);
        ctx.font = 'bold ' + textos.tam[i] + 'px Segoe UI';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.75)';
        ctx.strokeText(textos.txt[i], textos.x[i], textos.y[i]);
        ctx.fillStyle = PALETA[textos.col[i]];
        ctx.fillText(textos.txt[i], textos.x[i], textos.y[i]);
    }
    ctx.restore();
    ctx.textAlign = 'left';
}


/** La raqueta eléctrica: mango, marco y rejilla, barriendo un arco al frente.
 *  El swing dura más que la ventana activa a propósito — se ve terminar el
 *  gesto aunque el parry ya haya cerrado, y así el golpe se lee como un golpe. */
function dibujarRaqueta2D(cx, cy) {
    const p = 1 - jugador.raquetaT / CFG.raquetaSwing;      // 0 -> 1
    const e = 1 - Math.pow(1 - p, 3);                        // salida suavizada
    const ang = lerp(-2.05, 1.0, e);
    const activa = jugador.parryT > 0;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(jugador.dir, 1);
    ctx.rotate(ang);

    // Estela del barrido: dice por dónde acaba de pasar la rejilla.
    ctx.globalAlpha = 0.20 * (1 - p);
    ctx.fillStyle = '#1abc9c';
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.arc(0, 0, 46, -0.55, 0.55);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;

    // Mango
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(24, 0); ctx.stroke();

    // Marco
    ctx.strokeStyle = activa ? '#f1c40f' : '#16a085';
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.ellipse(36, 0, 15, 12, 0, 0, 6.284); ctx.stroke();

    // Rejilla: tres por cuatro, lo justo para que se lea como raqueta.
    ctx.strokeStyle = activa ? 'rgba(255,255,255,.95)' : 'rgba(180,230,220,.55)';
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(36 + i * 7, -10); ctx.lineTo(36 + i * 7, 10); ctx.stroke();
    }
    for (let i = -1; i <= 2; i++) {
        ctx.beginPath(); ctx.moveTo(23, i * 5 - 2); ctx.lineTo(49, i * 5 - 2); ctx.stroke();
    }

    // Chispa en la rejilla mientras la ventana está abierta.
    if (activa && Math.random() < 0.75) {
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6;
        const y0 = rndRango(-9, 9);
        ctx.beginPath();
        ctx.moveTo(25, y0);
        ctx.lineTo(33, y0 + rndRango(-4, 4));
        ctx.lineTo(41, y0 + rndRango(-4, 4));
        ctx.lineTo(48, y0 + rndRango(-3, 3));
        ctx.stroke();
    }
    ctx.restore();
}
