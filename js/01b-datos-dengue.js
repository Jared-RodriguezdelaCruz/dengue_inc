"use strict";

// ---------------------------------------------------------------------------
//  1b. DATOS DEL DENGUE — la única fuente de verdad de todo lo que el juego afirma
//
//  Aquí no hay lógica: solo hechos verificados y su procedencia. Si un texto del
//  juego dice algo sobre el dengue, sale de este archivo. Las fuentes son OMS,
//  CDC, la Secretaría de Salud de México y literatura revisada por pares.
//
//  Encuadre honesto para Aguascalientes: los casos son pocos PORQUE el control
//  funciona, no porque no exista riesgo. El vector está presente.
// ---------------------------------------------------------------------------

const FUENTES = {
    oms:      'OMS · Dengue and severe dengue',
    cdc:      'CDC · Aedes aegypti factsheet',
    cdcVida:  'CDC · Life cycle of Aedes aegypti mosquitoes',
    cdcCasa:  'CDC · Dengue: caring for someone at home',
    cdcClin:  'CDC Yellow Book 2026 · Dengue',
    ssa:      'Secretaría de Salud · Lava, tapa, voltea y tira',
    ssaEpi:   'Secretaría de Salud · Panorama epidemiológico',
    plos:     'PLOS Biology 2023 · Desecación de huevos de Aedes aegypti',
    cofepris: 'COFEPRIS · Registro sanitario, marzo 2026'
};

// --- Los cuatro verbos de la campaña oficial mexicana ----------------------
// El orden importa: es el nombre de la estrategia, "Lava, tapa, voltea y tira".
const VERBOS = {
    lava:   { nombre: 'LAVA',   icono: '🧽', color: '#3498db',
              accion: 'Talla la pared del recipiente con agua y cepillo',
              porque: 'los huevos quedan pegados en la pared, no flotando en el agua' },
    tapa:   { nombre: 'TAPA',   icono: '🔒', color: '#f1c40f',
              accion: 'Cubre el depósito para que el mosquito no entre',
              porque: 'sirve para el agua que sí necesitas guardar' },
    voltea: { nombre: 'VOLTEA', icono: '🔄', color: '#2ecc71',
              accion: 'Ponlo boca abajo para que no junte lluvia',
              porque: 'un recipiente vacío que sigue hacia arriba se vuelve a llenar' },
    tira:   { nombre: 'TIRA',   icono: '🗑️', color: '#e67e22',
              accion: 'Sácalo de tu patio, ya no sirve',
              porque: 'lo que no usas solo está ahí para juntar agua' }
};

// --- Envases reales, cada uno con su medida correcta -----------------------
// ancho/alto son para dibujarlos en 2D.
const CRIADEROS = {
    tinaco:   { verbo: 'tapa',   nombre: 'Tinaco',            icono: '🛢️', ancho: 52, alto: 46,
                nota: 'Guarda agua que sí ocupas: por eso se tapa, no se tira.' },
    cisterna: { verbo: 'tapa',   nombre: 'Cisterna',          icono: '🕳️', ancho: 58, alto: 34,
                nota: 'Depósito grande y oscuro; el mosquito entra por cualquier rendija.' },
    tambo:    { verbo: 'tapa',   nombre: 'Tambo',             icono: '🛢️', ancho: 44, alto: 48,
                nota: 'Muy común en azoteas y patios de Aguascalientes.' },
    cubeta:   { verbo: 'voltea', nombre: 'Cubeta',            icono: '🪣', ancho: 34, alto: 34,
                nota: 'El criadero número uno: basta una lluvia para llenarla.' },
    maceta:   { verbo: 'voltea', nombre: 'Plato de maceta',   icono: '🪴', ancho: 38, alto: 20,
                nota: 'El plato de abajo junta agua aunque riegues poco.' },
    carretilla:{verbo: 'voltea', nombre: 'Carretilla',        icono: '🛞', ancho: 48, alto: 30,
                nota: 'Cualquier cosa cóncava olvidada boca arriba junta lluvia.' },
    llanta:   { verbo: 'tira',   nombre: 'Llanta',            icono: '🛞', ancho: 44, alto: 40,
                nota: 'Guarda agua por dentro y la sombra la mantiene fresca.' },
    botella:  { verbo: 'tira',   nombre: 'Botellas y latas',  icono: '🍾', ancho: 30, alto: 32,
                nota: 'La basura del patio es criadero: poca agua le basta.' },
    florero:  { verbo: 'lava',   nombre: 'Florero',           icono: '🏺', ancho: 28, alto: 34,
                nota: 'Cambiar el agua no basta: hay que tallar el vidrio.' },
    bebedero: { verbo: 'lava',   nombre: 'Bebedero de mascota',icono:'🐕', ancho: 36, alto: 22,
                nota: 'Se lava a diario con cepillo, no solo se rellena.' }
};

