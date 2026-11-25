import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  quote: "“{text}”",
  issues: {
    stock: {
      one: "{phrases} es una frase que los reclutadores pasan por alto. Muestra el resultado.",
      other: "{phrases} son frases que los reclutadores pasan por alto. Muestra el resultado.",
    },
    weakStart: "Cambia {phrase} por lo que hiciste, como “Creé”, “Reduje” o “Lideré”.",
    duty: "{phrase} suena a descripción del puesto. Di qué hiciste y qué cambió.",
    tense: "Este trabajo ya terminó, así que escribe {past}, no {phrase}.",
    noResult: "¿Qué cambió gracias a esto? Agrega el resultado y, si lo sabes, cuánto.",
    noNumber: "¿Cuántos, cuánto o qué tan rápido? Agrega una cifra si la sabes.",
    noNumberWord: "{word}: ¿cuánto, o para cuántos? Agrega una cifra si la sabes.",
    noMethod: "Di cómo lo lograste: ¿qué creaste, cambiaste o pusiste en marcha?",
    firstPersonTeam: "{word} oculta tu parte. Di qué hiciste tú.",
    firstPersonSelf: "Quita {word}. En el currículum no se escribe “yo”, “mi” ni “nosotros”.",
    passive: "{phrase} oculta quién lo hizo. Di qué hiciste tú.",
    vagueList: "{phrase} es impreciso. Nombra lo importante o quítalo.",
    vagueThing: "{phrase} es impreciso. Di exactamente qué.",
    vagueCount: "{phrase} es impreciso. Da la cifra real.",
    tooLongWords:
      "Esta línea tiene {count} palabras. Recórtala a dos renglones para que se lea de un vistazo.",
    tooLongChars:
      "Esta línea tiene {count} caracteres. Recórtala a dos renglones para que se lea de un vistazo.",
    tooShort: "Esta línea es demasiado corta para mostrar mucho. Agrega qué hiciste y qué cambió.",
    duplicate: "Esta línea repite otra. Deja una, o haz que cada una diga algo nuevo.",
    stopMost:
      "La mayoría de las líneas aquí terminan con punto. Agrega uno aquí para que coincidan.",
    stopFirst: "Tu primera línea aquí termina con punto. Agrega uno aquí para que coincidan.",
    noneMost: "La mayoría de las líneas aquí terminan sin punto. Quita este para que coincidan.",
    noneFirst: "Tu primera línea aquí termina sin punto. Quita este para que coincidan.",
  },
  help: {
    duty: {
      why: "Los reclutadores buscan qué hiciste y qué cambió, no la descripción del puesto.",
      before: "Responsable del mantenimiento de la base de datos",
      after:
        "Mantuve la base de datos con 99.9 % de disponibilidad gracias a copias de seguridad automáticas",
    },
    "no-result": {
      why: "Una línea que termina en un resultado muestra por qué importó tu trabajo.",
      before: "Desarrollé APIs REST en Node.js",
      after: "Creé APIs REST en Node.js que bajaron el tiempo de carga de 3 s a 0.8 s",
    },
    "no-number": {
      why: "Una cifra muestra el tamaño del resultado: cuántos, cuánto o qué tan rápido.",
      before: "Mejoré el proceso de pago",
      after: "Mejoré el proceso de pago y subí un 12 % los pedidos completados",
    },
    "no-method": {
      why: "Decir cómo lograste el resultado lo hace creíble.",
      before: "Reduje un 30 % los costos de la nube",
      after:
        "Reduje un 30 % los costos de la nube al pasar los procesos por lotes a servidores más baratos",
    },
    "weak-start": {
      why: "La primera palabra es lo primero que se lee. Un verbo fuerte muestra que hiciste el trabajo.",
      before: "Ayudé a migrar el portal de pacientes a React",
      after: "Migré a React el portal de pacientes para 40,000 pacientes",
    },
    "first-person": {
      why: "Las líneas del currículum no llevan “yo” ni “nosotros”. Es tu currículum, así que queda claro quién lo hizo.",
      before: "Yo creé el sistema de facturación",
      after: "Creé el sistema de facturación que usan 40 clientes",
    },
    tense: {
      why: "Los trabajos que ya dejaste se escriben en pasado.",
      before: "Creo herramientas internas para el equipo de soporte",
      after: "Creé herramientas internas que le ahorraron a soporte 5 horas a la semana",
    },
    "too-long": {
      why: "Las líneas largas se leen por encima. Una o dos líneas cada una se leen mejor.",
      after:
        "Reduje un 40 % el tiempo de despliegue al mover las compilaciones a una caché compartida",
    },
    "too-short": {
      why: "Con pocas palabras no se ve qué hiciste ni qué cambió.",
      before: "Arreglé errores",
      after: "Arreglé 120 errores del pago y bajé un 18 % los pagos fallidos",
    },
    passive: {
      why: "Decir qué hiciste deja clara tu parte.",
      before: "La base de datos fue migrada a PostgreSQL",
      after: "Migré la base de datos a PostgreSQL en 3 semanas",
    },
    vague: {
      why: "Palabras como “varios” o “diversos” ocupan el lugar de una cifra o un nombre real.",
      before: "Organicé varios webinars",
      after: "Organicé 14 webinars con socios que trajeron 2,300 registros",
    },
    "stock-phrase": {
      why: "Las frases que tiene cualquier currículum se pasan por alto. Un resultado lo dice mejor.",
      before: "Proactivo y orientado a resultados",
      after: "Lideré un equipo de 4 que lanzó la app móvil 2 semanas antes",
    },
    duplicate: { why: "Una línea repetida ocupa el lugar de otro resultado." },
    punctuation: { why: "Las líneas que terminan igual se ven ordenadas y cuidadas." },
  },
  checks: {
    result: "Dice qué cambió",
    start: "Empieza fuerte",
    voice: "Sin yo ni nosotros",
    stock: "Sin frases hechas",
    length: "Largo adecuado",
    numbers: "Tiene cifras",
    method: "Dice cómo",
    tense: "En pasado",
    passive: "Dice quién lo hizo",
    vague: "Sin palabras vagas",
    repeat: "Sin líneas repetidas",
    stops: "Puntos finales parejos",
  },
  review: {
    places: { experience: "Experiencia", project: "Proyecto", education: "Educación" },
    groups: {
      duty: {
        title: {
          one: "{count} línea suena a descripción del puesto",
          other: "{count} líneas suenan a descripción del puesto",
        },
        reason: "Los reclutadores buscan qué hiciste y qué cambió, no la tarea en sí.",
      },
      "no-result": {
        title: {
          one: "{count} línea no dice qué cambió",
          other: "{count} líneas no dicen qué cambió",
        },
        reason:
          "Cada línea debería terminar en un resultado: qué mejoró, para quién y cuánto, si lo sabes.",
      },
      "weak-start": {
        title: { one: "{count} línea empieza débil", other: "{count} líneas empiezan débiles" },
        reason: "Empieza con lo que hiciste, como Creé, Reduje, Lideré o Escribí.",
      },
      "first-person": {
        title: {
          one: "{count} línea usa yo o nosotros",
          other: "{count} líneas usan yo o nosotros",
        },
        reason: "Las líneas del currículum no llevan yo, mi ni nosotros.",
      },
      "stock-phrase": {
        title: {
          one: "{count} línea usa frases hechas",
          other: "{count} líneas usan frases hechas",
        },
        reason:
          "Las frases que tiene cualquier currículum se pasan por alto. Muestra el resultado.",
      },
      "too-long": {
        title: {
          one: "{count} línea ocupa más de dos renglones",
          other: "{count} líneas ocupan más de dos renglones",
        },
        reason: "Las líneas largas se saltan. Deja cada una en uno o dos renglones.",
      },
      tense: {
        title: {
          one: "{count} línea de trabajos anteriores está en presente",
          other: "{count} líneas de trabajos anteriores están en presente",
        },
        reason: "Los trabajos que dejaste van en pasado: Creé, no Creo.",
      },
      passive: {
        title: {
          one: "{count} línea oculta quién hizo el trabajo",
          other: "{count} líneas ocultan quién hizo el trabajo",
        },
        reason: "Di qué hiciste, no qué se hizo.",
      },
      vague: {
        title: {
          one: "{count} línea usa palabras vagas",
          other: "{count} líneas usan palabras vagas",
        },
        reason: "Palabras como varios o diversos ocupan el lugar de una cifra o un nombre real.",
      },
      duplicate: {
        title: { one: "{count} línea repite otra", other: "{count} líneas repiten otra" },
        reason: "Deja una, o haz que cada una diga algo nuevo.",
      },
      "too-short": {
        title: {
          one: "{count} línea es demasiado corta",
          other: "{count} líneas son demasiado cortas",
        },
        reason: "Con pocas palabras no se ve qué hiciste ni qué cambió.",
      },
      "no-method": {
        title: { one: "{count} resultado no dice cómo", other: "{count} resultados no dicen cómo" },
        reason: "Un resultado convence más si dices cómo lo lograste.",
      },
      "no-number": {
        title: {
          one: "A {count} línea le vendría bien una cifra",
          other: "A {count} líneas les vendría bien una cifra",
        },
        reason: "Si la sabes, una cifra muestra el tamaño: cuántos, cuánto, qué tan rápido.",
      },
      punctuation: {
        title: {
          one: "Los puntos finales no coinciden en {count} línea",
          other: "Los puntos finales no coinciden en {count} líneas",
        },
        reason:
          "Las líneas de un mismo trabajo o proyecto se ven más ordenadas si todas terminan igual: con punto o sin él.",
      },
    },
    summary: {
      place: "Perfil",
      both: "Tu perfil usa frases hechas y yo",
      firstPerson: "Tu perfil usa yo o nosotros",
      stock: "Tu perfil usa frases hechas",
      reason: "Lo de arriba se lee primero, así que debe sonar como tus líneas: hechos, sin yo.",
    },
    firstLook: {
      title: {
        one: "A {count} trabajo le falta el puesto, la empresa o las fechas",
        other: "A {count} trabajos les falta el puesto, la empresa o las fechas",
      },
      reason: "Lo primero que mira un reclutador son tus puestos, empresas y fechas.",
      missing: "Sin {parts}.",
      parts: { title: "puesto", company: "empresa", dates: "fechas" },
      at: "{title} en {company}",
      aJob: "Un trabajo",
    },
    headline: {
      title: "No hay un puesto debajo de tu nombre",
      reason: "Pon arriba el puesto que buscas, para que quien lea sepa a qué te postulas.",
    },
    skills: {
      title: {
        one: "{count} habilidad solo está en tu lista de habilidades",
        other: "{count} habilidades solo están en tu lista de habilidades",
      },
      reason: {
        one: "{skills}: ninguna línea de trabajo o proyecto muestra que la usaste. Los reclutadores y los filtros confían más en una habilidad que aparece en algo que hiciste.",
        other:
          "{skills}: ninguna línea de trabajo o proyecto muestra que las usaste. Los reclutadores y los filtros confían más en una habilidad que aparece en algo que hiciste.",
      },
      more: "{names} y {count} más",
    },
  },
} satisfies Translation<Messages["lint"]>;
