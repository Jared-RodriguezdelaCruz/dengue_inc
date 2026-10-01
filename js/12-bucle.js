"use strict";

// --- Overlay de rendimiento (F3) -------------------------------------------
const elDebug = document.getElementById('debug');
let fpsAcum = 0, fpsCont = 0, fpsMostrado = 0, msLogica = 0, contadorHUD = 0;

function pintarDebug(msFrame) {
    const totalEnt = modoRender === '2d' ? enemigos.length : mosquitos3D.length;
    elDebug.textContent =
        'FPS         ' + fpsMostrado + '  (' + msFrame.toFixed(1) + ' ms/frame)\n' +
        'lógica      ' + msLogica.toFixed(2) + ' ms\n' +
        'partículas  ' + (modoRender === '2d'
            ? Part.n + '/' + MAX_PART + '   descartadas ' + Part.descartadas
            : P3.n + '/' + MAX_P3 + '   (1 draw call)') + '\n' +
        'entidades   ' + entidadesActualizadas + ' simuladas / ' + totalEnt + ' vivas\n' +
        'proyectiles ' + (modoRender === '2d' ? proyectiles.length : proy3D.length) + '\n' +
        'atacantes   ' + tokensAtaque + '/' + CFG.maxAtacantes + '  (token global)\n' +
        'generación  ' + statsGen + '\n' +
        'criaderos   ' + criaderosVivos() + ' activos  ·  casos ' + casosColonia + '\n' +
        'infección   ' + (jugador.infeccion
            ? SEROTIPOS[jugador.infeccion.serotipo].nombre + ' ' + jugador.infeccion.fase +
              (jugador.infeccion.grave ? ' GRAVE' : '') + ' t=' + jugador.infeccion.t.toFixed(0)
            : 'sana') + '  ·  inmune a ' + serotiposPasados() + '/4\n' +
        'semilla     ' + semillaRun + '  ·  nivel ' + nivelActual + '  ·  ' + estado + '\n' +
        'cortina     DOM ' + (elDestello.style.opacity || '0') +
            '  dueño ' + (cortina.dueno || '—') +
            (elDestello.classList.contains('grieta') ? '  [grieta]' : '') + '\n' +
        'build       ' + BUILD + '\n' +
        'errores     ' + (erroresBucle === 0 ? 'ninguno'
                          : erroresBucle + '  ·  ' + primerError);
}

// --- Bucle principal -------------------------------------------------------
let tPrev = performance.now();

// --- Blindaje del bucle ----------------------------------------------------
//  La cortina de pantalla se pinta en el `finally`, nunca en el cuerpo. Estaba
//  en la última línea del bucle y bastaba una excepción del camino 3D para que
//  no llegara a ejecutarse: `#destello` se quedaba congelado en el DOM y el
//  resultado era un velo blanco a pantalla completa con el juego corriendo
//  debajo. La versión con transiciones CSS era inmune a eso porque el fundido lo
//  terminaba el navegador; al traerlo al bucle hay que reponer esa garantía a
//  mano. `fase` dice en qué bloque se rompió, que si no el error no se localiza.
let erroresBucle = 0, primerError = '', ultimoError = '';

function anotarErrorBucle(fase, e) {
    erroresBucle++;
    ultimoError = fase + ' · ' + e.message;
    if (erroresBucle === 1) {
        primerError = ultimoError;
        console.error('[bucle] excepción en ' + fase, e);
    } else if (erroresBucle % 180 === 0) {
        // Un fallo por frame inunda la consola y tapa lo que importa.
        console.error('[bucle] ' + fase + ' (x' + erroresBucle + ')', e);
    }
}