/** Envases que aparecen en cada nivel: de lo obvio a lo que nadie revisa. */
const CRIADEROS_POR_NIVEL = {
    1: ['cubeta', 'llanta', 'botella'],
    2: ['cubeta', 'llanta', 'tinaco', 'maceta'],
    3: ['tinaco', 'florero', 'maceta', 'botella', 'carretilla'],
    4: ['tinaco', 'tambo', 'cisterna', 'llanta', 'bebedero'],
    5: ['cisterna', 'bebedero', 'florero', 'tambo', 'carretilla']
};

// --- Serotipos -------------------------------------------------------------
// Cuatro virus distintos. Pasar uno te protege de ESE y de ninguno más; la
// segunda infección con otro serotipo es la peligrosa.
const SEROTIPOS = [
    null,
    { id: 1, nombre: 'DENV-1', color: '#f1c40f', colorOsc: '#c29d0b' },
    { id: 2, nombre: 'DENV-2', color: '#e74c3c', colorOsc: '#a93226' },
    { id: 3, nombre: 'DENV-3', color: '#3498db', colorOsc: '#2471a3' },
    { id: 4, nombre: 'DENV-4', color: '#2ecc71', colorOsc: '#1e8449' }
];

/** Qué serotipos circulan en cada nivel. Van entrando de a poco para que la
 *  primera infección enseñe y la segunda (ya con otro serotipo) duela. */
const SEROTIPOS_POR_NIVEL = { 1: [1], 2: [1, 2], 3: [2, 3], 4: [3, 4], 5: [1, 2, 3, 4] };

// --- Señales de alarma (OMS) ----------------------------------------------
const SENALES_ALARMA = [
    { icono: '🤢', texto: 'Vómito persistente' },
    { icono: '😖', texto: 'Dolor abdominal intenso' },
    { icono: '🩸', texto: 'Sangrado de encías o nariz' },
    { icono: '😵', texto: 'Letargo o inquietud' }
];

