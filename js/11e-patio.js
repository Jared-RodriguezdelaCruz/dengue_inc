"use strict";

// ---------------------------------------------------------------------------
//  10e. MODO PATIO — inspeccionar una casa de Aguascalientes
//
//  Sin enemigos, sin dash, sin jefe: una casa con su azotea y su patio, diez
//  envases y un reloj. Es lo más parecido a lo que el juego quiere que hagas el
//  fin de semana en tu casa. La regla de las cuatro medidas es la misma de la
//  partida (resultadoVerbo, 11b) y el dibujo de cada envase también
//  (dibujarEnvase, 07): lo que se aprende aquí vale allá, y al revés.
// ---------------------------------------------------------------------------

const PATIO_ESCALA = 1.5;
const PATIO_REVIVE = 240;            // frames: lo vaciado sin tallar vuelve en ~4 s
// Dónde está cada envase: [tipo, centro x, base y]. Unos a la vista y otros
// donde de verdad se olvidan: el florero en la ventana, el plato bajo la planta,
// el bebedero junto a la casita del perro, la cisterna a ras de piso.
const PATIO_SITIOS = [
    ['tinaco', 215, 140], ['tambo', 335, 140],
    ['florero', 503, 298],
    ['maceta', 170, 496], ['cisterna', 405, 498],
    ['carretilla', 610, 498], ['cubeta', 690, 497],
    ['llanta', 768, 498], ['botella', 838, 497], ['bebedero', 905, 498]
];

let patio = null;

/** Pantalla de entrada: qué es y cómo se juega. */
function abrirPatio() {
    audio();                                    // desbloquea WebAudio con este clic
    mostrarMenu({
        titulo: 'Modo Patio',
        desc: 'Una casa de Aguascalientes, con su azotea y su patio. Hay <b>diez criaderos</b>: ' +
              'encuéntralos y ciérralos con la medida correcta. Sin mosquitos, contra reloj.<br><br>' +
              '<b>Ratón:</b> apunta a un envase y elige la medida con clic o con <b>1-4</b>. ' +
              '<b>Teclado o mando:</b> ← → para cambiar de envase, 1-4 (o la cruceta) para la medida. ' +
              '<b>Esc</b> para salir.<br><br>' +
              '<span style="color:#90a4ae;font-size:13px">Ojo: vaciar algo que había que tirar o tallar ' +
              'se ve bien… hasta que los huevos vuelven a eclosionar.</span>',
        boton: 'Empezar', accion: empezarPatio,
        boton2: 'Volver', accion2: menuPrincipal
    });
}

function empezarPatio() {
    ocultarMenu();
    patio = { objs: [], sel: 0, t: 0, cerrados: 0, errores: 0, trampas: 0, fin: false,
              textos: [], cajas: [], rx: ratonX, ry: ratonY };
    for (const s of PATIO_SITIOS) {
        const d = CRIADEROS[s[0]];
        const w = d.ancho * PATIO_ESCALA, h = d.alto * PATIO_ESCALA;
        // x/y en 0: dibujarEnvase dibuja en coordenadas locales y aquí se escala.
        patio.objs.push({ tipo: s[0], verbo: d.verbo, x: 0, y: 0, ancho: d.ancho, alto: d.alto,
                          px: s[1] - w / 2, py: s[2] - h, w: w, h: h,
                          activo: true, neutralizado: false, vaciado: false, tRevive: 0 });
    }
    estado = estados.PATIO;
    if (document.pointerLockElement) document.exitPointerLock();
    canvas.style.display = 'block';
    document.getElementById('container3d').style.display = 'none';
    document.getElementById('crosshair').style.display = 'none';
    contenedor.classList.add('modo-patio');
    objetivo('Encuentra y cierra los 10 criaderos',
             'Apunta a un envase y elige su medida (1-4). Esc para salir.');
}

function salirPatio() {
    patio = null;
    contenedor.classList.remove('modo-patio');
    if (modoRender === '3d') {                   // el menú vuelve sobre lo que había
        canvas.style.display = 'none';
        document.getElementById('container3d').style.display = 'block';
    }
    objetivo('', '');
    menuPrincipal();
}

// --- Lógica ------------------------------------------------------------------
function patioTexto(txt, o, color) {
    patio.textos.push({ txt: txt, x: o.px + o.w / 2, y: o.py - 8, t: 70, color: color });
}

