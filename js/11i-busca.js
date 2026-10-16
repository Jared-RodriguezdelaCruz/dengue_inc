"use strict";

// ---------------------------------------------------------------------------
//  10i. BUSCA EL CRIADERO — un lugar lleno de cosas y ocho criaderos escondidos
//
//  El Modo Patio (11e) enseña qué medida pide cada envase; aquí se practica lo
//  que va antes: verlo. Cada partida sortea qué sitios son criadero (boca arriba,
//  con agua y larvas) y cuáles señuelo (lo mismo, tapado o volteado). Tocar un
//  señuelo cuesta tiempo, porque lo que importa no es qué objeto es sino si
//  puede juntar agua. Los textos salen de CRIADEROS (01b). El dibujo es propio
//  y más detallado que el de la partida (07): aquí los envases son lo único
//  que se mira.
//
//  Arriba a la derecha está la lista de lo que hay que encontrar, y todo lo que
//  se toca abre una tarjeta que dice qué es y se queda hasta el siguiente toque.
//
//  La pista para encontrarlos son las larvas, nunca agua sucia: el mosquito
//  pone en agua limpia (ficha «agua_limpia»).
// ---------------------------------------------------------------------------

const BUSCA_CRIADEROS = 8;           // criaderos por partida
const BUSCA_SENUELOS = 3;            // señuelos asegurados: sin ellos no hay nada que decidir
const BUSCA_CASTIGO = { senuelo: 3, pista: 5, aire: 1 };   // segundos
const BUSCA_PISTA_SOLA = 25;         // s sin encontrar nada: el botón de pista late
const BUSCA_LUPA_VEL = 6;            // px por frame con las flechas
const BUSCA_MARGEN = 12;             // margen del sprite: la tapa a un lado, el asa, la sombra

// La franja de arriba es del HUD: la pista a la izquierda, la tarjeta al centro
// y la lista a la derecha.
const LISTA_X = ANCHO - 350, LISTA_ANCHO = 340;
const FICHA_BUSCA = { x: 180, y: 8, w: LISTA_X - 190, h: 82 };

// Cada sitio: [tipo, centro x, base y, escala]. Lo que no salga criadero sale
// de señuelo si su tipo tiene `seguro`; si no, ese sitio queda vacío.
// El desorden de cada escena nunca lleva recipientes: todo lo que parece
// envase se puede tocar. Ningún sitio va arriba de y = 95 ni bajo la lista
// (x > 600, y < 240): ahí está el HUD.
const ESCENAS_BUSCA = {
    tianguis: {
        nombre: 'Vulcanizadora y tianguis',
        sitios: [
            ['tinaco', 290, 140, 1],
            ['tambo', 38, 430, 0.85], ['llanta', 180, 430, 1], ['llanta', 262, 430, 0.9],
            ['bebedero', 346, 432, 0.8],
            ['florero', 440, 378, 1], ['florero', 520, 378, 1],
            ['tambo', 612, 430, 0.8], ['botella', 860, 378, 0.9], ['cubeta', 900, 430, 0.8],
            ['maceta', 430, 476, 0.9], ['maceta', 680, 476, 0.9],
            ['cubeta', 150, 490, 0.85], ['llanta', 470, 500, 0.9], ['botella', 600, 510, 0.85],
            ['cubeta', 720, 512, 0.85], ['carretilla', 800, 505, 1], ['cisterna', 250, 512, 0.9]
        ],
        fondo: fondoTianguis,
        frente: frenteTianguis
    }
};

// Dónde está el agua de cada envase: [centro x, centro y, radio x, radio y], en
// fracciones de su ancho y alto. De aquí salen el agua del dibujo y las larvas.
// En el florero el agua se ve por el vidrio: su boca es donde nadan.
const BOCAS_BUSCA = {
    tinaco:  [0.5, 0.22, 0.25, 0.08],   cisterna:   [0.5, 0.21, 0.24, 0.07],
    tambo:   [0.5, 0.14, 0.36, 0.065],  cubeta:     [0.5, 0.13, 0.4, 0.068],
    maceta:  [0.5, 0.36, 0.42, 0.13],   carretilla: [0.5, 0.13, 0.4, 0.07],
    llanta:  [0.5, 0.47, 0.2, 0.065],   botella:    [0.683, 0.29, 0.22, 0.06],
    florero: [0.5, 0.65, 0.22, 0.06],   bebedero:   [0.5, 0.29, 0.36, 0.11]
};
// Lo que sobresale arriba de la caja del envase y también se toca: la maceta
// con su planta sobre el plato y las flores del florero.
const ALTO_EXTRA_BUSCA = { maceta: 40, florero: 18 };

let busca = null;
const capasBusca = {};               // id → { fondo, frente }: lo fijo se pinta una vez
const spritesBusca = {};             // 'tipo:c' / 'tipo:s' → sprite a 2x, para que la miniatura no se vea borrosa

// La lupa se dibuja con teclado o mando; con el ratón o el dedo estorba.
document.addEventListener('mousemove', () => { if (busca) busca.lupa = false; });

/** Lo llama el submenú del título, dentro del clic: ahí se desbloquea el audio. */
function abrirBusca(id) {
    audio();
    pantallaCompletaAlJugar();
    empezarBusca(id);
}

function empezarBusca(id) {
    const esc = ESCENAS_BUSCA[id];
    ocultarTitulo();
    ocultarMenu();

    // Primero los señuelos asegurados y luego los criaderos entre lo que queda.
    // Math.random y no rnd(): este modo no debe mover la semilla de la partida.
    const orden = esc.sitios.map((s, i) => i);
    for (let i = orden.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [orden[i], orden[j]] = [orden[j], orden[i]];
    }
    const senuelos = orden.filter(i => CRIADEROS[esc.sitios[i][0]].seguro).slice(0, BUSCA_SENUELOS);
    const criaderos = orden.filter(i => !senuelos.includes(i)).slice(0, BUSCA_CRIADEROS);

    busca = { id: id, esc: esc, objs: [], total: criaderos.length, encontrados: 0,
              t: 0, castigo: 0, errores: 0, pistas: 0, tUltimo: 0, aire: [],
              pista: null, textos: [], botonPista: null, lupa: false, fin: false,
              lista: [], cajasLista: [], ficha: null,
              gracia: 8 };     // frames: el clic o el Enter que abrió el modo no cuenta
    esc.sitios.forEach((s, i) => {
        const d = CRIADEROS[s[0]], criadero = criaderos.includes(i);
        if (!criadero && !d.seguro) return;
        const k = s[3], w = d.ancho * k, h = d.alto * k, extra = (ALTO_EXTRA_BUSCA[s[0]] || 0) * k;
        const bx = s[1] - w / 2, by = s[2] - h;
        // bx/by: la caja del envase, de donde se dibuja. px/py/w/h: lo que se
        // toca y se marca, con lo que sobresale arriba.
        busca.objs.push({ tipo: s[0], verbo: d.verbo, ancho: d.ancho, alto: d.alto, k: k, bx: bx, by: by,
                          px: bx, py: by - extra, w: w, h: h + extra, fase: Math.random() * 6.284,
                          criadero: criadero, revisado: false });
        spriteBusca(s[0], criadero);              // se pinta ahora y no en el primer cuadro
    });
    // La lista va en el orden de CRIADEROS, que ya los agrupa por medida.
    busca.lista = Object.keys(CRIADEROS)
        .map(tipo => ({ tipo: tipo, encontrados: 0,
                        total: busca.objs.filter(o => o.criadero && o.tipo === tipo).length }))
        .filter(f => f.total);
    if (!capasBusca[id]) capasBusca[id] = { fondo: capaBusca(esc.fondo), frente: capaBusca(esc.frente) };

    estado = estados.BUSCA;
    if (document.pointerLockElement) document.exitPointerLock();
    canvas.style.display = 'block';
    document.getElementById('container3d').style.display = 'none';
    document.getElementById('crosshair').style.display = 'none';
    contenedor.classList.add('modo-busca');
    objetivo('Encuentra los ' + busca.total + ' criaderos',
             'Toca lo que puede juntar agua. Lo tapado o volteado ya no es criadero: tocarlo cuesta tiempo.');
}

