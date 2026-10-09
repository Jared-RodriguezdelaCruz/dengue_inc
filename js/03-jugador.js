"use strict";

// ---------------------------------------------------------------------------
//  7. JUGADOR
//     Un único objeto para las dos dimensiones: vida, estamina y los temporizadores
//     de dash/esquive/parry son idénticos en 2D y 3D, solo cambia cómo se mueve.
// ---------------------------------------------------------------------------
const jugador = {
    // Mundo 2D
    x: 60, y: 300, ancho: 24, alto: 32, vx: 0, vy: 0, dir: 1,
    enSuelo: false, coyote: 0, buffer: 0, saltando: false, dashAereo: true,
    enAgua: false,
    // Mundo 3D
    yaw: 0, pitch: 0, vy3: 0, enSuelo3: true,
    // Estado compartido
    vida: CFG.vidaMax, estamina: CFG.estaminaMax, esperaEstamina: 0,
    iframes: 0, muerto: false,
    dashT: 0, dashCd: 0, dashDirX: 1, dashDirY: 0, esRoll: false,
    parryT: 0, parryCd: 0, parryRecovery: 0, parryExito: false, parryGolpe: 0,
    // Raqueta: raquetaT anima el swing y dura más que la ventana activa, para que
    // el golpe se vea terminar. selloRaqueta identifica el swing, y así un mismo
    // arco no puede golpear dos veces al mismo mosquito.
    raquetaT: 0, selloRaqueta: 0,
    ataqueCd: 0,
    // Enfermedad: índice 1..4 por serotipo. La inmunidad es permanente y por serotipo.
    inmunes: [false, false, false, false, false],
    infeccion: null,        // { serotipo, fase:'febril'|'critica', t, tMax, grave }
    sangrado: 0,            // secuela de tomar AINE: daño por segundo en fase crítica
    protegido: 0,           // paracetamol: acorta fiebre y amortigua la fase crítica
    repelente: 0,           // frames en que casi no te pican (no mata a nadie)
    vacunado: false,
    tomoAINE: false,        // para el reporte final
    // Presentación
    escX: 1, escY: 1, rotVis: 0, parpadeo: 0, tAnim: 0
};

// Duraciones en frames de 60 fps. La fiebre es larga a propósito: hay que
// aprender a jugar enfermo, no esperar a que se pase.
const FIEBRE_DUR  = 1320;   // ~22 s
const CRITICA_DUR = 480;    // ~8 s

const infectado    = () => jugador.infeccion !== null;
const enFaseCritica = () => jugador.infeccion !== null && jugador.infeccion.fase === 'critica';
const serotiposPasados = () => jugador.inmunes.reduce((n, v) => n + (v ? 1 : 0), 0);

const invulnerable = () => jugador.iframes > 0 || jugador.dashT > 0;
const parryAbierto = () => jugador.parryT > 0;
const puedeActuar  = () => !jugador.muerto && jugador.parryRecovery <= 0;

function reiniciarJugador(completo) {
    jugador.vx = jugador.vy = 0; jugador.vy3 = 0;
    jugador.dashT = jugador.dashCd = 0;
    jugador.parryT = jugador.parryCd = jugador.parryRecovery = 0;
    jugador.iframes = 0; jugador.muerto = false;
    jugador.escX = jugador.escY = 1; jugador.rotVis = 0;
    jugador.dashAereo = true; jugador.saltando = false;
    if (completo) {
        jugador.vida = CFG.vidaMax; jugador.estamina = CFG.estaminaMax;
        // Partida nueva: se olvida todo el historial clínico.
        jugador.inmunes = [false, false, false, false, false];
        jugador.infeccion = null;
        jugador.sangrado = 0; jugador.protegido = 0; jugador.repelente = 0;
        jugador.vacunado = false; jugador.tomoAINE = false;
    }
}

function gastarEstamina(n) {
    if (jugador.estamina < n) return false;
    jugador.estamina -= n;
    jugador.esperaEstamina = CFG.estaminaEspera;
    return true;
}
function darEstamina(n) { jugador.estamina = Math.min(CFG.estaminaMax, jugador.estamina + n); }

/** Dash y esquive comparten temporizador; el roll cambia duración/velocidad. */
function intentarDash(dx, dy, roll) {
    if (!puedeActuar() || jugador.dashCd > 0 || jugador.dashT > 0) return false;
    if (!gastarEstamina(roll ? CFG.rollCoste : CFG.dashCoste)) { sfx.parryFail(); return false; }
    const len = Math.hypot(dx, dy) || 1;
    jugador.dashDirX = dx / len; jugador.dashDirY = dy / len;
    jugador.esRoll = !!roll;
    jugador.dashT  = roll ? CFG.rollDur : CFG.dashDur;
    jugador.dashCd = roll ? CFG.rollCd  : CFG.dashCd;
    sfx.dash(); sacudir(roll ? 2 : 4);
    return true;
}