function verboPatio(o, verbo) {
    if (!o || o.neutralizado || patio.fin) return;
    const r = resultadoVerbo(o.verbo, verbo);
    if (r === 'ok') {
        o.neutralizado = true; o.activo = false; o.vaciado = false;
        patio.cerrados++;
        patioTexto('✔ ' + VERBOS[verbo].nombre, o, VERBOS[verbo].color);
        destellar(VERBOS[verbo].color, 0.18, 260);
        sfx.nivel();
        if (patio.cerrados === patio.objs.length) terminarPatio();
        else siguientePatio(1);
    } else if (r === 'trampa') {
        o.activo = false; o.vaciado = true; o.tRevive = PATIO_REVIVE;
        patio.trampas++;
        patioTexto('¿listo?', o, '#bdc3c7');
        aviso('EL AGUA SE FUE… ESO PARECE', 1500);
        sfx.moneda();
    } else {
        patio.errores++;
        patioTexto('✗', o, '#e74c3c');
        aviso(explicarVerbo(o), 2300);
        sfx.parryFail(); sacudir(3);
    }
}

/** Pasa la selección al siguiente envase sin cerrar (dir = 1 o -1). */
function siguientePatio(dir) {
    const abiertos = patio.objs.map((o, i) => i).filter(i => !patio.objs[i].neutralizado)
                               .sort((a, b) => patio.objs[a].px - patio.objs[b].px);
    if (!abiertos.length) return;
    const k = abiertos.indexOf(patio.sel);
    patio.sel = k < 0 ? abiertos[0] : abiertos[(k + dir + abiertos.length) % abiertos.length];
}

function objetoBajo(x, y) {
    for (let i = patio.objs.length - 1; i >= 0; i--) {
        const o = patio.objs[i];
        if (o.neutralizado) continue;
        if (x >= o.px - 8 && x <= o.px + o.w + 8 && y >= o.py - 8 && y <= o.py + o.h + 8) return i;
    }
    return -1;
}

function actualizarPatio(dt) {
    if (!patio) return;
    if (!patio.fin) patio.t += dt / 60;

    for (const o of patio.objs) {
        if (!o.vaciado || o.neutralizado) continue;
        o.tRevive -= dt;
        if (o.tRevive <= 0) {
            o.vaciado = false; o.activo = true;
            patioTexto('¡revivió!', o, '#2ecc71');
            aviso('REVIVIÓ · LOS HUEVOS SEGUÍAN PEGADOS A LA PARED', 1900);
            sfx.parryFail();
        }
    }
    for (let i = patio.textos.length - 1; i >= 0; i--) {
        const tx = patio.textos[i];
        tx.t -= dt; tx.y -= 0.5 * dt;
        if (tx.t <= 0) patio.textos.splice(i, 1);
    }
    if (patio.fin) return;

    // Ratón: apuntar selecciona; clic en una medida la aplica.
    if (ratonX !== patio.rx || ratonY !== patio.ry) {
        patio.rx = ratonX; patio.ry = ratonY;
        const i = objetoBajo(ratonX, ratonY);
        if (i >= 0) patio.sel = i;
    }
    if (ratonNuevo[0]) {
        const caja = patio.cajas.find(c => ratonX >= c.x && ratonX <= c.x + c.w &&
                                           ratonY >= c.y && ratonY <= c.y + c.h);
        if (caja) verboPatio(patio.objs[patio.sel], caja.verbo);
        else { const i = objetoBajo(ratonX, ratonY); if (i >= 0) patio.sel = i; }
    }
    // Teclado y mando (la cruceta llega como 1-4; el stick como flechas).
    if (pulsada('ArrowRight') || pulsada('KeyD')) siguientePatio(1);
    if (pulsada('ArrowLeft')  || pulsada('KeyA')) siguientePatio(-1);
    const orden = ['lava', 'tapa', 'voltea', 'tira'];
    for (let k = 0; k < 4; k++)
        if (pulsada('Digit' + (k + 1)) || pulsada('Numpad' + (k + 1)))
            verboPatio(patio.objs[patio.sel], orden[k]);
}

