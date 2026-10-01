# Dengue Inc

## Descripción

Este proyecto es un juego web de acción y aprendizaje sobre la prevención del dengue, ambientado en Aguascalientes. Combina mecánicas tipo arcade, exploración en 2D y 3D, y elementos educativos para enseñar cómo se comporta el dengue, cuáles son los criaderos más comunes y qué medidas reales ayudan a prevenirlo.

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
- Modo 2D y 3D alternados por nivel
- Generación procedural de niveles con semilla configurable
- Sistema de tienda, inventario, fichas y mejoras
- Sistema de combate con dash, raqueta, esquives y ataque
- Capa educativa con fichas, mitos reales, estadísticas y reportes finales
- Uso de Three.js para la parte 3D
- Sin necesidad de un servidor para abrirse en navegador local

## Estructura del proyecto

- `index.html` — punto de entrada principal de la aplicación
- `css/estilos.css` — estilos visuales, HUD y menús
- `js/` — scripts del juego divididos por funcionalidad
  - `01-nucleo.js` — configuración global, estado, entrada, utilidades
  - `01b-datos-dengue.js` — datos de criaderos, serotipos y fichas educativas
  - `01c-mando.js` — soporte de mandos (Gamepad API)
  - `02-efectos.js` — partículas, audio y efectos visuales
  - `03-jugador.js` — lógica del jugador, vida, estamina y enfermedad
  - `04-mundo2d-gen.js` — generación del mundo 2D
  - `05-mundo2d-fisica.js` — físicas y combate 2D
  - `06-mundo2d-ia.js` — IA de enemigos y objetos del mundo 2D
  - `07-mundo2d-dibujo.js` — render 2D
  - `08-mundo3d-gen.js` — generación y preparación del mundo 3D
  - `09-mundo3d-jugador.js` — control del jugador en 3D
  - `10-mundo3d-ia.js` — IA y objetos del mundo 3D
  - `11-flujo.js` — niveles, tienda, HUD, menús y transiciones
  - `11b-educacion.js` — capa educativa, fichas, reportes y estadísticas
  - `11c-guero.js` — lógica del personaje Güero y el final
  - `12-bucle.js` — bucle principal y arranque

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
- `M` — silenciar/activar audio
- `F3` — mostrar debug

### Medidas para criaderos
- `1` — lava
- `2` — tapa
- `3` — voltea
- `4` — tira

### Mando (Xbox, PlayStation, Nintendo y genéricos)
Se conecta por USB o Bluetooth; el juego lo detecta al pulsar cualquier botón. Los botones van por posición (Xbox / PlayStation / Nintendo):

- Stick izquierdo — mover (en 3D: caminar)
- Stick derecho — mirar (3D, sin necesidad de capturar el ratón)
- `A` / `✕` / `B` — saltar · confirmar en menús
- `B` / `○` / `A` — dash (con stick abajo: esquive) · volver en menús
- `X` / `□` / `Y` o `RT` / `R2` / `ZR` — atacar (gatillo sostenido = autofuego en 3D)
- `Y` / `△` / `X` o `LT` / `L2` / `ZL` — raqueta
- `LB` / `L1` / `L` — tienda
- `RB` / `R1` / `R` — fichero
- `Menu` / `Options` / `+` — pausa
- `View` / `Share` / `−` — silenciar
- `L3` — rodar (3D)
- Cruceta `↑ → ↓ ←` — lava · tapa · voltea · tira (en menús: mover la selección)

El código está en `js/01c-mando.js`.

## Sistema educativo del proyecto

Una de las partes más importantes del juego es la capa de aprendizaje. El jugador no solo elimina enemigos, sino que entiende que:

- los criaderos son la causa del problema,
- no todos los envases se resuelven igual,
- vaciar un recipiente sin corregir la causa puede ser una trampa,
- la prevención debe basarse en eliminar o tratar correctamente los criaderos,
- la fiebre, los serotipos y la vacunación tienen consecuencias reales que se explican dentro del juego.

## Nota sobre la semilla

El juego usa una semilla para generar niveles reproducibles. Si ingresas una semilla en el menú, podrás repetir la misma experiencia exacta y verificar cómo evoluciona el nivel.

## Recomendaciones

- Si modificas archivos JavaScript, recuerda mantener el orden de carga definido en `index.html`.
- El proyecto usa caché-busting mediante parámetros como `?v=b5` en los scripts para evitar que el navegador use versiones antiguas.
- Si quieres probar cambios visuales o gameplay, puedes abrir el juego y generar una nueva semilla para observar distintos recorridos.

## Créditos y propósito

Este proyecto es una propuesta didáctica y lúdica para comunicar la problemática del dengue en Aguascalientes. Su enfoque principal es enseñar prevención, reforzar conceptos epidemiológicos y mostrar que el dengue se controla mejor cuando se eliminan los criaderos y se toman decisiones informadas.