function intentarParry() {
    if (!puedeActuar() || jugador.parryCd > 0 || jugador.parryT > 0) return false;
    if (!gastarEstamina(CFG.parryCoste)) { sfx.parryFail(); return false; }
    jugador.parryT = CFG.parryActivo;
    jugador.parryExito = false;
    jugador.raquetaT = CFG.raquetaSwing;
    jugador.selloRaqueta++;
    tono(720, 0.05, 'triangle', 0.04);
    tono(1450, 0.04, 'square', 0.03, 900);      // zumbido de la rejilla
    return true;
}

/** Se llama cuando el parry conecta con algo: recompensa generosa a propósito. */
function parryExitoso(x, y) {
    jugador.parryExito = true;
    jugador.parryGolpe = 14;      // señal de un solo uso: la consume quien reaccione al parry
    jugador.parryT = 0;
    jugador.parryRecovery = 0;
    jugador.parryCd = CFG.parryCd;
    jugador.iframes = Math.max(jugador.iframes, 18);
    darEstamina(CFG.parryDevuelve);
    congelar(6); sacudir(9); sfx.parry();
    destellar('#f1c40f', 0.35, 240);
    aviso('¡PARRY!', 620);
    if (estado === estados.J2D) { fxParry(x, y); emitirTexto(x, y - 30, '+' + CFG.parryDevuelve, COL.TURQ, 15); }
}

function dañarJugador(n, fx, fy) {
    if (debugGodMode) return false;
    if (invulnerable() || jugador.muerto || estado === estados.TRANSICION) return false;
    // En fase crítica se escapa plasma de los vasos: cualquier golpe pega el doble.
    // El paracetamol amortigua, pero no vuelve segura la fase crítica.
    if (enFaseCritica()) n = jugador.protegido > 0 ? n + 1 : n * 2;
    jugador.vida -= n;
    jugador.iframes = CFG.iframesGolpe;
    sacudir(13); congelar(7); pulsoVineta(30); sfx.daño(); vibrar(140, 0.6);
    destellar('#c0392b', 0.28, 260);
    if (estado === estados.J2D) {
        const dx = Math.sign(jugador.x + jugador.ancho/2 - (fx === undefined ? jugador.x : fx)) || 1;
        jugador.vx = dx * 7; jugador.vy = -5.5;
        fxChispas(jugador.x + jugador.ancho/2, jugador.y + jugador.alto/2, 18, COL.ROJO, 4);
        emitirTexto(jugador.x + 12, jugador.y - 8, '-' + n, COL.ROJO, 18);
    }
    latirCorazones();
    if (jugador.vida <= 0) { jugador.vida = 0; morirJugador(); return true; }
    return true;
}

// ---------------------------------------------------------------------------
//  ENFERMEDAD — el efecto del dengue convertido en regla
//
//  Una picadura no resta un corazón y ya: contagia. El curso es el real —
//  fase febril, la fiebre cede, y justo ahí empieza la fase crítica. Sobrevivirla
//  deja inmunidad a ESE serotipo y a ninguno más; la segunda infección con otro
//  serotipo es la grave. Todo esto está en el fichero con su fuente.
// ---------------------------------------------------------------------------

/** Elige el serotipo que circula en un nivel. Usa el PRNG con semilla: forma
 *  parte de la generación, así que la misma semilla da los mismos serotipos. */
function serotipoDeNivel(n) {
    const lista = SEROTIPOS_POR_NIVEL[n] || SEROTIPOS_POR_NIVEL[5];
    return lista[Math.floor(rnd() * lista.length)];
}

