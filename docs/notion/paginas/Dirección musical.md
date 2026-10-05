Página de Gael (tarea DI-401, para el 13 oct), con Ana de apoyo. Aquí se decide cómo suena el juego antes de producir las pistas. Lo de la primera sección ya está decidido en el roadmap; lo demás lo llena Gael.

## Lo que ya está decidido

- Hoy el juego tiene 12 efectos sintetizados con WebAudio y **no tiene música**.
- Cada pista es un **MP3 en loop limpio**. El tema del menú dura de 60 a 90 s y pesa menos de 1.5 MB (DI-404).
- La música tiene su propio canal en el mezclador (DI-402): **M** silencia todo, y el menú de opciones tendrá volumen de música y de efectos por separado (DI-423).
- Al cambiar de nivel o de estado, la música cambia con **crossfade** (DI-403).
- Arranca con el clic en *Iniciar*, porque el navegador bloquea el audio automático.
- Se reproduce con `HTMLAudioElement`, para que funcione al abrir `index.html` con doble clic, sin servidor.
- En fase febril la música pasa por un filtro paso-bajo, más marcado en fase crítica (DI-410, deseable).
- Cada pista o sonido de terceros necesita autor y licencia en los créditos (DI-412).

## Decisión: ¿pistas propias o con licencia libre?

- [ ] Propias: Gael las compone.
- [ ] Con licencia libre (CC0 o CC BY).

**Por qué:** …

**Plan B si no alcanza el tiempo:** …

## Pistas

| Contexto | Tarea | Entrega | Lo que pide el roadmap | BPM | Instrumentación | Referencias |
|---|---|---|---|---|---|---|
| Menú principal | DI-404 | 27 oct | Loop de 60 a 90 s, menos de 1.5 MB | … | … | … |
| Niveles 2D (la colonia) | DI-405 | 3 nov | Energía de plataformas; que deje escuchar los efectos | … | … | … |
| Niveles 3D (laberinto con niebla) | DI-406 | 10 nov | Más ambiental y tenso que el tema 2D | … | … | … |
| Jefe final | DI-408 | 17 nov | Sube la intensidad en la fase 2: capa extra o pista distinta al romperse el escudo | … | … | … |
| Final con Güero | DI-409 | 17 nov | Latido que se acelera con su fase crítica | … | … | … |
| Jingle de victoria | DI-409 | 17 nov | Uno por desenlace | … | … | … |
| Jingle de derrota | DI-409 | 17 nov | Uno por desenlace | … | … | … |

## Efectos de sonido nuevos (DI-407, 10 nov)

- [ ] Lava
- [ ] Tapa
- [ ] Voltea
- [ ] Tira
- [ ] Zumbido de mosquito posicional en 3D
- [ ] Pasos en 3D
- [ ] Sonidos de la interfaz
- [ ] Ficha desbloqueada
- [ ] Portal

## Créditos y licencias (DI-412, 24 nov)

| Pista o efecto | Autor | Licencia | Link |
|---|---|---|---|
| … | … | … | … |
