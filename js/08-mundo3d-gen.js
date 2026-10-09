"use strict";

// ===========================================================================
//  9. MUNDO 3D — generación por salas, muros instanciados y combate
// ===========================================================================
let scene, camera3D, renderer;
let grupoNivel = null;
let murosInst = null;
let mosquitos3D = [], monedas3D = [], proy3D = [], tinacos3D = [];
let criaderos3D = [];       // mismos envases que en 2D, con su mismo verbo
let meta3D = null, luzMeta = null;
let raqueta3D = null, mallaRaqueta = null, luzRaqueta = null;
let bobCam = 0, kickCam = 0, sacudida3D = 0;

// Desde file:// (abrir index.html con doble clic) TextureLoader pide la imagen
// con CORS y el navegador la bloquea: la textura queda vacía, el mosquito sale
// negro y la consola marca el error. En ese caso el 3D se queda con materiales de
// color, como antes. (El 2D no tiene el problema: un <img> normal sí carga.)
const TEXTURAS_3D = location.protocol !== 'file:';
const cargarTextura3D = ruta => TEXTURAS_3D ? new THREE.TextureLoader().load(ruta) : null;

// Sin ajuste de espacio de color: en r128 el renderer sale en lineal y las
// texturas lineales se ven tal cual (THREE.SRGBColorSpace no existe hasta r152).
const texturasEnemigos3D = {
    base: cargarTextura3D('assets/textures/enemy_base.png'),
    mini: cargarTextura3D('assets/textures/enemy_mini.png'),
    giant: cargarTextura3D('assets/textures/enemy_giant.png')
};
function texturaEnemigo3D(tipo) {
    if (tipo === 'enjambre') return texturasEnemigos3D.mini;
    if (tipo === 'mutante') return texturasEnemigos3D.giant;
    return texturasEnemigos3D.base;
}
const BLANCO3 = new THREE.Color(0xffffff);

const GW = 46, GH = 46;          // celdas de la rejilla del mapa
const CELDA3 = 3.2;              // unidades de mundo por celda
const ALTO_MURO = 4.6;
const RADIO_JUG = 0.55;
let mapa = new Uint8Array(GW * GH);
let salas = [];
let metaAbierta = true;

const gx2x = gx => (gx - GW / 2) * CELDA3;
const gz2z = gz => (gz - GH / 2) * CELDA3;
const x2gx = x => Math.floor(x / CELDA3 + GW / 2);
const z2gz = z => Math.floor(z / CELDA3 + GH / 2);

function celdaSolida(gx, gz) {
    if (gx < 0 || gz < 0 || gx >= GW || gz >= GH) return true;
    return mapa[gz * GW + gx] === 0;
}
const solidoMundo = (x, z) => celdaSolida(x2gx(x), z2gz(z));
/** Colisión del jugador: consulta O(1) sobre la rejilla, no recorre los muros. */
function chocaCirculo(x, z, r) {
    return solidoMundo(x - r, z) || solidoMundo(x + r, z) ||
           solidoMundo(x, z - r) || solidoMundo(x, z + r) ||
           solidoMundo(x - r * .7, z - r * .7) || solidoMundo(x + r * .7, z + r * .7) ||
           solidoMundo(x - r * .7, z + r * .7) || solidoMundo(x + r * .7, z - r * .7);
}
/** Línea de vista 3D: muestrea celdas entre dos puntos. */
function visible3D(x1, z1, x2, z2) {
    const d = Math.hypot(x2 - x1, z2 - z1);
    const pasos = Math.min(26, Math.ceil(d / (CELDA3 * 0.55)));
    for (let i = 1; i < pasos; i++) {
        const t = i / pasos;
        if (solidoMundo(x1 + (x2 - x1) * t, z1 + (z2 - z1) * t)) return false;
    }
    return true;
}

// --- Partículas 3D: un único THREE.Points para toda la escena ---------------
const MAX_P3 = 1800;
const P3 = {
    pos: new Float32Array(MAX_P3 * 3), col: new Float32Array(MAX_P3 * 3),
    vx: new Float32Array(MAX_P3), vy: new Float32Array(MAX_P3), vz: new Float32Array(MAX_P3),
    vida: new Float32Array(MAX_P3), vidaMax: new Float32Array(MAX_P3),
    r: new Float32Array(MAX_P3), g: new Float32Array(MAX_P3), b: new Float32Array(MAX_P3),
    grav: new Float32Array(MAX_P3), n: 0
};
let geoP3 = null, puntos3D = null;

