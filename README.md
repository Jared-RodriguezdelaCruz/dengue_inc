# Dengue Inc

[![Validar](https://github.com/Jared-RodriguezdelaCruz/dengue_inc/actions/workflows/validar.yml/badge.svg?branch=develop)](https://github.com/Jared-RodriguezdelaCruz/dengue_inc/actions/workflows/validar.yml)
[![Publicación](https://github.com/Jared-RodriguezdelaCruz/dengue_inc/actions/workflows/pages.yml/badge.svg)](https://jared-rodriguezdelacruz.github.io/dengue_inc/)
[![Estado](https://img.shields.io/badge/estado-UptimeRobot-brightgreen)](https://stats.uptimerobot.com/KSFC94VXhP)


## Descripción

**Dengue Inc · Multiverso Aguascalientes** es un juego web de acción y aprendizaje sobre la prevención del dengue, ambientado en Aguascalientes. Combina mecánicas tipo arcade, exploración en 2D y 3D, y elementos educativos para enseñar cómo se comporta el dengue, cuáles son los criaderos más comunes y qué medidas reales ayudan a prevenirlo.

El juego está pensado como una experiencia interactiva donde el jugador no solo avanza por niveles, sino que también aprende a identificar:

- qué tipos de envases pueden convertirse en criaderos,
- qué medida corresponde a cada tipo de recipiente,
- cómo funcionan los serotipos del dengue,
- por qué algunas acciones (como vaciar o voltear el recipiente sin corregir la causa) no resuelven el problema,
- y qué tan importante es la prevención de criaderos para evitar brotes.

## Objetivo principal

El objetivo del juego es cerrar los criaderos activos, evitar contagios en la colonia, sobrevivir a las fases de infección y llegar al final del recorrido, donde se resuelve la historia de un personaje llamado Güero.

## Características principales

- Juego en navegador con HTML, CSS y JavaScript puro
- Dos niveles en 2D (1 y 3) y tres en 3D (2, 4 y 5), con un jefe por dimensión: el Núcleo Mutante al final del nivel 3 y la Hembra en el nivel 4, que se protege con sus propios criaderos
- Plataformas y desniveles en 3D que se suben saltando
- La Gorda, una gata aliada que se compra en la tienda y caza mosquitos en 2D y 3D
- Generación procedural de niveles con semilla configurable
- Sistema de tienda, inventario, fichas y mejoras
- Sistema de combate con dash, raqueta, esquives y ataque
- Capa educativa con fichas, mitos reales, estadísticas y reportes finales
- Uso de Three.js para la parte 3D
- Pantalla de título estilo Katana Zero (VHS y neón) con Jugar, Modo Patio, Aprende, Opciones, Ayuda y Créditos, que se maneja con teclado, ratón, mando o con el dedo
- Se juega en celular: joystick y botones en pantalla, mirar arrastrando el dedo en 3D y el marco escalado a cualquier pantalla
- Minitutorial la primera vez que se juega en 2D y en 3D
- Opciones que se guardan en el navegador: volumen de música y efectos, sensibilidad 3D, reducir destellos y sacudidas, tutorial (y pantalla completa)
- Favicon y vista previa al compartir el link (Open Graph)
- Sin necesidad de un servidor para abrirse en navegador local

## Estructura del proyecto

- `index.html` — punto de entrada principal de la aplicación
- `css/estilos.css` — estilos visuales, HUD y menús
- `js/` — scripts del juego divididos por funcionalidad
  - `01-nucleo.js` — configuración global, estado, entrada, utilidades
  - `01b-datos-dengue.js` — datos de criaderos, serotipos y fichas educativas
  - `01c-mando.js` — soporte de mandos (Gamepad API)
  - `01d-tactil.js` — controles táctiles, escala del marco, pantalla completa y aviso de girar el celular
  - `02-efectos.js` — partículas, audio y efectos visuales
  - `03-jugador.js` — lógica del jugador, vida, estamina y enfermedad
  - `04-mundo2d-gen.js` — generación del mundo 2D
  - `05-mundo2d-fisica.js` — físicas y combate 2D
  - `06-mundo2d-ia.js` — IA de enemigos y objetos del mundo 2D
  - `07-mundo2d-dibujo.js` — render 2D
  - `08-mundo3d-gen.js` — generación y preparación del mundo 3D
  - `09-mundo3d-jugador.js` — control del jugador en 3D
  - `10-mundo3d-ia.js` — IA y objetos del mundo 3D
  - `10b-jefe3d.js` — la Hembra, el jefe 3D del nivel 4
  - `11-flujo.js` — niveles, tienda, HUD, menús y transiciones
  - `11b-educacion.js` — capa educativa, fichas, reportes y estadísticas
  - `11c-guero.js` — lógica del personaje Güero y el final
  - `11d-ivan.js` — Ivan, el caso de la fase febril en el nivel 2
  - `11e-patio.js` — Modo Patio: inspeccionar una casa sin enemigos
  - `11f-menu.js` — pantalla de título y submenús (Jugar, Opciones, Ayuda, Créditos)
  - `11g-tutorial.js` — minitutorial del primer nivel 2D y el primer 3D
  - `11h-gata.js` — la Gorda, gata aliada (2D y 3D)
  - `12-bucle.js` — bucle principal y arranque
- `assets/` — texturas, sonidos, favicon (`favicon.svg`, `icono-32.png`, `icono-180.png`) y la imagen para compartir (`og-imagen.png`)

## Cómo ejecutar

Este proyecto se puede abrir directamente en el navegador sin necesidad de instalar dependencias adicionales.

### Opción 1: abrir directamente

1. Abre `index.html` en tu navegador.
2. El juego cargará los archivos JavaScript desde la carpeta `js/`.

### Opción 2: usar un servidor local

Si prefieres, puedes ejecutar un servidor simple en la carpeta del proyecto, por ejemplo:

```bash
python -m http.server 8000
```

Luego abre:

```text
http://localhost:8000
```

## Controles

### General
- `A / D` o flechas izquierda/derecha — mover
- `W`, `↑` o `Espacio` — saltar
- `Shift` — dash
- `S + Shift` — evade / esquive
- `F` o clic derecho — raqueta
- `J` o clic izquierdo — ataque
- `T` — tienda
- `C` — fichero
- `Esc` — pausa
- `M` — silenciar/activar audio (en Opciones están la música y los sonidos por separado, con su volumen; se recuerdan al recargar)
- `F3` — mostrar debug

### Menús
- `↑ / ↓` (o `W / S`) — elegir · `← / →` — ajustar una opción · `Enter` — aceptar · `Esc` — volver
- Con el ratón: pasar por encima elige y el clic acepta
- En la pausa, el botón *Opciones* permite cambiar la sensibilidad 3D sin salir del nivel

### Solo en 3D
- `Espacio` — saltar (las losas grises se suben de un salto; para bajar, camina fuera del borde)
- `Q` (mantener) — gancho: te jala hacia la pared o el mosquito que tengas en la mira. Cuesta estamina y tiene cooldown; al mosquito lo aturde y le quita 1 de vida, no lo mata de un golpe.
- `Ctrl + Shift` — rodar
- El ratón se captura solo al entrar a un nivel 3D o al volver de la pausa, la tienda o el fichero. Si el navegador no lo permite, basta un clic o cualquier tecla.

### Medidas para criaderos
- `1` — lava
- `2` — tapa
- `3` — voltea
- `4` — tira

### Mando (Xbox, PlayStation, Nintendo y genéricos)
Se conecta por USB o Bluetooth; el juego lo detecta al pulsar cualquier botón. Los botones van por posición (Xbox / PlayStation / Nintendo):

- Stick izquierdo — mover (en 3D: caminar)
- Stick derecho — mirar (3D, sin necesidad de capturar el ratón) · desplazar el texto de menús, fichero y tienda
- `A` / `✕` / `B` — saltar · confirmar en menús
- `B` / `○` / `A` — dash (con stick abajo: esquive) · volver en menús
- `X` / `□` / `Y` o `RT` / `R2` / `ZR` — atacar (gatillo sostenido = autofuego en 3D)
- `Y` / `△` / `X` o `LT` / `L2` / `ZL` — raqueta
- `LB` / `L1` / `L` — tienda
- `RB` / `R1` / `R` (mantener) — gancho (3D)
- `Menu` / `Options` / `+` — pausa
- `View` / `Share` / `−` — silenciar
- `L3` — rodar (3D)
- `R3` (clic del stick derecho) — fichero
- Cruceta `↑ → ↓ ←` — lava · tapa · voltea · tira (en menús: mover la selección; en el primer o el último botón, desplaza el texto que falte por ver; en la pantalla de título, `← →` ajustan las opciones)

El código está en `js/01c-mando.js`.

### En celular (pantalla táctil)
Se juega en horizontal; en vertical el juego pide girar el teléfono y se pausa. Al tocar «Empezar» se pide pantalla completa (también está en Opciones). Los controles solo aparecen jugando, y se van solos si usas teclado, ratón o mando.

- Joystick (apoya el pulgar izquierdo donde quieras) — mover (en 3D: caminar; abajo + Dash: esquive)
- Arrastrar el dedo en la mitad derecha — mirar (3D). Mientras disparas, la mira se acerca un poco a un mosquito o a la Hembra si están casi enfrente: menos de 8°, nunca a través de un muro
- `Saltar` · `Atacar` (en 3D, mantenerlo es ráfaga) · `Raqueta` · `Dash` · `Gancho` (3D, mantener)
- Junto a un envase salen sus cuatro medidas como botones (siempre las cuatro: cuál toca no lo dice)
- `⏸` pausa · `🛒` tienda · `📖` fichero, arriba a la derecha
- Modo Patio: toca un envase y luego su medida

En iPhone, Safari no deja poner una página a pantalla completa: Compartir → «Agregar a inicio» la abre sin barras. Para probar desde el celular sin publicar, corre `python -m http.server 8765 --bind 0.0.0.0` en la PC y abre `http://<IP de la PC>:8765` en la misma red Wi-Fi.

El código está en `js/01d-tactil.js`.

## Sistema educativo del proyecto

Una de las partes más importantes del juego es la capa de aprendizaje. El jugador no solo elimina enemigos, sino que entiende que:

- los criaderos son la causa del problema,
- no todos los envases se resuelven igual,
- vaciar un recipiente sin corregir la causa puede ser una trampa,
- la prevención debe basarse en eliminar o tratar correctamente los criaderos,
- la fiebre, los serotipos y la vacunación tienen consecuencias reales que se explican dentro del juego.

Se aprende jugando y decidiendo, no solo leyendo:

- **El juego premia lo que enseña:** cerrar un criadero da monedas y el mosquito que acaba de salir de uno no da nada. El abate solo sirve donde el agua se guarda.
- **Quiz antes y después:** las mismas 5 preguntas al empezar y antes del final, para ver cuánto se aprendió. El resultado se guarda en el navegador para los playtests.
- **Entre niveles:** repaso de las fichas que se abrieron y retos que se contestan antes de ver la respuesta (¿mito o realidad?, ¿a dónde llevas al vecino?).
- **Los jefes enseñan algo:** el del nivel 3 solo baja el escudo con la raqueta; la Hembra del nivel 4 no cae mientras sus envases tengan agua (o solo se hayan vaciado), así que hay que cerrarlos con su medida.
- **En el mundo:** cada criadero muestra el ciclo huevos → larvas → pupas, llueve una vez por nivel, e Ivan (nivel 2) y Güero (nivel 5) enseñan las dos fases de la enfermedad. A los dos se les atiende con los criaderos ya cerrados: un enfermo rodeado de criaderos vuelve a alimentar la cadena.
- **Fuera de la partida:** *Modo Patio* (una casa con 10 criaderos, sin enemigos), *Aprende* (todo el contenido con sus fuentes) y, al terminar, la lista *Revisa tu casa* para imprimir o mandar por WhatsApp.

Todo dato sale de `js/01b-datos-dengue.js` con su fuente, y la Action *Validar* revisa que cada ficha, mito, realidad y pregunta la cite.

## Nota sobre la semilla

El juego usa una semilla para generar niveles reproducibles. Si ingresas una semilla en el menú, podrás repetir la misma experiencia exacta y verificar cómo evoluciona el nivel.

## Recomendaciones

- Si modificas archivos JavaScript, recuerda mantener el orden de carga definido en `index.html`.
- El proyecto usa caché-busting mediante parámetros como `?v=b6` en los scripts para evitar que el navegador use versiones antiguas. Al subir `BUILD` en `js/01-nucleo.js`, sube también el `?v=` de `index.html` (el CI revisa que coincidan).
- **Modo Coco (para probar):** `P` activa modo dios, espadazo y dash apuntados con el ratón (2D). Solo funciona en local (`file://`, `localhost`) o si la URL lleva `?coco`; en la versión publicada no se puede activar por accidente.
- Las texturas de `assets/textures/` deben ser PNG con transparencia y con el personaje mirando a la derecha (el juego las voltea según la dirección). Abriendo con doble clic (`file://`), el 3D no puede usar texturas y se queda con colores: para verlas, usa el servidor local.
- Si quieres probar cambios visuales o gameplay, puedes abrir el juego y generar una nueva semilla para observar distintos recorridos.

## Créditos y propósito

Este proyecto es una propuesta didáctica y lúdica para comunicar la problemática del dengue en Aguascalientes. Su enfoque principal es enseñar prevención, reforzar conceptos epidemiológicos y mostrar que el dengue se controla mejor cuando se eliminan los criaderos y se toman decisiones informadas.