function salirBusca() {
    busca = null;
    contenedor.classList.remove('modo-busca');
    if (modoRender === '3d') {                   // el menú vuelve sobre lo que había
        canvas.style.display = 'none';
        document.getElementById('container3d').style.display = 'block';
    }
    objetivo('', '');
    menuPrincipal();
}

function elegirLugarBusca() {
    salirBusca();
    abrirSubTitulo('busca');
}

function capaBusca(pintar) {
    const c = document.createElement('canvas');
    c.width = ANCHO; c.height = ALTO;
    pintar(c.getContext('2d'));
    return c;
}

// --- Récord --------------------------------------------------------------------
const CLAVE_BUSCA = 'dengueinc.busca';

function recordBusca(id) {
    try { return (JSON.parse(localStorage.getItem(CLAVE_BUSCA) || '{}') || {})[id] || null; }
    catch (e) { return null; }                   // sin almacenamiento: sin récord
}

/** Guarda el mejor tiempo y las mejores estrellas; devuelve el mejor tiempo o null. */
function guardarRecordBusca(id, tiempo, estrellas) {
    try {
        const todo = JSON.parse(localStorage.getItem(CLAVE_BUSCA) || '{}') || {};
        const previo = todo[id];
        todo[id] = { mejor: previo ? Math.min(previo.mejor, tiempo) : tiempo,
                     estrellas: previo ? Math.max(previo.estrellas, estrellas) : estrellas };
        localStorage.setItem(CLAVE_BUSCA, JSON.stringify(todo));
        return todo[id].mejor;
    } catch (e) { return null; }
}

// --- Lógica ------------------------------------------------------------------
function textoBusca(txt, x, y, color) {
    busca.textos.push({ txt: txt, x: clamp(x, 50, ANCHO - 50), y: y, t: 70, color: color });
}

/** El sitio más cercano al punto, si está a menos del margen (con el dedo, más). */
function objBuscaBajo(x, y) {
    const margen = tactilVisible() ? 14 : 6;
    let mejor = null, dMejor = margen + 1;
    for (const o of busca.objs) {
        const d = Math.max(o.px - x, 0, x - (o.px + o.w), o.py - y, y - (o.py + o.h));
        if (d < dMejor) { dMejor = d; mejor = o; }
    }
    return mejor;
}

/** La tarjeta de «qué es» de un envase. Se queda hasta el siguiente toque.
 *  `o` es el objeto de la escena que la abrió: se marca con un anillo. */
function fichaBusca(tipo, modo, o) {
    const d = CRIADEROS[tipo];
    const f = { tipo: tipo, criadero: modo !== 'senuelo', titulo: d.nombre, texto: d.nota,
                verbo: d.verbo, o: o || null };
    if (modo === 'senuelo') {
        f.etiqueta = '✗ SEÑUELO · YA NO JUNTA AGUA'; f.color = '#e67e22';
        f.texto = d.seguro; f.verbo = null;
    } else if (modo === 'criadero') {
        f.etiqueta = '✔ CRIADERO ENCONTRADO'; f.color = '#2ecc71';
    } else {                                      // desde la lista: lo que se busca
        const fila = busca.lista.find(l => l.tipo === tipo), faltan = fila.total - fila.encontrados;
        f.etiqueta = !faltan ? (fila.total > 1 ? '✔ YA LOS ENCONTRASTE' : '✔ YA LO ENCONTRASTE')
                   : '🔍 BUSCA · ' + (faltan > 1 ? 'te faltan ' + faltan : 'te falta 1');
        f.color = faltan ? '#f1c40f' : '#2ecc71';
    }
    abrirFichaBusca(f);
}

function abrirFichaBusca(f) {
    f.t0 = performance.now();
    busca.ficha = f;
}

function revisarBusca(x, y) {
    const dentro = c => c && x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h;
    if (busca.ficha) {                            // cualquier toque la cierra; tocarla, solo eso
        busca.ficha = null;
        if (dentro(FICHA_BUSCA)) return;
    }
    if (dentro(busca.botonPista)) { pistaBusca(); return; }
    const celda = busca.cajasLista.find(dentro);
    if (celda) { fichaBusca(celda.fila.tipo, 'lista'); return; }
    const o = objBuscaBajo(x, y);
    if (!o) { aireBusca(x, y); return; }
    if (o.revisado) { fichaBusca(o.tipo, o.criadero ? 'criadero' : 'senuelo', o); return; }   // volver a verlo es gratis
    o.revisado = true;
    const d = CRIADEROS[o.tipo];
    if (o.criadero) {
        busca.encontrados++;
        busca.lista.find(l => l.tipo === o.tipo).encontrados++;
        busca.tUltimo = busca.t;
        textoBusca('✔ ' + d.nombre, o.px + o.w / 2, o.py - 8, '#2ecc71');
        fichaBusca(o.tipo, 'criadero', o);
        sfx.moneda();
        if (busca.encontrados === busca.total) terminarBusca();
    } else {
        busca.errores++;
        busca.castigo += BUSCA_CASTIGO.senuelo;
        textoBusca('+' + BUSCA_CASTIGO.senuelo + ' s', o.px + o.w / 2, o.py - 8, '#e67e22');
        fichaBusca(o.tipo, 'senuelo', o);
        sfx.parryFail();
    }
}

/** Tres toques al aire en dos segundos ya es adivinar: cuesta un segundo. */
function aireBusca(x, y) {
    busca.aire = busca.aire.filter(s => busca.t - s < 2);
    busca.aire.push(busca.t);
    textoBusca('?', x, y, '#bdc3c7');
    if (busca.aire.length < 3) return;
    busca.aire.length = 0;
    busca.castigo += BUSCA_CASTIGO.aire;
    abrirFichaBusca({ etiqueta: '? TRES TOQUES AL AIRE · +' + BUSCA_CASTIGO.aire + ' s', color: '#bdc3c7',
                      titulo: 'Sin adivinar', texto: 'Busca agua quieta en algo boca arriba.' });
}

/** Marca un área con un criadero dentro, no el punto exacto. */
function pistaBusca() {
    if (busca.fin || busca.pista) return;
    const quedan = busca.objs.filter(o => o.criadero && !o.revisado);
    if (!quedan.length) return;
    const o = quedan[Math.floor(Math.random() * quedan.length)];
    const a = Math.random() * 6.284, r = Math.random() * 40;
    busca.pista = { x: clamp(o.px + o.w / 2 + Math.cos(a) * r, 70, ANCHO - 70),
                    y: clamp(o.py + o.h / 2 + Math.sin(a) * r, 70, ALTO - 70), t: 240 };
    busca.pistas++;
    busca.castigo += BUSCA_CASTIGO.pista;
    busca.tUltimo = busca.t;
    abrirFichaBusca({ etiqueta: '💡 PISTA · +' + BUSCA_CASTIGO.pista + ' s', color: '#f1c40f',
                      titulo: 'Hay uno dentro del círculo', texto: 'Busca algo boca arriba, con agua y larvas.' });
}

function actualizarBusca(dt) {
    if (!busca) return;
    if (!busca.fin) busca.t += dt / 60;
    for (let i = busca.textos.length - 1; i >= 0; i--) {
        const tx = busca.textos[i];
        tx.t -= dt; tx.y -= 0.5 * dt;
        if (tx.t <= 0) busca.textos.splice(i, 1);
    }
    if (busca.pista && (busca.pista.t -= dt) <= 0) busca.pista = null;
    if (busca.fin) return;
    if (busca.gracia > 0) { busca.gracia -= dt; return; }

    // Las flechas mueven la lupa. Solo las del teclado: el stick del mando
    // también escribe flechas, pero la lupa ya la mueve 01c-mando.js.
    const v = BUSCA_LUPA_VEL * dt;
    const dx = (teclas.ArrowRight || teclas.KeyD ? v : 0) - (teclas.ArrowLeft || teclas.KeyA ? v : 0);
    const dy = (teclas.ArrowDown || teclas.KeyS ? v : 0) - (teclas.ArrowUp || teclas.KeyW ? v : 0);
    if (dx || dy) {
        ratonX = clamp(ratonX + dx, 0, ANCHO);
        ratonY = clamp(ratonY + dy, 0, ALTO);
        busca.lupa = true;
    }
    if (pulsada('KeyH') || pulsada('KeyF')) pistaBusca();       // F: la Y del mando
    if (ratonNuevo[0] || pulsada('Space') || pulsada('Enter') || pulsada('NumpadEnter'))
        revisarBusca(ratonX, ratonY);
}