/** Picadura de mosquito. A diferencia de dañarJugador, esta puede contagiar. */
function picar(serotipo, fx, fy) {
    if (debugGodMode) return false;
    if (invulnerable() || jugador.muerto || estado === estados.TRANSICION) return false;
    serotipo = serotipo || 1;
    // La primera picadura abre la ficha: te pican despierto, de día.
    desbloquearFicha('dia');

    // Ya pasaste ESE serotipo: la picadura molesta pero no enferma. La inmunidad
    // es real, y es exactamente igual de real que su límite.
    if (jugador.inmunes[serotipo]) {
        jugador.iframes = Math.max(jugador.iframes, CFG.iframesGolpe * 0.5);
        sacudir(4); tono(520, 0.06, 'triangle', 0.05);
        if (estado === estados.J2D) {
            emitirTexto(jugador.x + 4, jugador.y - 10, 'INMUNE', COL.TURQ, 15);
            fxChispas(jugador.x + jugador.ancho / 2, jugador.y + jugador.alto / 2, 8, COL.TURQ, 3);
        }
        desbloquearFicha('serotipos');
        return false;
    }

    // El repelente evita la picadura mientras dura; tampoco cierra criaderos.
    if (jugador.repelente > 0 && Math.random() < 0.7) {
        jugador.iframes = Math.max(jugador.iframes, CFG.iframesGolpe * 0.6);
        tono(700, 0.06, 'triangle', 0.05);
        aviso('REPELENTE · NO TE PICÓ', 900);
        return false;
    }

    // La vacuna reduce el riesgo; no lo elimina ni cierra un solo criadero.
    if (jugador.vacunado && Math.random() < 0.6) {
        jugador.iframes = Math.max(jugador.iframes, CFG.iframesGolpe * 0.6);
        sacudir(5); tono(660, 0.07, 'triangle', 0.05);
        aviso('VACUNA: CONTAGIO EVITADO', 1000);
        desbloquearFicha('vacuna');
        return false;
    }

    // Ya estás cursando una infección: no se encima otra, pero la picadura duele.
    if (infectado()) return dañarJugador(1, fx, fy);

    infectar(serotipo, fx, fy);
    return true;
}

function infectar(serotipo, fx, fy) {
    // Segunda infección con un serotipo distinto: esto es el dengue grave.
    const grave = serotiposPasados() > 0;
    const s = SEROTIPOS[serotipo];
    jugador.infeccion = { serotipo, fase: 'febril', t: FIEBRE_DUR, tMax: FIEBRE_DUR, grave, dot: 0 };

    dañarJugador(grave ? 2 : 1, fx, fy);
    contagioEnColonia();

    destellar(s.color, 0.42, 560);
    sacudir(grave ? 18 : 11);
    aviso(grave ? '¡DENGUE GRAVE! ' + s.nombre : 'CONTAGIO · ' + s.nombre, 1700);
    desbloquearFicha('fase_febril');
    if (grave) { desbloquearFicha('dengue_grave'); desbloquearFicha('senales_alarma'); }
}

/** Avance del curso clínico. Corre en las dos dimensiones. */
function actualizarInfeccion(dt) {
    if (jugador.protegido > 0) jugador.protegido -= dt;
    if (jugador.repelente > 0) {
        jugador.repelente -= dt;
        if (jugador.repelente <= 0) aviso('SE ACABÓ EL REPELENTE · HAY QUE VOLVER A PONERLO', 1500);
    }

    const inf = jugador.infeccion;
    if (!inf || jugador.muerto) return;

    // El paracetamol acorta la fiebre; no toca la fase crítica.
    inf.t -= dt * (inf.fase === 'febril' && jugador.protegido > 0 ? 1.9 : 1);

    if (inf.fase === 'febril') {
        if (inf.t <= 0) {
            // Defervescencia. El HUD se ve sano y es justo el momento peligroso.
            inf.fase = 'critica'; inf.t = CRITICA_DUR; inf.tMax = CRITICA_DUR; inf.dot = 0;
            destellar('#ffffff', 0.34, 420);
            aviso('LA FIEBRE BAJÓ — AHORA ES CUANDO', 2100);
            tono(300, 0.5, 'sine', 0.06, 180);
            desbloquearFicha('fase_critica');
        }
        return;
    }

    // Fase crítica: se escapa plasma. El sangrado por AINE y el dengue grave
    // hacen daño sostenido; ambos son consecuencia, no azar.
    // El modo dios del Modo Coco también cubre este daño: no pasa por dañarJugador.
    const sangra = (jugador.sangrado > 0 || inf.grave) && !debugGodMode;
    if (sangra) {
        inf.dot += dt;
        const cada = jugador.sangrado > 0 ? 96 : 150;
        if (inf.dot >= cada) {
            inf.dot = 0;
            jugador.vida--;
            sacudir(9); pulsoVineta(26); sfx.daño();
            destellar('#7b241c', 0.32, 320);
            aviso(jugador.sangrado > 0 ? 'HEMORRAGIA' : 'FUGA DE PLASMA', 950);
            if (estado === estados.J2D)
                emitirTexto(jugador.x + 8, jugador.y - 12, '-1', COL.ROJO_OSC, 17);
            latirCorazones();
            if (jugador.vida <= 0) { jugador.vida = 0; morirJugador(); return; }
        }
    }

    if (inf.t <= 0) {
        const s = SEROTIPOS[inf.serotipo];
        jugador.inmunes[inf.serotipo] = true;
        jugador.infeccion = null;
        jugador.sangrado = 0;
        aviso('RECUPERADO · INMUNE A ' + s.nombre, 1900);
        destellar(s.color, 0.36, 620);
        sfx.nivel();
        desbloquearFicha('serotipos');
    }
}

