"use strict";

// ---------------------------------------------------------------------------
//  10c. GÜERO — el rescate del final
//
//  Todo lo demás del juego enseña con reglas. Esto lo enseña con una persona.
//  Güero está en la sala del portal del nivel 5, cursando la fase crítica, y el
//  portal no es una salida hasta que decidas qué hacer con él. Como a Ivan, se
//  le atiende con los criaderos ya cerrados: antes solo te pide que los cierres,
//  y su reloj no arranca hasta que lo atiendes.
//
//  Su desenlace depende de las tres cosas que el juego lleva cinco niveles
//  enseñando: el medicamento correcto, llegar a tiempo, y haber cerrado los
//  criaderos para que no lo vuelvan a picar. No hay azar en esto.
// ---------------------------------------------------------------------------

let guero = null;
const elPanelGuero = () => document.getElementById('panel-guero');
const texturaGuero = cargarTextura3D('assets/textures/guero.png');   // null desde file://
const audioGueroDialogue1 = new Audio('assets/sounds/guero_dialogue1.mp3');
audioGueroDialogue1.preload = 'auto';
// 1.0 es el máximo: HTMLMediaElement lanza IndexSizeError con un volumen > 1,
// y esa excepción cortaba la carga del script entero. Para que suene más fuerte
// hay que exportar el MP3 con más ganancia. Se escala con el volumen de efectos.
audioGueroDialogue1.volume = clamp(opciones.volSfx, 0, 1);
audioGueroDialogue1.loop = false;

/** No reinicia si ya está hablando: así no se duplica el frame del hallazgo ni
 *  vuelve a empezar cada vez que cruzas el borde del radio. */
function reproducirDialogoGuero() {
    if (!guero || !sfxActivo || !audioGueroDialogue1.paused) return;
    audioGueroDialogue1.currentTime = 0;
    audioGueroDialogue1.play().catch(() => {});
}

/** Al pausar, silenciar o cambiar de nivel, Güero se calla. */
function detenerDialogoGuero() {
    if (!audioGueroDialogue1.paused) audioGueroDialogue1.pause();
}

/**
 * El panel se MONTA una vez y después solo se mutan textos y clases.
 *
 * Antes esto reescribía `innerHTML` entero en cada frame, con lo que los cuatro
 * botones se destruían y se recreaban sesenta veces por segundo. Un `click` solo
 * se dispara si el `mousedown` y el `mouseup` caen sobre el MISMO nodo, así que
 * pulsarlos era casi imposible: el jugador clicaba, no pasaba nada, se le acababa
 * el reloj y Güero moría siempre de «llegaste tarde». Los dos finales estaban
 * fuera de alcance jugando, y no se notó porque las pruebas llamaban a
 * elegirGuero() desde JS en vez de pulsar.
 */
const panelG = { montado: false, barra: null, reloj: null, senales: [], botones: [] };

function reiniciarGuero() {
    guero = null;
    detenerDialogoGuero();
    const el = elPanelGuero();
    if (el) { el.classList.add('oculto'); el.innerHTML = ''; }
    // El panel se vacía: hay que volver a montarlo, con sus listeners.
    panelG.montado = false;
    panelG.botones.length = 0;
    panelG.senales.length = 0;
}

/** Güero en la sala de la meta: cuerpo, cabeza y una baliza que se ve de lejos. */
function crearGuero3D(x, z) {
    const g = new THREE.Group();

    const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.30, 0.92, 10),
        new THREE.MeshLambertMaterial({ color: 0x2e86de })
    );
    torso.position.y = 0.62;
    g.add(torso);

    const cabeza = new THREE.Mesh(
        new THREE.SphereGeometry(0.21, 24, 20),
        new THREE.MeshLambertMaterial({ color: 0xe8c39e })
    );
    cabeza.position.set(0, 1.24, 0.06);
    g.add(cabeza);

    // La foto va en una media esfera frontal, no envolviendo la cabeza entera:
    // en una esfera completa el centro de la imagen quedaba mirando a +X y de
    // frente se veía media cara estirada. Con phiStart 0 y phiLength π el centro
    // de la imagen (u = 0.5) cae en +Z, del lado contrario a la melena.
    if (texturaGuero) {
        const cara = new THREE.Mesh(
            new THREE.SphereGeometry(0.212, 24, 16, 0, Math.PI, Math.PI * 0.2, Math.PI * 0.6),
            new THREE.MeshLambertMaterial({ map: texturaGuero })
        );
        cara.position.copy(cabeza.position);
        g.add(cara);
    }

    const melena = new THREE.Group();
    const matMelena = new THREE.MeshLambertMaterial({ color: 0xd7b15c });
    for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const mechon = new THREE.Mesh(
            new THREE.SphereGeometry(0.17, 12, 10),
            matMelena
        );
        mechon.position.set(Math.cos(a) * 0.24, 0.18 + Math.sin(a * 2.2) * 0.10, -0.18 + Math.sin(a) * 0.12);
        mechon.scale.set(1.5, 2.0, 1.2);
        melena.add(mechon);
    }
    const melenaBase = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.92),
        matMelena
    );
    melenaBase.position.set(0, 0.06, -0.22);
    melenaBase.scale.set(1.4, 1.3, 1.1);
    melena.add(melenaBase);
    melena.position.y = 1.18;
    g.add(melena);

    // Baliza: una columna tenue que sube. Sin esto, encontrarlo entre la niebla
    // sería cosa de suerte, y el reloj de la fase crítica ya está corriendo.
    const baliza = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 7, 8, 1, true),
        new THREE.MeshBasicMaterial({
            color: 0xe67e22, transparent: true, opacity: 0.32,
            side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending
        })
    );
    baliza.position.y = 3.6;
    g.add(baliza);

    const luz = new THREE.PointLight(0xff6b4a, 1.6, 11);
    luz.position.set(0, 1.3, 0);
    g.add(luz);

    g.position.set(x, 0, z);
    grupoNivel.add(g);

    guero = {
        grupo: g, luz: luz, baliza: baliza, x: x, z: z,
        encontrado: false, resuelto: false, salvado: false,
        t: GUERO.reloj, tMax: GUERO.reloj,
        tratamiento: null, motivos: [],
        cerca: false, fase: 0, avisoT: 0
    };
    return guero;
}

