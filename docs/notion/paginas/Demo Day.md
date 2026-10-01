Presentación final del proyecto: de 5 a 7 minutos, en la primera semana de diciembre (30 nov – 4 dic).

**Fecha y hora:** … *(la pone Ana cuando el profesor la confirme)*

## Guion

| Tiempo | Quién | Qué |
|---|---|---|
| 0:00 – 0:45 | Ana | El problema: dengue en Aguascalientes y por qué un juego |
| 0:45 – 2:45 | Mau | Demo en vivo: nivel 2D → la grieta → nivel 3D → Güero *(respaldo: video)* |
| 2:45 – 3:30 | Gael | El audio: cómo cambia la música con el nivel y con la fiebre |
| 3:30 – 4:30 | Jared | El flujo: PR → Validar → revisión → kudos bot en Discord (video de 30 s) |
| 4:30 – 5:15 | Ivan | Calidad y métricas: testing, uptime, PRs por persona, % de tareas, kudos |
| 5:15 – 6:30 | Ana | La cultura de reconocimiento, qué aprendimos y cierre |

## Slides (DI-504, 29 nov)

1. **Dengue Inc:** nombre del juego, equipo y link para jugar.
2. **El problema:** el dengue en Aguascalientes y por qué un juego. *(Ana)*
3. **Demo:** nivel 2D → la grieta → nivel 3D → Güero. Respaldo: el video de DI-505. *(Mau)*
4. **El audio:** cómo cambia la música con el nivel y con la fiebre. *(Gael)*
5. **Cómo trabajamos:** Notion, Discord y el flujo de PRs con revisión. *(Jared)*
6. **La automatización:** Validar y el bot de kudos, con el video de 30 s. *(Jared)*
7. **Calidad y métricas:** testing, uptime, PRs por integrante, % de tareas y kudos. *(Ivan)*
8. **Cultura y aprendizajes:** los kudos del equipo, qué aprendimos y cierre. *(Ana)*
9. **Links:** Notion, GitHub, página de estado y juego.

## Métricas (DI-503, 29 nov)

| Métrica | Valor | Dónde sacarla |
|---|---|---|
| Uptime % | … | Página de estado de UptimeRobot (últimos 30 días) |
| PRs fusionados por integrante | … | GitHub → Pull requests → buscar `is:pr is:merged author:USUARIO` |
| Commits por integrante | … | `git shortlog -sn --no-merges develop` |
| Ejecuciones de CI | … | GitHub → Actions → *Validar* → total de ejecuciones |
| % de tareas hechas | … | ✅ Tareas → gráfica *Avance* |
| Kudos dados | … | 🏆 Kudos → número de kudos publicados |

## Testing final (DI-601, sobre la versión publicada)

- [ ] Chrome, Edge y Firefox: el juego abre desde la URL de GitHub Pages.
- [ ] Los 5 niveles, de principio a fin, con **teclado**.
- [ ] Los 5 niveles con **mando**.
- [ ] Las semillas de regresión (DI-451) generan siempre el mismo nivel.
- [ ] Sin internet: `index.html` local con doble clic, incluido el nivel 3D.
- [ ] Música y efectos en todos los niveles; **M** silencia todo.
- [ ] En celular aparece el aviso de que se juega con teclado o mando.
- [ ] Overlay F3: 60 fps en 2D y al menos 45 en 3D.

Desde el release v2.0 solo se arreglan bugs **P0**, con un PR `fix/…` y un release v2.0.1. Lo demás se anota en ✅ Tareas y no se toca.

## Checklist del día

- [ ] Laptop cargada, con el juego abierto en la URL **y** una copia local lista (doble clic).
- [ ] Video de respaldo (DI-505) descargado, no en streaming.
- [ ] Slides también en PDF, sin conexión.
- [ ] Mando con pila o cable, y audio probado con el proyector o las bocinas.
- [ ] Última slide con los links: Notion, GitHub, página de estado y juego.
- [ ] Ensayo cronometrado hecho (menos de 7 min).

## Después de presentar

- [ ] Los 5 llenamos el formulario de evaluación entre equipos (DI-604).
- [ ] Retrospectiva escrita (abajo).

## Retrospectiva (DI-605)

### Qué funcionó

- …

### Qué no funcionó

- …

### Qué haríamos distinto

- …
