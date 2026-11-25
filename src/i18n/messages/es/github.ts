import type { Messages } from "..";
import type { Translation } from "../../types";

// Adding projects from GitHub, in Spanish.
export default {
  offer: {
    links: "Tu currículum enlaza a github.com/{username}",
    text: "Elige tus mejores repos públicos y Otto redacta las líneas del proyecto. Tú las revisas primero.",
    button: "Agregar proyectos de mi GitHub",
  },
  connect: {
    title: "Importar desde GitHub",
    signInFirst: "Primero inicia sesión y luego conecta tu cuenta de GitHub.",
    checkFailed: "No se pudo revisar tu cuenta de GitHub en este momento.",
    signIn: "Iniciar sesión",
    tryAgain: "Reintentar",
    connectTitle: "Conecta tu GitHub",
    connectDescription:
      "Otto solo agrega trabajo de una cuenta de GitHub que sea tuya. Inicia sesión en GitHub una vez para conectarla.",
    connect: "Conectar GitHub",
    reads:
      "Otto lee tus repos públicos y tus pull requests fusionados. Nunca publica nada en GitHub.",
    description:
      "Elige repos públicos y pull requests fusionados, y Otto redacta líneas de proyecto con ellos.",
    find: "Buscar mi trabajo",
    cancel: "Cancelar",
    connectedAs: "Conectado como <b>{login}</b>",
    notYou: " · ¿No eres tú? ",
    disconnect: "Desconectar",
    signInReason: "Inicia sesión para conectar tu cuenta de GitHub.",
    offline: "No se puede conectar con Otto ahora. Revisa tu conexión.",
    startFailed: "No se pudo empezar a conectar GitHub. Inténtalo de nuevo.",
    disconnectFailed: "No se pudo desconectar GitHub. Inténtalo de nuevo.",
    notConnected: "GitHub no está conectado",
    errors: {
      taken: "Esa cuenta de GitHub ya está conectada a otra cuenta de Otto Sensei.",
      failed: "GitHub no se conectó. Inténtalo de nuevo.",
    },
  },
  pick: {
    title: "Elige qué agregar",
    description: "Trabajo público de {username}. Hasta {repos} repos y {pulls} pull requests.",
    repoCount: { one: "{count} repo", other: "{count} repos" },
    pullCount: { one: "{count} pull request", other: "{count} pull requests" },
    otto: "Elige tu mejor trabajo. Solo escribiré líneas con lo que muestra GitHub.",
    nothing: "No encontré repos públicos ni pull requests fusionados de {username}.",
    back: "Atrás",
    draft: { one: "Redactar {count} proyecto", other: "Redactar {count} proyectos" },
    draftNone: "Redactar proyectos",
    tabs: "Qué importar",
    repos: "Repos",
    pulls: "Pull requests",
    picked: "{repos} de {reposMax} repos y {pulls} de {pullsMax} pull requests elegidos",
    search: "Buscar en tus repos",
    searchPlaceholder: "Busca por nombre, lenguaje o tema",
    noRepos:
      "No tienes repos públicos propios en GitHub. Los forks quedan fuera, porque empiezan como trabajo de otra persona.",
    noMatch: "Ningún repo coincide con “{query}”.",
    pullsBusy:
      "GitHub estaba demasiado ocupado para listar los pull requests. Vuelve atrás y búscalos de nuevo en un minuto.",
    noPulls: "No hay pull requests fusionados en repos públicos de otras personas.",
    onResume: "En tu currículum",
    stars: { one: "{count} estrella", other: "{count} estrellas" },
    archived: "Archivado",
    merged: "Fusionado en {month}",
  },
  review: {
    title: "Quédate con los proyectos que quieras",
    description:
      "Otto eligió tu mejor trabajo público. Desmarca lo que no quieras; no se agrega nada hasta que lo digas.",
    projects: { one: "{count} proyecto", other: "{count} proyectos" },
    lines: { one: "{count} línea", other: "{count} líneas" },
    usedAI: "Usé solo datos y números de GitHub. Desmarca lo que no quieras.",
    plain: "Estas líneas usan las palabras de GitHub. Hazlas tuyas después de agregarlas.",
    pickOther: "Elegir otros repos",
    add: { one: "Agregar {count} proyecto", other: "Agregar {count} proyectos" },
    addNone: "Agregar proyectos",
    already: "Ya está en tu currículum",
    noLines: "Aún no hay líneas. Puedes escribirlas después de agregarlo.",
  },
  added: {
    title: {
      one: "Se agregó {count} proyecto de GitHub",
      other: "Se agregaron {count} proyectos de GitHub",
    },
    skipped: "Un currículum admite {max} proyectos, así que {skipped} no cupieron.",
    where: "Están en Proyectos. Edita cualquier línea para hacerla tuya.",
    full: "Este currículum ya tiene {max} proyectos",
    makeRoom: "Quita uno para hacer espacio.",
    undo: "Proyectos agregados de GitHub",
  },
} satisfies Translation<Messages["github"]>;