// --- Fichero ---------------------------------------------------------------
// Se desbloquean HACIENDO cosas, no leyendo. El id lo dispara el código de juego.
const FICHAS = [
    { id: 'agua_limpia', cat: 'Causas', titulo: 'No es agua sucia: es agua limpia',
      texto: 'Al Aedes aegypti no le interesa el drenaje ni el pantano. Pone sus huevos en agua ' +
             'limpia y quieta guardada en recipientes de casa: cubetas, tinacos, floreros, llantas. ' +
             'Por eso el criadero casi siempre está dentro de tu propio patio.',
      fuente: FUENTES.ssa },

    { id: 'vuelo', cat: 'Causas', titulo: 'Vuela menos de 100 metros',
      texto: 'En toda su vida un Aedes aegypti se aleja normalmente menos de 100 m de donde nació. ' +
             'El mosquito que te picó no vino de lejos: nació en tu casa o en la de junto. Por eso ' +
             'la prevención es de manzana, no individual.',
      fuente: FUENTES.cdc },

    { id: 'dia', cat: 'Causas', titulo: 'Pica de día, no de noche',
      texto: 'El mosquito que transmite dengue es activo durante el día. El mosquitero nocturno ' +
             'sirve contra otros mosquitos, pero contra el dengue protege poco: la exposición ' +
             'ocurre despierto, en la escuela, el trabajo o el patio.',
      fuente: FUENTES.oms },

    { id: 'huevos_secos', cat: 'Causas', titulo: 'Vaciar no basta',
      texto: 'La hembra pega los huevos en la pared del recipiente, justo en la línea del agua. ' +
             'Esos huevos resisten la sequía seis meses o más — en laboratorio, hasta un año. ' +
             'Si solo tiras el agua, los huevos siguen ahí esperando la próxima lluvia. Hay que TALLAR.',
      fuente: FUENTES.plos },

    { id: 'ciclo', cat: 'Causas', titulo: 'De huevo a mosquito en una semana',
      texto: 'Del huevo sale una larva, la larva se vuelve pupa y la pupa, mosquito adulto: en el ' +
             'agua, todo el ciclo toma de 8 a 10 días. Por eso el patio se revisa cada semana: si ' +
             'cada semana lavas, tapas, volteas y tiras, ningún criadero alcanza a dar un mosquito.',
      fuente: FUENTES.cdcVida },

    { id: 'lava', cat: 'Prevención', titulo: 'LAVA',
      texto: 'Talla con agua y cepillo las paredes de floreros, bebederos y depósitos. No es por ' +
             'limpieza estética: es para arrancar los huevos pegados que sobreviven al secado.',
      fuente: FUENTES.ssa },
    { id: 'tapa', cat: 'Prevención', titulo: 'TAPA',
      texto: 'Cubre bien tinacos, tambos y cisternas. Es la medida para el agua que sí necesitas ' +
             'almacenar: si no puede entrar la hembra, no hay dónde poner huevos.',
      fuente: FUENTES.ssa },
    { id: 'voltea', cat: 'Prevención', titulo: 'VOLTEA',
      texto: 'Pon boca abajo cubetas, macetas, platos y cualquier cosa cóncava. Vaciarla no sirve ' +
             'si la dejas hacia arriba: la siguiente lluvia la vuelve a llenar.',
      fuente: FUENTES.ssa },
    { id: 'tira', cat: 'Prevención', titulo: 'TIRA',
      texto: 'Saca del patio llantas, botellas, latas y cacharros que ya no usas. Son criaderos ' +
             'sin ninguna función: la solución es que dejen de existir.',
      fuente: FUENTES.ssa },

    { id: 'criadero_infinito', cat: 'Prevención', titulo: 'Matar mosquitos no sirve',
      texto: 'Un criadero activo repone a sus adultos indefinidamente. Por eso fumigar da alivio ' +
             'de días y no resuelve nada: baja la población adulta pero no toca la fuente. ' +
             'El control real es eliminar los recipientes con agua.',
      fuente: FUENTES.ssa },

    { id: 'repelente', cat: 'Prevención', titulo: 'El repelente no mata: evita la picadura',
      texto: 'El repelente no elimina mosquitos ni criaderos: hace que no te piquen mientras dura. ' +
             'Se pone en la piel expuesta y se vuelve a aplicar cuando se acaba. Sirve de día, que ' +
             'es cuando pica el Aedes, y para que alguien con dengue no contagie a su familia.',
      fuente: FUENTES.oms },

    { id: 'lluvia', cat: 'Prevención', titulo: 'Después de cada lluvia, revisa',
      texto: 'La lluvia vuelve a llenar todo lo que quedó boca arriba y despierta los huevos ' +
             'pegados en las paredes: por eso los casos suben en temporada de lluvias. Después de ' +
             'cada lluvia, una vuelta por el patio: voltear, tapar, tirar y tallar.',
      fuente: FUENTES.ssa },

    { id: 'abate', cat: 'Prevención', titulo: 'Larvicida: para lo que no puedes vaciar',
      texto: 'El abate (temefos) mata las larvas y se usa en depósitos que deben conservar agua. ' +
             'Es el complemento, no el sustituto: primero elimina lo que puedas, y usa larvicida ' +
             'solo donde el agua tiene que quedarse.',
      fuente: FUENTES.ssa },

    { id: 'fase_febril', cat: 'Enfermedad', titulo: 'Fase febril',
      texto: 'Los síntomas aparecen de 4 a 10 días después de la picadura y duran de 2 a 7 días: ' +
             'fiebre alta, dolor de cabeza, dolor detrás de los ojos, dolor muscular y articular, ' +
             'náusea y sarpullido. La mayoría de las infecciones son leves o incluso sin síntomas.',
      fuente: FUENTES.oms },

    { id: 'fase_critica', cat: 'Enfermedad', titulo: 'Cuando baja la fiebre empieza el peligro',
      texto: 'La fase crítica arranca justo cuando cede la fiebre y dura de 24 a 48 horas. El ' +
             'paciente parece mejorar, y es exactamente ahí cuando se escapa plasma de los vasos ' +
             'y puede caer en choque. Sentirse mejor no es señal de estar a salvo.',
      fuente: FUENTES.cdcClin },

    { id: 'senales_alarma', cat: 'Enfermedad', titulo: 'Señales de alarma',
      texto: 'Vómito persistente, dolor abdominal intenso, sangrado de encías o nariz, letargo o ' +
             'inquietud, sed excesiva, piel pálida y fría. Aparecen sobre todo cuando ya se quitó ' +
             'la fiebre. Con cualquiera de ellas hay que ir al médico de inmediato.',
      fuente: FUENTES.oms },

    { id: 'serotipos', cat: 'Enfermedad', titulo: 'Son cuatro virus, no uno',
      texto: 'Existen cuatro serotipos: DENV-1, 2, 3 y 4. Pasar uno te deja inmunidad de por vida ' +
             'contra ESE serotipo y contra ninguno de los otros tres. Puedes enfermar de dengue ' +
             'hasta cuatro veces en la vida.',
      fuente: FUENTES.oms },

    { id: 'dengue_grave', cat: 'Enfermedad', titulo: 'La segunda vez es la peligrosa',
      texto: '"Ya me dio dengue, ya estoy protegido" es falso y es peligroso. Quien se infecta por ' +
             'segunda vez con un serotipo distinto tiene mayor riesgo de dengue grave. Haber pasado ' +
             'la enfermedad no relaja los cuidados: los aumenta.',
      fuente: FUENTES.oms },

    { id: 'sangrado', cat: 'Tratamiento', titulo: 'Nunca ibuprofeno ni aspirina',
      texto: 'Los antiinflamatorios como ibuprofeno, naproxeno y aspirina afectan las plaquetas y ' +
             'aumentan el riesgo de hemorragia, que es justo la complicación que mata en dengue. ' +
             'Para la fiebre y el dolor se usa PARACETAMOL.',
      fuente: FUENTES.oms },

    { id: 'hidratacion', cat: 'Tratamiento', titulo: 'No hay antiviral: hay hidratación',
      texto: 'No existe medicamento que elimine el virus. El tratamiento es de soporte, y lo que ' +
             'de verdad salva vidas es reponer líquidos a tiempo y vigilar las señales de alarma. ' +
             'Suero oral y atención médica temprana.',
      fuente: FUENTES.oms },

    { id: 'vacuna', cat: 'Tratamiento', titulo: 'La vacuna no cierra criaderos',
      texto: 'COFEPRIS aprobó Qdenga (TAK-003) en México el 5 de marzo de 2026: dos dosis, protege ' +
             'contra los cuatro serotipos. Es una herramienta más, no un permiso para dejar de ' +
             'eliminar criaderos — el mosquito sigue ahí y transmite también zika y chikunguña.',
      fuente: FUENTES.cofepris },

    { id: 'colonia', cat: 'Enfermedad', titulo: 'Tú también eres parte de la cadena',
      texto: 'El ciclo necesita personas: un mosquito sano pica a alguien infectado, adquiere el ' +
             'virus y lo pasa a los siguientes. Por eso una sola persona enferma en una manzana ' +
             'con criaderos activos basta para encender un brote.',
      fuente: FUENTES.oms },

    { id: 'guero_alarma', cat: 'Enfermedad', titulo: 'Reconocerlo en otra persona',
      texto: 'Las señales de alarma casi nunca las nota quien las tiene: con dengue se está ' +
             'aturdido y adolorido. Las ve quien está al lado. Si alguien cercano tuvo fiebre y ' +
             'ahora vomita, le duele el abdomen o sangra de encías, hay que moverlo al médico ya.',
      fuente: FUENTES.oms },

    { id: 'guero_traslado', cat: 'Tratamiento', titulo: 'Llevarlo, no esperarlo',
      texto: 'El dengue grave mata por choque, y el choque avanza en horas. Lo que salva es ' +
             'reponer líquidos a tiempo bajo vigilancia médica. Esperar a ver si se le pasa ' +
             'es la decisión que llega tarde.',
      fuente: FUENTES.oms },

    { id: 'no_picar_enfermo', cat: 'Tratamiento', titulo: 'Que no lo piquen mientras tenga fiebre',
      texto: 'El dengue no pasa directo de una persona a otra, pero durante la primera semana el ' +
             'virus va en la sangre del enfermo: el mosquito que lo pica se lo lleva y se lo pasa a ' +
             'su familia. Mientras dure la fiebre: repelente, mosquitero y tela en las ventanas.',
      fuente: FUENTES.cdcCasa }
];