function emitir3D(x, y, z, vx, vy, vz, vida, r, g, b, grav) {
    const i = P3.n;
    if (i >= MAX_P3) return;
    P3.pos[i*3] = x; P3.pos[i*3+1] = y; P3.pos[i*3+2] = z;
    P3.vx[i] = vx; P3.vy[i] = vy; P3.vz[i] = vz;
    P3.vida[i] = vida; P3.vidaMax[i] = vida;
    P3.r[i] = r; P3.g[i] = g; P3.b[i] = b; P3.grav[i] = grav === undefined ? -0.004 : grav;
    P3.n++;
}
function matarP3(i) {
    const u = --P3.n;
    if (i !== u) {
        P3.pos[i*3]=P3.pos[u*3]; P3.pos[i*3+1]=P3.pos[u*3+1]; P3.pos[i*3+2]=P3.pos[u*3+2];
        P3.vx[i]=P3.vx[u]; P3.vy[i]=P3.vy[u]; P3.vz[i]=P3.vz[u];
        P3.vida[i]=P3.vida[u]; P3.vidaMax[i]=P3.vidaMax[u];
        P3.r[i]=P3.r[u]; P3.g[i]=P3.g[u]; P3.b[i]=P3.b[u]; P3.grav[i]=P3.grav[u];
    }
}
function actualizarParticulas3D(dt) {
    for (let i = P3.n - 1; i >= 0; i--) {
        P3.vida[i] -= dt;
        if (P3.vida[i] <= 0) { matarP3(i); continue; }
        P3.vy[i] += P3.grav[i] * dt;
        P3.pos[i*3]   += P3.vx[i] * dt;
        P3.pos[i*3+1] += P3.vy[i] * dt;
        P3.pos[i*3+2] += P3.vz[i] * dt;
        // El desvanecido se hace con el color (mezcla aditiva): a negro = invisible.
        const t = P3.vida[i] / P3.vidaMax[i];
        P3.col[i*3] = P3.r[i] * t; P3.col[i*3+1] = P3.g[i] * t; P3.col[i*3+2] = P3.b[i] * t;
    }
    if (geoP3) {
        geoP3.attributes.position.needsUpdate = true;
        geoP3.attributes.color.needsUpdate = true;
        geoP3.setDrawRange(0, P3.n);
    }
}
function fxExplosion3D(x, y, z, radio, r, g, b) {
    const n = Math.min(150, 50 + Math.floor(radio * 22));
    for (let i = 0; i < n; i++) {
        const th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1);
        const v = radio * (0.02 + Math.random() * 0.075);
        emitir3D(x, y, z,
            Math.sin(ph) * Math.cos(th) * v, Math.cos(ph) * v, Math.sin(ph) * Math.sin(th) * v,
            26 + Math.random() * 26,
            Math.random() < 0.5 ? 1 : r, Math.random() < 0.5 ? 0.75 : g, Math.random() < 0.4 ? 0.3 : b, -0.006);
    }
    anillo3D(x, y, z, radio * 2.4, 0xffb347);
}
function fxChispas3D(x, y, z, n, r, g, b, fuerza) {
    for (let i = 0; i < n; i++) {
        const th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1);
        const v = fuerza * (0.3 + Math.random());
        emitir3D(x, y, z, Math.sin(ph)*Math.cos(th)*v, Math.cos(ph)*v, Math.sin(ph)*Math.sin(th)*v,
                 18 + Math.random() * 16, r, g, b, -0.008);
    }
}

// --- Anillos de choque 3D (pool de mallas reutilizadas) ---------------------
const MAX_ANILLOS = 8;
let anillos = [];
function anillo3D(x, y, z, rMax, color) {
    for (const a of anillos) {
        if (a.libre) {
            a.libre = false; a.r = 0.2; a.rMax = rMax; a.t = 1;
            a.mesh.position.set(x, y, z);
            a.mesh.material.color.setHex(color);
            a.mesh.visible = true;
            return;
        }
    }
}
function actualizarAnillos(dt) {
    for (const a of anillos) {
        if (a.libre) continue;
        a.r += (a.rMax - a.r) * 0.14 * dt + 0.06 * dt;
        a.t -= 0.035 * dt;
        a.mesh.scale.setScalar(a.r);
        a.mesh.material.opacity = Math.max(0, a.t) * 0.75;
        a.mesh.lookAt(camera3D.position);
        if (a.t <= 0 || a.r >= a.rMax - 0.05) { a.libre = true; a.mesh.visible = false; }
    }
}

// --- Motor -----------------------------------------------------------------
function iniciarMotor3D() {
    const cont = document.getElementById('container3d');
    scene = new THREE.Scene();
    // Mismo cielo diurno que el mundo 2D: las dos dimensiones deben leerse
    // como el mismo Aguascalientes, no como dos juegos distintos.
    scene.background = new THREE.Color(0x8fc4e8);
    // La niebla tiene que llegar mas lejos que la distancia tipica entre salas.
    // Con far=74 en un mapa de 147 unidades de lado se podia aparecer mirando
    // una pared de bruma con el nivel entero detras, sin nada que dibujar.
    scene.fog = new THREE.Fog(0x8fc4e8, 26, 130);

    camera3D = new THREE.PerspectiveCamera(74, ANCHO / ALTO, 0.1, 400);
    camera3D.rotation.order = 'YXZ';
    // La cámara va DENTRO de la escena: three.js recorre el grafo desde scene, y
    // si la cámara queda fuera, sus hijos (el viewmodel de la raqueta) no se
    // dibujan nunca. Colgarla aquí también hace que la raqueta sobreviva a
    // limpiarNivel3D sin tener que reconstruirla en cada nivel.
    scene.add(camera3D);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(ANCHO, ALTO);
    cont.innerHTML = '';
    cont.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xdce9f5, 0.62));
    const dir = new THREE.DirectionalLight(0xfff2d6, 0.95);
    dir.position.set(12, 26, 8);
    scene.add(dir);
    scene.add(new THREE.HemisphereLight(0xbfe4ff, 0x2c5c3c, 0.38));

    // Sistema de partículas: una sola geometría, una sola draw call.
    geoP3 = new THREE.BufferGeometry();
    geoP3.setAttribute('position', new THREE.BufferAttribute(P3.pos, 3));
    geoP3.setAttribute('color', new THREE.BufferAttribute(P3.col, 3));
    geoP3.setDrawRange(0, 0);
    puntos3D = new THREE.Points(geoP3, new THREE.PointsMaterial({
        size: 0.26, vertexColors: true, transparent: true, opacity: 0.95,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    }));
    puntos3D.frustumCulled = false;
    scene.add(puntos3D);

    const geoAnillo = new THREE.RingGeometry(0.86, 1, 36);
    for (let i = 0; i < MAX_ANILLOS; i++) {
        const m = new THREE.Mesh(geoAnillo, new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false
        }));
        m.visible = false;
        scene.add(m);
        anillos.push({ mesh: m, libre: true, r: 0, rMax: 1, t: 0 });
    }

    crearRaqueta3D();

    renderer.domElement.addEventListener('click', () => capturarRaton3D(true));
}