// --- Tratamiento: lo que se compra en la tienda ----------------------------
function tomarParacetamol() {
    jugador.protegido = 1800;                       // ~30 s de cobertura
    if (jugador.infeccion) jugador.sangrado = 0;    // no revierte el daño hecho
    aviso('PARACETAMOL', 900); sfx.moneda();
    desbloquearFicha('hidratacion');
}

/** La trampa. Se etiqueta con honestidad y el castigo llega con su motivo. */
function tomarAINE() {
    jugador.tomoAINE = true;
    jugador.sangrado = 1;
    if (jugador.infeccion && jugador.infeccion.fase === 'febril')
        jugador.infeccion.t = Math.min(jugador.infeccion.t, 90);   // "baja la fiebre" al instante
    destellar('#c0392b', 0.4, 500); sacudir(10);
    aviso('LA FIEBRE BAJÓ… PERO NO ERA ESO', 2200);
    desbloquearFicha('sangrado');
}

/** Repelente: casi no te pican durante ~30 s. No mata mosquitos ni toca un criadero. */
function aplicarRepelente() {
    jugador.repelente = 1800;
    aviso('REPELENTE · 30 s CASI SIN PICADURAS', 1400); sfx.moneda();
    desbloquearFicha('repelente');
}

function aplicarVacuna() {
    jugador.vacunado = true;
    aviso('VACUNADO · SIGUE CERRANDO CRIADEROS', 2000);
    destellar('#2ecc71', 0.3, 500); sfx.nivel();
    desbloquearFicha('vacuna');
}

function morirJugador() {
    jugador.muerto = true;
    sfx.muerte(); sacudir(20); congelar(14); vibrar(450, 1);
    destellar('#c0392b', 0.6, 700);
    if (estado === estados.J2D) fxExplosion(jugador.x + 12, jugador.y + 16, 46, COL.AZUL, COL.BLANCO);
    // Si en esos 900 ms el nivel cambia (morir justo al tocar la salida), este
    // temporizador ya no debe abrir la pantalla de derrota.
    const nivelAlMorir = nivelActual;
    setTimeout(() => {
        if (jugador.muerto && nivelActual === nivelAlMorir) mostrarDerrota();
    }, 900);
}

/** Temporizadores comunes a las dos dimensiones. */
function actualizarJugadorComun(dt) {
    if (jugador.iframes > 0)        jugador.iframes -= dt;
    if (jugador.dashCd > 0)         jugador.dashCd -= dt;
    if (jugador.parryCd > 0)        jugador.parryCd -= dt;
    if (jugador.ataqueCd > 0)       jugador.ataqueCd -= dt;
    if (jugador.esperaEstamina > 0) jugador.esperaEstamina -= dt;
    if (jugador.parryGolpe > 0)     jugador.parryGolpe -= dt;
    if (jugador.raquetaT > 0)       jugador.raquetaT -= dt;

    if (jugador.dashT > 0) {
        jugador.dashT -= dt;
        if (jugador.dashT <= 0) {
            // Pequeña ventana extra de invulnerabilidad al terminar el dash:
            // evita que un enemigo te toque justo en el frame de salida.
            jugador.iframes = Math.max(jugador.iframes,
                jugador.esRoll ? CFG.rollIframesExtra : CFG.dashIframesExtra);
        }
    }
    if (jugador.parryT > 0) {
        jugador.parryT -= dt;
        // Fallar el parry cuesta: 0.35 s sin poder dashear ni volver a parear.
        if (jugador.parryT <= 0 && !jugador.parryExito) {
            jugador.parryRecovery = CFG.parryRecovery;
            sfx.parryFail();
        }
    }
    if (jugador.parryRecovery > 0) jugador.parryRecovery -= dt;

    actualizarInfeccion(dt);

    if (jugador.esperaEstamina <= 0 && jugador.estamina < CFG.estaminaMax) {
        // Con fiebre el cuerpo rinde menos: la estamina se recupera a la mitad.
        const factor = (jugador.infeccion && jugador.infeccion.fase === 'febril') ? 0.5 : 1;
        jugador.estamina = Math.min(CFG.estaminaMax,
                                    jugador.estamina + CFG.estaminaRegen * factor * dt);
    }

    jugador.tAnim += dt;
    jugador.parpadeo = jugador.iframes > 0 ? (Math.floor(jugador.iframes / 4) % 2) : 0;
}