// --- Mitos, uno por transición de nivel ------------------------------------
const MITOS = [
    { mito: 'El mosquito del dengue pica de noche',
      real: 'Es activo de DÍA. El mosquitero nocturno no te protege del dengue.',
      fuente: FUENTES.oms },
    { mito: 'El dengue se cría en agua sucia',
      real: 'Prefiere agua LIMPIA y quieta, en recipientes de tu propia casa.',
      fuente: FUENTES.ssa },
    { mito: 'Si vacío la cubeta ya quedó',
      real: 'Los huevos siguen pegados en la pared y aguantan meses secos. Hay que tallar.',
      fuente: FUENTES.plos },
    { mito: 'Ya me dio dengue, ya estoy protegido',
      real: 'Solo contra ese serotipo. La segunda infección con otro es la más grave.',
      fuente: FUENTES.oms },
    { mito: 'Bajó la fiebre, ya pasó lo peor',
      real: 'Al contrario: ahí empieza la fase crítica. Es cuando hay que vigilar más.',
      fuente: FUENTES.cdcClin }
];

// --- Realidades: la otra mitad de «¿mito o realidad?» -----------------------
// Entre niveles el jugador contesta antes de ver la explicación. Si todo fuera
// mito, la respuesta sería siempre la misma y no habría nada que recordar.
const REALIDADES = [
    { real: 'Los huevos del mosquito aguantan meses secos pegados a la pared del recipiente',
      porque: 'Por eso vaciar no basta: hay que tallar la pared.',
      fuente: FUENTES.plos },
    { real: 'El mosquito del dengue casi nunca se aleja más de 100 metros de donde nació',
      porque: 'El que te pica nació en tu casa o en la de junto: la prevención es de toda la manzana.',
      fuente: FUENTES.cdc },
    { real: 'Te puede dar dengue hasta cuatro veces en la vida',
      porque: 'Son cuatro serotipos y pasar uno solo te protege de ese.',
      fuente: FUENTES.oms },
    { real: 'Con dengue, la fiebre se baja con paracetamol y no con ibuprofeno',
      porque: 'El ibuprofeno, el naproxeno y la aspirina afectan las plaquetas y aumentan el riesgo de hemorragia.',
      fuente: FUENTES.oms },
    { real: 'El tinaco se tapa; la llanta que ya no usas se tira',
      porque: 'El agua que sí ocupas se protege; lo que no usas solo está ahí para juntar agua.',
      fuente: FUENTES.ssa }
];