function terminarBusca() {
    busca.fin = true;
    const id = busca.id;
    const tiempo = busca.t + busca.castigo;
    const estrellas = busca.errores === 0 && busca.pistas === 0 && tiempo <= 60 ? 3
                    : busca.errores <= 2 ? 2 : 1;
    const mejor = guardarRecordBusca(id, tiempo, estrellas);
    sfx.nivel();
    destellar('#2ecc71', 0.22, 480);

    // El estado sigue en BUSCA: el lugar se queda detrás del resultado y Esc sale.
    setTimeout(() => {
        if (!busca) return;
        let d = '<div style="font-size:34px;color:#f1c40f;letter-spacing:6px">' +
                '★'.repeat(estrellas) + '<span style="color:#37474f">' + '★'.repeat(3 - estrellas) + '</span></div>';
        d += '<div class="rep">';
        d += '<div class="rep-fila"><b>Tiempo (con castigos)</b><span>' + tiempo.toFixed(1) + ' s</span></div>';
        d += '<div class="rep-fila"><b>Señuelos tocados</b><span class="' +
             (busca.errores ? 'malo' : 'bueno') + '">' + busca.errores + '</span></div>';
        d += '<div class="rep-fila"><b>Pistas</b><span>' + busca.pistas + '</span></div>';
        if (mejor !== null)
            d += '<div class="rep-fila"><b>Tu mejor tiempo aquí</b><span>' + mejor.toFixed(1) + ' s</span></div>';
        d += '<div class="rep-detalle">Lo que encontraste, y cómo se cierra cada uno:</div>';
        for (const v of ['tapa', 'voltea', 'tira', 'lava']) {
            const nombres = [...new Set(busca.objs.filter(o => o.criadero && o.verbo === v)
                                                  .map(o => CRIADEROS[o.tipo].nombre.toLowerCase()))];
            if (!nombres.length) continue;
            d += '<div class="rep-fila"><b style="color:' + VERBOS[v].color + '">' + VERBOS[v].icono + ' ' +
                 VERBOS[v].nombre + '</b><span style="font-size:13px;color:#ecf0f1">' + nombres.join(', ') + '</span></div>';
        }
        if (busca.errores)
            d += '<div class="rep-nota">Lo que importa no es qué objeto es, sino si puede juntar agua: la ' +
                 'misma cubeta es criadero boca arriba y deja de serlo volteada.</div>';
        else
            d += '<div class="rep-nota buena">Ni un señuelo: ya distingues lo que junta agua de lo que no.</div>';
        d += '</div>';
        mostrarMenu({ titulo: busca.esc.nombre + ' sin criaderos', desc: d,
                      boton: 'Otra vez', accion: () => empezarBusca(id),
                      boton2: 'Elegir lugar', accion2: elegirLugarBusca,
                      boton3: 'Menú principal', accion3: salirBusca });
    }, 700);
}

// --- Dibujo ------------------------------------------------------------------
function dibujarBusca() {
    if (!busca) return;
    const t = performance.now() * 0.002;
    const capas = capasBusca[busca.id];
    ctx.drawImage(capas.fondo, 0, 0);
    for (const o of busca.objs) dibujarObjBusca(o, t);
    ctx.drawImage(capas.frente, 0, 0);

    // Marcas de lo revisado: el círculo de lo encontrado y el de lo seguro.
    ctx.save();
    for (const o of busca.objs) {
        if (!o.revisado) continue;
        const cx = o.px + o.w / 2, cy = o.py + o.h / 2, r = Math.max(o.w, o.h) / 2 + 9;
        ctx.lineWidth = 3;
        ctx.strokeStyle = o.criadero ? '#2ecc71' : 'rgba(236,240,241,.85)';
        ctx.setLineDash(o.criadero ? [] : [5, 4]);
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.284); ctx.stroke();
        if (!o.criadero) {
            ctx.setLineDash([]);
            ctx.font = 'bold 10px Segoe UI'; ctx.textAlign = 'center'; ctx.fillStyle = '#ecf0f1';
            ctx.fillText('SEGURO', cx, cy + r + 11);
        }
    }
    ctx.setLineDash([]);
    // La cosa de la tarjeta abierta, para que se sepa de cuál habla.
    const f = busca.ficha;
    if (f && f.o) {
        const o = f.o, r = Math.max(o.w, o.h) / 2 + 14 + Math.sin(t * 4) * 2;
        ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(o.px + o.w / 2, o.py + o.h / 2, r, 0, 6.284); ctx.stroke();
    }
    ctx.restore();

    if (busca.pista) {
        const p = busca.pista;
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.t / 30);
        ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.arc(p.x, p.y, 70 + Math.sin(t * 3) * 4, 0, 6.284); ctx.stroke();
        ctx.restore();
    }

    ctx.textAlign = 'center'; ctx.font = 'bold 15px Segoe UI';
    for (const tx of busca.textos) {
        ctx.globalAlpha = Math.min(1, tx.t / 25);
        ctx.fillStyle = tx.color; ctx.fillText(tx.txt, tx.x, tx.y);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';

    dibujarHUDBusca();
    dibujarFichaBusca();
    if ((busca.lupa || mandoActivo) && !busca.fin) dibujarLupa(ratonX, ratonY);
}

function dibujarObjBusca(o, t) {
    const s = spriteBusca(o.tipo, o.criadero), k = o.k;
    ctx.drawImage(s.lienzo, o.bx - s.izq * k, o.by - s.arriba * k, s.ancho * k, s.alto * k);
    if (o.criadero) larvasBusca(o, t);
}

/** Las larvas se mueven: son lo que delata al criadero. */
function larvasBusca(o, t) {
    const [fx, fy, frx, fry] = BOCAS_BUSCA[o.tipo], k = o.k;
    const cx = o.bx + fx * o.ancho * k, cy = o.by + fy * o.alto * k;
    const rx = frx * o.ancho * k, ry = fry * o.alto * k, l = 2 * k;
    ctx.save();
    ctx.strokeStyle = '#0b2e2b'; ctx.lineWidth = 1.3 * k; ctx.lineCap = 'round';
    (o.tipo === 'maceta' ? [-0.75, 0.75] : [-0.5, 0.05, 0.55]).forEach((p, i) => {
        const x = cx + p * rx + Math.sin(t * 3 + i * 2.1 + o.fase) * rx * 0.1;
        const y = cy + Math.cos(t * 2.3 + i + o.fase) * ry * 0.35;
        const c = Math.sin(t * 6 + i * 1.7) * 1.2 * k;           // se retuerce
        ctx.beginPath(); ctx.moveTo(x - l, y); ctx.quadraticCurveTo(x, y + c, x + l, y - c * 0.3); ctx.stroke();
    });
    ctx.restore();
}

/** El sprite de un envase, como criadero o como señuelo. Se pinta una vez. */
function spriteBusca(tipo, criadero) {
    const clave = tipo + (criadero ? ':c' : ':s');
    if (spritesBusca[clave]) return spritesBusca[clave];
    const d = CRIADEROS[tipo], m = BUSCA_MARGEN, arriba = m + (ALTO_EXTRA_BUSCA[tipo] || 0);
    const s = { izq: m, arriba: arriba, ancho: d.ancho + 2 * m, alto: d.alto + arriba + m,
                lienzo: document.createElement('canvas') };
    s.lienzo.width = s.ancho * 2; s.lienzo.height = s.alto * 2;
    const g = s.lienzo.getContext('2d');
    g.scale(2, 2); g.translate(m, arriba);
    g.fillStyle = 'rgba(0,0,0,.22)'; elipseBusca(g, d.ancho / 2, d.alto - 1, d.ancho * 0.52, 3.5); g.fill();  // sombra
    PINTA_BUSCA[tipo](g, criadero, d.ancho, d.alto);
    return spritesBusca[clave] = s;
}