/** Mientras Güero siga sin resolverse, el portal no lleva a ninguna parte. */
function gueroListo() { return !guero || guero.resuelto; }

function actualizarGuero(dt) {
    if (!guero || modoRender !== '3d') return;
    guero.fase += dt * 0.05;

    // Latido de la fiebre: se acelera conforme se le acaba el tiempo.
    const urgencia = guero.resuelto ? 0 : 1 - guero.t / guero.tMax;
    guero.luz.intensity = guero.resuelto
        ? (guero.salvado ? 1.4 : 0.25)
        : 1.2 + Math.sin(guero.fase * (5 + urgencia * 9)) * 0.7;
    if (guero.resuelto) {
        guero.luz.color.setHex(guero.salvado ? 0x2ecc71 : 0x555555);
        guero.baliza.material.color.setHex(guero.salvado ? 0x2ecc71 : 0x555555);
    }
    guero.baliza.material.opacity = 0.22 + Math.sin(guero.fase * 2) * 0.10;

    if (estado !== estados.J3D) return;

    const d = camera3D.position.distanceTo(guero.grupo.position);
    if (guero.avisoT > 0) guero.avisoT -= dt;

    // Con criaderos vivos no se le atiende: el panel no sale y el reloj no corre.
    if (!guero.encontrado && criaderosVivos() > 0) {
        guero.grupo.rotation.y = Math.atan2(camera3D.position.x - guero.x, camera3D.position.z - guero.z);
        if (d < 3.4 && guero.avisoT <= 0) { guero.avisoT = 150; aviso(GUERO.esperar, 2200); }
        return;
    }
    const cerca = d < 3.4;

    // Te da la cara mientras siga consciente (el frente del modelo es +Z).
    if (!guero.resuelto || guero.salvado)
        guero.grupo.rotation.y = Math.atan2(camera3D.position.x - guero.x, camera3D.position.z - guero.z);

    if (cerca && !guero.encontrado) {
        guero.encontrado = true;                 // el reloj arranca AQUÍ
        aviso(GUERO.hallado, 2400);
        destellar('#e67e22', 0.3, 620);
        desbloquearFicha('guero_alarma');
        desbloquearFicha('fase_critica');
        reproducirDialogoGuero();
    }
    if (cerca !== guero.cerca) {
        guero.cerca = cerca;
        if (cerca && !guero.resuelto) reproducirDialogoGuero();
        if (!cerca && !guero.resuelto) elPanelGuero().classList.add('oculto');
    }
    if (cerca && !guero.resuelto) pintarPanelGuero();

    // El reloj solo corre desde que lo encontraste: explorar no se castiga,
    // pero quedarse mirando sí. La fase crítica no espera a nadie.
    if (guero.encontrado && !guero.resuelto) {
        guero.t -= dt;
        if (guero.t <= 0) { guero.t = 0; resolverGuero('tarde'); }
    }
}

/** Cuántas señales de alarma se le ven ya. Suben conforme baja el reloj. */
function senalesVisibles() {
    if (!guero) return 0;
    const p = 1 - guero.t / guero.tMax;
    return Math.min(SENALES_ALARMA.length, Math.floor(p * (SENALES_ALARMA.length + 1)));
}

