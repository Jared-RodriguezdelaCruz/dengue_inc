"use strict";

// ---------------------------------------------------------------------------
//  10g. MINITUTORIAL (DI-426)
//
//  La primera vez que se juega un nivel 2D y un nivel 3D, una tarjeta arriba al
//  centro enseña los controles de uno en uno. Cada paso se cumple por lo que
//  pasa en el juego, no por la tecla: vale igual con teclado, ratón o mando, y
//  lo que el jugador ya hizo por su cuenta se da por aprendido.
//
//  Las medidas se enseñan como teclas, nunca como respuesta: qué medida pide
//  cada envase es justo lo que el juego quiere que se aprenda.
//
//  No usa rnd(): con o sin tutorial, cada semilla genera los mismos niveles.
// ---------------------------------------------------------------------------

const CLAVE_TUTORIAL = 'dengueinc.tutorial';
const elTutorial = document.getElementById('tutorial');
const TUTORIAL_OK = 36;          // frames que se ve el ✔ antes del siguiente paso
const TUTORIAL_FIN = 110;        // frames del «¡Listo!»

let tutorial = null;
let tutorialMem = {};            // por si el navegador no deja guardar

function tutorialVisto() {
    let v = {};
    try { v = JSON.parse(localStorage.getItem(CLAVE_TUTORIAL) || '{}') || {}; } catch (e) { /* sin guardar */ }
    return Object.assign({}, v, tutorialMem);
}

function marcarTutorialVisto(modo) {
    tutorialMem[modo] = true;
    const v = tutorialVisto();
    try { localStorage.setItem(CLAVE_TUTORIAL, JSON.stringify(v)); } catch (e) { /* vale en esta pestaña */ }
}

/** Desde Ayuda: vuelve a salir en la próxima partida, aunque estuviera apagado. */
function repetirTutorial() {
    tutorialMem = {};
    try { localStorage.removeItem(CLAVE_TUTORIAL); } catch (e) { /* nada guardado */ }
    if (!opciones.tutorial) { opciones.tutorial = true; guardarOpciones(); }
}

const kbd = t => '<kbd>' + t + '</kbd>';
const totalCerrados = () => {
    const v = cerradosPorVerbo;
    return v.lava + v.tapa + v.voltea + v.tira + v.abate;
};
// Con el dedo, los controles se nombran como dicen los botones (01d-tactil.js).
const JOYSTICK = 'joystick: apoya el pulgar izquierdo';

function teclasMedidas() {
    if (tactilVisible()) return 'toca su medida en los botones de abajo';
    return mandoActivo
        ? 'cruceta: ↑ lava · → tapa · ↓ voltea · ← tira'
        : kbd('1') + ' lava ' + kbd('2') + ' tapa ' + kbd('3') + ' voltea ' + kbd('4') + ' tira';
}

const PASOS_TUTORIAL = {
    d2: [
        { txt: () => 'Muévete',
          teclas: () => tactilVisible() ? JOYSTICK
                      : mandoActivo ? 'stick izquierdo' : kbd('A') + kbd('D') + ' o ' + kbd('←') + kbd('→'),
          hecho: s => Math.abs(jugador.x - s.x0) > 80 },
        { txt: () => 'Salta',
          teclas: () => tactilVisible() ? kbd('Saltar')
                      : mandoActivo ? kbd(etiquetasMando().A) : kbd('W') + ' · ' + kbd('↑') + ' · ' + kbd('Espacio'),
          hecho: () => !jugador.enSuelo && jugador.vy < 0 },
        { txt: () => 'Dash: un instante invulnerable',
          teclas: () => tactilVisible() ? kbd('Dash') : mandoActivo ? kbd(etiquetasMando().B) : kbd('Shift'),
          hecho: () => jugador.dashT > 0 },
        { txt: () => 'Raqueta: achicharra y devuelve los proyectiles morados',
          teclas: () => tactilVisible() ? kbd('Raqueta')
                      : mandoActivo ? kbd(etiquetasMando().Y) : kbd('F') + ' · clic derecho',
          hecho: () => jugador.parryT > 0 },
        { txt: () => criaderoCercano2D() ? 'Ciérralo con la medida que pide' : 'Busca un envase con agua →',
          teclas: () => criaderoCercano2D() ? teclasMedidas() : 'de ahí salen los mosquitos',
          hecho: s => totalCerrados() > s.cerrados0 }
    ],
    d3: [
        { txt: () => 'Mira alrededor',
          teclas: () => tactilVisible() ? 'arrastra el dedo en la mitad derecha'
                      : mandoActivo ? 'stick derecho'
                      : (document.pointerLockElement ? 'mueve el ratón' : 'haz clic en la vista y mueve el ratón'),
          hecho: s => s.giro > 1 },
        { txt: () => 'Camina',
          teclas: () => tactilVisible() ? JOYSTICK
                      : mandoActivo ? 'stick izquierdo' : kbd('W') + kbd('A') + kbd('S') + kbd('D'),
          hecho: s => Math.hypot(camera3D.position.x - s.x0, camera3D.position.z - s.z0) > 4 },
        { txt: () => 'Ataca',
          teclas: () => tactilVisible() ? kbd('Atacar') + ' · mantenlo para una ráfaga'
                      : mandoActivo ? kbd(etiquetasMando().RT) + ' · ' + kbd(etiquetasMando().X)
                                    : 'clic izquierdo · ' + kbd('J'),
          hecho: () => jugador.ataqueCd > 0 },
        { txt: () => 'Esquiva con el dash',
          teclas: () => tactilVisible() ? kbd('Dash') : mandoActivo ? kbd(etiquetasMando().B) : kbd('Shift'),
          hecho: () => jugador.dashT > 0 },
        { txt: () => 'Sigue la brújula hasta el envase',
          teclas: () => 'la flecha de abajo apunta al criadero',
          hecho: () => !!criaderoCercano3D() },
        { txt: () => 'Ciérralo con la medida que pide',
          teclas: () => teclasMedidas(),
          hecho: s => totalCerrados() > s.cerrados0 }
    ]
};

