Plan del proyecto de septiembre a diciembre de 2026. Última actualización: **5 de octubre de 2026**.

Las tareas, con su responsable, fecha límite y estado, viven en **✅ Tareas**. Esta página resume hacia dónde vamos.

## Dónde estamos

**Avance al 5 de octubre: 55 de 114 tareas hechas (48 %) y 4 de las 7 fases cerradas (F0 a F3).** El juego está publicado en [GitHub Pages](https://jared-rodriguezdelacruz.github.io/dengue_inc/) y monitoreado en la [página de estado de UptimeRobot](https://stats.uptimerobot.com/KSFC94VXhP). Cada cambio entra por PR revisado, con CI y bot de kudos en Discord. Lo que sigue es F4 (audio, pulido y los bugs y mejoras que salieron del juego publicado) y el cierre (F5 y F6).

El juego está completo y se puede jugar de principio a fin: unas 7,000 líneas de JavaScript sin dependencias (salvo Three.js), **5 niveles procedurales** (1, 3 y 4 en 2D; 2 y 5 en 3D en primera persona), jefe de dos fases, transición dimensional, final con Güero y una capa educativa en la que cada dato cita su fuente.

| Área | Estado | Qué hay / qué falta |
|---|---|---|
| Motor y entrada | ✅ Listo | PRNG con semilla, dt normalizado, teclado, ratón y mando |
| Mundo 2D | ✅ Listo | Funciona a la perfección (Jared y Gael): 8 plantillas de chunk validadas, 4 tipos de mosquito, jefe de 2 fases. Solo falta acelerar la fase 2 del jefe (DI-462) |
| Mundo 3D | ✅ Listo | Salas procedurales, muros instanciados, brújula. Vienen el nivel 4 en 3D, el jefe 3D y plataformas (DI-463 a DI-465) |
| Capa educativa | ✅ Listo | 10 envases, 4 serotipos, 21 fichas, 5 mitos, tienda con datos reales, Güero |
| Flujo de equipo | ✅ Listo | Notion, Discord, ramas protegidas, PRs con revisión, plantillas y CODEOWNERS. Falta subir `CONTRIBUTING.md` (DI-202) |
| Automatización | ✅ Listo | *Validar* y *Título del PR* en cada PR; el bot de kudos felicita en Discord cada PR fusionado |
| Publicación y monitoreo | ✅ Listo | GitHub Pages con cache-busting por commit, UptimeRobot cada 5 min y badges en el README |
| Bugs del juego publicado | 🟡 En curso | 2 bugs P0 (la vida del HUD y el ratón en el final con Güero) y 9 mejoras, repartidas en F4 por área |
| Audio | 🟡 Parcial | 12 efectos sintetizados; **no hay música** ni control de volumen (DI-401 a DI-412 y DI-470) |
| Interfaz y marca | 🟡 Parcial | HUD y menús completos; faltan el menú principal nuevo (DI-469), créditos, opciones, nombre único, favicon y etiquetas meta (DI-456) |
| Accesibilidad y celular | 🔴 Falta | Los serotipos se distinguen solo por color; no se pueden reducir destellos; no se puede jugar en celular (DI-430) |
| Guardado | 🔴 Falta | Nada persiste entre sesiones |

## Fases

| Fase | Fechas | Objetivo | Paso | Hito de salida |
|---|---|---|---|---|
| **F0 · Prototipo jugable** ✅ | 11 – 29 sep | Tener el juego completo | — | Build `b5`: 5 niveles, mando, capa educativa |
| **F1 · Organización del equipo** ✅ | 30 sep – **6 oct** | Que el equipo trabaje en un solo lugar, con roles claros | Paso 1 | Link de Notion con visión, propósito y roles |
| **F2 · Flujo de trabajo en GitHub** ✅ | 7 – 13 oct | Que todo cambio se pida y se apruebe por PR | Paso 2 | Ramas protegidas, CONTRIBUTING y primer PR revisado |
| **F3 · Automatización y publicación** ✅ | 14 – 27 oct | Que el buen trabajo se valide y se celebre solo, y que el juego esté en línea | Pasos 3 y 4 | Video de 30 s del bot · link público de UptimeRobot |
| **F4 · Audio, pulido y calidad** | 7 oct – 24 nov | Música completa, los bugs y mejoras del juego publicado, y el juego listo para enseñarse | — | Música en todos los niveles, P0 y P1 hechas, 2 playtests |
| **F5 · Cultura y cierre** | 18 – 29 nov | Reconocimiento visible y producto terminado | Paso 5 | Kudos de los 5, slides y **release v2.0 (29 nov)** |
| **F6 · Testing final y Demo Day** | 30 nov – 4 dic | Probar la versión final y presentarla | Paso 6 | Presentación y evaluación entre equipos |

## Calendario por semana

Las semanas van de **miércoles a martes** para que cada entrega caiga en martes, como la del Paso 1 (6 de octubre). La S9 es corta: cierra el domingo 29 de noviembre con el proyecto terminado, y la primera semana de diciembre queda solo para testing y presentación.

> Si el profesor fija otras fechas para los pasos 2 a 5, solo se mueven esas filas. Si falta tiempo, se recortan primero las tareas **P2**, luego las **P1**; las **P0** no se mueven.

| Semana | Fechas | Fase | Paso | Entrega de la actividad | Foco en el juego |
|---|---|---|---|---|---|
| S0 | 11 – 29 sep | F0 | — | — | Prototipo `b5` (hecho) |
| S1 | 30 sep – 6 oct | F1 | **1** | **6 oct:** link del workspace de Notion ✅ | Juego publicado en GitHub Pages ✅ |
| S2 | 7 – 13 oct | F2 | **2** | **13 oct:** flujo de GitHub documentado y configurado ✅ | Bugs P0 (vida del HUD, ratón con Güero), dirección musical, marca, Three.js local, plan de pruebas |
| S3 | 14 – 20 oct | F3 | **3** | **20 oct:** video de 30 s de la automatización ✅ | Mezclador de audio, favicon y etiquetas meta |
| S4 | 21 – 27 oct | F3 | **4** | **27 oct:** link de la página de estado de UptimeRobot ✅ | Reproductor de música, tema del menú, créditos, fase 2 del jefe 2D |
| S5 | 28 oct – 3 nov | F4 | — | — | Tema 2D, menú estilo Katana Zero, opciones, guardado, nivel 4 en 3D, aviso en celular |
| S6 | 4 – 10 nov | F4 | — | — | Tema 3D, SFX nuevos, accesibilidad, tutorial 2D y 3D, skins de Güero e Ivan, rendimiento |
| S7 | 11 – 17 nov | F4 | — | — | Tema del jefe y del final, música integrada, jefe 3D, gato aliado, playtest 1 |
| S8 | 18 – 24 nov | F4 · F5 | **5** | Kudos de los 5 y su evidencia | Bugs del playtest, playtest 2, jugar en celular, plataformas 3D, extras P2 |
| S9 | 25 – 29 nov | F5 | **5** | Slides y video de respaldo · **29 nov: release v2.0, proyecto terminado** | Código congelado |
| S10 | 30 nov – 4 dic | F6 | **6** | Presentación en vivo · evaluación entre equipos | Testing final (solo arreglos P0) |

**Rituales desde S1:** daily asíncrona en `#daily` (ayer / hoy / bloqueos) · revisión del tablero los lunes · **kudos los viernes**. Así el Paso 5 es costumbre y no un trámite de última semana, y en S8 ya habrá varias semanas de evidencia.

## Carga por integrante

**Prioridad:** **P0** imprescindible para el Demo Day · **P1** importante · **P2** deseable (se recorta primero).

| Integrante | Rol | Tareas hechas | Pendientes | Pendientes P0 | Horas estimadas pendientes |
|---|---|---|---|---|---|
| Ana | CEO / Project Manager | 12 | 6 | 3 | 12.5 |
| Jared | Backend | 22 | 16 | 6 | 56 |
| Gael | Música y sonido | 2 | 10 | 6 | 38.5 |
| Mau | Frontend | 11 | 14 | 3 | 60.5 |
| Ivan | QA, métricas y documentación | 8 | 10 | 5 | 21.5 |
| Todos | — | 0 | 3 | 3 | 1 |
| **Total** | | **55** | **59** | **26** | **190** |

Cada tarea cuenta para su responsable; quien apoyó aparece en la columna *Apoyo* de ✅ Tareas. Por ejemplo, Gael en todo el mundo 2D (DI-008 a DI-011).

## Riesgos

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Sin internet o Wi-Fi lento en el Demo Day | Media | Alto | Three.js local (DI-421), video de respaldo (DI-505) y el juego abre sin servidor |
| La música no está a tiempo | Media | Alto | Pistas con licencia libre como plan B; el reproductor (DI-403) no depende de las pistas finales |
| Conflictos de merge (varios tocan `11-flujo.js`) | Alta | Medio | PRs pequeños, actualizar la rama desde `develop` a diario, CODEOWNERS |
| El navegador bloquea el audio automático | Alta | Bajo | La música arranca con el clic de *Iniciar*, donde el juego ya desbloquea el audio |
| El navegador sirve JS viejo de la caché | Media | Medio | Cache-busting automático en el deploy (DI-307) |
| Se filtra el webhook de Discord | Baja | Medio | Solo como secreto de GitHub; si se filtra, se regenera en Discord |
| Mau concentra todo el frontend (2D, 3D e interfaz) | Media | Medio | Sus tareas extra son P2 y se recortan primero; Jared apoya en 3D y controles |
| El testing final encuentra algo grave sin tiempo para arreglarlo | Baja | Alto | Proyecto terminado el 29 nov, 2 playtests antes y en S10 solo se arreglan bugs P0 |
| Se pierde el ritmo a mitad de noviembre | Media | Medio | Rituales semanales y la gráfica de avance de Notion revisada cada lunes |
| Se sumaron 11 tareas (5 oct) con las mismas fechas | Alta | Medio | Los bugs P0 van primero (13 oct); las P2 nuevas (gato aliado, plataformas 3D) se recortan antes que cualquier otra |
| Faltan las imágenes de referencia (Güero, Ivan, la Gorda) | Media | Bajo | Se piden a Jared antes de S6; mientras, se modela con primitivas y se ajusta después |