// --- ¿Es dengue? ¿A dónde lo llevo? -----------------------------------------
// Casos de vecinos para la pausa antes del nivel 4. Mismo formato que el quiz:
// la diferencia entre «en casa», «centro de salud» y «urgencias» la marcan la
// fase y las señales de alarma, que el juego ya enseñó.
const TRIAGE = [
    { pregunta: 'Doña Lupe, 62 años, tuvo fiebre tres días. Hoy ya no tiene fiebre, pero vomita ' +
                'todo lo que toma y le duele mucho el abdomen.',
      opciones: ['En casa, con paracetamol y suero', 'Al centro de salud mañana', 'A urgencias, ya'],
      correcta: 2,
      explica: 'Bajó la fiebre y aparecieron señales de alarma: vómito persistente y dolor abdominal ' +
               'intenso. Es la fase crítica, y el choque avanza en horas.',
      fuente: FUENTES.oms },
    { pregunta: 'Toño, 15 años, empezó ayer con fiebre de 39 °C, dolor de cabeza y dolor detrás ' +
                'de los ojos. Toma líquidos bien y no tiene sangrados.',
      opciones: ['A urgencias, ya',
                 'Al centro de salud para que lo revisen; en casa, paracetamol, suero y reposo',
                 'Ibuprofeno y a la escuela'],
      correcta: 1,
      explica: 'Es la fase febril sin señales de alarma: que lo vea un médico, paracetamol y líquidos, ' +
               'y vigilarlo sobre todo cuando le baje la fiebre.',
      fuente: FUENTES.oms },
    { pregunta: 'Mari, 30 años, tiene dengue desde hace cinco días. Hoy le sangran las encías y ' +
                'está muy adormilada.',
      opciones: ['A urgencias, ya', 'Que descanse y tome más suero', 'Al centro de salud la próxima semana'],
      correcta: 0,
      explica: 'Sangrado de encías y letargo son señales de alarma. Con cualquiera de ellas, a ' +
               'urgencias de inmediato.',
      fuente: FUENTES.oms }
];

