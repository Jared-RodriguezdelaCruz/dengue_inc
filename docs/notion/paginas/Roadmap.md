Plan del proyecto de septiembre a diciembre de 2026. Última actualización: **9 de octubre de 2026**.

Las tareas, con su responsable, fecha límite y estado, viven en **✅ Tareas**. Esta página resume hacia dónde vamos.

## Dónde estamos

**Avance al 9 de octubre: 57 de 132 tareas hechas (43 %) y 4 de las 7 fases cerradas (F0 a F3).** El juego está publicado en [GitHub Pages](https://jared-rodriguezdelacruz.github.io/dengue_inc/) y monitoreado en la [página de estado de UptimeRobot](https://stats.uptimerobot.com/KSFC94VXhP). Cada cambio entra por PR revisado, con CI y bot de kudos en Discord. Lo que sigue es F4 (audio, pulido, el rediseño educativo que pidió la maestra y los bugs y mejoras que salieron del juego publicado) y el cierre (F5 y F6).

El juego está completo y se puede jugar de principio a fin: unas 7,000 líneas de JavaScript sin dependencias (salvo Three.js), **5 niveles procedurales** (1, 3 y 4 en 2D; 2 y 5 en 3D en primera persona), jefe de dos fases, transición dimensional, final con Güero y una capa educativa en la que cada dato cita su fuente.

| Área | Estado | Qué hay / qué falta |
|---|---|---|
| Motor y entrada | ✅ Listo | PRNG con semilla, dt normalizado, teclado, ratón y mando |
| Mundo 2D | ✅ Listo | Funciona a la perfección (Jared y Gael): 8 plantillas de chunk validadas, 4 tipos de mosquito, jefe de 2 fases. En la rama `feature/jefes-3d-gata` el jefe pasa al nivel 3, el último 2D, y su fase 2 dura un 39 % menos sin perder ningún aviso (DI-462) |
| Mundo 3D | 🟡 En curso | Salas procedurales, muros instanciados, brújula. En la rama `feature/jefes-3d-gata`: el nivel 4 pasa a 3D (DI-464) con la Hembra, un jefe que se protege con sus criaderos (DI-463), plataformas que se suben saltando (DI-465) y la Gorda, gata aliada en 2D y 3D (DI-468) |
| Capa educativa | 🟡 Rediseño | La maestra pidió repensar cómo enseñamos: casi todo se leía y el juego premiaba matar mosquitos. En la rama `feature/educacion-rediseno` ya está casi todo (DI-471 a DI-484 y DI-486): cerrar criaderos paga, quiz antes y después, repaso y retos entre niveles, ciclo de vida, lluvia, Ivan en fase febril, Modo Patio, «Aprende» y «Revisa tu casa». Son 25 fichas, 5 mitos y 5 realidades, todo con fuente. Faltan la revisión de Ana (DI-484), medir en los playtests (DI-485) y los niveles en lugares reales (DI-487) |
| Flujo de equipo | ✅ Listo | Notion, Discord, ramas protegidas, PRs con revisión, plantillas y CODEOWNERS. Falta subir `CONTRIBUTING.md` (DI-202) |
| Automatización | ✅ Listo | *Validar* y *Título del PR* en cada PR; el bot de kudos felicita en Discord cada PR fusionado |
| Publicación y monitoreo | ✅ Listo | GitHub Pages con cache-busting por commit, UptimeRobot cada 5 min y badges en el README |
| Bugs del juego publicado | 🟡 En curso | Los 2 bugs P0 (la vida del HUD y el ratón en el final con Güero) ya están arreglados y verificados (DI-460, DI-461). De las mejoras pedidas, el celular ya se juega en la rama `feature/celular` (DI-424, DI-430); faltan las que esperan material: las skins (DI-466, DI-467) y la música (DI-470) |
| Audio | 🟡 Parcial | 12 efectos sintetizados; **no hay música** ni control de volumen (DI-401 a DI-412 y DI-470) |
| Interfaz y marca | 🟡 Casi lista | En la rama `feature/menu-tutorial`: pantalla de título estilo Katana Zero con Jugar, Modo Patio, Aprende, Opciones, Ayuda y Créditos (DI-469, DI-422, DI-423), nombre único «Dengue Inc» (DI-420), favicon y vista previa al compartir (DI-456) y tutorial la primera vez (DI-426). Faltan los créditos de audio (DI-412) |
| Accesibilidad y celular | 🟡 En curso | Ya se pueden reducir destellos y sacudidas (DI-423) y, en la rama `feature/celular`, jugar en celular con controles táctiles (DI-430, DI-424); los serotipos se siguen distinguiendo solo por color (DI-425) |
| Guardado | 🟡 Parcial | Se guardan las opciones, el audio, el tutorial visto, los resultados del quiz y el mejor tiempo del Modo Patio; faltan las fichas y el progreso (DI-440) |

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
| S3 | 14 – 20 oct | F3 | **3** | **20 oct:** video de 30 s de la automatización ✅ | Mezclador de audio, favicon y etiquetas meta, incentivos educativos (cerrar criaderos paga, abate y fichas que faltaban) |
| S4 | 21 – 27 oct | F3 | **4** | **27 oct:** link de la página de estado de UptimeRobot ✅ | Reproductor de música, tema del menú, créditos, fase 2 del jefe 2D, contenido nuevo con fuentes, repaso entre niveles y mito o realidad |
| S5 | 28 oct – 3 nov | F4 | — | — | Tema 2D, menú estilo Katana Zero, opciones, guardado, nivel 4 en 3D, aviso en celular, «Revisa tu casa» |
| S6 | 4 – 10 nov | F4 | — | — | Tema 3D, SFX nuevos, accesibilidad, tutorial 2D y 3D, skins de Güero e Ivan, rendimiento, quiz antes y después, Modo Patio, Ivan en fase febril |
| S7 | 11 – 17 nov | F4 | — | — | Tema del jefe y del final, música integrada, jefe 3D, gato aliado, playtest 1, ciclo de vida en el criadero, repelente e insecticida, submenú Aprende |
| S8 | 18 – 24 nov | F4 · F5 | **5** | Kudos de los 5 y su evidencia | Bugs del playtest, playtest 2 con medición de aprendizaje, jugar en celular, plataformas 3D, extras P2 (lluvia, triage, niveles en lugares reales) |
| S9 | 25 – 29 nov | F5 | **5** | Slides y video de respaldo · **29 nov: release v2.0, proyecto terminado** | Código congelado |
| S10 | 30 nov – 4 dic | F6 | **6** | Presentación en vivo · evaluación entre equipos | Testing final (solo arreglos P0) |

**Rituales desde S1:** daily asíncrona en `#daily` (ayer / hoy / bloqueos) · revisión del tablero los lunes · **kudos los viernes**. Así el Paso 5 es costumbre y no un trámite de última semana, y en S8 ya habrá varias semanas de evidencia.

## Carga por integrante

**Prioridad:** **P0** imprescindible para el Demo Day · **P1** importante · **P2** deseable (se recorta primero).

| Integrante | Rol | Tareas hechas | Pendientes | Pendientes P0 | Horas estimadas pendientes |
|---|---|---|---|---|---|
| Ana | CEO / Project Manager | 12 | 9 | 4 | 25.5 |
| Jared | Backend | 24 | 23 | 8 | 82 |
| Gael | Música y sonido | 2 | 10 | 6 | 38.5 |
| Mau | Frontend | 11 | 19 | 3 | 77 |
| Ivan | QA, métricas y documentación | 8 | 11 | 5 | 22.5 |
| Todos | — | 0 | 3 | 3 | 1 |
| **Total** | | **57** | **75** | **29** | **246.5** |

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
| El rediseño educativo (DI-471 a DI-487) suma 58.5 h | Alta | Medio | Las P0 educativas (DI-471 a DI-474 y DI-484) van antes que cualquier extra; si falta tiempo se recortan primero las P2 que no enseñan nada (gato aliado DI-468, plataformas 3D DI-465) y luego las P2 educativas |