/**
 * Captura el ratón para mirar en 3D. Se llama al entrar a un nivel 3D, al volver
 * de la pausa, la tienda o el fichero, y con cualquier tecla: así no hace falta
 * el clic extra. El navegador solo lo permite dentro de un gesto (clic o tecla);
 * fuera de uno —la transición al nivel 5, el botón A del mando— lo rechaza y se
 * queda el aviso de «haz clic». Con el panel de Güero abierto solo captura un
 * clic sobre la vista (`aunConGuero`): ahí el ratón hace falta para elegir.
 */
function capturarRaton3D(aunConGuero) {
    if (estado !== estados.J3D || !renderer || document.pointerLockElement) return;
    if (tiendaAbierta() || ficheroAbierto()) return;
    const pg = document.getElementById('panel-guero');
    if (!aunConGuero && pg && !pg.classList.contains('oculto')) return;
    const p = renderer.domElement.requestPointerLock();
    if (p && p.catch) p.catch(() => {});      // rechazado fuera de un gesto: no pasa nada
}

// Las dos poses del viewmodel. El barrido cruza la vista pero se detiene antes
// del centro: la mira nunca queda tapada, que es la diferencia entre un
// viewmodel y un estorbo. Las usa actualizarRaqueta3D en 09.
const RAQ_REPOSO = { px: 0.50, py: -0.44, pz: -0.86, rx: 0.20, ry: 0.34, rz: -0.55 };
const RAQ_GOLPE  = { px: 0.05, py: -0.24, pz: -0.78, rx: -0.16, ry: -0.52, rz: 1.15 };

/** Viewmodel de la raqueta: mango, marco, rejilla y una luz que solo enciende
 *  en el golpe. Cuelga de la cámara, así que se mueve con la mirada sin coste. */
function crearRaqueta3D() {
    raqueta3D = new THREE.Group();

    const mango = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.34, 0.055),
        new THREE.MeshLambertMaterial({ color: 0x4e342e })
    );
    mango.position.y = -0.2;
    raqueta3D.add(mango);

    const marco = new THREE.Mesh(
        new THREE.TorusGeometry(0.23, 0.028, 8, 26),
        new THREE.MeshLambertMaterial({ color: 0x16a085 })
    );
    raqueta3D.add(marco);

    // La rejilla: un plano translúcido aditivo. Al encenderse es todo el efecto.
    mallaRaqueta = new THREE.Mesh(
        new THREE.CircleGeometry(0.215, 22),
        new THREE.MeshBasicMaterial({
            color: 0x7bed9f, transparent: true, opacity: 0.16,
            side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending
        })
    );
    raqueta3D.add(mallaRaqueta);

    luzRaqueta = new THREE.PointLight(0xf1c40f, 0, 6);
    luzRaqueta.position.set(0, 0, 0.2);
    raqueta3D.add(luzRaqueta);

    // A tamaño 1 la raqueta ocupaba el 74% del alto de la pantalla y tapaba la
    // mira. Un viewmodel tiene que leerse en la periferia, no ser el plano.
    raqueta3D.scale.setScalar(0.5);
    raqueta3D.position.set(RAQ_REPOSO.px, RAQ_REPOSO.py, RAQ_REPOSO.pz);
    raqueta3D.rotation.set(RAQ_REPOSO.rx, RAQ_REPOSO.ry, RAQ_REPOSO.rz);
    raqueta3D.renderOrder = 999;
    camera3D.add(raqueta3D);
}

/** Libera geometrías y materiales del nivel anterior: sin esto la GPU se llena
 *  tras varias regeneraciones (Three.js no libera solo). */
function limpiarNivel3D() {
    if (grupoNivel) {
        grupoNivel.traverse(o => {
            if (o.geometry) o.geometry.dispose();
            if (o.material) {
                if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
                else o.material.dispose();
            }
        });
        scene.remove(grupoNivel);
    }
    grupoNivel = new THREE.Group();
    scene.add(grupoNivel);
    mosquitos3D = []; monedas3D = []; proy3D = []; tinacos3D = []; criaderos3D = [];
    meta3D = null; murosInst = null; P3.n = 0;
    reiniciarGuero();          // su malla vive en grupoNivel: ya quedó liberada
    reiniciarIvan();
    limpiarGancho3D();         // no puede seguir jalando hacia un mosquito del nivel anterior
    for (const a of anillos) { a.libre = true; a.mesh.visible = false; }
}

// --- Generación del mapa ---------------------------------------------------
function excavarRect(gx, gz, w, h) {
    for (let z = gz; z < gz + h; z++)
        for (let x = gx; x < gx + w; x++)
            if (x >= 0 && z >= 0 && x < GW && z < GH) mapa[z * GW + x] = 1;
}
function excavarPasillo(ax, az, bx, bz, ancho) {
    const w = ancho || 2;
    const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx);
    const z0 = Math.min(az, bz), z1 = Math.max(az, bz);
    excavarRect(x0, az - ((w / 2) | 0), x1 - x0 + 1, w);   // tramo horizontal
    excavarRect(bx - ((w / 2) | 0), z0, w, z1 - z0 + 1);   // tramo vertical
}