// --- Quiz de antes y después ------------------------------------------------
// Las mismas cinco preguntas al empezar y al terminar: la diferencia es lo que
// el juego enseñó. Antes no se revela la respuesta (si no, el quiz enseñaría y
// no mediría); después sí, con su explicación y su fuente.
const QUIZ = [
    { pregunta: '¿En qué agua pone sus huevos el mosquito del dengue?',
      opciones: ['En agua sucia de drenajes y charcos',
                 'En agua limpia guardada en recipientes de la casa',
                 'En ríos y presas'],
      correcta: 1,
      explica: 'Agua limpia y quieta: cubetas, tinacos, floreros, llantas. El criadero casi siempre está en tu patio.',
      fuente: FUENTES.ssa },
    { pregunta: 'Alguien tiene dengue y fiebre alta. ¿Qué se le da?',
      opciones: ['Ibuprofeno o aspirina', 'Paracetamol y mucho líquido', 'Un antibiótico'],
      correcta: 1,
      explica: 'Los antiinflamatorios aumentan el riesgo de hemorragia y el antibiótico no sirve contra un virus. Paracetamol y suero.',
      fuente: FUENTES.oms },
    { pregunta: '¿Qué se hace con una llanta vieja que está en el patio?',
      opciones: ['Voltearla', 'Taparla', 'Tirarla'],
      correcta: 2,
      explica: 'Lo que ya no usas solo sirve para juntar agua: se tira.',
      fuente: FUENTES.ssa },
    { pregunta: 'A alguien con dengue por fin le bajó la fiebre. ¿Qué significa?',
      opciones: ['Que ya se curó',
                 'Que empieza la fase más peligrosa y hay que vigilar las señales de alarma',
                 'Que ya puede tomar ibuprofeno'],
      correcta: 1,
      explica: 'La fase crítica arranca cuando cede la fiebre y dura de 24 a 48 horas.',
      fuente: FUENTES.cdcClin },
    { pregunta: 'Si ya te dio dengue una vez…',
      opciones: ['Ya estás protegido para siempre',
                 'Te puede volver a dar, y la segunda vez puede ser más grave',
                 'Los mosquitos ya no te pican'],
      correcta: 1,
      explica: 'Hay cuatro serotipos. Una segunda infección con otro distinto aumenta el riesgo de dengue grave.',
      fuente: FUENTES.oms }
];