function terminarPatio() {
    patio.fin = true;
    const t = patio.t, fallos = patio.errores + patio.trampas;
    const estrellas = fallos === 0 && t <= 60 ? 3 : fallos <= 2 ? 2 : 1;
    let mejor = null;
    try {
        const k = 'dengueinc.patio';
        const previo = JSON.parse(localStorage.getItem(k) || 'null');
        mejor = previo && previo.mejor <= t ? previo.mejor : t;
        localStorage.setItem(k, JSON.stringify({ mejor: mejor }));
    } catch (e) { /* sin almacenamiento: sin récord */ }

    // El estado sigue en PATIO: la casa se queda detrás del resultado y Esc sale.
    setTimeout(() => {
        if (!patio) return;
        let d = '<div style="font-size:34px;color:#f1c40f;letter-spacing:6px">' +
                '★'.repeat(estrellas) + '<span style="color:#37474f">' + '★'.repeat(3 - estrellas) + '</span></div>';
        d += '<div class="rep">';
        d += '<div class="rep-fila"><b>Tiempo</b><span>' + t.toFixed(1) + ' s</span></div>';
        d += '<div class="rep-fila"><b>Medidas equivocadas</b><span class="' +
             (patio.errores ? 'malo' : 'bueno') + '">' + patio.errores + '</span></div>';
        d += '<div class="rep-fila"><b>Vaciados sin tallar</b><span class="' +
             (patio.trampas ? 'malo' : 'bueno') + '">' + patio.trampas + '</span></div>';
        if (mejor !== null)
            d += '<div class="rep-fila"><b>Tu mejor tiempo</b><span>' + mejor.toFixed(1) + ' s</span></div>';
        if (patio.trampas)
            d += '<div class="rep-nota">Vaciar no basta: los huevos quedan pegados a la pared y ' +
                 'aguantan meses secos. Lo que no sirve se tira; lo que se queda, se tapa o se talla.</div>';
        if (!fallos)
            d += '<div class="rep-nota buena">Ni un error: ya sabes qué se lava, qué se tapa, qué se ' +
                 'voltea y qué se tira.</div>';
        d += '</div>' + revisaTuCasa();
        mostrarMenu({ titulo: 'Patio sin criaderos', desc: d,
                      boton: 'Otra vez', accion: empezarPatio,
                      boton2: 'Menú principal', accion2: salirPatio });
        montarRevisaTuCasa();
    }, 700);
}