function generarMapa3D(n) {
    mapa.fill(0);
    salas = [];
    const numSalas = 5 + Math.min(4, n);
    let intentos = 0;

    // Las salas se siembran PEGADAS a una que ya exista, no repartidas por toda
    // la rejilla. Con reparto uniforme el mapa se estiraba 147 unidades mientras
    // la vista llega a 130, y una de cada cinco partidas empezaba en un cuarto
    // vacio sin nada visible alrededor: el "nivel en blanco".
    const SEP_MIN = 8, SEP_MAX = 13;          // celdas entre centros de sala
    while (salas.length < numSalas && intentos++ < 600) {
        const w = rndEnt(6, 11), h = rndEnt(6, 11);
        let gx, gz;
        if (salas.length === 0) {
            gx = ((GW - w) >> 1) + rndEnt(-3, 3);
            gz = ((GH - h) >> 1) + rndEnt(-3, 3);
        } else {
            const base = salas[rndEnt(0, salas.length - 1)];
            const a = rnd() * 6.283, r = rndRango(SEP_MIN, SEP_MAX);
            gx = Math.round(base.cx + Math.cos(a) * r - w / 2);
            gz = Math.round(base.cz + Math.sin(a) * r - h / 2);
        }
        gx = clamp(gx, 2, GW - w - 3);
        gz = clamp(gz, 2, GH - h - 3);
        // Rechaza si se solapa con otra sala (margen de 2 celdas).
        let libre = true;
        for (const s of salas)
            if (gx < s.gx + s.w + 2 && gx + w + 2 > s.gx && gz < s.gz + s.h + 2 && gz + h + 2 > s.gz)
                { libre = false; break; }
        if (!libre) continue;
        salas.push({ gx, gz, w, h, cx: gx + (w >> 1), cz: gz + (h >> 1), vecinas: [], tipo: 'arena' });
    }

    for (const s of salas) excavarRect(s.gx, s.gz, s.w, s.h);
    // Cada sala se conecta con la anterior: garantiza que el grafo es conexo.
    for (let i = 1; i < salas.length; i++) {
        excavarPasillo(salas[i - 1].cx, salas[i - 1].cz, salas[i].cx, salas[i].cz, rndEnt(2, 3));
        salas[i].vecinas.push(i - 1); salas[i - 1].vecinas.push(i);
    }
    // Un par de atajos extra para que no sea un pasillo lineal.
    for (let k = 0; k < 2 && salas.length > 3; k++) {
        const a = rndEnt(0, salas.length - 1), b = rndEnt(0, salas.length - 1);
        if (a !== b && salas[a].vecinas.indexOf(b) < 0) {
            excavarPasillo(salas[a].cx, salas[a].cz, salas[b].cx, salas[b].cz, 2);
            salas[a].vecinas.push(b); salas[b].vecinas.push(a);
        }
    }

    // BFS desde la sala de inicio: la meta va en la MÁS LEJANA en número de saltos,
    // así el recorrido siempre atraviesa el mapa.
    const distancia = new Array(salas.length).fill(-1);
    distancia[0] = 0;
    const cola = [0];
    while (cola.length) {
        const a = cola.shift();
        for (const b of salas[a].vecinas)
            if (distancia[b] < 0) { distancia[b] = distancia[a] + 1; cola.push(b); }
    }
    let iMeta = 0, mejor = -1;
    for (let i = 0; i < salas.length; i++) if (distancia[i] > mejor) { mejor = distancia[i]; iMeta = i; }

    // Asignación de tipos de sala
    salas[0].tipo = 'inicio';
    salas[iMeta].tipo = 'meta';
    for (let i = 0; i < salas.length; i++) {
        if (salas[i].tipo !== 'arena') continue;
        salas[i].tipo = rndPesos([
            { t: 'arena',    peso: 10 },
            { t: 'criadero', peso: 8 },
            { t: 'botin',    peso: 6 }
        ]).t;
    }
    return iMeta;
}

function construirMuros3D() {
    // Un muro por celda sólida adyacente a una transitable: solo lo que se ve.
    const celdas = [];
    for (let gz = 0; gz < GH; gz++) {
        for (let gx = 0; gx < GW; gx++) {
            if (mapa[gz * GW + gx] === 1) continue;
            let borde = false;
            for (let dz = -1; dz <= 1 && !borde; dz++)
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = gx + dx, nz = gz + dz;
                    if (nx >= 0 && nz >= 0 && nx < GW && nz < GH && mapa[nz * GW + nx] === 1) { borde = true; break; }
                }
            if (borde) celdas.push(gx, gz);
        }
    }
    const total = celdas.length / 2;
    const geo = new THREE.BoxGeometry(CELDA3, ALTO_MURO, CELDA3);
    const mat = new THREE.MeshLambertMaterial({ color: 0xb06a3b });
    murosInst = new THREE.InstancedMesh(geo, mat, total);
    const m = new THREE.Matrix4(), color = new THREE.Color();
    for (let i = 0; i < total; i++) {
        const gx = celdas[i * 2], gz = celdas[i * 2 + 1];
        m.makeTranslation(gx2x(gx) + CELDA3 / 2, ALTO_MURO / 2, gz2z(gz) + CELDA3 / 2);
        murosInst.setMatrixAt(i, m);
        // Variación de tono por instancia: rompe la repetición sin coste extra.
        const v = 0.78 + ((gx * 7 + gz * 13) % 11) / 32;
        color.setRGB(0.69 * v, 0.42 * v, 0.23 * v);
        murosInst.setColorAt(i, color);
    }
    murosInst.instanceMatrix.needsUpdate = true;
    if (murosInst.instanceColor) murosInst.instanceColor.needsUpdate = true;
    grupoNivel.add(murosInst);
    return total;
}