// --- Cifras reales para el reporte final -----------------------------------
const DATOS_REALES = {
    aguascalientes: [
        { anio: '2024', casos: 59 },
        { anio: '2025', casos: 8 },
        { anio: '2026', casos: 2 }
    ],
    aguasNota: 'Aguascalientes bajó de 59 casos en 2024 a 2 en lo que va de 2026. No es que el ' +
               'mosquito se haya ido: es que la vigilancia y la eliminación de criaderos funcionan. ' +
               'El día que se dejan de hacer, los números regresan.',
    mexico2024: { casos: 125000, muertes: 478 },
    mexicoNota: 'En 2024 México superó los 125 mil casos y 478 muertes. El dengue no es una ' +
                'enfermedad lejana ni tropical de postal: es de patios, azoteas y cacharros.',
    fuentes: [FUENTES.oms, FUENTES.ssa, FUENTES.ssaEpi, FUENTES.cdc, FUENTES.cdcVida, FUENTES.plos, FUENTES.cofepris]
};

// --- Güero: el rescate del final -------------------------------------------
// El desenlace no es azar ni una elección de sabor. Depende de las tres cosas
// que el juego lleva cinco niveles enseñando, y cada una tiene su fuente.
const GUERO = {
    nombre: 'Güero',
    destino: 'Universidad Tecnológica El Retoño',
    // Duración de su fase crítica, en frames de 60 fps. Solo corre desde que lo
    // encuentras: explorar no debe castigarse, tardar en decidir sí.
    reloj: 1500,

    hallado: 'GÜERO ESTÁ AQUÍ · TIENE DENGUE',
    intro: 'Le bajó la fiebre hace rato y dice que ya se siente mejor. ' +
           'Está pálido, le duele el abdomen y le sangran las encías.',

    opciones: [
        { id: 'paracetamol', icono: '💊', titulo: 'Darle paracetamol',
          txt: 'Baja la fiebre sin tocar las plaquetas.', bien: true },
        { id: 'suero', icono: '🥤', titulo: 'Darle suero oral',
          txt: 'Hidratación: es lo único que de verdad sostiene en la fase crítica.', bien: true },
        { id: 'aine', icono: '💊', titulo: 'Darle ibuprofeno',
          txt: 'Corta la fiebre al instante y es lo más barato.', bien: false },
        { id: 'nada', icono: '🚪', titulo: 'Llevarlo al portal sin más',
          txt: 'Está consciente y camina. Quizá aguante.', bien: false }
    ],

    // Motivos de fallo, cada uno con su fuente. Se muestran solo si aplican.
    fallos: {
        aine: { que: 'Le diste un antiinflamatorio.',
                por: 'El ibuprofeno, el naproxeno y la aspirina afectan las plaquetas y disparan ' +
                     'el riesgo de hemorragia, que es justo lo que mata en dengue. Para la fiebre ' +
                     'va paracetamol.', fuente: FUENTES.oms },
        nada: { que: 'No le diste nada.',
                por: 'No existe antiviral contra el dengue: el tratamiento es de soporte. Sin ' +
                     'hidratación ni vigilancia, la fase crítica termina en choque.', fuente: FUENTES.oms },
        tarde: { que: 'Llegaste tarde.',
                 por: 'La fase crítica dura de 24 a 48 horas y empieza justo cuando cede la ' +
                      'fiebre. Verlo "mejor" era el aviso, no el alta.', fuente: FUENTES.cdcClin },
        criaderos: { que: 'Quedaron criaderos abiertos a su alrededor.',
                     por: 'Un enfermo rodeado de criaderos activos vuelve a ser picado y alimenta ' +
                          'la cadena. Sin cerrar la fuente, curar a uno solo compra tiempo.',
                     fuente: FUENTES.ssa }
    },

    finalBien: {
        titulo: 'Güero salió adelante',
        texto: 'Aguantó la fase crítica hidratado y vigilado, y a los pocos días estaba fastidiando ' +
               'otra vez. En agosto se fue a estudiar a la Universidad Tecnológica El Retoño. ' +
               'Dice que en su colonia ya nadie deja una cubeta boca arriba.',
        nota: 'Lo salvaron tres cosas concretas: el medicamento correcto, llegar antes de que la ' +
              'fase crítica avanzara, y que no quedara un solo criadero cerca para volver a picarlo.'
    },
    finalMal: {
        titulo: 'Güero no la libró',
        texto: 'Entró en choque durante la fase crítica. Tenía diecisiete años y le faltaban dos ' +
               'meses para entrar a la Universidad Tecnológica El Retoño.',
        nota: 'Esto no fue mala suerte. Falló algo que el juego llevaba cinco niveles enseñando:'
    }
};