function montarPanelGuero(el) {
    let h = '<h2>' + GUERO.nombre + '</h2>';
    h += '<div id="g-estado">' + GUERO.intro + '</div>';
    h += '<div id="g-reloj"><div></div></div>';
    h += '<div id="g-reloj-txt"></div>';
    for (const s of SENALES_ALARMA)
        h += '<div class="g-senal"><span class="g-ico">·</span><span>' + s.texto + '</span></div>';
    h += '<div class="g-op"></div>';
    el.innerHTML = h;

    panelG.barra = el.querySelector('#g-reloj div');
    panelG.reloj = el.querySelector('#g-reloj-txt');
    panelG.senales = Array.from(el.querySelectorAll('.g-senal'));

    const caja = el.querySelector('.g-op');
    panelG.botones = GUERO.opciones.map(function (o) {
        const b = document.createElement('button');
        const costo = PRECIOS[o.id] || 0;
        b.innerHTML = '<b>' + o.icono + ' ' + o.titulo +
                      (costo ? ' — ' + costo + ' 💰' : '') + '</b>' + o.txt;
        // Listener de verdad, no onclick inline: el nodo vive lo que dure el
        // rescate y el navegador puede emparejar mousedown con mouseup.
        b.addEventListener('click', function () { elegirGuero(o.id); });
        caja.appendChild(b);
        return { el: b, costo: costo };
    });
    panelG.montado = true;
}

function pintarPanelGuero() {
    const el = elPanelGuero();
    if (!el || !guero) return;
    if (!panelG.montado) montarPanelGuero(el);

    const p = clamp(guero.t / guero.tMax, 0, 1);
    const seg = Math.ceil(guero.t / 60);
    panelG.barra.style.width = (p * 100) + '%';
    const txt = 'FASE CRÍTICA · ' + seg + ' s';
    if (panelG.reloj.textContent !== txt) panelG.reloj.textContent = txt;

    const n = senalesVisibles();
    for (let i = 0; i < panelG.senales.length; i++) {
        const on = i < n;
        if (panelG.senales[i].classList.contains('on') !== on) {
            panelG.senales[i].classList.toggle('on', on);
            panelG.senales[i].querySelector('.g-ico').textContent = on ? SENALES_ALARMA[i].icono : '·';
        }
    }
    for (const b of panelG.botones) {
        const caro = fichas < b.costo;
        if (b.el.classList.contains('caro') !== caro) b.el.classList.toggle('caro', caro);
    }
    el.classList.remove('oculto');
}

function elegirGuero(id) {
    if (!guero || guero.resuelto) return;
    const costo = PRECIOS[id] || 0;
    if (fichas < costo) { aviso('SIN MONEDAS', 800); sfx.parryFail(); return; }
    fichas -= costo;
    actualizarHUD();
    resolverGuero(id);
}

/**
 * El desenlace. Se acumulan TODOS los motivos de fallo, no solo el primero: si
 * le diste ibuprofeno y además dejaste criaderos abiertos, el final te dice las
 * dos cosas. Cada motivo lleva su fuente.
 */
function resolverGuero(id) {
    if (!guero || guero.resuelto) return;
    guero.resuelto = true;
    guero.tratamiento = id;
    const m = [];

    if (id === 'aine') m.push('aine');
    if (id === 'nada') m.push('nada');
    if (guero.t <= 0)  m.push('tarde');
    if (criaderosVivos() > 0) m.push('criaderos');

    guero.motivos = m;
    guero.salvado = m.length === 0;

    elPanelGuero().classList.add('oculto');
    desbloquearFicha('guero_traslado');

    if (guero.salvado) {
        aviso('GÜERO VA A SALIR DE ÉSTA', 2600);
        destellar('#2ecc71', 0.42, 900);
        sfx.nivel();
        fxExplosion3D(guero.x, 1.4, guero.z, 2.4, 0.2, 0.9, 0.45);
    } else {
        aviso('GÜERO ENTRÓ EN CHOQUE', 2600);
        destellar('#7b241c', 0.5, 1100);
        sacudida3D = Math.max(sacudida3D, 0.5);
        sfx.muerte();
        if (id === 'aine') desbloquearFicha('sangrado');
    }
    recordarSalida();
}

/** Aviso diferido: que quede claro si ya se puede salir o si falta cerrar. */
function recordarSalida() {
    const n = nivelActual;
    setTimeout(() => {
        if (nivelActual === n && estado === estados.J3D)
            aviso(metaAbierta ? 'EL PORTAL YA ES UNA SALIDA' : 'CIERRA LOS CRIADEROS QUE FALTAN', 2200);
    }, 2700);
}

/** Bloque del desenlace para la pantalla final. */
function desenlaceGuero() {
    if (!guero || !guero.resuelto) {
        return '<div class="desenlace mal"><h3>Güero se quedó atrás</h3>' +
               '<p>Saliste sin resolver nada. Nadie lo sacó de ahí.</p></div>';
    }
    if (guero.salvado) {
        const f = GUERO.finalBien;
        return '<div class="desenlace bien"><h3>' + f.titulo + '</h3>' +
               '<p>' + f.texto + '</p>' +
               '<div class="por-que">' + f.nota + '</div></div>';
    }
    const f = GUERO.finalMal;
    let h = '<div class="desenlace mal"><h3>' + f.titulo + '</h3><p>' + f.texto + '</p>';
    h += '<div class="por-que">' + f.nota;
    for (const k of guero.motivos) {
        const d = GUERO.fallos[k];
        if (!d) continue;
        h += '<p><b>' + d.que + '</b> ' + d.por +
             '<br><i style="color:#78909c">' + d.fuente + '</i></p>';
    }
    h += '</div></div>';
    return h;
}