// --- Contenido de las salas ------------------------------------------------
function crearMosquito3D(tipo, x, z, y) {
    const a = ARQUETIPOS[tipo];
    const escala = tipo === 'enjambre' ? 0.62 : (tipo === 'mutante' ? 1.7 : 1);
    const g = new THREE.BoxGeometry(0.62 * escala, 0.5 * escala, 0.92 * escala);
    // Con textura, el color del arquetipo se aclara: la tiñe sin taparla y el
    // tipo se sigue leyendo. El destello va por emissive (ver 10-mundo3d-ia.js).
    const tex = texturaEnemigo3D(tipo);
    const color = new THREE.Color(a.color);
    if (tex) color.lerp(BLANCO3, 0.4);
    const mat = new THREE.MeshLambertMaterial({ map: tex, color, emissive: 0x000000 });
    const malla = new THREE.Mesh(g, mat);
    malla.position.set(x, y === undefined ? 1.6 + Math.random() * 1.4 : y, z);

    // Alas: dos planos que se escalan con un seno (aleteo).
    const geoAla = new THREE.PlaneGeometry(0.5 * escala, 0.3 * escala);
    const matAla = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true,
                                                 opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
    const alaI = new THREE.Mesh(geoAla, matAla); alaI.position.set(-0.32 * escala, 0.28 * escala, 0);
    const alaD = new THREE.Mesh(geoAla, matAla); alaD.position.set( 0.32 * escala, 0.28 * escala, 0);
    malla.add(alaI); malla.add(alaD);

    grupoNivel.add(malla);
    const vidaBase = Math.max(1, Math.round(a.vida * (1 + (nivelActual - 1) * 0.22)));
    const e = {
        tipo, arq: a, malla, alaI, alaD, escala,
        vida: vidaBase, vidaMax: vidaBase, vivo: true,
        vx: 0, vy: 0, vz: 0, est: 'patrulla', t: 0,
        hogar: malla.position.clone(), ultX: x, ultZ: z, memT: 0,
        cargaT: 0, cd: rndEnt(0, 90), aturdido: 0, flash: 0, blanco: false, token: false,
        selloRaqueta: -1,
        fase: rndRango(0, 6.28),
        serotipo: serotipoDeNivel(nivelActual), origen: null
    };
    mosquitos3D.push(e);
    return e;
}

function crearMoneda3D(x, z, y) {
    const g = new THREE.SphereGeometry(0.34, 10, 8);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xf1c40f }));
    m.position.set(x, y === undefined ? 1.1 : y, z);
    grupoNivel.add(m);
    monedas3D.push(m);
}

// --- Envases 3D --------------------------------------------------------------
//  Antes todos eran el mismo cilindro de 2.3 m, casi negro y más alto que los
//  ojos: simétrico y sin detalle, se veía igual desde cualquier lado y parecía
//  un dibujo que giraba para mirarte. Ahora cada uno es el envase que es, con
//  los colores del 2D, más bajo que los ojos (el agua se ve por dentro) y con
//  algo que rompe la simetría: el asa, la rueda, la maceta fuera del centro.
const GRIS_CERRADO = 0x6b7a8f;

/** Material del envase. Se guarda en `mats` para ponerlo gris al cerrarlo. */
function matEnvase(mats, color, doble) {
    const m = new THREE.MeshLambertMaterial({ color, side: doble ? THREE.DoubleSide : THREE.FrontSide });
    mats.push(m);
    return m;
}

function pieza3D(g, geo, mat, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
}

/** Recipiente abierto, con fondo y aro en el borde. y0 = altura de la base. */
function vaso3D(g, mats, rArr, rAb, alto, color, y0 = 0) {
    const m = matEnvase(mats, color, true);       // DoubleSide: se ve por dentro
    pieza3D(g, new THREE.CylinderGeometry(rArr, rAb, alto, 20, 1, true), m, 0, y0 + alto / 2, 0);
    pieza3D(g, new THREE.CircleGeometry(rAb, 20).rotateX(-Math.PI / 2), m, 0, y0 + 0.01, 0);
    pieza3D(g, new THREE.TorusGeometry(rArr, 0.035, 6, 24).rotateX(Math.PI / 2), m, 0, y0 + alto, 0);
}

/** Refuerzos horizontales (tambo, tinaco). */
function aros3D(g, mats, r, ys, color) {
    const m = matEnvase(mats, color);
    for (const y of ys) pieza3D(g, new THREE.TorusGeometry(r, 0.04, 6, 24).rotateX(Math.PI / 2), m, 0, y, 0);
}

/** Superficie de agua: mientras se vea, el criadero produce. `geo` ya horizontal. */
function agua3D(g, geo, y) {
    return pieza3D(g, geo, new THREE.MeshBasicMaterial({
        color: 0x2a7f8f, transparent: true, opacity: 0.85, side: THREE.DoubleSide
    }), 0, y, 0);
}
const discoAgua = (r, lados = 20) => new THREE.CircleGeometry(r, lados).rotateX(-Math.PI / 2);

/**
 * El envase de cada tipo, con el origen en el suelo. Devuelve el grupo, sus
 * materiales, el agua, a qué altura está (aguaY), cuánto mide (aguaR, para las
 * partículas) y su radio de choque. No usa rnd(): no le mueve la semilla al nivel.
 */