// --- Ivan: el otro caso, al principio de la enfermedad ---------------------
// Güero enseña la fase crítica. Ivan está en la febril, que es cuando se decide
// casi todo: qué medicamento, cómo se cuida a la familia y qué señales vigilar.
// Aparece en el nivel 2 y solo se le puede atender con la cuadra ya sin criaderos.
const IVAN = {
    nombre: 'Ivan',
    hallado: 'IVAN TIENE FIEBRE',
    esperar: 'IVAN TIENE FIEBRE · PRIMERO CIERRA LOS CRIADEROS DE LA CUADRA',
    intro: 'Ivan empezó ayer con fiebre de 39 °C, dolor de cabeza y dolor detrás de los ojos. ' +
           'Vive con su familia. Tú decides cómo lo cuidan.',
    preguntas: [
        { pregunta: '¿Qué le dan para la fiebre y el dolor?',
          opciones: ['Paracetamol, y mucho líquido o suero oral',
                     'Ibuprofeno: baja la fiebre más rápido',
                     'Un antibiótico, por si acaso'],
          correcta: 0,
          explica: 'Paracetamol para la fiebre y líquidos para no deshidratarse. El ibuprofeno ' +
                   'aumenta el riesgo de hemorragia y el antibiótico no sirve contra un virus.',
          ficha: 'hidratacion',
          fuente: FUENTES.oms },
        { pregunta: '¿Cómo cuidan a su familia mientras él tenga fiebre?',
          opciones: ['No hace falta: el dengue no se pasa de persona a persona',
                     'Que use repelente y duerma con mosquitero mientras tenga fiebre',
                     'Que tome vitamina C para no contagiar'],
          correcta: 1,
          explica: 'No se contagia directo, pero un mosquito que pique a Ivan se lleva el virus ' +
                   'y lo pasa a los demás. Mientras tenga fiebre, que no lo piquen.',
          ficha: 'no_picar_enfermo',
          fuente: FUENTES.cdcCasa },
        { pregunta: '¿Cuándo hay que llevarlo a urgencias sin esperar?',
          opciones: ['Si la fiebre le dura más de un día',
                     'Si cuando le baje la fiebre vomita, le duele mucho el abdomen o le sangran las encías',
                     'Solo si se desmaya'],
          correcta: 1,
          explica: 'Las señales de alarma suelen aparecer justo cuando baja la fiebre. Con ' +
                   'cualquiera de ellas, a urgencias de inmediato.',
          ficha: 'senales_alarma',
          fuente: FUENTES.oms }
    ],
    // Qué pasa si se falla cada pregunta, en el mismo orden.
    fallos: [
        'Con ibuprofeno o un antibiótico en vez de paracetamol y líquidos, Ivan se arriesgó a ' +
        'una hemorragia sin que nada atacara el virus.',
        'Sin repelente ni mosquitero, un mosquito de la casa lo picó con fiebre: dos semanas ' +
        'después alguien más en su casa tenía dengue.',
        'Esperar a que se desmaye es llegar tarde: las señales de alarma aparecen cuando baja ' +
        'la fiebre y el choque avanza en horas.'
    ],
    finalBien: 'Ivan pasó la fiebre en casa, con paracetamol, suero, repelente y mosquitero, ' +
               'vigilando las señales de alarma. A la semana estaba otra vez en la cancha, y nadie ' +
               'más en su casa se enfermó.',
    finalMal: 'Ivan salió adelante, pero lo que decidiste pudo salir caro:'
};