function iniciarTutorial(n) {
    tutorial = null;
    ocultarTutorial();
    if (!opciones.tutorial) return;
    const modo = NIVEL_ES_2D(n) ? 'd2' : 'd3';
    if (tutorialVisto()[modo]) return;
    const pasos = PASOS_TUTORIAL[modo];
    tutorial = {
        modo, pasos, i: 0, hechos: pasos.map(() => false), ok: 0, fin: 0, clave: '',
        x0: modo === 'd2' ? jugador.x : camera3D.position.x,
        z0: modo === 'd3' ? camera3D.position.z : 0,
        yaw: jugador.yaw, giro: 0, cerrados0: totalCerrados()
    };
}

function ocultarTutorial() {
    if (!elTutorial.classList.contains('oculto')) elTutorial.classList.add('oculto');
}

function actualizarTutorial(dt) {
    const s = tutorial;
    if (!s) return;
    const jugando = (s.modo === 'd2' && estado === estados.J2D) || (s.modo === 'd3' && estado === estados.J3D);
    if (!jugando) { ocultarTutorial(); return; }

    if (s.fin > 0) {                               // «¡Listo!» y se va
        s.fin -= dt;
        if (s.fin <= 0) { tutorial = null; ocultarTutorial(); }
        else pintarTutorial(s.htmlFin, 'fin');     // por si se pausó a la mitad
        return;
    }

    if (s.modo === 'd3') { s.giro += Math.abs(difAngulo(jugador.yaw, s.yaw)); s.yaw = jugador.yaw; }
    for (let k = 0; k < s.pasos.length; k++)
        if (!s.hechos[k] && s.pasos[k].hecho(s)) s.hechos[k] = true;

    if (s.ok > 0) {
        s.ok -= dt;
        if (s.ok <= 0) {
            while (s.i < s.pasos.length && s.hechos[s.i]) s.i++;
            if (s.i >= s.pasos.length) {
                marcarTutorialVisto(s.modo);
                s.fin = TUTORIAL_FIN;
                s.htmlFin = '<div class="tu-txt">¡Listo! Ya sabes lo básico</div>' +
                            '<div class="tu-teclas">' + (tactilVisible() ? '⏸ pausa · 🛒 tienda · 📖 fichero'
                                                                         : 'Esc pausa · T tienda · C fichero') + '</div>';
                pintarTutorial(s.htmlFin, 'fin');
                sfx.nivel();
                return;
            }
        }
    } else if (s.hechos[s.i]) {
        s.ok = TUTORIAL_OK;
        sfx.moneda();
    }

    const p = s.pasos[s.i];
    const listo = s.ok > 0;
    pintarTutorial(
        '<div class="tu-paso">Tutorial · ' + (s.i + 1) + ' de ' + s.pasos.length + '</div>' +
        '<div class="tu-txt">' + (listo ? '✔ ' : '') + p.txt(s) + '</div>' +
        '<div class="tu-teclas">' + p.teclas(s) + '</div>', listo ? 'ok' : '');
}

/** Solo toca el DOM si algo cambió: se llama cada frame. */
function pintarTutorial(html, clase) {
    const clave = clase + html;
    if (tutorial && tutorial.clave === clave && !elTutorial.classList.contains('oculto')) return;
    if (tutorial) tutorial.clave = clave;
    elTutorial.innerHTML = html;
    elTutorial.classList.toggle('ok', clase === 'ok');
    elTutorial.classList.toggle('fin', clase === 'fin');
    elTutorial.classList.remove('oculto');
}
