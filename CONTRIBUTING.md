# Cómo contribuir a Dengue Inc

Todo cambio entra por Pull Request revisado. Esta guía junta en un solo lugar las reglas que usamos; el plan completo y el tablero están en [`docs/ROADMAP.md`](docs/ROADMAP.md) y en Notion.

## 1. Antes de empezar

- Cada cambio sale de una tarea de Notion con su ID (`DI-xxx`). Si no existe, se abre un issue con la plantilla **Mejora** o **Bug** y se pide en `#dev`.
- Pasa la tarea a **En progreso** en Notion.

## 2. Ramas

| Rama | Para qué | Quién escribe |
|---|---|---|
| `main` | Lo publicado en GitHub Pages | Solo el PR de release desde `develop` |
| `develop` | Integración | Solo PRs revisados |
| `feature/<área>-<descripción>` | Trabajo nuevo, ej. `feature/audio-tema-menu` | El responsable de la tarea |
| `fix/<descripción>` | Arreglos, ej. `fix/vida-hud` | El responsable de la tarea |

Las ramas nuevas salen de `develop` actualizado. Si la tarea dura más de un día, trae los cambios de `develop` a diario para evitar conflictos (sobre todo en `js/11-flujo.js`).

## 3. Commits

[Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/): `tipo(área): descripción`.

- Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`.
- Ejemplos: `feat(audio): tema del menú`, `fix(3d): la brújula apunta al revés`, `docs: roadmap`.
- Cada tarea la sube su responsable desde su propia cuenta. Quien ayudó entra como coautor con una línea `Co-authored-by: Nombre <correo>` al final del commit.

## 4. Abrir un Pull Request

1. Corre la validación local: `node .github/scripts/validar.mjs` (solo necesita Node).
2. Abre el PR hacia `develop` (nunca directo a `main`).
3. Título: `tipo(área): qué cambia (DI-xxx)`, ej. `feat(audio): tema del menú (DI-404)`. El check **Título del PR** lo revisa.
4. Llena la plantilla: qué cambia, link a la tarea, cómo probarlo paso a paso y la checklist. Si se ve o se oye, agrega captura o video.
5. Un PR = una tarea. Si está a medias y quieres opinión, ábrelo como **borrador** (*draft*).
6. Pasa la tarea a **En revisión** en Notion.

## 5. Revisión de código

**Quién revisa.** GitHub pide la revisión al dueño del área según [`CODEOWNERS`](.github/CODEOWNERS). Nadie aprueba su propio PR. Si el dueño del área es el autor, revisa quien dice la tabla:

| Autor | Revisa |
|---|---|
| Jared (backend) | Mau |
| Mau (frontend) | Jared |
| Gael (audio) | Jared |
| Ana (contenido y gestión) | Ivan |
| Ivan (QA y docs) | Ana |

**Cuándo.** En menos de 24 h desde que se pide. Si no puedes, avísalo en `#dev` para que lo tome otra persona.

**Cómo.**

1. Baja la rama y abre `index.html` con doble clic.
2. Sigue los pasos de *Cómo probarlo* del PR.
3. Revisa:
   - Hace lo que dice la tarea y nada más.
   - El juego sigue abriendo sin servidor: nada de módulos ES ni `fetch` de archivos locales.
   - Funciona en Chrome y en Firefox; si toca controles, también con mando (y en celular si toca `01d-tactil.js`).
   - Todo dato del dengue está en `js/01b-datos-dengue.js` con su fuente.
   - Audio o imágenes de terceros llevan su licencia en los créditos.
   - No hay secretos, tokens ni webhooks en el código.
4. Comenta con prefijo, para que se sepa qué detiene el merge:
   - `bloqueante:` hay que corregirlo antes de fusionar. Usa *Request changes* y explica por qué.
   - `sugerencia:` mejora opcional; el autor decide.
5. Al aprobar, escribe qué probaste (ej. «Niveles 1 a 3 en Chrome con mando, sin errores en consola»). Un «ok» sin más no le dice nada al equipo.

**Después.** Si el autor sube cambios, la aprobación anterior se descarta y hay que volver a revisar. Todas las conversaciones deben quedar resueltas.

## 6. Fusionar

- Requisitos (GitHub los exige): CI en verde (**Validar** y **Título del PR**), 1 aprobación vigente y conversaciones resueltas.
- `feature/*` o `fix/*` → `develop`: **Squash and merge**. Lo fusiona el autor.
- Al fusionar, el bot de kudos lo anuncia en `#github-bot`. Pasa la tarea a **Hecho** en Notion.

## 7. Release a `main`

1. PR de `develop` a `main` con título `chore(release): vX.Y …`.
2. Ivan prueba el build con el plan de pruebas.
3. Ana lo aprueba.
4. Se fusiona con **Create a merge commit** (no squash, para que `develop` y `main` no se separen).
5. GitHub Pages publica solo y pone la versión en los `?v=` con el SHA del commit.

## 8. Reglas de las ramas protegidas

El ruleset «Proteger main y develop» aplica a las dos ramas, sin excepciones para nadie:

- PR obligatorio con 1 aprobación; una aprobación se descarta si llegan commits nuevos.
- Checks obligatorios: **Validar** y **Título del PR**.
- Conversaciones resueltas antes de fusionar.
- Sin push directo, sin force push y sin borrar la rama.

## 9. Definición de terminado

Una tarea pasa a **Hecho** solo si:

- [ ] Entró por PR a `develop`, con la tarea de Notion enlazada y la plantilla llena.
- [ ] La GitHub Action **Validar** está en verde.
- [ ] La aprobó alguien que no es el autor.
- [ ] Se probó en Chrome y en Firefox; si toca controles, también con mando.
- [ ] El juego sigue abriéndose con **doble clic** en `index.html` (sin servidor).
- [ ] Si agrega un dato sobre el dengue, está en `js/01b-datos-dengue.js` con su fuente.
- [ ] Si agrega audio o imágenes de terceros, su licencia está en los créditos.

## 10. Reportar un problema o proponer algo

Abre un issue con la plantilla **Bug** (incluye semilla, nivel y navegador para reproducirlo) o **Mejora**. Ana lo prioriza en el tablero de Notion.
