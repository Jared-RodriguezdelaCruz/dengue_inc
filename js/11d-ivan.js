"use strict";

// ---------------------------------------------------------------------------
//  10d. IVAN — el otro caso, en la fase febril
//
//  Güero enseña la fase crítica, con el reloj encima. Ivan enseña lo que se
//  decide antes, cuando apenas empieza la fiebre: qué medicamento, cómo se cuida
//  a la familia y qué señales hay que vigilar. Está junto al portal del nivel 2 y
//  solo se le puede atender con la cuadra ya sin criaderos: un enfermo rodeado de
//  criaderos vivos vuelve a alimentar la cadena (ficha «colonia»).
//
//  La consulta pausa el nivel: la fase febril no es una carrera contra el reloj,
//  es una decisión. Los textos y las fuentes viven en IVAN (01b).
// ---------------------------------------------------------------------------

const NIVEL_IVAN = 2;
const PREMIO_IVAN = 2;               // monedas por decisión acertada
let ivan = null;
let ivanResultado = null;            // { aciertos, de } para el reporte final

/** Su malla vive en grupoNivel: limpiarNivel3D ya la libera. */
function reiniciarIvan() { ivan = null; }

/** Ivan en low poly: playera, cabeza facetada y su gorra. Baliza amarilla: fiebre. */
function crearIvan3D(x, z) {
    const g = new THREE.Group();

    const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.31, 0.92, 7),
        new THREE.MeshLambertMaterial({ color: 0x27ae60, flatShading: true })
    );
    torso.position.y = 0.62;
    g.add(torso);

    const cabeza = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.21, 1),
        new THREE.MeshLambertMaterial({ color: 0xc68e5a, flatShading: true })
    );
    cabeza.position.set(0, 1.24, 0.03);
    g.add(cabeza);

    // La gorra es su rasgo: copa de media esfera y visera hacia el frente (+Z).
    const matGorra = new THREE.MeshLambertMaterial({ color: 0xc0392b, flatShading: true });
    const copa = new THREE.Mesh(
        new THREE.SphereGeometry(0.225, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), matGorra
    );
    copa.position.set(0, 1.29, 0.03);
    g.add(copa);
    const visera = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.035, 0.2), matGorra);
    visera.position.set(0, 1.3, 0.26);
    g.add(visera);

    // Baliza tenue, como la de Güero, para encontrarlo entre la niebla.
    const baliza = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 7, 8, 1, true),
        new THREE.MeshBasicMaterial({
            color: 0xf1c40f, transparent: true, opacity: 0.3,
            side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending
        })
    );
    baliza.position.y = 3.6;
    g.add(baliza);

    const luz = new THREE.PointLight(0xf1c40f, 1.2, 10);
    luz.position.set(0, 1.3, 0);
    g.add(luz);

    g.position.set(x, 0, z);
    grupoNivel.add(g);
    ivan = { grupo: g, luz: luz, baliza: baliza, x: x, z: z,
             visto: false, resuelto: false, bien: false, motivos: [], avisoT: 0, fase: 0 };
    return ivan;
}

/** Mientras Ivan siga sin atender, el portal del nivel 2 no es salida. */
function ivanListo() { return !ivan || ivan.resuelto; }

function actualizarIvan(dt) {
    if (!ivan || modoRender !== '3d') return;
    ivan.fase += dt * 0.05;
    ivan.luz.intensity = ivan.resuelto ? 1.1 : 1 + Math.sin(ivan.fase * 4) * 0.4;
    ivan.baliza.material.opacity = 0.2 + Math.sin(ivan.fase * 2) * 0.08;

    if (estado !== estados.J3D) return;
    if (ivan.avisoT > 0) ivan.avisoT -= dt;
    ivan.grupo.rotation.y = Math.atan2(camera3D.position.x - ivan.x, camera3D.position.z - ivan.z);

    if (ivan.resuelto || camera3D.position.distanceTo(ivan.grupo.position) > 3.2) return;
    if (!ivan.visto) { ivan.visto = true; desbloquearFicha('fase_febril'); }
    if (criaderosVivos() > 0) {
        if (ivan.avisoT <= 0) { ivan.avisoT = 150; aviso(IVAN.esperar, 2200); }
        return;
    }
    consultaIvan();
}

/** Tres decisiones, cada una con su explicación y su fuente. */
function consultaIvan() {
    estado = estados.MENU;
    correrPreguntas({ lista: IVAN.preguntas, titulo: IVAN.nombre + ' tiene fiebre', intro: IVAN.intro,
                      conRespuesta: true, saltable: false, fin: 'Ver cómo le fue' },
                    function (aciertos, bienes) {
        ivan.resuelto = true;
        ivan.bien = aciertos === IVAN.preguntas.length;
        ivan.motivos = IVAN.fallos.filter((_, i) => !bienes[i]);
        ivanResultado = { aciertos: aciertos, de: IVAN.preguntas.length };
        if (aciertos > 0) { fichas += aciertos * PREMIO_IVAN; actualizarHUD(); }
        ivan.baliza.material.color.setHex(ivan.bien ? 0x2ecc71 : 0xe67e22);
        ivan.luz.color.setHex(ivan.bien ? 0x2ecc71 : 0xe67e22);
        if (ivan.bien) sfx.nivel(); else sfx.parryFail();
        mostrarMenu({
            titulo: ivan.bien ? IVAN.nombre + ' se recuperó en casa' : IVAN.nombre + ' salió adelante… a medias',
            desc: desenlaceIvan() +
                  (aciertos ? '<div class="rep-nota buena">+' + aciertos * PREMIO_IVAN +
                              ' 💰 por las decisiones acertadas.</div>' : ''),
            boton: 'Seguir', accion: volverDeIvan
        });
    });
}

function desenlaceIvan() {
    if (ivan.bien)
        return '<div class="desenlace bien"><h3>Hiciste lo correcto</h3><p>' + IVAN.finalBien + '</p></div>';
    let h = '<div class="desenlace mal"><h3>Faltó algo</h3><p>' + IVAN.finalMal + '</p><div class="por-que">';
    for (const m of ivan.motivos) h += '<p>' + m + '</p>';
    return h + '</div></div>';
}

function volverDeIvan() {
    ocultarMenu();
    estado = estados.J3D;
    capturarRaton3D();          // viene de un clic: el navegador sí lo deja
    aviso('EL PORTAL YA ES UNA SALIDA', 1800);
}