function modeloEnvase3D(tipo) {
    const g = new THREE.Group(), mats = [];
    let agua, aguaY, aguaR, radio;
    switch (tipo) {
        case 'cubeta': {
            vaso3D(g, mats, 0.5, 0.4, 0.8, 0x2980b9);
            // El asa, caída hacia un lado: es lo que la delata como cubeta.
            const asa = pieza3D(g, new THREE.TorusGeometry(0.5, 0.025, 5, 16, Math.PI),
                                matEnvase(mats, 0x95a5a6), 0, 0.8, 0);
            asa.rotation.x = -1.05;
            aguaY = 0.62; aguaR = 0.47; radio = 0.5;
            agua = agua3D(g, discoAgua(aguaR), aguaY);
            break;
        }
        case 'tambo':
            vaso3D(g, mats, 0.55, 0.55, 1.1, 0x7f6a3d);
            aros3D(g, mats, 0.565, [0.3, 0.75], 0x5e4e2c);
            aguaY = 0.95; aguaR = 0.54; radio = 0.55;
            agua = agua3D(g, discoAgua(aguaR), aguaY);
            break;
        case 'tinaco':
            vaso3D(g, mats, 0.8, 0.8, 1.4, 0x2c3e50);
            aros3D(g, mats, 0.815, [0.35, 0.7, 1.05], 0x22303d);
            aguaY = 1.25; aguaR = 0.79; radio = 0.8;
            agua = agua3D(g, discoAgua(aguaR), aguaY);
            break;
        case 'cisterna': {
            // Losa baja con una boca cuadrada: lo único que asoma de una cisterna.
            pieza3D(g, new THREE.BoxGeometry(1.8, 0.45, 1.8), matEnvase(mats, 0x4a3f35), 0, 0.225, 0);
            const mb = matEnvase(mats, 0x5d5147);
            for (const s of [-1, 1]) {
                pieza3D(g, new THREE.BoxGeometry(1.1, 0.14, 0.1), mb, 0, 0.52, s * 0.5);
                pieza3D(g, new THREE.BoxGeometry(0.1, 0.14, 0.9), mb, s * 0.5, 0.52, 0);
            }
            aguaY = 0.5; aguaR = 0.45; radio = 1.05;
            agua = agua3D(g, new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2), aguaY);
            break;
        }
        case 'maceta': {
            // El criadero es el plato; la maceta va encima y fuera del centro.
            vaso3D(g, mats, 0.6, 0.52, 0.12, 0xa0482a);
            pieza3D(g, new THREE.CylinderGeometry(0.4, 0.3, 0.6, 16), matEnvase(mats, 0xb1552f), 0.12, 0.42, 0.06);
            pieza3D(g, discoAgua(0.37, 16), matEnvase(mats, 0x4e342e), 0.12, 0.721, 0.06);
            pieza3D(g, new THREE.IcosahedronGeometry(0.3, 0), matEnvase(mats, 0x2e7d32), 0.16, 0.98, 0.04);
            aguaY = 0.09; aguaR = 0.55; radio = 0.6;
            agua = agua3D(g, discoAgua(aguaR), aguaY);
            break;
        }
        case 'bebedero':
            vaso3D(g, mats, 0.45, 0.36, 0.22, 0xd35400);
            // Junto al de agua, el de croquetas: rompe la simetría y dice qué es.
            pieza3D(g, new THREE.CylinderGeometry(0.26, 0.21, 0.15, 14), matEnvase(mats, 0xe67e22), 0.72, 0.075, 0.2);
            pieza3D(g, discoAgua(0.23, 12), matEnvase(mats, 0x8d5a2b), 0.72, 0.151, 0.2);
            aguaY = 0.17; aguaR = 0.42; radio = 0.5;
            agua = agua3D(g, discoAgua(aguaR), aguaY);
            break;
        case 'florero': {
            const perfil = [[0, 0], [0.22, 0], [0.3, 0.15], [0.32, 0.35], [0.24, 0.6], [0.14, 0.75], [0.16, 0.9]]
                .map(p => new THREE.Vector2(p[0], p[1]));
            pieza3D(g, new THREE.LatheGeometry(perfil, 18), matEnvase(mats, 0x8e6fb5, true), 0, 0, 0);
            const tallo = matEnvase(mats, 0x2e7d32);
            [[0.3, 0.2], [-0.25, 2.3], [0.15, 4.2]].forEach(([incl, giro]) => {
                const t = pieza3D(g, new THREE.CylinderGeometry(0.012, 0.012, 0.55, 5).translate(0, 0.275, 0),
                                  tallo, 0, 0.82, 0);
                t.rotation.set(incl, giro, 0, 'YXZ');
            });
            // Flor en la punta del primer tallo (0.55 de largo, inclinado 0.3, girado 0.2).
            pieza3D(g, new THREE.IcosahedronGeometry(0.07, 0), matEnvase(mats, 0xf1c40f), 0.032, 1.35, 0.159);
            aguaY = 0.85; aguaR = 0.15; radio = 0.34;
            agua = agua3D(g, discoAgua(aguaR, 14), aguaY);
            break;
        }
        case 'carretilla': {
            // Batea de cuatro lados (un cilindro de 4 segmentos girado 45° y
            // estirado), rueda delante, patas y mangos detrás.
            const batea = geo => geo.rotateY(Math.PI / 4).scale(1.5, 1, 1);
            const mt = matEnvase(mats, 0xc0392b, true);
            pieza3D(g, batea(new THREE.CylinderGeometry(0.6, 0.42, 0.35, 4, 1, true)), mt, 0, 0.675, 0);
            pieza3D(g, batea(discoAgua(0.42, 4)), mt, 0, 0.505, 0);
            pieza3D(g, new THREE.TorusGeometry(0.2, 0.06, 6, 16), matEnvase(mats, 0x22282e), 0.75, 0.26, 0);
            const mf = matEnvase(mats, 0x7f8c8d);
            for (const s of [-1, 1]) {
                pieza3D(g, new THREE.BoxGeometry(0.05, 0.5, 0.05), mf, -0.42, 0.25, s * 0.3);
                pieza3D(g, new THREE.CylinderGeometry(0.025, 0.025, 0.8, 6).rotateZ(Math.PI / 2), mf, -1.0, 0.8, s * 0.3);
            }
            aguaY = 0.7; aguaR = 0.5; radio = 0.85;
            agua = agua3D(g, batea(discoAgua(0.5, 4)), aguaY);
            break;
        }
        case 'llanta':
            // De pie: de frente es un aro y de lado una banda, imposible de
            // confundir con un dibujo. El agua se junta abajo, por dentro.
            pieza3D(g, new THREE.TorusGeometry(0.5, 0.22, 10, 24), matEnvase(mats, 0x22282e), 0, 0.72, 0);
            aguaY = 0.5; aguaR = 0.17; radio = 0.6;
            agua = agua3D(g, new THREE.PlaneGeometry(0.34, 0.4).rotateX(-Math.PI / 2), aguaY);
            break;
        case 'botella': {
            // Basura suelta: una botella de pie, otra tirada, una lata y el charco.
            const mv = new THREE.MeshLambertMaterial({ color: 0x78be8c, transparent: true, opacity: 0.85 });
            mats.push(mv);
            const botella = (padre, x, y, z) => {
                pieza3D(padre, new THREE.CylinderGeometry(0.16, 0.16, 0.5, 12), mv, x, y + 0.25, z);
                pieza3D(padre, new THREE.CylinderGeometry(0.06, 0.16, 0.14, 12), mv, x, y + 0.57, z);
                pieza3D(padre, new THREE.CylinderGeometry(0.06, 0.06, 0.14, 8), mv, x, y + 0.71, z);
            };
            botella(g, -0.25, 0, 0.12);
            const tirada = new THREE.Group();
            botella(tirada, 0, -0.39, 0);
            tirada.position.set(0.3, 0.16, -0.2);
            tirada.rotation.set(0, 0.6, Math.PI / 2, 'YXZ');
            g.add(tirada);
            pieza3D(g, new THREE.CylinderGeometry(0.09, 0.09, 0.24, 12), matEnvase(mats, 0xbdc3c7), 0.2, 0.12, 0.38);
            aguaY = 0.02; aguaR = 0.4; radio = 0.45;
            agua = agua3D(g, discoAgua(0.42, 18).scale(1.4, 1, 0.9), aguaY);
            break;
        }
        default:
            vaso3D(g, mats, 0.5, 0.4, 0.8, 0x16a085);
            aguaY = 0.62; aguaR = 0.47; radio = 0.5;
            agua = agua3D(g, discoAgua(aguaR), aguaY);
    }
    return { grupo: g, mats, agua, aguaY, aguaR, radio };
}

