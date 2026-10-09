"use strict";

// ---------------------------------------------------------------------------
//  8. MUNDO 2D — estructuras
// ---------------------------------------------------------------------------
const SUELO_Y = 430;        // altura de la superficie del suelo base
const ALTO_SUELO = 130;
const ANCHO_CHUNK = 560;
const CELDA_G = 128;        // ancho de columna para la rejilla espacial

// Límites derivados de la física real del jugador. Se usan para VALIDAR el
// nivel generado: si un hueco los supera, el nivel sería injugable.
const ALTURA_SALTO  = (CFG.salto * CFG.salto) / (2 * CFG.grav);            // ~119 px
const ALCANCE_SALTO = (2 * Math.abs(CFG.salto) / CFG.grav) * CFG.velMax;   // ~164 px
const MAX_HUECO  = Math.floor(ALCANCE_SALTO * 0.72);   // ~118 px — límite duro
const MAX_SUBIDA = Math.floor(ALTURA_SALTO  * 0.70);   // ~83 px  — límite duro
// Los generadores usan estos valores, no los límites duros: dejan un colchón
// para que un salto exigente nunca dependa de ejecutar el pixel perfecto.
const SALTO_SEGURO  = Math.floor(MAX_HUECO  * 0.85);   // ~100 px
const SUBIDA_SEGURA = Math.floor(MAX_SUBIDA * 0.86);   // ~71 px

/** Altura de una plataforma que DEBE poder alcanzarse desde `base`. */
function yDesde(base, minSalto) {
    return base - rndRango(minSalto === undefined ? 44 : minSalto, SUBIDA_SEGURA);
}

let plataformas = [];       // {x, y, ancho, alto, color, tipo}
let segmentosSuelo = [];    // {x0, x1, y} — se usa para validar la jugabilidad
let enemigos = [];
let monedas = [];
let barriles = [];
let charcos = [];
let criaderos = [];         // envases reales con agua: la FUENTE de los mosquitos
let proyectiles = [];
let decoraciones = [];
let meta = null;
let jefe = null;
let longitudNivel = 0;
let tokensAtaque = 0;
let nubes = [];
let entidadesActualizadas = 0;   // métrica del overlay de rendimiento

// Rejilla espacial de una dimensión (el mundo es largo y bajo): las plataformas
// se indexan por columna de 128 px, así la colisión no recorre las ~120 del nivel.
let columnas = [];
let sello = 0;
const bufCand = [];