/** El envase en una caja de `lado` px, para la lista y la tarjeta. */
function miniBusca(tipo, criadero, x, y, lado) {
    const s = spriteBusca(tipo, criadero), d = CRIADEROS[tipo], extra = ALTO_EXTRA_BUSCA[tipo] || 0;
    const e = lado / Math.max(d.ancho + 8, d.alto + extra + 8);
    const bx = x + (lado - d.ancho * e) / 2, by = y + (lado - (d.alto + extra) * e) / 2 + extra * e;
    ctx.drawImage(s.lienzo, bx - s.izq * e, by - s.arriba * e, s.ancho * e, s.alto * e);
}

function dibujarHUDBusca() {
    ctx.save();
    const x = LISTA_X, dedo = tactilVisible();
    ctx.fillStyle = 'rgba(12,20,28,.8)'; ctx.fillRect(x, 10, LISTA_ANCHO, 34);
    ctx.font = 'bold 15px Segoe UI';
    ctx.fillStyle = '#f1c40f'; ctx.fillText('⏱ ' + (busca.t + busca.castigo).toFixed(1) + ' s', x + 12, 33);
    ctx.fillStyle = '#2ecc71'; ctx.fillText('🔍 ' + busca.encontrados + '/' + busca.total, x + 140, 33);
    ctx.fillStyle = '#e67e22'; ctx.fillText('✗ ' + busca.errores, x + 260, 33);
    dibujarListaBusca(x, 50, dedo);

    // Botón de pista: con el dedo es la única forma de pedirla, por eso crece.
    const b = busca.botonPista = { x: 10, y: 10, w: 160, h: dedo ? 46 : 34 };
    const late = !busca.fin && !busca.pista && busca.t - busca.tUltimo > BUSCA_PISTA_SOLA;
    ctx.globalAlpha = late ? 0.7 + 0.3 * Math.sin(performance.now() * 0.008) : 1;
    ctx.fillStyle = 'rgba(12,20,28,.8)'; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = late ? '#f1c40f' : 'rgba(241,196,15,.35)'; ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    const tecla = dedo ? '' : mandoActivo ? ' (' + etiquetasMando().Y + ')' : ' (H)';
    ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 13px Segoe UI';
    ctx.fillText('💡 Pista' + tecla + ' · +' + BUSCA_CASTIGO.pista + ' s', b.x + 10, b.y + b.h / 2 + 5);
    ctx.globalAlpha = 1;

    let ayuda = 'Clic, o flechas y Espacio: revisar · en la lista o en lo ya revisado: ver qué es · H pista · Esc salir';
    if (dedo) ayuda = 'Toca lo que puede juntar agua · toca la lista o lo ya revisado: ver qué es · 💡 pista · ⏸ salir';
    else if (mandoActivo) {
        const e = etiquetasMando();
        ayuda = 'Stick: mover la lupa · ' + e.A + ': revisar o ver qué es · ' + e.Y + ': pista · ' + e.START + ': salir';
    }
    ctx.fillStyle = 'rgba(12,20,28,.6)'; ctx.fillRect(0, ALTO - 24, ANCHO, 24);
    ctx.font = '11px Segoe UI'; ctx.fillStyle = '#ecf0f1';
    ctx.fillText(ayuda, 10, ALTO - 8);
    ctx.restore();
}

/** Lo que hay que encontrar, por tipo. Cada celda se toca para ver qué es. */
function dibujarListaBusca(x, y, dedo) {
    const filaH = dedo ? 36 : 30, celdaW = (LISTA_ANCHO - 22) / 2, lado = filaH - 4;
    const filas = Math.ceil(busca.lista.length / 2);
    ctx.fillStyle = 'rgba(12,20,28,.8)'; ctx.fillRect(x, y, LISTA_ANCHO, 26 + filas * (filaH + 4));
    ctx.font = 'bold 11px Segoe UI'; ctx.fillStyle = '#bdc3c7';
    ctx.fillText('Lo que buscas · ' + (dedo ? 'toca' : 'clic en') + ' uno para verlo', x + 8, y + 16);
    busca.cajasLista.length = 0;
    busca.lista.forEach((f, i) => {
        const cx = x + 8 + (i % 2) * (celdaW + 6), cy = y + 24 + Math.floor(i / 2) * (filaH + 4);
        busca.cajasLista.push({ x: cx, y: cy, w: celdaW, h: filaH, fila: f });
        const listo = f.encontrados === f.total;
        const encima = !dedo && ratonX >= cx && ratonX <= cx + celdaW && ratonY >= cy && ratonY <= cy + filaH;
        ctx.fillStyle = listo ? 'rgba(46,204,113,.2)' : encima ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.06)';
        ctx.fillRect(cx, cy, celdaW, filaH);
        if (listo) { ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 1.5; ctx.strokeRect(cx, cy, celdaW, filaH); }
        miniBusca(f.tipo, true, cx + 3, cy + 2, lado);

        ctx.textAlign = 'right';
        if (listo) {
            ctx.font = 'bold 14px Segoe UI'; ctx.fillStyle = '#2ecc71';
            ctx.fillText('✔', cx + celdaW - 6, cy + filaH / 2 + 5);
        } else if (f.total > 1) {
            ctx.font = 'bold 11px Segoe UI'; ctx.fillStyle = '#f1c40f';
            ctx.fillText(f.encontrados + '/' + f.total, cx + celdaW - 6, cy + filaH / 2 + 4);
        }
        ctx.textAlign = 'left';
        // «Bebedero de mascota» no cabe a 12 px: la letra baja hasta 10.
        const nombre = CRIADEROS[f.tipo].nombre, libre = celdaW - lado - 36;
        let tam = dedo ? 13 : 12;
        do ctx.font = 'bold ' + tam + 'px Segoe UI';
        while (ctx.measureText(nombre).width > libre && --tam > 9);
        ctx.fillStyle = listo ? '#a9dfbf' : '#ecf0f1';
        ctx.fillText(nombre, cx + lado + 8, cy + filaH / 2 + 4);
    });
}

/** La tarjeta abierta: qué es, por qué y, si es criadero, cómo se cierra. */
function dibujarFichaBusca() {
    const f = busca.ficha;
    if (!f) return;
    const c = FICHA_BUSCA, dedo = tactilVisible();
    ctx.save();
    ctx.globalAlpha = Math.min(1, 0.25 + (performance.now() - f.t0) / 200);
    ctx.fillStyle = 'rgba(12,20,28,.94)'; ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = f.color; ctx.lineWidth = 2; ctx.strokeRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = f.color; ctx.fillRect(c.x, c.y, 4, c.h);
    let tx = c.x + 16;
    if (f.tipo) {
        ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(c.x + 10, c.y + 11, 60, 60);
        miniBusca(f.tipo, f.criadero, c.x + 10, c.y + 11, 60);
        tx = c.x + 82;
    }
    ctx.font = 'bold ' + (dedo ? 11 : 10) + 'px Segoe UI';
    ctx.fillStyle = f.color; ctx.fillText(f.etiqueta, tx, c.y + 18);
    ctx.textAlign = 'right';
    if (f.verbo) {
        const v = VERBOS[f.verbo];
        ctx.fillStyle = v.color; ctx.fillText(v.icono + ' ' + v.nombre, c.x + c.w - 30, c.y + 18);
    }
    ctx.fillStyle = '#7f8c8d'; ctx.fillText('✕', c.x + c.w - 10, c.y + 18);
    ctx.textAlign = 'left';
    ctx.font = 'bold ' + (dedo ? 16 : 15) + 'px Segoe UI'; ctx.fillStyle = '#ecf0f1';
    ctx.fillText(f.titulo, tx, c.y + 38);
    ctx.font = (dedo ? 13 : 12) + 'px Segoe UI'; ctx.fillStyle = '#cfd8dc';
    lineasBusca(f.texto, c.x + c.w - tx - 12, 2)
        .forEach((l, i) => ctx.fillText(l, tx, c.y + 56 + i * (dedo ? 16 : 15)));
    ctx.restore();
}

/** Parte un texto en renglones que quepan en `ancho` con la letra ya puesta. */
function lineasBusca(texto, ancho, max) {
    const lineas = [];
    let linea = '';
    for (const p of texto.split(' ')) {
        const prueba = linea ? linea + ' ' + p : p;
        if (linea && ctx.measureText(prueba).width > ancho) { lineas.push(linea); linea = p; }
        else linea = prueba;
    }
    if (linea) lineas.push(linea);
    if (lineas.length > max) { lineas.length = max; lineas[max - 1] += '…'; }
    return lineas;
}