/** Giro fijo por posición. No sale de rnd() para no correr la semilla del nivel. */
function giroFijo(x, z) {
    const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return (h - Math.floor(h)) * Math.PI * 2;
}

/** Un criadero en 3D: el mismo envase, con el mismo verbo, que en 2D. */
function crearCriadero3D(tipo, x, z) {
    const d = CRIADEROS[tipo];
    const prod = CICLO_PRIMERO + rndRango(0, 90);   // la primera cría tarda más (11b)
    const m = modeloEnvase3D(tipo);
    m.grupo.position.set(x, 0, z);
    m.grupo.rotation.y = giroFijo(x, z);
    grupoNivel.add(m.grupo);

    const c = {
        tipo, verbo: d.verbo, x, y: 0, z, malla: m.grupo, agua: m.agua,
        aguaY: m.aguaY, mats: m.mats, radioCol: m.radio, gris: false,
        activo: true, neutralizado: false, vaciado: false, tRevive: 0, conVerbo: null,
        prod, prodMax: prod, producidos: 0, vivos: 0,
        radio: 9, fase: rndRango(0, 6.28)
    };
    criaderos3D.push(c);
    tinacos3D.push({ malla: m.grupo, agua: m.agua, fase: c.fase, aguaY: m.aguaY, r: m.aguaR });
    return c;
}

/** Criadero al alcance de la mirada del jugador en 3D, o null. */
function criaderoCercano3D() {
    if (!camera3D) return null;
    let mejor = null, mejorD = 3.2;
    for (const c of criaderos3D) {
        if (c.neutralizado) continue;
        const d = Math.hypot(c.x - camera3D.position.x, c.z - camera3D.position.z);
        if (d < mejorD) { mejorD = d; mejor = c; }
    }
    return mejor;
}

/** Producción infinita y reactivación de los que solo se vaciaron. */
function actualizarCriaderos3D(dt) {
    for (const c of criaderos3D) {
        c.fase += dt * 0.05;

        if (c.vaciado && !c.neutralizado) {
            c.tRevive -= dt;
            if (c.tRevive <= 0) {
                c.vaciado = false; c.activo = true;
                if (c.agua) c.agua.visible = true;
                fxExplosion3D(c.x, c.aguaY + 0.4, c.z, 1.4, 0.2, 0.7, 0.4);
                sacudida3D = Math.max(sacudida3D, 0.5); sfx.parryFail();
                aviso('EL CRIADERO REVIVIÓ · LOS HUEVOS SOBREVIVEN SECOS', 2600);
                desbloquearFicha('huevos_secos');
            }
            continue;
        }
        if (!c.activo || c.neutralizado) continue;

        c.prod -= dt;
        if (c.prod > 0) continue;
        reiniciarCiclo(c, Math.max(80, 180 - nivelActual * 12));
        if (c.vivos >= 3 || mosquitos3D.length > 26) continue;

        const e = crearMosquito3D(rndProb(0.6) ? 'enjambre' : 'zumbador',
                                  c.x + rndRango(-1.4, 1.4), c.z + rndRango(-1.4, 1.4), 1.2);
        e.origen = c;
        c.vivos++; c.producidos++;
        fxChispas3D(c.x, c.aguaY + 0.1, c.z, 6, 0.2, 0.7, 0.45, 0.05);
        tono(150, 0.14, 'sawtooth', 0.035, 90);
        if (c.producidos === 1) desbloquearFicha('ciclo');
        if (c.producidos === 6) desbloquearFicha('criadero_infinito');
    }
}

