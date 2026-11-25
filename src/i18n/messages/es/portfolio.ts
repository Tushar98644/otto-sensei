import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  title: "Portafolio",
  about:
    "Un sitio de portafolio hecho a partir de tu currículum, alojado para ti en tu propio enlace.",
  loadFailed: "No se pudo cargar tu portafolio",
  tryAgain: "Intentar de nuevo",
  checkConnection: "Revisa tu conexión y vuelve a intentarlo.",
  otto: {
    pick: "Elige un diseño y lo lleno con tu currículum. Abre uno para verlo con el tuyo.",
    pickThin: "Estos muestran un ejemplo con todo completo. Elige uno y lo lleno con lo tuyo.",
    draft: "Llené esto con tu currículum. Nada se publica hasta que tú lo publiques.",
    live: {
      one: "Tu página está en línea, con {count} visita hasta ahora.",
      other: "Tu página está en línea, con {count} visitas hasta ahora.",
    },
    liveNoViews: "Tu página está en línea. Envía el enlace a alguien y las visitas se suman aquí.",
    behind: "Tu currículum cambió desde esta copia. Actualiza la página cuando quieras.",
    noResume:
      "El currículum de esta página no está en este navegador. La página guarda su propia copia.",
    noResumes: "Primero agrega un currículum y luego lo convierto en una página.",
    previews:
      "Cada diseño de abajo es tu propio currículum. Abre uno a página completa para verlo como los visitantes.",
    previewsSample:
      "Estos muestran una página de ejemplo. Agrega un currículum y dibujo cada diseño con el tuyo.",
    previewsThin:
      "Estos muestran una página de ejemplo con todo completo. Cambia a la tuya cuando quieras.",
  },
  facts: {
    projects: { one: "{count} proyecto", other: "{count} proyectos" },
    jobs: { one: "{count} empleo", other: "{count} empleos" },
    skills: {
      one: "{count} habilidad",
      other: "{count} habilidades",
    },
  },
  resumeLink: {
    linked:
      "Tu página enlaza a tu currículum compartido, para que los visitantes lo lean completo.",
    hidden:
      "Tu currículum compartido muestra datos de contacto que esta página oculta, así que la página no incluye el enlace.",
    share:
      "Comparte este currículum y tu página lo enlazará, para que los visitantes lo lean completo.",
  },
  views: {
    none: "Aún sin visitas",
    count: { one: "{count} visita", other: "{count} visitas" },
  },
  saving: "Guardando…",
  savedLive: "Guardado en tu página publicada",
  saved: "Todos los cambios guardados",
  publishNote:
    "Publicar viene con Pro, y nosotros alojamos la página por ti. Hasta entonces, solo tú puedes verla.",
  store: {
    makeFailed: "No se pudo crear tu portafolio",
    saveFailed: "No se pudo guardar",
    notLoaded: "Tu portafolio aún no ha cargado. Vuelve a intentarlo en un momento.",
    live: "Tu página está en línea",
    liveDetail: "Cualquiera con la dirección puede abrirla ahora.",
    down: "Tu página está fuera de línea",
    downDetail: "Quien abra la dirección ahora verá que no funciona.",
    undo: "Deshacer",
    failed: "Algo salió mal. Vuelve a intentarlo.",
  },
  tabs: { design: "Diseño", content: "Contenido", sections: "Secciones", settings: "Ajustes" },
  editLabel: "Edita tu portafolio",
  offer: {
    title: "¿Mostrar “{name}” en su lugar?",
    use: "Usar este currículum",
    keep: "Mantener el actual",
    shows: "Tienes un portafolio. Ahora muestra {current}.",
    quoted: "“{name}”",
    another: "otro currículum",
  },
  inUseNote: "En uso en tu página.",
  notYetNote: "Aún no está en tu página.",
  useDesign: "Usar este diseño",
  useDesignNamed: "Usar este diseño: {name}",
  bar: {
    copied: "Copiado",
    copyLink: "Copiar enlace",
    publish: "Publicar",
    live: "En línea",
    draft: "Borrador",
    newTab: "(se abre en una pestaña nueva)",
    openPage: "Abrir página",
    pageActions: "Acciones de la página",
    moreActions: "Más acciones de la página",
    takeDown: "Despublicar",
    takeDownHint: "Los visitantes ven que la página no está disponible. Puedes deshacerlo.",
    linkCopied: "Enlace copiado",
    preview: "Vista previa",
  },
  start: {
    noResume: "Aún no hay currículum",
    waving: "Otto la nutria, saludando",
    title: "Elige un diseño",
    intro: "Puedes cambiar de diseño cuando quieras. Nada se publica hasta que tú lo publiques.",
    makeFrom: "Hacerlo a partir de",
  },
  upgrade: {
    eyebrow: "Alojado para ti, sin configurar nada",
    offlineTitle: "Tu página está fuera de línea por ahora",
    title: "Un portafolio de verdad, en línea en tu propio enlace",
    offline:
      "Los portafolios vienen con Pro y Max. Tu página y sus ajustes se guardan, así que vuelve tal como estaba.",
    pitch:
      "Tus proyectos, trabajo, escritos y enlaces en uno de {count} diseños, completado a partir de tu currículum.",
    liveAt: "En línea en <b>{url}</b>",
    hosted: "Nosotros lo alojamos: sin dominio, servidor ni código que configurar.",
    flows: "Los cambios en tu currículum llegan solos, y puedes cambiar de diseño cuando quieras.",
    comesWith: "Los portafolios vienen con Pro y Max.",
    trial:
      "{price} por {days} días, luego {plan} al mes. Cancela cuando quieras antes de que termine la prueba.",
    fullPage: "Página completa",
  },
  previewFull: "Ver {name} a página completa",
  settings: {
    madeFrom: "Hecho a partir de",
    resume: "Currículum",
    notHere: "Un currículum que no está en este navegador",
    upToDate: "Mantener la página al día",
    sync: "Sincronizar con mi currículum",
    syncHint: "Activado: los cambios del currículum aparecen solos en la página.",
    update: "Actualizar la página con mi último currículum",
    search: "Buscadores",
    indexing: "Dejar que los buscadores la encuentren",
    indexingHint: "Desactivado: se pide a Google y a otros que no la muestren en los resultados.",
    views: "Visitas",
    viewsNote:
      "{views}. El conteo no incluye tus visitas, las vistas previas de enlaces ni los buscadores.",
  },
  address: {
    title: "Dirección",
    livesAt: "Tu página está en /p/",
    keepsOld: "Si la cambias, la dirección anterior sigue funcionando {days} días.",
    rules: "Letras minúsculas, números y guiones.",
    free: "/p/{slug} está disponible.",
    checking: "Comprobando…",
    save: "Guardar",
    problems: {
      too_short: "Usa al menos {min} letras o números.",
      too_long: "Usa {max} caracteres como máximo.",
      characters: "Usa letras, números y guiones sueltos.",
      reserved: "Esa dirección está reservada para la app. Prueba otra.",
    },
  },
  delete: {
    done: "Tu página se eliminó",
    doneDetail: "Su dirección y su contenido ya no existen. Tu currículum sigue intacto.",
    failed: "No se pudo eliminar tu página",
    confirm:
      "Esto elimina la página, su dirección y todo lo que agregaste para ella. No se puede deshacer.",
    delete: "Eliminar página",
    keep: "Conservarla",
    start: "Eliminar esta página",
  },
  picker: {
    title: "Diseño",
    intro: "Todos los diseños usan el mismo contenido. Cambia cuando quieras; no se pierde nada.",
    inUse: "En uso",
    groups: { picks: "Nuestros favoritos", more: "Más diseños" },
  },
  full: {
    previewOnly: "Solo vista previa: aún no está en línea.",
    previous: "Diseño anterior",
    next: "Diseño siguiente",
    position: "{at} de {count}",
    width: "Ancho de página",
    close: "Cerrar vista previa",
  },
  preview: {
    label: "Vista previa",
    width: "Ancho de la vista previa",
    desktop: "Escritorio",
    phone: "Teléfono",
    asVisitors: "{name} · como la ven los visitantes",
    fullScreen: "Pantalla completa",
    region: "Vista previa de tu página en {name}. Desplázate para verla completa.",
  },
  source: {
    yours: "Tu página",
    sample: "Página de ejemplo",
    group: "Página mostrada en las vistas previas",
    own: "Tu página, con tu propio contenido",
    sampleShort: "Ejemplo:",
    sampleLong: "Página de ejemplo:",
    madeUpShort: "una persona inventada",
    madeUpLong: "{name}, una persona inventada",
  },
  visibility: {
    linkSettings: "Ajustes del enlace",
    shareResume: "Compartir este currículum",
    onPage: "En tu página",
    shown:
      "Se muestran {shown} de {total}. Una sección oculta conserva lo que tiene, lista para volver a activarla.",
    legend: "Secciones de tu página",
    hidden: "Oculta en tu página",
    contact: "Datos de contacto",
    contactIntro:
      "Ambos empiezan desactivados, para que una página pública nunca los comparta sin que lo pidas.",
    showEmail: "Mostrar mi correo",
    noEmail: "Tu currículum no tiene correo.",
    emailOn: "Activado: los visitantes ven {email}.",
    emailOff: "Desactivado: {email} no aparece en la página.",
    showPhone: "Mostrar mi teléfono",
    noPhone: "Tu currículum no tiene número de teléfono.",
    phoneOn: "Activado: los visitantes ven {phone}.",
    phoneOff: "Desactivado: {phone} no aparece en la página.",
    resumeLink: "Enlace al currículum",
  },
  sections: {
    about: "Sobre mí",
    projects: "Proyectos",
    experience: "Experiencia",
    skills: "Habilidades",
    education: "Educación",
    certifications: "Certificaciones",
    extras: "Otras secciones",
    links: "Enlaces",
  },
  templates: {
    navy: "Página azul marino oscuro con secciones numeradas, pestañas por empleo y grandes proyectos destacados.",
    dock: "Una columna tranquila que aparece suavemente, con filas de trabajo, tarjetas de proyectos y un dock flotante.",
    reel: "Un título enorme que gira sobre una esfera 3D, y luego cada proyecto en el marco de un dispositivo.",
    bento: "Todo en mosaicos: presentación, tecnologías, hora local en vivo, GitHub y proyectos.",
    cv: "Un CV dibujado a escala: paneles con reglas, tus iniciales en 3D y empleos agrupados por empresa.",
    prose:
      "Primero las palabras, con etiquetas de color, proyectos agrupados por tipo, y luego charlas y escritos.",
    folio:
      "Tu página como una app de notas: una nota fijada sobre ti y enlaces rápidos, luego una nota para cada parte de tu trabajo.",
    paper:
      "Dibujado a mano: tu nombre con marcador sobre un zorro junto al mar, tarjetas entintadas y subrayados ondulados, de día o de noche.",
    gazette:
      "Tu página como un periódico de 1926: una cabecera en letra gótica, tu titular, columnas con reglas y una cinta de noticias.",
    terminal:
      "Una terminal que imprime tu resumen al abrirse y deja que los visitantes escriban help, work o contact.",
    brutal:
      "Bloques de color llamativos con bordes negros gruesos, sombras duras que se hunden y etiquetas en forma de píldora.",
    card: "Una tarjeta sobre fondo carbón: una barra lateral de perfil junto a pestañas de sobre mí, currículum y trabajo, con detalles dorados.",
    retro:
      "Una estación de trabajo retro: ventanas que puedes arrastrar, enrollar y ampliar, una barra de menús y tres épocas para elegir.",
    starring:
      "Tu carrera como una película: tu nombre en letras enormes sobre un escenario negro, y luego un acto para cada parte de tu trabajo.",
    bubble:
      "Llamativo y tierno: letras infladas a rayas sobre un cielo a cuadros, tarjetas de stickers, pequeñas mascotas y una marquesina.",
  },
  page: {
    title: "{name} - Portafolio",
    untitled: "Portafolio",
    description: "Un portafolio hecho con {brand}.",
    imageLabel: "PORTAFOLIO",
  },
} satisfies Translation<Messages["portfolio"]>;