function dibujarLupa(x, y) {
    ctx.save();
    ctx.lineCap = 'round';
    for (const [ancho, color] of [[6, 'rgba(12,20,28,.85)'], [2.5, '#f1c40f']]) {
        ctx.lineWidth = ancho; ctx.strokeStyle = color;
        ctx.beginPath(); ctx.arc(x, y, 16, 0, 6.284); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 12, y + 12); ctx.lineTo(x + 26, y + 26); ctx.stroke();
    }
    ctx.restore();
}

// --- Los envases ---------------------------------------------------------------
// Cada uno en coordenadas locales, dentro de su caja ancho×alto (01b), con su
// color de siempre: lo que separa el criadero del señuelo es si junta agua.
function elipseBusca(g, cx, cy, rx, ry) { g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 6.284); }

/** Degradado de izquierda a derecha: le da volumen de cilindro. */
function volumenBusca(g, x0, x1, oscuro, claro, base) {
    const gr = g.createLinearGradient(x0, 0, x1, 0);
    gr.addColorStop(0, oscuro); gr.addColorStop(0.28, claro);
    gr.addColorStop(0.62, base); gr.addColorStop(1, oscuro);
    return gr;
}

function contornoBusca(g) { g.lineWidth = 1.4; g.strokeStyle = 'rgba(14,18,22,.7)'; g.stroke(); }

/** Agua clara en la boca: el mosquito pone en agua limpia. */
function aguaBusca(g, tipo, w, h) {
    const [fx, fy, frx, fry] = BOCAS_BUSCA[tipo];
    const cx = fx * w, cy = fy * h, rx = frx * w, ry = fry * h;
    g.fillStyle = '#1d7c80'; elipseBusca(g, cx, cy, rx, ry); g.fill();
    g.fillStyle = 'rgba(120,225,218,.9)'; elipseBusca(g, cx, cy + ry * 0.2, rx * 0.84, ry * 0.62); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1;
    g.beginPath(); g.ellipse(cx - rx * 0.3, cy, rx * 0.35, ry * 0.4, 0, 3.6, 5.2); g.stroke();
}

/** Rayas de lámina antiderrapante, como las de una tapa de registro. */
function diamanteBusca(g, x0, x1, y0, y1) {
    g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 1;
    g.beginPath();
    for (let x = x0; x < x1 - 2; x += 5) { g.moveTo(x, y1); g.lineTo(x + 2.5, y0); }
    g.stroke();
}