function construirColumnas() {
    const nc = Math.ceil(longitudNivel / CELDA_G) + 2;
    columnas = new Array(nc);
    for (let i = 0; i < nc; i++) columnas[i] = [];
    for (const p of plataformas) {
        const a = clamp(Math.floor(p.x / CELDA_G), 0, nc - 1);
        const b = clamp(Math.floor((p.x + p.ancho) / CELDA_G), 0, nc - 1);
        for (let i = a; i <= b; i++) columnas[i].push(p);
    }
}
/** Plataformas que podrían solapar el rango [x, x+ancho]. Sin asignaciones. */
function candidatas(x, ancho) {
    bufCand.length = 0; sello++;
    const a = clamp(Math.floor(x / CELDA_G), 0, columnas.length - 1);
    const b = clamp(Math.floor((x + ancho) / CELDA_G), 0, columnas.length - 1);
    for (let i = a; i <= b; i++) {
        const c = columnas[i];
        for (let j = 0; j < c.length; j++) {
            const p = c[j];
            if (p._sello !== sello) { p._sello = sello; bufCand.push(p); }
        }
    }
    return bufCand;
}
function puntoSolido(x, y) {
    const c = candidatas(x, 1);
    for (let i = 0; i < c.length; i++) {
        const p = c[i];
        if (p.solida !== false && x >= p.x && x <= p.x + p.ancho && y >= p.y && y <= p.y + p.alto) return true;
    }
    return false;
}
/** Línea de vista aproximada: muestrea el segmento contra las plataformas. */
function hayParedEntre(x1, y1, x2, y2) {
    const pasos = 8;
    for (let i = 1; i < pasos; i++) {
        const t = i / pasos;
        if (puntoSolido(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return true;
    }
    return false;
}

// ---------------------------------------------------------------------------
//  8b. ARQUETIPOS DE ENEMIGO
// ---------------------------------------------------------------------------
const ARQUETIPOS = {
    zumbador: { vida: 2, ancho: 26, alto: 22, vel: 1.75, vision: 300, rangoAtaque: 195,
                carga: 26, cdAtaque: 78, color: '#e74c3c', colorP: COL.ROJO, valor: 1,
                embiste: true, vuela: true, radioSep: 42 },
    picador:  { vida: 2, ancho: 24, alto: 20, vel: 1.25, vision: 380, rangoAtaque: 300,
                carga: 30, cdAtaque: 105, color: '#8e44ad', colorP: COL.MORADO, valor: 2,
                dispara: true, vuela: true, distOrbita: 210, radioSep: 46 },
    enjambre: { vida: 1, ancho: 15, alto: 13, vel: 2.5, vision: 340, rangoAtaque: 150,
                carga: 14, cdAtaque: 52, color: '#e67e22', colorP: COL.NARANJA, valor: 1,
                embiste: true, vuela: true, radioSep: 26, boids: true },
    mutante:  { vida: 8, ancho: 44, alto: 42, vel: 0.95, vision: 360, rangoAtaque: 130,
                carga: 52, cdAtaque: 130, color: '#c0392b', colorP: COL.ROJO_OSC, valor: 4,
                areaAtaque: 105, vuela: true, radioSep: 60, explotaAlMorir: 68 }
};

function crearEnemigo(tipo, x, y) {
    const a = ARQUETIPOS[tipo];
    const escalaVida = 1 + (nivelActual - 1) * 0.22;
    const vida = Math.max(1, Math.round(a.vida * escalaVida));
    return {
        tipo, arq: a, x, y, ancho: a.ancho, alto: a.alto, vx: 0, vy: 0,
        vida, vidaMax: vida, vivo: true,
        est: 'patrulla', t: 0, hogarX: x, hogarY: y,
        memT: 0, ultX: x, ultY: y,
        cargaT: 0, cd: rndEnt(0, 60), aturdido: 0, flash: 0, token: false,
        selloRaqueta: -1,               // un impacto de raqueta por swing
        fase: rndRango(0, 6.28), escala: 1, dirX: 1, dirY: 0,
        radioPatrulla: rndRango(50, 110), gtiempo: rndRango(0, 100),
        // Cada mosquito porta un serotipo. El color de la banda del abdomen lo
        // delata: aprender a leerlo es aprender contra qué ya estás inmune.
        serotipo: serotipoDeNivel(nivelActual), origen: null
    };
}

// ---------------------------------------------------------------------------
//  8c. GENERACIÓN PROCEDURAL 2D — plantillas de chunk
//      Cada plantilla escribe sus propias plataformas y su propio contenido.
//      Los huecos son AUSENCIA de plataforma, nunca una bandera.
// ---------------------------------------------------------------------------
const VERDE_SUELO = '#2f7d4f', VERDE_TOPE = '#43a26a';
const LADRILLO = '#a0522d', LADRILLO_TOPE = '#c26a3a';
const PIEDRA = '#6b7a8f', PIEDRA_TOPE = '#8fa1b5';

function addSuelo(x0, x1, y) {
    if (x1 <= x0) return;
    plataformas.push({ x: x0, y, ancho: x1 - x0, alto: ALTO_SUELO + (SUELO_Y - y),
                       color: VERDE_SUELO, tope: VERDE_TOPE, tipo: 'suelo' });
    segmentosSuelo.push({ x0, x1, y });
}
function addPlata(x, y, ancho, alto, color, tope) {
    plataformas.push({ x, y, ancho, alto: alto || 18, color: color || LADRILLO,
                       tope: tope || LADRILLO_TOPE, tipo: 'plataforma' });
}
function addMuro(x, y, ancho, alto) {
    plataformas.push({ x, y, ancho, alto, color: PIEDRA, tope: PIEDRA_TOPE, tipo: 'muro' });
}
function addMoneda(x, y)   { monedas.push({ x, y, r: 9, recogida: false, fase: rndRango(0, 6.28) }); }
function addBarril(x, y)   { barriles.push({ x: x - 15, y: y - 34, ancho: 30, alto: 34, vivo: true, t: rndRango(0,6.28), fusible: 0 }); }
function addCharco(x, ancho, y) {
    charcos.push({ x, y: y - 8, ancho, alto: 12, fase: rndRango(0,6.28) });
}

/** Un criadero es un envase concreto con su medida correcta. Mientras esté activo
 *  repone mosquitos sin fin: por eso matar adultos no cierra un nivel. */
function addCriadero(tipo, x, y) {
    const d = CRIADEROS[tipo];
    // La primera cría tarda más: es la ventana para cerrarlo antes de que nazca
    // un solo mosquito (CICLO_PRIMERO, 11b).
    const prod = CICLO_PRIMERO + rndRango(0, 90);
    criaderos.push({
        tipo, verbo: d.verbo, x: x - d.ancho / 2, y: y - d.alto, ancho: d.ancho, alto: d.alto,
        activo: true, neutralizado: false, vaciado: false, tRevive: 0,
        conVerbo: null,                       // con qué se neutralizó, para el reporte
        prod, prodMax: prod, producidos: 0, vivos: 0,  // ciclo de cría, total y descendencia viva
        radio: 250,                           // zona de vuelo de su descendencia
        fase: rndRango(0, 6.28), sacude: 0
    });
}

function addEnemigo(tipo, x, y) { enemigos.push(crearEnemigo(tipo, x, y)); }
function addDeco(tipo, x, y) { decoraciones.push({ tipo, x, y, fase: rndRango(0, 6.28) }); }

/** Mezcla de enemigos permitida según el nivel: la dificultad sube con la variedad. */
function tiposDisponibles() {
    const t = [{ t: 'zumbador', peso: 10 }];
    if (nivelActual >= 1) t.push({ t: 'enjambre', peso: 5 });
    if (nivelActual >= 3) t.push({ t: 'picador',  peso: 8 });
    if (nivelActual >= 4) t.push({ t: 'mutante',  peso: 5 });
    return t;
}
function tipoEnemigoAleatorio() { return rndPesos(tiposDisponibles()).t; }

/** Envase que toca en este nivel: van de lo obvio a lo que nadie revisa. */
function envaseDeNivel() {
    const l = CRIADEROS_POR_NIVEL[nivelActual] || CRIADEROS_POR_NIVEL[5];
    return l[Math.floor(rnd() * l.length)];
}

// --- Plantillas -------------------------------------------------------------
// Cada una recibe (x0, ancho) y devuelve la altura del suelo con la que termina,
// para que el siguiente chunk enlace sin escalones imposibles.
const PLANTILLAS = {
    llano(x0, w, yIn) {
        addSuelo(x0, x0 + w, yIn);
        if (rndProb(0.6)) {
            const px = x0 + rndRango(w * 0.2, w * 0.55);
            const py = yDesde(yIn);
            addPlata(px, py, rndRango(90, 150));
            if (rndProb(0.65)) addMoneda(px + 40, py - 24);
            if (rndProb(0.4)) {                       // segundo nivel, encadenado al primero
                const py2 = yDesde(py, 34);
                addPlata(px + rndRango(70, 130), py2, 100);
                addMoneda(px + rndRango(70, 130) + 50, py2 - 24);
            }
        }
        if (rndProb(0.55)) addEnemigo(tipoEnemigoAleatorio(), x0 + rndRango(120, w - 120), yIn - rndRango(70, 160));
        for (let i = 0; i < rndEnt(1, 3); i++) addMoneda(x0 + rndRango(60, w - 60), yIn - rndRango(30, 90));
        if (rndProb(0.5)) addDeco('arbusto', x0 + rndRango(40, w - 40), yIn);
        return yIn;
    },

    hueco(x0, w, yIn) {
        const g = rndEnt(70, SALTO_SEGURO);
        const hx = x0 + (w - g) / 2;
        addSuelo(x0, hx, yIn);
        addSuelo(hx + g, x0 + w, yIn);
        // Plataforma-red opcional sobre el hueco: alternativa segura al salto.
        if (rndProb(0.5)) addPlata(hx + g * 0.15, yDesde(yIn), g * 0.7);
        addMoneda(hx + g / 2, yIn - 46);
        addMoneda(hx + g / 2 - 26, yIn - 64);
        addMoneda(hx + g / 2 + 26, yIn - 64);
        if (rndProb(0.6)) addEnemigo(rndProb(0.5) ? 'zumbador' : tipoEnemigoAleatorio(), hx + g / 2, yIn - 120);
        return yIn;
    },

    doble_hueco(x0, w, yIn) {
        const g = rndEnt(66, SALTO_SEGURO);
        const isla = rndRango(90, 130);
        const inicio = x0 + (w - (g * 2 + isla)) / 2;
        addSuelo(x0, inicio, yIn);
        addSuelo(inicio + g, inicio + g + isla, yIn);
        addSuelo(inicio + g * 2 + isla, x0 + w, yIn);
        addMoneda(inicio + g / 2, yIn - 50);
        addMoneda(inicio + g + isla / 2, yIn - 40);
        addMoneda(inicio + g * 1.5 + isla, yIn - 50);
        if (rndProb(0.7)) addEnemigo(tipoEnemigoAleatorio(), inicio + g + isla / 2, yIn - 100);
        if (rndProb(0.4)) addBarril(inicio + g + isla / 2, yIn);
        return yIn;
    },

    escalera(x0, w, yIn) {
        const sube = rndProb(0.5) ? 1 : -1;
        const pasos = 3;
        const alturaPaso = rndRango(44, SUBIDA_SEGURA);
        let y = yIn;
        const anchoPaso = w / (pasos + 1);
        addSuelo(x0, x0 + anchoPaso, y);
        for (let i = 1; i <= pasos; i++) {
            const ny = clamp(y - sube * alturaPaso, 190, SUELO_Y + 20);
            addSuelo(x0 + anchoPaso * i, x0 + anchoPaso * (i + 1), ny);
            if (rndProb(0.6)) addMoneda(x0 + anchoPaso * i + anchoPaso / 2, ny - 34);
            y = ny;
        }
        if (rndProb(0.6)) addEnemigo(tipoEnemigoAleatorio(), x0 + w * 0.6, y - 90);
        return y;
    },

    torre(x0, w, yIn) {
        addSuelo(x0, x0 + w, yIn);
        const tw = rndRango(58, 84), th = rndRango(110, 190);
        const tx = x0 + w * 0.52;
        addMuro(tx, yIn - th, tw, th);       // bloque sólido que llega hasta el suelo
        // La torre corta el paso a ras de suelo, así que la escalera lateral no
        // es decoración: se calculan tantos peldaños como exija su altura.
        const peldanos = Math.max(1, Math.ceil(th / SUBIDA_SEGURA));
        const anchoP = 66;
        for (let i = 1; i <= peldanos; i++) {
            const py = yIn - (th * i) / peldanos;
            const px = tx - anchoP - 4 - (peldanos - i) * (anchoP - 6);
            addPlata(px, py, anchoP);
            if (rndProb(0.45)) addMoneda(px + anchoP / 2, py - 24);
        }
        addMoneda(tx + tw / 2, yIn - th - 28);
        addMoneda(tx + tw / 2 - 24, yIn - th - 46);
        addMoneda(tx + tw / 2 + 24, yIn - th - 46);
        if (rndProb(0.75)) addEnemigo(nivelActual >= 3 ? 'picador' : 'zumbador', tx + tw / 2, yIn - th - 70);
        return yIn;
    },

    flotantes(x0, w, yIn) {
        const g = rndRango(240, 320);
        const hx = x0 + (w - g) / 2;
        addSuelo(x0, hx, yIn);
        addSuelo(hx + g, x0 + w, yIn);
        // Cadena de islas: cada altura se encadena con la ANTERIOR, no con el
        // suelo, así ninguna queda fuera del alcance de un salto.
        const n = 3, paso = g / (n + 1), anchoP = 92;
        let prevY = yIn;
        for (let i = 1; i <= n; i++) {
            const px = hx + paso * i - anchoP / 2;
            const py = clamp(prevY - rndRango(-40, SUBIDA_SEGURA), 170, yIn - 40);
            addPlata(px, py, anchoP, 16, '#7f8c8d', '#a4b0be');
            addMoneda(px + anchoP / 2, py - 28);
            if (i === 2 && rndProb(0.6)) addEnemigo('enjambre', px + anchoP / 2, py - 70);
            prevY = py;
        }
        return yIn;
    },

    arena(x0, w, yIn) {
        addSuelo(x0, x0 + w, yIn);
        addMuro(x0 + 12, yIn - 46, 20, 46);                  // parapetos bajos, saltables
        addMuro(x0 + w - 32, yIn - 46, 20, 46);
        const y1 = yDesde(yIn), y2 = yDesde(y1, 34);
        addPlata(x0 + w * 0.24, y1, 110);
        addPlata(x0 + w * 0.56, y2, 110);
        const n = rndEnt(2, 2 + Math.min(3, nivelActual));
        for (let i = 0; i < n; i++)
            addEnemigo(tipoEnemigoAleatorio(), x0 + rndRango(70, w - 70), yIn - rndRango(60, 190));
        addMoneda(x0 + w * 0.28, y1 - 26);
        addMoneda(x0 + w * 0.60, y2 - 26);
        addMoneda(x0 + rndRango(80, w - 80), yIn - rndRango(40, 90));
        if (rndProb(0.6)) addBarril(x0 + w * 0.5, yIn);
        return yIn;
    },

    criadero(x0, w, yIn) {
        addSuelo(x0, x0 + w, yIn);
        const cx = x0 + w * 0.5;
        addCharco(x0 + w * 0.2, w * 0.6, yIn);               // agua estancada
        // Dos envases distintos: obliga a reconocer que cada uno lleva su medida.
        addCriadero(envaseDeNivel(), cx - 70, yIn);
        addCriadero(envaseDeNivel(), cx + 80, yIn);
        addBarril(cx, yIn);
        const y1 = yDesde(yIn), y2 = yDesde(y1, 34);
        addPlata(x0 + w * 0.30, y1, 120);
        addPlata(x0 + w * 0.52, y2, 110);
        addMoneda(x0 + w * 0.36, y1 - 26);
        addMoneda(x0 + w * 0.57, y2 - 26);
        addMoneda(x0 + w * 0.62, y2 - 26);
        return yIn;
    },

    tesoro(x0, w, yIn) {
        addSuelo(x0, x0 + w, yIn);
        const y1 = yDesde(yIn);                              // repisas de acceso
        addPlata(x0 + w * 0.10, y1, 84);
        addPlata(x0 + w * 0.76, y1, 84);
        const y2 = yDesde(y1, 34);                           // botín, un salto por encima
        addPlata(x0 + w * 0.30, y2, w * 0.4, 18, '#b8860b', '#e0b040');
        for (let i = 0; i < 6; i++) addMoneda(x0 + w * 0.33 + i * (w * 0.34 / 5), y2 - 28);
        addBarril(x0 + w * 0.5, yIn);
        if (rndProb(0.7)) addEnemigo('picador', x0 + w * 0.5, y2 - 90);
        return yIn;
    }
};

/** Tabla de pesos: los chunks difíciles ganan peso conforme sube el nivel. */
function tablaChunks() {
    const n = nivelActual;
    return [
        { k: 'llano',       peso: Math.max(4, 16 - n * 3) },
        { k: 'hueco',       peso: 8 + n },
        { k: 'doble_hueco', peso: n >= 2 ? 5 + n : 0 },
        { k: 'escalera',    peso: 7 },
        { k: 'torre',       peso: 4 + n },
        { k: 'flotantes',   peso: n >= 2 ? 4 + n : 1 },
        { k: 'arena',       peso: 3 + n * 2 },
        { k: 'criadero',    peso: n >= 2 ? 5 : 2 },
        { k: 'tesoro',      peso: 4 }
    ].filter(e => e.peso > 0);
}

/** Comprueba y REPARA el nivel: ningún hueco puede superar la física del jugador.
 *  Es la red de seguridad de todo el sistema procedural. */
function validarNivel() {
    segmentosSuelo.sort((a, b) => a.x0 - b.x0);
    let reparaciones = 0;
    const ANCHO_P = 96;

    for (let i = 0; i < segmentosSuelo.length - 1; i++) {
        const a = segmentosSuelo[i], b = segmentosSuelo[i + 1];
        const hueco = b.x0 - a.x1;
        const subida = a.y - b.y;               // > 0 = el siguiente está más alto
        if (hueco <= SALTO_SEGURO && subida <= SUBIDA_SEGURA) continue;

        // Cuántos apoyos hacen falta. Con k plataformas de ancho W repartidas,
        // cada salto mide (hueco - k*W)/(k+1); se despeja la k mínima que lo
        // mantiene bajo SALTO_SEGURO. Un único puente centrado NO basta: para
        // huecos grandes queda justo en el límite del salto máximo.
        let k = Math.max(0, Math.ceil((hueco - SALTO_SEGURO) / (SALTO_SEGURO + ANCHO_P)));
        // …y, si además hay que subir, tantos peldaños como exija el desnivel.
        if (subida > SUBIDA_SEGURA) k = Math.max(k, Math.ceil(subida / SUBIDA_SEGURA));
        k = Math.max(1, Math.min(k, 6));

        const libre = Math.max(0, hueco - k * ANCHO_P);
        let prevY = a.y;
        for (let j = 1; j <= k; j++) {
            // Reparto uniforme; con huecos estrechos las plataformas se solapan
            // en X y forman una escalera vertical, que también es transitable.
            const px = a.x1 + (libre * j) / (k + 1) + ANCHO_P * (j - 1);
            let py = lerp(a.y, b.y, j / (k + 1)) - 40;
            py = Math.max(py, prevY - SUBIDA_SEGURA);        // nunca un peldaño imposible
            addPlata(px, py, ANCHO_P, 16, '#7f8c8d', '#a4b0be');
            prevY = py;
            reparaciones++;
        }
    }
    // Ninguna moneda debe quedar dentro de un bloque sólido.
    for (const m of monedas) {
        let intentos = 0;
        while (puntoSolido(m.x, m.y) && intentos++ < 12) m.y -= 16;
    }
    return reparaciones;
}

function generarNivel2D(n) {
    sembrarNivel(n);
    plataformas = []; segmentosSuelo = []; enemigos = []; monedas = [];
    barriles = []; charcos = []; criaderos = []; proyectiles = []; decoraciones = [];
    meta = null; jefe = null; tokensAtaque = 0;
    limpiarParticulas();

    const numChunks = n === 1 ? 6 : (n === 4 ? 10 : 8);
    longitudNivel = ANCHO_CHUNK * (numChunks + 2);

    // Chunk de entrada: siempre llano y sin enemigos, para no morir al aparecer.
    addSuelo(0, ANCHO_CHUNK, SUELO_Y);
    addDeco('cartel', 150, SUELO_Y);
    let y = SUELO_Y;
    const tabla = tablaChunks();
    let ultima = '';

    for (let i = 0; i < numChunks; i++) {
        let k = rndPesos(tabla).k;
        if (k === ultima && rndProb(0.75)) k = rndPesos(tabla).k;   // evita repetir seguido
        ultima = k;
        y = PLANTILLAS[k](ANCHO_CHUNK * (i + 1), ANCHO_CHUNK, y);
    }

    // Chunk final: plano y despejado, con la puerta o el jefe.
    const xFin = ANCHO_CHUNK * (numChunks + 1);
    addSuelo(xFin, longitudNivel, y);

    if (n === 4) {
        jefe = {
            x: xFin + 260, y: y - 150, ancho: 92, alto: 110,
            vida: 26, vidaMax: 26, escudo: true, fase: 1, t: 0, cd: 90,
            flash: 0, muerto: false, cargaT: 0, selloRaqueta: -1,
            // Fase 2: dos patrones que se alternan, con su propia telegrafía.
            patron: 0, patronT: 0, telegrafiaT: 0, embisteVX: 0, embisteY: 0,
            andanadas: 0, giroAnillo: 0, aturdido: 0, invocaCd: 0, sueloY: y,
            // Límites de la arena: la embestida termina estrellándose contra uno.
            x0: xFin + 30, x1: longitudNivel - 30
        };
        addPlata(xFin + 90, y - 110, 100);
        addPlata(xFin + 420, y - 110, 100);
    } else {
        meta = { x: longitudNivel - 200, y: y - 84, ancho: 56, alto: 84, t: 0 };
    }

    // Todo nivel tiene criaderos, salga o no el chunk que los trae. Sin fuente
    // que cerrar no hay lección: el nivel volvería a ser "mata todo lo que vuela".
    const minCriaderos = 2 + Math.floor(n / 2);
    let intentos = 0;
    while (criaderos.length < minCriaderos && intentos++ < 80) {
        const s = segmentosSuelo[rndEnt(1, Math.max(1, segmentosSuelo.length - 1))];
        if (!s || s.x1 - s.x0 < 140) continue;
        const cx = rndRango(s.x0 + 70, s.x1 - 70);
        if (criaderos.some(c => Math.abs(c.x + c.ancho / 2 - cx) < 170)) continue;
        addCriadero(envaseDeNivel(), cx, s.y);
    }

    // La rejilla debe existir ANTES de validar: validarNivel consulta plataformas
    // para desatascar monedas. Si aparecen puentes, se reconstruye.
    construirColumnas();
    const reparaciones = validarNivel();
    if (reparaciones > 0) construirColumnas();

    // Nubes de fondo (parallax en 3 capas)
    nubes = [];
    for (let i = 0; i < 70; i++)
        nubes.push({ x: rndRango(0, longitudNivel), y: rndRango(30, 220),
                     w: rndRango(70, 190), h: rndRango(22, 48), capa: rndEnt(0, 2) });

    jugador.x = 90; jugador.y = SUELO_Y - 60;
    reiniciarJugador(false);
    camX = 0; camY = 0;

    return reparaciones;
}