// --- Dibujo ------------------------------------------------------------------
function dibujarPatio() {
    if (!patio) return;
    const t = performance.now() * 0.002;

    // Cielo, sol y barda del fondo.
    const g = ctx.createLinearGradient(0, 0, 0, ALTO);
    g.addColorStop(0, '#5dade2'); g.addColorStop(1, '#d6eaf8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, ANCHO, ALTO);
    ctx.fillStyle = 'rgba(255,243,176,.9)';
    ctx.beginPath(); ctx.arc(880, 120, 36, 0, 6.284); ctx.fill();
    ctx.fillStyle = '#c9b49a'; ctx.fillRect(560, 372, 400, 126);
    ctx.fillStyle = 'rgba(0,0,0,.07)';
    for (let y = 384; y < 498; y += 16) ctx.fillRect(560, y, 400, 2);

    // La casa: muro, pretil de la azotea, puerta y ventanas.
    ctx.fillStyle = '#e8c9a0'; ctx.fillRect(90, 140, 470, 358);
    ctx.fillStyle = '#d4b48a'; ctx.fillRect(84, 128, 482, 14);
    ctx.fillStyle = '#7b4a2e'; ctx.fillRect(250, 382, 72, 116);
    ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(312, 442, 3, 0, 6.284); ctx.fill();
    for (const vx of [130, 455]) {
        ctx.fillStyle = '#85c1e9'; ctx.fillRect(vx, 226, 96, 72);
        ctx.strokeStyle = '#fdfefe'; ctx.lineWidth = 4; ctx.strokeRect(vx, 226, 96, 72);
        ctx.beginPath(); ctx.moveTo(vx + 48, 226); ctx.lineTo(vx + 48, 298); ctx.stroke();
        ctx.fillStyle = '#bfa27a'; ctx.fillRect(vx - 7, 298, 110, 7);
    }

    // Casita del perro, detrás del bebedero.
    ctx.fillStyle = '#a0522d'; ctx.fillRect(872, 440, 80, 58);
    ctx.fillStyle = '#7b3f1f';
    ctx.beginPath(); ctx.moveTo(864, 444); ctx.lineTo(912, 404); ctx.lineTo(960, 444); ctx.fill();
    ctx.fillStyle = '#2b1a10';
    ctx.beginPath(); ctx.arc(912, 482, 14, Math.PI, 0); ctx.fill(); ctx.fillRect(898, 482, 28, 16);

    // Piso del patio.
    ctx.fillStyle = '#a6acaf'; ctx.fillRect(0, 496, ANCHO, ALTO - 496);
    ctx.fillStyle = 'rgba(0,0,0,.08)';
    for (let x = 0; x < ANCHO; x += 80) ctx.fillRect(x, 496, 2, ALTO - 496);

    // Los envases, con el mismo dibujo que en la partida.
    for (const o of patio.objs) {
        ctx.save();
        ctx.translate(o.px, o.py);
        ctx.scale(PATIO_ESCALA, PATIO_ESCALA);
        dibujarEnvase(o, o.ancho / 2, o.alto, t);
        if (o.activo && !o.neutralizado) {              // agua con larvas
            const wy = o.alto * 0.32;
            ctx.fillStyle = 'rgba(38,166,154,.75)';
            ctx.fillRect(o.ancho * 0.16, wy, o.ancho * 0.68, 4);
            ctx.fillStyle = '#0e3d38';
            for (let i = 0; i < 3; i++)
                ctx.fillRect(o.ancho * 0.28 + i * o.ancho * 0.18 + Math.sin(t * 3 + i) * 2,
                             wy + 1 + Math.cos(t * 2 + i), 3, 1.5);
        }
        if (o.vaciado && !o.neutralizado) {             // seco… con huevos en la pared
            ctx.fillStyle = 'rgba(210,190,130,.95)';
            for (let i = 0; i < 5; i++) ctx.fillRect(o.ancho * 0.2 + i * o.ancho * 0.13, o.alto * 0.32, 1.5, 1.5);
        }
        ctx.restore();
        if (o.tipo === 'maceta') {                      // la planta tapa el plato
            ctx.fillStyle = '#27ae60';
            for (const [dx, dy, r] of [[-14, -12, 16], [10, -16, 18], [0, -30, 15]]) {
                ctx.beginPath(); ctx.arc(o.px + o.w / 2 + dx, o.py + dy, r, 0, 6.284); ctx.fill();
            }
        }
    }

    // El marcador va arriba a la derecha y antes del panel de medidas: el tinaco
    // está en la azotea y su panel sube hasta el borde de arriba.
    dibujarHUDPatio();
    dibujarSeleccionPatio();

    ctx.textAlign = 'center'; ctx.font = 'bold 15px Segoe UI';
    for (const tx of patio.textos) {
        ctx.globalAlpha = Math.min(1, tx.t / 25);
        ctx.fillStyle = tx.color; ctx.fillText(tx.txt, tx.x, tx.y);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
}

/** Marco del envase elegido y, encima, sus cuatro medidas (clicables). */
function dibujarSeleccionPatio() {
    patio.cajas.length = 0;
    const o = patio.objs[patio.sel];
    if (!o || o.neutralizado || patio.fin) return;
    ctx.save();
    ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.strokeRect(o.px - 6, o.py - 6, o.w + 12, o.h + 12);
    ctx.setLineDash([]);

    const w = 252, h = 58;
    const x = clamp(o.px + o.w / 2 - w / 2, 6, ANCHO - w - 6);
    const y = Math.max(6, o.py - h - 14);
    ctx.fillStyle = 'rgba(12,20,28,.92)'; ctx.strokeStyle = '#1abc9c';
    ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#ecf0f1'; ctx.font = 'bold 12px Segoe UI'; ctx.textAlign = 'center';
    ctx.fillText(CRIADEROS[o.tipo].nombre, x + w / 2, y + 16);
    const orden = ['lava', 'tapa', 'voltea', 'tira'];
    ctx.font = 'bold 11px Segoe UI';
    for (let i = 0; i < 4; i++) {
        const v = VERBOS[orden[i]];
        const bx = x + 8 + i * 60, by = y + 24, bw = 56, bh = 26;
        const encima = ratonX >= bx && ratonX <= bx + bw && ratonY >= by && ratonY <= by + bh;
        ctx.fillStyle = encima ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.06)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = v.color; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = v.color; ctx.fillText((i + 1) + ' ' + v.nombre, bx + bw / 2, by + 17);
        patio.cajas.push({ x: bx, y: by, w: bw, h: bh, verbo: orden[i] });
    }
    ctx.restore();
    ctx.textAlign = 'left';
}

function dibujarHUDPatio() {
    ctx.save();
    const x = ANCHO - 310;
    ctx.fillStyle = 'rgba(12,20,28,.8)'; ctx.fillRect(x, 10, 300, 34);
    ctx.font = 'bold 15px Segoe UI'; ctx.fillStyle = '#f1c40f';
    ctx.fillText('⏱ ' + patio.t.toFixed(1) + ' s', x + 10, 33);
    ctx.fillStyle = '#2ecc71'; ctx.fillText('✔ ' + patio.cerrados + '/' + patio.objs.length, x + 108, 33);
    ctx.fillStyle = '#e74c3c'; ctx.fillText('✗ ' + patio.errores, x + 188, 33);
    ctx.fillStyle = '#bdc3c7'; ctx.fillText('↺ ' + patio.trampas, x + 240, 33);
    ctx.font = '11px Segoe UI'; ctx.fillStyle = '#ecf0f1';
    ctx.fillText('Apunta a un envase · 1 LAVA · 2 TAPA · 3 VOLTEA · 4 TIRA · ← → cambiar · Esc salir', 10, ALTO - 12);
    ctx.restore();
}