const PINTA_BUSCA = {
    tinaco(g, criadero, w, h) {
        // Plástico negro, un poco abombado, con sus costillas.
        g.beginPath(); g.moveTo(5, 10); g.quadraticCurveTo(0, h * 0.55, 4, h - 2);
        g.lineTo(w - 4, h - 2); g.quadraticCurveTo(w, h * 0.55, w - 5, 10); g.closePath();
        g.fillStyle = volumenBusca(g, 0, w, '#101417', '#5a6874', '#2a333b'); g.fill(); contornoBusca(g);
        for (const y of [h * 0.45, h * 0.72]) {
            g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.6;
            g.beginPath(); g.moveTo(2.5, y); g.quadraticCurveTo(w / 2, y + 3, w - 2.5, y); g.stroke();
            g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1;
            g.beginPath(); g.moveTo(3, y - 1.8); g.quadraticCurveTo(w / 2, y + 1.2, w - 3, y - 1.8); g.stroke();
        }
        g.fillStyle = '#3b4752'; elipseBusca(g, w / 2, 10, w / 2 - 5, 6); g.fill(); contornoBusca(g);   // hombro
        if (criadero) {
            g.fillStyle = '#0c1013'; elipseBusca(g, w / 2, 10, w * 0.28, 4.4); g.fill();
            aguaBusca(g, 'tinaco', w, h);
            // La tapa, recargada a un lado: alguien la quitó y no la volvió a poner.
            g.save(); g.translate(w + 1, h * 0.6); g.rotate(0.22);
            g.fillStyle = '#46545f'; elipseBusca(g, 0, 0, 3.6, 14); g.fill(); contornoBusca(g);
            g.restore();
        } else {
            g.fillStyle = '#4a5864'; elipseBusca(g, w / 2, 9, w * 0.31, 5); g.fill(); contornoBusca(g);
            g.fillStyle = '#5c6b77'; elipseBusca(g, w / 2, 7.5, w * 0.21, 3.2); g.fill();
            g.beginPath(); g.rect(w / 2 - 3, 3, 6, 3.5); g.fillStyle = '#262e35'; g.fill(); contornoBusca(g);  // perilla
        }
    },

    tambo(g, criadero, w, h) {
        // Tambo de lámina, ya con óxido, y sus dos aros.
        g.beginPath(); g.rect(2, 6, w - 4, h - 7);
        g.fillStyle = volumenBusca(g, 2, w - 2, '#4a3519', '#b8904f', '#87683a'); g.fill(); contornoBusca(g);
        g.fillStyle = 'rgba(110,45,15,.35)';
        g.fillRect(9, 13, 2, 9); g.fillRect(29, 30, 2, 11); g.fillRect(17, 38, 3, 6);
        for (const y of [h * 0.37, h * 0.7]) {
            g.fillStyle = '#5e4526'; g.fillRect(1, y - 2, w - 2, 4);
            g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(1, y - 2, w - 2, 1);
        }
        g.fillStyle = '#a8854b'; elipseBusca(g, w / 2, 6, w / 2 - 2, 5); g.fill(); contornoBusca(g);
        if (criadero) {
            g.fillStyle = '#23190d'; elipseBusca(g, w / 2, 6.5, w / 2 - 5, 3.6); g.fill();
            aguaBusca(g, 'tambo', w, h);
        } else {
            g.fillStyle = '#8e999c'; elipseBusca(g, w / 2, 5, w / 2 - 1, 5); g.fill(); contornoBusca(g);   // tapa
            g.strokeStyle = '#5f6b6d'; g.lineWidth = 2;                                                   // cincho
            g.beginPath(); g.ellipse(w / 2, 5.5, w / 2 - 1, 5, 0, 0.15, 2.99); g.stroke();
            g.fillStyle = '#3d4b55'; g.fillRect(w - 6, 6, 4, 4);
            g.fillStyle = '#b0babd'; elipseBusca(g, w * 0.68, 4, 3, 1.3); g.fill();
        }
    },

    cisterna(g, criadero, w, h) {
        // Lo que se ve de una cisterna: su registro de concreto.
        g.beginPath(); g.rect(1, 12, w - 2, h - 13);
        g.fillStyle = volumenBusca(g, 1, w - 1, '#6f6d64', '#c4c2b8', '#a2a097'); g.fill(); contornoBusca(g);
        g.fillStyle = 'rgba(0,0,0,.14)';
        for (const [x, y] of [[8, 18], [20, 26], [34, 20], [47, 27], [52, 16], [13, 29]]) g.fillRect(x, y, 2, 1.5);
        g.beginPath(); g.moveTo(1, 12); g.lineTo(7, 2); g.lineTo(w - 7, 2); g.lineTo(w - 1, 12); g.closePath();
        g.fillStyle = '#c2c0b6'; g.fill(); contornoBusca(g);
        const boca = () => {
            g.beginPath(); g.moveTo(13, 10); g.lineTo(17, 4); g.lineTo(w - 17, 4); g.lineTo(w - 13, 10); g.closePath();
        };
        if (criadero) {
            // La tapa levantada, recargada atrás: el registro quedó abierto.
            g.beginPath(); g.moveTo(16, 4); g.lineTo(19, -9); g.lineTo(w - 19, -9); g.lineTo(w - 16, 4); g.closePath();
            g.fillStyle = '#7d878b'; g.fill(); contornoBusca(g);
            diamanteBusca(g, 19, w - 19, -8, 3);
            boca(); g.fillStyle = '#15130f'; g.fill(); contornoBusca(g);
            g.save(); boca(); g.clip(); aguaBusca(g, 'cisterna', w, h); g.restore();
        } else {
            boca(); g.fillStyle = '#8b969a'; g.fill(); contornoBusca(g);           // tapa metálica, al ras
            diamanteBusca(g, 16, w - 16, 5, 9);
            g.strokeStyle = '#4f5b5f'; g.lineWidth = 1.6;
            g.beginPath(); g.arc(w / 2, 7.5, 3, Math.PI, 0); g.stroke();
        }
    },

    cubeta(g, criadero, w, h) {
        const cuerpo = (arriba, abajo) => {           // trapecio: ancho arriba o ancho abajo
            g.beginPath(); g.moveTo(arriba, criadero ? 4 : 2); g.lineTo(w - arriba, criadero ? 4 : 2);
            g.lineTo(w - abajo, criadero ? h - 1 : h - 4); g.lineTo(abajo, criadero ? h - 1 : h - 4); g.closePath();
            g.fillStyle = volumenBusca(g, 1, w - 1, '#174a6e', '#6cb6e6', '#2a82bd'); g.fill(); contornoBusca(g);
            g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 1.2;
            g.beginPath(); g.moveTo(3, 13); g.lineTo(w - 3, 13); g.moveTo(4, 23); g.lineTo(w - 4, 23); g.stroke();
        };
        g.lineCap = 'round';
        if (criadero) {
            cuerpo(1, 5);
            g.fillStyle = '#2573a8'; elipseBusca(g, w / 2, 4, w / 2 - 0.5, 3.6); g.fill(); contornoBusca(g);  // labio
            g.fillStyle = '#103552'; elipseBusca(g, w / 2, 4.3, w / 2 - 3, 2.6); g.fill();
            aguaBusca(g, 'cubeta', w, h);
            g.strokeStyle = '#c8ced3'; g.lineWidth = 1.6;                                                    // asa
            g.beginPath(); g.moveTo(1.5, 6); g.quadraticCurveTo(w / 2, -11, w - 1.5, 6); g.stroke();
        } else {
            // Boca abajo: el fondo queda arriba y el labio, en el suelo.
            cuerpo(5, 1);
            g.fillStyle = '#1f6596'; elipseBusca(g, w / 2, 2.2, w / 2 - 5, 2); g.fill(); contornoBusca(g);
            g.beginPath(); g.rect(0, h - 5, w, 4); g.fillStyle = '#2573a8'; g.fill(); contornoBusca(g);
            g.strokeStyle = '#c8ced3'; g.lineWidth = 1.6;                                                    // el asa, caída
            g.beginPath(); g.moveTo(1, h - 7); g.quadraticCurveTo(-9, h - 3, -2, h - 1); g.stroke();
        }
    },

    maceta(g, criadero, w, h) {
        // El criadero es el plato: junta el agua que escurre al regar.
        const cx = w / 2;
        g.fillStyle = '#9c4a28'; elipseBusca(g, cx, 7, cx - 1, 4); g.fill(); contornoBusca(g);
        aguaBusca(g, 'maceta', w, h);
        g.beginPath(); g.moveTo(cx - 12, -20); g.lineTo(cx + 12, -20); g.lineTo(cx + 8.5, 9); g.lineTo(cx - 8.5, 9); g.closePath();
        g.fillStyle = volumenBusca(g, cx - 12, cx + 12, '#7a3519', '#e3925f', '#c2663a'); g.fill(); contornoBusca(g);
        g.beginPath(); g.rect(cx - 13.5, -23, 27, 6); g.fillStyle = '#b5592f'; g.fill(); contornoBusca(g);
        g.fillStyle = '#4a2f1f'; elipseBusca(g, cx, -23, 12, 2); g.fill();                    // tierra
        g.strokeStyle = '#2d6a3e'; g.lineWidth = 1.4;
        for (const [x, y] of [[-6, -33], [0, -38], [6, -32]]) {
            g.beginPath(); g.moveTo(cx, -23); g.lineTo(cx + x, y); g.stroke();
        }
        for (const [x, y, rx, ry, a, c] of [[-9, -29, 8, 3.5, -0.5, '#2e8b57'], [9, -30, 8, 3.5, 0.5, '#27ae60'],
                                           [-5, -36, 7, 3, -1.1, '#27ae60'], [6, -37, 7, 3, 1.1, '#2e8b57'],
                                           [0, -33, 3, 7, 0, '#1e8449']]) {
            g.fillStyle = c; g.beginPath(); g.ellipse(cx + x, y, rx, ry, a, 0, 6.284); g.fill();
        }
        g.fillStyle = '#e84393'; elipseBusca(g, cx + 2, -40, 3, 3); g.fill();
        g.fillStyle = '#f1c40f'; elipseBusca(g, cx + 2, -40, 1.2, 1.2); g.fill();
        // El frente del plato tapa la base de la maceta.
        g.beginPath(); g.moveTo(1, 7); g.ellipse(cx, 7, cx - 1, 4, 0, Math.PI, 0, true);
        g.lineTo(w - 4, 16); g.lineTo(4, 16); g.closePath();
        g.fillStyle = volumenBusca(g, 1, w - 1, '#7a3519', '#d98552', '#b5592f'); g.fill(); contornoBusca(g);
    },

    carretilla(g, criadero, w, h) {
        const rueda = (x, y) => {
            g.fillStyle = '#1e2428'; elipseBusca(g, x, y, 6, 6); g.fill(); contornoBusca(g);
            g.fillStyle = '#aab3b8'; elipseBusca(g, x, y, 2.6, 2.6); g.fill();
            g.fillStyle = '#4d5656'; elipseBusca(g, x, y, 1, 1); g.fill();
        };
        const batea = () => {
            g.fillStyle = volumenBusca(g, 1, w - 1, '#6e1f17', '#ec6a5c', '#c0392b'); g.fill(); contornoBusca(g);
        };
        g.lineCap = 'round';
        if (criadero) {
            g.strokeStyle = '#4d5656'; g.lineWidth = 2;
            g.beginPath(); g.moveTo(9, h - 6); g.lineTo(14, h - 11);        // horquilla
            g.moveTo(w - 15, h - 11); g.lineTo(w - 17, h - 1);              // pata
            g.moveTo(10, h - 11); g.lineTo(w + 7, h - 17); g.stroke();      // larguero
            g.strokeStyle = '#2c3e50'; g.lineWidth = 3;
            g.beginPath(); g.moveTo(w + 1, h - 16); g.lineTo(w + 7, h - 17); g.stroke();   // maneral
            g.beginPath(); g.moveTo(1, 3.5); g.lineTo(w - 1, 3.5); g.lineTo(w - 10, h - 11); g.lineTo(9, h - 11); g.closePath();
            batea();
            g.fillStyle = '#d64535'; elipseBusca(g, w / 2, 3.5, w / 2 - 1, 3.5); g.fill(); contornoBusca(g);
            g.fillStyle = '#5a1a13'; elipseBusca(g, w / 2, 3.8, w / 2 - 4, 2.4); g.fill();
            aguaBusca(g, 'carretilla', w, h);
            rueda(9, h - 6);
        } else {
            // Volteada: la batea descansa en su borde y la rueda queda al aire.
            g.beginPath(); g.moveTo(9, 8); g.lineTo(w - 10, 8); g.lineTo(w - 1, h - 2); g.lineTo(1, h - 2); g.closePath();
            batea();
            g.beginPath(); g.rect(0, h - 4, w, 3); g.fillStyle = '#a93226'; g.fill(); contornoBusca(g);
            g.strokeStyle = '#4d5656'; g.lineWidth = 2;
            g.beginPath(); g.moveTo(12, 8); g.lineTo(9, 2);
            g.moveTo(w - 15, 8); g.lineTo(w - 17, -2);
            g.moveTo(10, 8); g.lineTo(w + 6, 4); g.stroke();
            g.strokeStyle = '#2c3e50'; g.lineWidth = 3;
            g.beginPath(); g.moveTo(w, 4.4); g.lineTo(w + 6, 4); g.stroke();
            rueda(9, 1);
        }
    },

    llanta(g, criadero, w, h) {
        // Acostada: el costado arriba y la banda de rodadura al frente.
        const cx = w / 2, cy = h * 0.42, rx = w / 2 - 1, ry = h * 0.3, alto = 9;
        g.beginPath(); g.moveTo(cx - rx, cy); g.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true);
        g.lineTo(cx + rx, cy + alto); g.ellipse(cx, cy + alto, rx, ry, 0, 0, Math.PI); g.closePath();
        g.fillStyle = '#171c20'; g.fill(); contornoBusca(g);
        g.strokeStyle = 'rgba(255,255,255,.13)'; g.lineWidth = 1.5;
        g.beginPath();
        for (let a = 0.25; a < 3; a += 0.3) {
            const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
            g.moveTo(x, y + 2); g.lineTo(x + 1.5, y + alto - 1);
        }
        g.stroke();
        g.fillStyle = '#2b3237'; elipseBusca(g, cx, cy, rx, ry); g.fill(); contornoBusca(g);
        g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 2;
        g.beginPath(); g.ellipse(cx, cy, rx - 3.5, ry - 2.8, 0, 3.4, 5.0); g.stroke();
        g.fillStyle = '#090c0e'; elipseBusca(g, cx, cy + 1, rx * 0.5, ry * 0.46); g.fill(); contornoBusca(g);
        aguaBusca(g, 'llanta', w, h);
    },

    botella(g, criadero, w, h) {
        const vidrio = 'rgba(125,205,150,.6)', filo = 'rgba(28,90,58,.85)';
        const plastico = () => { g.fillStyle = vidrio; g.fill(); g.strokeStyle = filo; g.lineWidth = 1.2; g.stroke(); };
        if (criadero) {
            // Una lata abierta y una botella tirada sin tapa: las dos juntan lluvia.
            g.beginPath(); g.rect(12, 9, 17, h - 10);
            g.fillStyle = volumenBusca(g, 12, 29, '#77818a', '#f0f3f5', '#bfc6cc'); g.fill(); contornoBusca(g);
            g.fillStyle = '#c0392b'; g.fillRect(12.7, 15, 15.6, 8);
            g.fillStyle = '#ecf0f1'; g.fillRect(12.7, 18, 15.6, 1.6);
            g.fillStyle = '#a7b0b7'; elipseBusca(g, 20.5, 9, 8.5, 2.8); g.fill(); contornoBusca(g);
            g.fillStyle = '#2b3136'; elipseBusca(g, 20.5, 9.2, 7.3, 2.2); g.fill();
            aguaBusca(g, 'botella', w, h);
            g.beginPath(); g.rect(6, 22, 15, 9); plastico();
            g.beginPath(); g.moveTo(6, 23.5); g.lineTo(2, 25); g.lineTo(2, 28); g.lineTo(6, 29.5); g.closePath(); plastico();
            g.fillStyle = 'rgba(60,185,180,.75)'; g.fillRect(6.6, 27, 13.8, 3.4);       // el agua que juntó
            g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(8, 23.5, 11, 1.3);
        } else {
            // De pie y con su tapa puesta.
            g.beginPath(); g.moveTo(8, h - 1); g.lineTo(8, 13); g.quadraticCurveTo(8, 7, 12.5, 6); g.lineTo(17.5, 6);
            g.quadraticCurveTo(22, 7, 22, 13); g.lineTo(22, h - 1); g.closePath(); plastico();
            g.beginPath(); g.rect(12.5, 2.5, 5, 4); plastico();
            g.beginPath(); g.rect(12, -0.5, 6, 3.5); g.fillStyle = '#c0392b'; g.fill(); contornoBusca(g);
            g.fillStyle = '#f4f6f7'; g.fillRect(8.6, 16, 12.8, 7);
            g.fillStyle = '#2980b9'; g.fillRect(8.6, 18.5, 12.8, 2);
            g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(10, 8, 1.4, 20);
        }
    },

    florero(g, criadero, w, h) {
        // De vidrio: por dentro se ven el agua, los tallos y las larvas.
        const cuerpo = () => {
            g.beginPath(); g.moveTo(9, 2); g.lineTo(19, 2); g.quadraticCurveTo(18, 10, 24, 16);
            g.quadraticCurveTo(29, 25, 21, h - 1); g.lineTo(7, h - 1); g.quadraticCurveTo(-1, 25, 4, 16);
            g.quadraticCurveTo(10, 10, 9, 2); g.closePath();
        };
        const flores = [[6, -9, '#e74c3c'], [14, -14, '#f39c12'], [22, -8, '#f5f5f5']];
        g.strokeStyle = '#2e7d32'; g.lineWidth = 1.4;
        for (const [x, y] of flores) { g.beginPath(); g.moveTo(14, 26); g.quadraticCurveTo(14, 4, x, y); g.stroke(); }
        cuerpo(); g.fillStyle = 'rgba(175,160,225,.33)'; g.fill();
        g.save(); cuerpo(); g.clip();
        g.fillStyle = 'rgba(70,195,190,.5)'; g.fillRect(0, 16, w, h);
        g.restore();
        g.fillStyle = 'rgba(150,235,228,.85)'; elipseBusca(g, 14, 16, 9.6, 1.8); g.fill();
        cuerpo(); g.strokeStyle = 'rgba(80,60,130,.85)'; g.lineWidth = 1.3; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(6.5, 17, 1.5, 10);
        elipseBusca(g, 14, 2, 5, 1.3); g.stroke();
        g.fillStyle = '#388e3c';
        g.beginPath(); g.ellipse(10, -1, 4, 1.6, -0.6, 0, 6.284); g.fill();
        g.beginPath(); g.ellipse(18, -2, 4, 1.6, 0.6, 0, 6.284); g.fill();
        for (const [x, y, c] of flores) {
            g.fillStyle = c;
            for (let i = 0; i < 5; i++) {
                const a = i * 1.2566;
                elipseBusca(g, x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 2.3, 2.3); g.fill();
            }
            g.fillStyle = '#8d5524'; elipseBusca(g, x, y, 1.4, 1.4); g.fill();
        }
    },

    bebedero(g, criadero, w, h) {
        g.beginPath(); g.moveTo(1, 6); g.lineTo(w - 1, 6); g.quadraticCurveTo(w - 2, h - 2, w - 7, h - 1);
        g.lineTo(7, h - 1); g.quadraticCurveTo(2, h - 2, 1, 6); g.closePath();
        g.fillStyle = volumenBusca(g, 1, w - 1, '#7f3300', '#f59a5c', '#d35400'); g.fill(); contornoBusca(g);
        g.fillStyle = '#e8762f'; elipseBusca(g, w / 2, 6, w / 2 - 1, 4); g.fill(); contornoBusca(g);
        g.fillStyle = '#6b2b00'; elipseBusca(g, w / 2, 6.3, w / 2 - 4, 2.8); g.fill();
        aguaBusca(g, 'bebedero', w, h);
        // El hueso pintado: es el plato del perro.
        g.fillStyle = '#fdfefe'; g.fillRect(13, 12.6, 10, 2.8);
        for (const [x, y] of [[13, 12.6], [13, 15.4], [23, 12.6], [23, 15.4]]) { elipseBusca(g, x, y, 1.8, 1.8); g.fill(); }
    }
};