function loop(t) {
    requestAnimationFrame(loop);
    const ms = Math.min(120, t - tPrev);
    tPrev = t;

    // dt normalizado a "1 = un frame de 60 fps". El tope de 3 impide que, tras
    // volver de otra pestaña, el jugador atraviese el suelo de un salto.
    const dtReal = ms / 16.667;
    let dt = Math.min(dtReal, 3);

    // Hitstop: la lógica se congela unos frames en cada impacto, el render no.
    if (hitstop > 0) { hitstop -= dtReal; dt = 0; }

    sacudida *= Math.pow(0.86, dtReal);
    if (sacudida < 0.15) sacudida = 0;
    if (vinetaT > 0) { vinetaT -= dtReal; elVineta.style.opacity = Math.min(0.85, vinetaT / 34); }
    else if (elVineta.style.opacity !== '0') elVineta.style.opacity = 0;

    entidadesActualizadas = 0;
    const t0 = performance.now();
    let fase = 'inicio';

    try {
        fase = 'mando';
        actualizarMando(dtReal);

        fase = 'transicion';
        actualizarTransicion(dtReal);

        if (modoRender === '2d') {
            const jugando = estado === estados.J2D;
            if (jugando && dt > 0) {
                fase = 'jugador2d';   actualizarJugadorComun(dt); actualizarJugador2D(dt);
                fase = 'enemigos2d';  actualizarEnemigos2D(dt);
                fase = 'jefe';        actualizarJefe(dt);
                fase = 'proyectiles2d'; actualizarProyectiles2D(dt);
                fase = 'objetos2d';   actualizarObjetos2D(dt);
            }
            if (dt > 0 && estado !== estados.PAUSA) {
                fase = 'particulas2d';
                actualizarParticulas(dt); actualizarOndas(dt); actualizarTextos(dt);
            }
            fase = 'camara2d'; actualizarCamara2D(jugando ? dt : 0);
            msLogica = performance.now() - t0;
            fase = 'dibujo2d'; dibujar2D();
        } else {
            const jugando = estado === estados.J3D;
            if (jugando && dt > 0) {
                fase = 'jugador3d';   actualizarJugadorComun(dt); actualizarJugador3D(dt);
                fase = 'mosquitos3d'; actualizarMosquitos3D(dt);
                fase = 'proyectiles3d'; actualizarProyectiles3D(dt);
                fase = 'objetos3d';   actualizarObjetos3D(dt);
            } else if (dt > 0 && estado !== estados.PAUSA) {
                fase = 'anillos3d'; actualizarAnillos(dt);
            }
            if (dt > 0 && estado !== estados.PAUSA) {
                fase = 'particulas3d'; actualizarParticulas3D(dt);
            }
            msLogica = performance.now() - t0;
            fase = 'render3d';
            if (renderer && scene && camera3D) renderer.render(scene, camera3D);
        }

        // Capa educativa: la colonia se sigue contagiando mientras haya criaderos,
        // y las fichas nuevas salen de una en una sin cortar la partida.
        if (dt > 0 && estado !== estados.PAUSA) {
            fase = 'colonia'; actualizarColonia(dt);
            fase = 'fichas';  actualizarFichas(dt);
            fase = 'guero';   actualizarGuero(dt);
        }

        // HUD continuo: solo toca unos pocos estilos, y no cada frame.
        fase = 'hud';
        if (++contadorHUD % 3 === 0) actualizarHUDContinuo();
    } catch (e) {
        anotarErrorBucle(fase, e);
    } finally {
        // Pase lo que pase ahí arriba, la cortina se sigue animando. Esto es lo
        // único que garantiza que un fallo nunca deje la pantalla tapada.
        actualizarCortina();
    }

    fpsAcum += ms; fpsCont++;
    if (fpsAcum >= 500) {
        fpsMostrado = Math.round(1000 / (fpsAcum / fpsCont));
        fpsAcum = 0; fpsCont = 0;
    }
    if (mostrarDebug) pintarDebug(ms);

    limpiarFlancos();
}

// --- Arranque --------------------------------------------------------------
iniciarMotor3D();
semillaRun = (Math.random() * 2147483647) | 0;
pintarLegenda();
actualizarHUD();
menuPrincipal();
requestAnimationFrame(loop);