function poblarSalas3D(n) {
    for (let i = 0; i < salas.length; i++) {
        const s = salas[i];
        const cx = gx2x(s.cx), cz = gz2z(s.cz);
        const rad = Math.min(s.w, s.h) * CELDA3 * 0.32;

        // La sala de inicio ya no se deja vacia. Lo primero que ves al aparecer
        // es un envase con agua y unas monedas: te dice que hay algo que hacer y
        // hacia donde se sale, sin tener que adivinar entre la niebla.
        if (s.tipo === 'inicio') {
            crearCriadero3D(envaseDeNivel(), cx + rad * 0.9, cz + rad * 0.9);
            crearMoneda3D(cx - rad * 0.8, cz);
            crearMoneda3D(cx, cz - rad * 0.8);
            continue;
        }

        if (s.tipo === 'meta') {
            const g = new THREE.BoxGeometry(3.2, 4.2, 0.7);
            meta3D = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x8e44ad }));
            meta3D.position.set(cx, 2.1, cz);
            grupoNivel.add(meta3D);
            luzMeta = new THREE.PointLight(0x9b59b6, 2.2, 18);
            luzMeta.position.set(cx, 2.6, cz);
            grupoNivel.add(luzMeta);
            crearMosquito3D(nivelActual >= 4 ? 'mutante' : 'zumbador', cx + rad, cz);
            // El último nivel no termina cruzando un portal: termina decidiendo
            // qué hacer con Güero, que está aquí cursando la fase crítica.
            if (nivelActual >= 5) crearGuero3D(cx - 2.6, cz + 2.2);
            // Ivan, en la fase febril: se le atiende con la cuadra ya sin criaderos.
            if (nivelActual === NIVEL_IVAN) crearIvan3D(cx - 2.6, cz + 2.2);
            continue;
        }
        if (s.tipo === 'criadero') {
            crearCriadero3D(envaseDeNivel(), cx, cz);
            for (let k = 0; k < 2; k++)
                crearMosquito3D('enjambre', cx + rndRango(-rad, rad), cz + rndRango(-rad, rad));
            crearMoneda3D(cx - 2.2, cz);
            continue;
        }
        if (s.tipo === 'botin') {
            for (let k = 0; k < 5; k++) {
                const a = (k / 5) * 6.283;
                crearMoneda3D(cx + Math.cos(a) * rad * 0.7, cz + Math.sin(a) * rad * 0.7);
            }
            if (rndProb(0.7)) crearMosquito3D('picador', cx, cz, 2.6);
            continue;
        }
        // arena
        const cuantos = rndEnt(2, 2 + Math.min(3, n));
        for (let k = 0; k < cuantos; k++) {
            const tipo = rndPesos([
                { t: 'zumbador', peso: 10 },
                { t: 'enjambre', peso: 6 },
                { t: 'picador',  peso: n >= 2 ? 7 : 2 },
                { t: 'mutante',  peso: n >= 4 ? 5 : 0 }
            ].filter(o => o.peso > 0)).t;
            crearMosquito3D(tipo, cx + rndRango(-rad, rad), cz + rndRango(-rad, rad));
        }
        for (let k = 0; k < 2; k++)
            crearMoneda3D(cx + rndRango(-rad, rad), cz + rndRango(-rad, rad));
    }

    // Garantia: si el sorteo de salas no dio ningun criadero, el nivel no tendria
    // fuente que cerrar y se ganaria corriendo. Se siembran en salas de arena.
    const minimo = 1 + Math.floor(nivelActual / 2);
    for (let i = 1; i < salas.length && criaderos3D.length < minimo; i++) {
        const s = salas[i];
        if (s.tipo !== "arena") continue;
        crearCriadero3D(envaseDeNivel(), gx2x(s.cx) + 1.6, gz2z(s.cz) + 1.6);
    }
}

function generarNivel3D(n) {
    sembrarNivel(n + 100);        // desplazamiento: el 3D del nivel N no repite el 2D
    limpiarNivel3D();
    generarMapa3D(n);

    // Suelo: un único plano grande (una draw call) bajo todo el mapa.
    const suelo = new THREE.Mesh(
        new THREE.PlaneGeometry(GW * CELDA3, GH * CELDA3),
        new THREE.MeshLambertMaterial({ color: 0x35704a })
    );
    suelo.rotation.x = -Math.PI / 2;
    grupoNivel.add(suelo);

    const numMuros = construirMuros3D();
    poblarSalas3D(n);

    // La salida se abre solo con todos los criaderos cerrados. Sin fuente que
    // cerrar, el nivel volveria a ganarse corriendo.
    metaAbierta = criaderos3D.length === 0;

    const s0 = salas[0];
    camera3D.position.set(gx2x(s0.cx), CFG.altoOjos, gz2z(s0.cz));
    jugador.yaw = 0; jugador.pitch = 0; jugador.vy3 = 0; jugador.enSuelo3 = true;
    reiniciarJugador(false);
    return numMuros;
}