// --- Escena: vulcanizadora y tianguis --------------------------------------------
function fondoTianguis(g) {
    const cielo = g.createLinearGradient(0, 0, 0, 300);
    cielo.addColorStop(0, '#6cb7e0'); cielo.addColorStop(1, '#f3e2b8');
    g.fillStyle = cielo; g.fillRect(0, 0, ANCHO, ALTO);

    // Las casas de enfrente, con su pretil y sus ventanas.
    for (const [x, y, w, c] of [[336, 230, 170, '#f2c6a0'], [506, 214, 150, '#a9d6c2'],
                                [656, 236, 150, '#f5e08a'], [806, 220, 154, '#d7b8e0']]) {
        g.fillStyle = c; g.fillRect(x, y, w, 430 - y);
        g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(x, y, w, 8);
        g.fillStyle = '#85c1e9'; g.fillRect(x + 24, y + 30, 34, 28); g.fillRect(x + w - 58, y + 30, 34, 28);
    }

    // Papel picado de lado a lado del tianguis.
    g.strokeStyle = 'rgba(60,40,30,.6)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(336, 232); g.quadraticCurveTo(648, 252, 960, 232); g.stroke();
    const colores = ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#e84393', '#e67e22'];
    for (let i = 0, x = 344; x < 948; x += 24, i++) {
        const y = 232 + Math.sin((x - 336) / 624 * Math.PI) * 10;
        g.fillStyle = colores[i % colores.length];
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + 16, y); g.lineTo(x + 16, y + 14);
        g.lineTo(x + 8, y + 19); g.lineTo(x, y + 14); g.closePath(); g.fill();
    }

    // La vulcanizadora: muro, losa, letrero y la cortina subida.
    g.fillStyle = '#e8b04b'; g.fillRect(16, 150, 320, 280);
    g.fillStyle = '#c9973a'; g.fillRect(10, 140, 332, 12);
    g.fillStyle = '#c0392b'; g.fillRect(36, 166, 280, 40);
    g.textAlign = 'center';
    g.fillStyle = '#fff'; g.font = 'bold 24px Segoe UI'; g.fillText('VULCANIZADORA', 176, 195);
    g.fillStyle = '#5d4037'; g.font = 'bold 12px Segoe UI'; g.fillText('LLANTAS NUEVAS Y USADAS · 24 H', 176, 224);
    g.fillStyle = '#3b3f44'; g.fillRect(60, 246, 166, 184);
    g.fillStyle = '#9aa0a6'; g.fillRect(56, 234, 174, 14);
    g.fillStyle = 'rgba(0,0,0,.2)';
    for (let y = 237; y < 248; y += 4) g.fillRect(56, y, 174, 1);
    g.fillStyle = '#6b4f3a';                                       // banco de trabajo
    g.fillRect(70, 378, 72, 8); g.fillRect(74, 386, 5, 44); g.fillRect(133, 386, 5, 44);
    g.strokeStyle = '#b0b7bd'; g.lineWidth = 3; g.lineCap = 'round';
    for (const [x, y] of [[84, 300], [104, 296], [124, 302]]) {   // llaves colgadas
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4, y + 34); g.stroke();
    }
    g.fillStyle = '#c0392b'; g.fillRect(292, 398, 34, 32);         // compresor
    g.fillStyle = '#ecf0f1'; g.beginPath(); g.arc(309, 410, 6, 0, 6.284); g.fill();

    // Banqueta y calle.
    g.fillStyle = '#b8afa3'; g.fillRect(0, 430, ANCHO, 18);
    g.fillStyle = '#8c857c'; g.fillRect(0, 448, ANCHO, ALTO - 448);
    g.fillStyle = 'rgba(0,0,0,.07)';
    for (let x = 0; x < ANCHO; x += 64) g.fillRect(x, 430, 2, 18);

    // Los tres puestos: flores, fruta y ropa.
    puestoTianguis(g, 400, 170, '#ff7aa8', '#fff', 'FLORES');
    mesaTianguis(g, 410, 150, '#f8bbd0');
    for (const [fx, c] of [[478, '#e74c3c'], [496, '#f1c40f']]) {  // ramos envueltos en papel
        g.fillStyle = '#f5f0e1';
        g.beginPath(); g.moveTo(fx - 8, 362); g.lineTo(fx + 8, 362); g.lineTo(fx, 378); g.fill();
        g.fillStyle = c;
        for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(fx - 5 + k * 5, 358, 4, 0, 6.284); g.fill(); }
    }

    puestoTianguis(g, 590, 180, '#2ecc71', '#fff', 'FRUTA');
    mesaTianguis(g, 600, 160, '#c8e6c9');
    for (const [cx, fruta] of [[612, '#e67e22'], [664, '#e74c3c'], [716, '#f1c40f']]) {  // cajas de madera
        g.fillStyle = '#c49a6c'; g.fillRect(cx, 358, 44, 20);
        g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(cx, 365, 44, 2); g.fillRect(cx, 371, 44, 2);
        g.fillStyle = fruta;
        for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(cx + 6 + k * 11, 356, 6, 0, 6.284); g.fill(); }
    }

    puestoTianguis(g, 790, 160, '#3498db', '#f1c40f', 'ROPA');
    mesaTianguis(g, 800, 140, null);
    for (const [px, w, c] of [[806, 36, '#e67e22'], [882, 50, '#2c3e50']]) {   // ropa doblada
        for (let k = 0; k < 3; k++) {
            g.fillStyle = k % 2 ? c : '#ecf0f1';
            g.fillRect(px, 370 - k * 7, w, 7);
        }
    }
    g.textAlign = 'left'; g.lineCap = 'butt';
}

/** Lona a rayas con su faldón de ondas y los dos postes. */
function puestoTianguis(g, x, w, colA, colB, letrero) {
    g.fillStyle = '#7f8c8d'; g.fillRect(x + 4, 270, 4, 160); g.fillRect(x + w - 8, 270, 4, 160);
    const n = 8, paso = (w + 16) / n;
    for (let i = 0; i < n; i++) {
        g.fillStyle = i % 2 ? colB : colA;
        g.fillRect(x - 8 + i * paso, 252, paso + 0.5, 26);
        g.beginPath(); g.arc(x - 8 + i * paso + paso / 2, 278, paso / 2, 0, Math.PI); g.fill();
    }
    g.fillStyle = 'rgba(30,20,30,.75)'; g.font = 'bold 12px Segoe UI'; g.textAlign = 'center';
    g.fillText(letrero, x + w / 2, 270);
}

/** Mesa con su sombra debajo; `mantel` null deja ver lo que hay abajo. */
function mesaTianguis(g, x, w, mantel) {
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x, 386, w, 44);
    g.fillStyle = '#8d6e63'; g.fillRect(x, 378, w, 8);
    if (mantel) { g.fillStyle = mantel; g.fillRect(x, 386, w, 30); }
    else { g.fillStyle = '#6d4c41'; g.fillRect(x + 4, 386, 5, 44); g.fillRect(x + w - 9, 386, 5, 44); }
}

/** Lo que va delante de los envases y los tapa a medias. */
function frenteTianguis(g) {
    // Ropa colgada del puesto: el vestido tapa media botella.
    g.strokeStyle = '#5d4037'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(796, 292); g.lineTo(944, 292); g.stroke();
    prendaTianguis(g, 810, 292, 24, 46, '#e84393');
    prendaTianguis(g, 838, 292, 18, 74, '#8e44ad');
    prendaTianguis(g, 902, 292, 28, 44, '#16a085');

    personaTianguis(g, 170, 522, '#34495e', '#f5cba7');
    personaTianguis(g, 498, 530, '#c0392b', '#d4a373');
    personaTianguis(g, 918, 526, '#27ae60', '#e0ac69');
    perroTianguis(g, 384, 432);                     // el perro del taller, junto a su bebedero
}

function prendaTianguis(g, x, y, w, h, c) {
    g.fillStyle = c;
    g.fillRect(x, y + 4, w, h - 4);
    g.fillRect(x - 5, y + 4, w + 10, 10);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x, y + h - 6, w, 6);
}

function personaTianguis(g, x, pies, ropa, piel) {
    g.fillStyle = '#2c3e50'; g.fillRect(x - 9, pies - 30, 7, 30); g.fillRect(x + 2, pies - 30, 7, 30);
    g.fillStyle = ropa; g.fillRect(x - 12, pies - 70, 24, 42);
    g.fillStyle = piel; g.beginPath(); g.arc(x, pies - 80, 9, 0, 6.284); g.fill();
    g.fillStyle = '#2b1a10'; g.beginPath(); g.arc(x, pies - 83, 9, Math.PI, 0); g.fill();
}

function perroTianguis(g, x, suelo) {
    g.fillStyle = '#c68642';
    g.beginPath(); g.ellipse(x, suelo - 16, 18, 9, 0, 0, 6.284); g.fill();
    g.fillRect(x - 14, suelo - 10, 4, 10); g.fillRect(x + 10, suelo - 10, 4, 10);
    g.beginPath(); g.arc(x - 18, suelo - 26, 8, 0, 6.284); g.fill();
    g.fillStyle = '#8d5524';
    g.beginPath(); g.ellipse(x - 22, suelo - 30, 3, 6, 0.4, 0, 6.284); g.fill();
    g.strokeStyle = '#c68642'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x + 17, suelo - 18); g.quadraticCurveTo(x + 26, suelo - 30, x + 22, suelo - 34); g.stroke();
    g.fillStyle = '#111'; g.beginPath(); g.arc(x - 21, suelo - 27, 1.5, 0, 6.284); g.fill();
    g.lineCap = 'butt';
}
