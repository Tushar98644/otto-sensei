import type { Messages } from "..";
import type { Translation } from "../../types";

// Privacy policy, terms, refund policy and acceptable use, in Spanish; the English version governs.
export default {
  page: {
    contents: "Contenido",
    lastUpdated: "Última actualización:",
    shortVersion: "La versión corta",
    englishGoverns:
      "Esta página es una traducción. Si difiere de la <link>versión en inglés</link>, prevalece la versión en inglés.",
  },
  disclosure:
    "Nuestro proceso de pedidos lo lleva a cabo nuestro revendedor en línea {merchant}, el comerciante registrado (merchant of record) de todos nuestros pedidos. {merchant} gestiona el pago, los recibos, el impuesto sobre las ventas o el IVA, los reembolsos y el soporte de facturación.",
  privacy: {
    meta: {
      title: "Política de privacidad: dónde se guarda tu currículum",
      description:
        "Qué recopila {brand}, dónde se guarda tu currículum y quién más lo procesa, en palabras simples. Sin anuncios, sin cookies de rastreo, sin vender tus datos.",
    },
    title: "Política de privacidad",
    intro:
      "{brand} te ayuda a revisar y mejorar tu currículum. Esta página explica qué recopilamos, por qué y quién más lo ve.",
    summary: {
      noSelling:
        "No vendemos tus datos ni los compartimos con fines publicitarios, y no usamos anuncios ni cookies de rastreo.",
      browser:
        "Tus currículums se guardan en tu navegador. Si inicias sesión, también guardamos un respaldo para que puedas abrirlos en otros dispositivos.",
      ai: "Cada función de IA envía solo el texto que necesita, cuando la usas. Le indicamos a OpenRouter que use solo proveedores que no entrenan con él.",
      payments: "Los pagos pasan por {merchant}. Nunca vemos el número completo de tu tarjeta.",
      deleting:
        "Eliminar tu cuenta borra los datos de tu cuenta de inmediato. Si tuviste una prueba o pagaste, solo queda una huella unidireccional de tu correo, para que cada persona reciba la prueba de Pro una sola vez.",
    },
    collect: {
      title: "Qué recopilamos",
      items: {
        email:
          "<b>Tu dirección de correo electrónico,</b> si inicias sesión, ya sea con Google o con un código que te enviamos por correo. La usamos para iniciar tu sesión y para enviarte avisos importantes sobre tu cuenta o tu facturación. No hay contraseñas. Si usas Google, también comparte tu nombre y tu foto de perfil con nuestro proveedor de inicio de sesión; nosotros no los usamos.",
        resumes:
          "<b>Tus currículums.</b> Se guardan en el almacenamiento local de tu navegador, en tu dispositivo. Si inicias sesión, también guardamos una copia de respaldo en nuestra base de datos para que puedas abrirlos en otros dispositivos.",
        shareLinks:
          "<b>Enlaces para compartir.</b> Si compartes un currículum, guardamos una copia de esa versión (sin las líneas ocultas ni las notas de adaptación) para que cualquiera con el enlace pueda leerla y descargarla en PDF. Tu correo y tu teléfono solo se muestran si lo activas, y se les pide a los buscadores que omitan la página a menos que lo permitas. Contamos las visitas: para contar a cada lector una sola vez, guardamos durante unos dos días un código ofuscado creado a partir de su dirección de red y su navegador (no la dirección en sí). Desactivar el enlace elimina la copia.",
        applications:
          "<b>Postulaciones que registras.</b> Si haces seguimiento de postulaciones, guardamos lo que ingresas (empresa, título del puesto, enlace del empleo, fecha, estado y notas) y qué currículum enviaste, para que puedas ver tu propia tasa de entrevistas. Si creas una guía de preparación para entrevistas para una de ellas, la guardamos con esa postulación. Nadie más la ve.",
        jobEmails:
          "<b>Correos de empleo que reenvías a Otto.</b> Si activas el seguimiento por correo, eliges un identificador para una dirección privada, y los correos que tu filtro de Gmail le reenvía pasan por Cloudflare, que nos entrega cada uno como texto junto con el resultado de sus verificaciones de firma. Lo leemos con reglas fijas, no con IA, y guardamos solo el dominio del remitente, el asunto, qué tipo de actualización era, la empresa, el título del puesto, el enlace del empleo y la fecha de entrevista que leímos en él, y lo que cambiamos en tu tablero o te pedimos que revises. También guardamos tus identificadores y la dirección de Gmail que confirmas que reenvía a ella. El resto del correo, sus adjuntos y sus encabezados se descartan en cuanto se lee; ni Cloudflare ni nosotros guardamos una copia. Estos registros se eliminan después de seis meses o cuando eliminas tu cuenta, y están en tu descarga de datos. Un identificador que cambias o desactivas no se le asigna a nadie más durante 90 días.",
        letters:
          "<b>Cartas y mensajes que guardas.</b> Cuando escribes una carta de presentación, una respuesta de postulación o un mensaje de contacto con la sesión iniciada, lo guardamos con la empresa, el título del puesto y el enlace del empleo para el que era, y el título del currículum del que salió, para que puedas encontrarlo de nuevo en Cartas y mensajes. Los cambios que haces en un mensaje de contacto se guardan mientras escribes. Otto no busca a nadie, pero lo que escribes en un mensaje, como el nombre de la persona a la que le escribes, se guarda con él. Eliminar uno lo elimina. Nadie más los ve.",
        reminders:
          "<b>Recordatorios.</b> Cuando marcas un empleo como postulado, guardamos una fecha de seguimiento (7 días después, a menos que elijas otro número). Cuando llega, agregamos una nota a la campana de tu panel; Otto no envía recordatorios por correo. Guardamos la nota, si la leíste, la fecha y tu configuración de recordatorios. Las notas leídas se eliminan después de 90 días, y las no leídas, después de un año.",
        matches:
          "<b>Nuevos empleos compatibles.</b> Una vez por semana, Otto busca nuevos empleos que encajan con tu currículum y agrega una nota a la campana diciendo cuántos hay. Guardamos cuándo salió la última nota y cuándo buscamos por última vez; usa tu currículum y tu perfil laboral igual que la pestaña Empleos, y deja fuera los empleos que guardaste o a los que postulaste. Otto ya no envía el correo semanal de empleos ni correos de consejos o de visitas. Conservamos las preferencias de correo que elegiste antes y el registro de qué consejos te enviamos y cuándo (nunca el texto del correo), pero ya no tienen ningún efecto. Los correos enviados antes siguen teniendo un enlace que funciona para darte de baja con un clic.",
        careerLog:
          "<b>Tu bitácora profesional.</b> Si llevas una, guardamos el texto que escribes para cada mes (lo que lanzaste, cifras, lo que aprendiste o lideraste, o que no hubo nada nuevo) y la configuración de tu aviso mensual: el día, tu zona horaria y si está activado o en pausa. Si usas el micrófono, la grabación se convierte en texto y se descarta; solo se guarda el texto. Con el aviso activado, Otto agrega una nota a la campana y a Inicio en tu día y envía un correo al mes, que puedes desactivar con un clic. Es gratis en todos los planes. Puedes editar o eliminar cualquier mes, está en tu descarga de datos y se elimina con tu cuenta.",
        week: "<b>Tu semana con Otto.</b> Para mostrarte tu resumen semanal, guardamos los días en que tu cuenta abrió la app (solo la fecha, nunca la hora ni la página) y una copia del resumen de cada semana, que incluye los nombres de empresas y empleos de tus propias postulaciones y empleos guardados. Guardamos ambos durante unas 10 semanas. Los días solo se registran donde se permiten los eventos de uso: si tu navegador envía Do Not Track o Global Privacy Control, no los registramos, y el resumen cuenta solo lo que guardaste en Otto. Ambos están en tu descarga de datos y se eliminan con tu cuenta.",
        workProfile:
          "<b>Tu perfil laboral.</b> Si lo completas, guardamos el país donde vives, tu zona horaria, dónde puedes trabajar sin una visa patrocinada, si quieres trabajo de tiempo completo o por contrato, y si solo quieres empleos remotos. Otto compara las ofertas de empleo con él en tu navegador, y en nuestro servidor al ordenar la pestaña Empleos. Nadie más lo ve.",
        writingStyle:
          "<b>Tu estilo de escritura.</b> Si configuras uno, guardamos el tono, la extensión, la ortografía y la despedida que eliges, y las notas que le escribes a Otto. Dan forma a tus cartas de presentación, respuestas de postulación y mensajes de contacto. Nadie más los ve.",
        jobs: "<b>Empleos que comparas y guardas.</b> Para ordenarte las vacantes, tu navegador envía las habilidades, los títulos de puesto y los años de experiencia que lee de tu currículum, nunca el currículum en sí ni tus datos de contacto. Los usamos solo para esa solicitud y no los guardamos ni los enviamos a una IA. Si guardas un empleo, guardamos cuál y cuándo. Los empleos vienen de las páginas públicas de empleo y de las fuentes de empleo de las empresas, cada uno enlazado a su oferta original.",
        files:
          "<b>Archivos que subes.</b> Los leemos en memoria para extraer el texto y hacer las revisiones. No guardamos los archivos.",
        usage:
          "<b>Recuentos de uso.</b> Para los usuarios con sesión iniciada, cuántas correcciones de línea, versiones adaptadas, cartas de presentación y respuestas usaste este mes (o durante tu prueba), más cualquier extra que te haya dado una invitación, para que funcionen los límites del plan.",
        billing:
          "<b>Plan y estado de facturación.</b> Si te suscribes o empiezas una prueba, guardamos tu plan y los datos de la suscripción que nos envía {merchant}, como si está activa, cuándo termina tu prueba y cuándo se renueva. Nunca vemos el número completo de tu tarjeta.",
        trial:
          "<b>Registro de prueba.</b> Para que cada persona reciba la prueba de Pro una sola vez, guardamos una huella unidireccional (un hash SHA-256) del correo de cualquier persona que haya empezado una prueba o pagado. No se puede volver a convertir en tu correo, y la conservamos después de que eliminas tu cuenta, solo para comprobar si ese correo ya tuvo una prueba.",
        feedback:
          "<b>Comentarios que envías.</b> Tu nota, si es un problema o una idea, y la página desde la que la enviaste. Si iniciaste sesión, queda vinculada a tu cuenta.",
        invites:
          "<b>Invitaciones.</b> Tu código de invitación, qué cuenta se unió con el enlace de quién, y los identificadores de la cookie de dispositivo (ver abajo) de los navegadores usados, para que nadie pueda invitarse a sí mismo. Quienes invitan solo ven recuentos, nunca quién se unió. Una vez que tienes un enlace de invitación, el enlace “Hecho con Otto Sensei” al pie de tus enlaces para compartir lleva tu código de invitación, así que las personas que se registran desde ahí cuentan como tus invitaciones. El código por sí solo no dice quién eres.",
        abuse:
          "<b>Contadores de prevención de abuso.</b> Para frenar el abuso, contamos las solicitudes por dirección IP, dispositivo y dirección de correo en ventanas de tiempo cortas. Estos contadores se eliminan después de unos dos días.",
        logs: "<b>Registros técnicos.</b> Nuestros servidores registran eventos como errores. Los registros nunca incluyen el texto de tu currículum, y las direcciones de correo que aparecen en ellos están enmascaradas.",
        events:
          "<b>Eventos de uso.</b> Qué páginas abren las personas y qué pasos dan, como subir un currículum, descargar un PDF o mejorar de plan, con recuentos simples como cuántas revisiones fallaron. Para una página, eso es el tipo de página (nunca la dirección de un enlace para compartir o de un portafolio), el nombre del sitio que te envió, las etiquetas de campaña del enlace, si estás en un celular, una tableta o una computadora, cuánto tiempo te quedaste en ella y, en algunas visitas, qué tan rápido cargó la página. Nunca incluyen el texto de tu currículum, ofertas de empleo, tu nombre ni tu dirección de correo. Si iniciaste sesión, se vinculan con el identificador aleatorio de tu cuenta. Si tu navegador envía Do Not Track o Global Privacy Control, no enviamos ninguno.",
      },
    },
    ai: {
      title: "Cómo usa Otto la IA",
      intro:
        "Otto usa modelos de IA (de forma predeterminada, GLM de Z.ai) a través de OpenRouter. Cada función envía solo el texto que necesita, y solo cuando la usas:",
      items: {
        importing:
          "<b>Importar un currículum:</b> el texto del archivo, para ordenarlo en secciones.",
        fixing:
          "<b>Corregir una línea:</b> la línea, su título de puesto y su empresa, y tus respuestas a las preguntas de Otto.",
        summary:
          "<b>Escribir tu resumen profesional:</b> tu currículum sin sus datos de contacto, o solo el resumen que le pediste a Otto que ajustara.",
        tailoring:
          "<b>Adaptación, cartas de presentación, mensajes de contacto y respuestas de postulación:</b> tu currículum, la oferta de empleo, en el caso de una respuesta, la pregunta, y tu estilo de escritura si configuraste uno (con los datos de contacto de tus notas reemplazados por marcadores).",
        prep: "<b>Preparación para entrevistas:</b> tu currículum y la oferta de empleo.",
        build:
          "<b>“Crear con Otto”:</b> el empleo que quieres y lo que escribiste sobre cada empleo, nunca tu nombre.",
        github:
          "<b>Importar desde GitHub:</b> la descripción, el README y el texto de los pull requests de los repositorios y pull requests que elijas.",
      },
      notes: {
        placeholders:
          "Antes de que algo de esto vaya a la IA, Otto reemplaza tu nombre, correo, número de teléfono y enlaces por marcadores, y después los vuelve a poner. Los detecta por sus patrones habituales, así que un formato poco común puede escaparse. OpenRouter pasa el texto al proveedor del modelo y devuelve el resultado. Le indicamos a OpenRouter que use solo proveedores que no entrenan con estos datos. Los proveedores pueden conservarlos por un tiempo limitado según sus propias políticas, por ejemplo para detectar abusos.",
        safety:
          "<b>Controles de seguridad:</b> el texto que escribe Otto, y el texto de las páginas que publicas (tu portafolio y los enlaces de currículum compartidos), lo revisa un modelo de seguridad a través de OpenRouter, con la recopilación de datos desactivada, para bloquear contenido sexual o explícito.",
        noAi: "Las revisiones del reclutador, el editor y las descargas en PDF no usan IA. Las revisiones de líneas y los PDF se generan directamente en tu navegador.",
        inBrowser:
          "Una exportación de datos de LinkedIn o un archivo JSON Resume que importes se lee en tu navegador y nunca se sube. La verificación de elegibilidad de las ofertas de empleo también se hace en tu navegador, sin IA.",
        voice:
          "<b>Dictado por voz:</b> cuando presionas un botón de micrófono, tu navegador escucha solo mientras está activado. En Chrome, Edge y Safari, el servicio de voz del propio navegador (Google en Chrome, Microsoft en Edge, Apple en Safari) convierte tu voz en texto, según la política de privacidad de esa empresa. En otros navegadores, o cuando ese servicio no está disponible, el navegador graba un clip que va a nuestro proveedor de voz a texto a través de OpenRouter, con la recopilación de datos desactivada. Nunca guardamos el audio, solo el texto que conservas.",
        github:
          "“Importar desde GitHub” lee solo datos públicos de GitHub (tus repositorios y pull requests fusionados) a partir del nombre de usuario que escribes, sin tu inicio de sesión de GitHub. No se agrega nada a tu currículum hasta que lo confirmes. No guardamos los datos de GitHub: un servidor los mantiene en memoria hasta una hora, para que una segunda consulta no tenga que pedírselos de nuevo a GitHub.",
      },
    },
    chrome: {
      title: "Otto para Chrome",
      intro:
        "La extensión de Chrome muestra qué tan compatible es tu currículum con una oferta de empleo en la página donde la lees. Funciona así:",
      items: {
        reads:
          "<b>Qué lee:</b> el título, la empresa, la ubicación y el texto de una oferta de empleo. Solo se ejecuta en ofertas de empleo de LinkedIn, Naukri, Indeed, Greenhouse, Lever, Ashby, Workday, SmartRecruiters y Workable, y en cualquier otra página solo cuando presionas su botón en la barra de herramientas. No lee otras páginas ni tu historial de navegación, y nunca envía una postulación por ti.",
        fill: "<b>Llenar con Otto (Pro):</b> cuando lo presionas en un formulario de postulación de Greenhouse, Lever, Ashby o Workday, la extensión obtiene de tu cuenta tu nombre, correo, teléfono, ubicación, enlaces, historial laboral, educación y respuestas guardadas, los pone en ese formulario y adjunta el PDF de tu currículum; no los conserva. Nunca responde preguntas de autoidentificación ni de consentimiento y nunca envía el formulario. Redactar con Otto nos envía esa pregunta y la oferta de empleo. Después de que envías un formulario que llenó, agrega la postulación a tu tablero con el enlace, el título y la empresa del empleo.",
        device:
          "<b>La comparación se hace en tu dispositivo.</b> La extensión guarda una copia de lo que necesita la comparación en el almacenamiento de Chrome para extensiones: el texto de tus currículums sin tu nombre, correo, teléfono ni enlaces, tu perfil laboral, dónde buscas trabajo y qué empleos guardaste. Actualiza esa copia cada pocas horas. Revisar una oferta no nos envía nada.",
        save: "<b>Guardar:</b> cuando presionas Guardar, la extensión nos envía el enlace, el título, la empresa, la ubicación y el texto de la oferta de ese empleo. Los guardamos con tu cuenta, para que el empleo te espere en tu tablero y Otto pueda seguir leyendo la oferta si la retiran.",
        tailor:
          "<b>Adaptar y Carta</b> abren {brand} en una pestaña nueva con esa oferta guardada, y funcionan como las funciones de IA de arriba.",
        connecting:
          "<b>Conexión:</b> la extensión guarda una clave aleatoria para tu cuenta. Nosotros guardamos solo una huella unidireccional de ella, con la fecha en que se creó y en que se usó por última vez. Deja de funcionar después de 90 días sin uso, cuando presionas Desconectar en la página de tu cuenta o en la extensión, o cuando eliminas tu cuenta.",
      },
      outro: "La extensión no muestra anuncios ni envía eventos de uso.",
    },
    payments: {
      title: "Pagos",
      checkout:
        "{disclosure} El pago se hace en el sitio de {merchant}, no en el nuestro. Allí, {merchant} recopila tus datos de pago y tu dirección de facturación (también para la prueba, para que el plan pueda empezar cuando termine) según su propia <link>política de privacidad</link>.",
      items: {
        send: "<b>Lo que le enviamos a {merchant}:</b> cuando empiezas un pago, el correo de tu cuenta, nuestro identificador aleatorio para tu cuenta y el plan que elegiste, para que el pago quede vinculado a tu cuenta. Cuando empiezas un pago o eliminas tu cuenta, también buscamos ese correo en {merchant}, para que nunca se te cobre una segunda suscripción y se cancelen todas.",
        receive:
          "<b>Lo que {merchant} nos envía:</b> el plan y el estado de tu suscripción, su período de facturación, cuándo se renueva o termina tu prueba, una cancelación pendiente, y los identificadores que {merchant} usa para ti, tu suscripción y tus pagos. Sus avisos también incluyen el nombre, el correo y la dirección de facturación del pedido, y la red y los últimos cuatro dígitos de la tarjeta. Usamos ese correo solo para vincular un pago con tu cuenta, y no guardamos ninguno de estos datos. {merchant} nunca nos envía el número completo de tu tarjeta.",
      },
    },
    cookies: {
      title: "Cookies y almacenamiento local",
      intro: "Solo usamos lo que la app necesita para funcionar:",
      items: {
        signIn:
          "<b>Las cookies de inicio de sesión</b> mantienen tu sesión iniciada. Se renuevan mientras usas la app y se eliminan cuando cierras sesión.",
        device:
          "<b>Una cookie de dispositivo</b> guarda un identificador aleatorio que limita las subidas y revisiones gratis por dispositivo. No está vinculada a tu nombre ni a tu correo, y dura un año.",
        invite:
          "<b>Una cookie de invitación</b> guarda el código de invitación de un amigo durante 30 días después de que abres su enlace, para que la invitación cuente aunque te registres más tarde. Se elimina una vez que la invitación se resuelve.",
        language:
          "<b>Una cookie de idioma</b> recuerda qué idioma elegiste para la app. Guarda solo esa elección y dura un año.",
        localStorage:
          "<b>El almacenamiento local</b> (no es una cookie) guarda en tu dispositivo tus currículums, tu progreso y qué recorridos guiados viste, hasta que los eliminas o borras los datos de tu navegador.",
        checkout:
          "<b>El pago de {merchant}</b> se hace en su propio sitio, que puede poner allí sus propias cookies para procesar el pago y prevenir fraudes, según la <link>política de privacidad</link> de {merchant}. Nuestro sitio no pone cookies de pago.",
      },
      outro:
        "No usamos anuncios ni cookies de rastreo. Para los eventos de uso de arriba, se guarda un identificador aleatorio en el almacenamiento local para que tus pasos puedan contarse juntos, entre visitas. No está vinculado a tu nombre ni a tu correo, y borrar los datos de tu navegador lo elimina.",
    },
    sharing: {
      title: "Con quién compartimos datos",
      intro:
        "No vendemos tus datos ni los compartimos con fines publicitarios. Solo usamos estos proveedores para que {brand} funcione:",
      items: {
        openRouter:
          "<b>OpenRouter</b> y el proveedor de modelos de IA al que dirige las solicitudes procesan el texto de los currículums para las funciones de IA de arriba.",
        merchant:
          "<b>{merchant}</b> procesa los pagos como nuestro comerciante registrado y revendedor en línea.",
        supabase:
          "<b>Supabase</b> aloja nuestra base de datos y gestiona el inicio de sesión, incluidas tus sesiones.",
        resend:
          "<b>Resend</b> entrega nuestros códigos de inicio de sesión y los avisos sobre tu cuenta, como el fin de una prueba.",
        google: "<b>Google</b>, solo si eliges iniciar sesión con tu cuenta de Google.",
        github:
          "<b>GitHub</b> recibe el nombre de usuario que buscas, solo si usas Importar desde GitHub.",
        vercel: "<b>Vercel</b> aloja la app en sí.",
        cloudflare:
          "<b>Cloudflare</b> recibe los correos de empleo que reenvías a tu dirección de Otto y nos los pasa, solo si activas el seguimiento por correo.",
        sentry:
          "<b>Sentry</b> recibe informes de errores cuando algo falla, después de quitarles los correos, los números de teléfono y el texto de los currículums.",
        posthog:
          "<b>PostHog</b> recibe los eventos de uso de arriba, para que podamos ver qué pasos ayudan y dónde se traban las personas.",
      },
      outro:
        "Estos proveedores pueden procesar datos fuera de tu país, incluso en Estados Unidos. También podemos compartir información si la ley lo exige.",
    },
    retention: {
      title: "Cuánto tiempo guardamos los datos",
      items: {
        account:
          "Datos de la cuenta, respaldos de currículums, postulaciones registradas, preparación para entrevistas, tu perfil laboral y tu estilo de escritura: hasta que los elimines o elimines tu cuenta.",
        shareLinks: "Enlaces para compartir: hasta que desactives el enlace o elimines tu cuenta.",
        savedJobs:
          "Empleos guardados: hasta que los quites, o 30 días después de que cierre el empleo.",
        chromeJobs:
          "Empleos guardados desde Otto para Chrome: hasta que los quites o elimines tu cuenta.",
        chromeKey:
          "La clave de la extensión de Chrome: hasta que la desconectes, o 90 días después de su último uso.",
        reminders: "Notas de recordatorio: 90 días una vez leídas, un año si nunca se leen.",
        recaps:
          "Los días en que abriste la app y tus resúmenes semanales: unas 10 semanas, o hasta que elimines tu cuenta.",
        codes: "Códigos de inicio de sesión: funcionan una vez y vencen después de 10 minutos.",
        feedback:
          "Comentarios y registros de invitaciones: hasta que se elimine tu cuenta. Los comentarios enviados sin sesión iniciada no se vinculan a ninguna cuenta.",
        abuse: "Contadores de prevención de abuso: unos dos días.",
        uploads: "Archivos subidos: no se guardan en absoluto.",
        emailChoices:
          "Tus preferencias de correo y el registro de qué consejos te enviamos: hasta que elimines tu cuenta.",
        trialEnd:
          "Una copia de la fecha de fin de tu prueba: 30 días después de que termine la prueba, o hasta que desactives los consejos.",
        letters:
          "Cartas, respuestas y mensajes de contacto que guardas: hasta que los elimines o elimines tu cuenta.",
      },
    },
    choices: {
      title: "Tus opciones",
      items: {
        resumes:
          "Elimina cualquier currículum en el estudio cuando quieras. Su respaldo se borra de inmediato; la copia en este navegador espera en Eliminados recientemente durante 30 días, o hasta que cierres sesión o vacíes esa sección.",
        account:
          "Elimina tu cuenta desde la <link>página de tu cuenta</link>. Esto borra de inmediato tu correo, tu registro de inicio de sesión, los respaldos de currículums, las postulaciones registradas y su preparación, tu perfil laboral, tu estilo de escritura, cartas y mensajes, empleos guardados, la conexión de la extensión de Chrome, enlaces para compartir, recordatorios y preferencias de correo, registros de invitaciones, comentarios y registros de uso, y cierra tu sesión en todos los dispositivos. Eliminar tu cuenta cancela de inmediato tu plan de pago o tu prueba, y no se te volverá a cobrar. Solo queda la huella de prueba mencionada arriba.",
        data: "Pídenos una copia de tus datos, o que los corrijamos o eliminemos, escribiendo a <link>{email}</link>. También puedes presentar una queja ante tu autoridad local de protección de datos.",
      },
    },
    children: {
      title: "Menores",
      body: "{brand} no está pensado para menores de 16 años, y no recopilamos sus datos a sabiendas.",
    },
    changes: {
      title: "Cambios en esta política",
      body: "Si cambiamos esta política, actualizaremos la fecha de arriba. Si un cambio afecta cómo usamos tus datos, avisaremos por correo a los usuarios con sesión iniciada antes de que entre en vigor.",
    },
    contact: {
      title: "Contacto",
      body: "¿Preguntas sobre privacidad? Escribe a <link>{email}</link>.",
    },
  },
  terms: {
    meta: {
      title: "Términos del servicio: planes, límites y cancelación",
      description:
        "Las reglas para usar {brand}, en palabras simples: tu contenido sigue siendo tuyo, qué incluye y cuánto cuesta cada plan, sus límites mensuales y cómo cancelar.",
    },
    title: "Términos del servicio",
    intro:
      "Estos términos son el acuerdo entre tú y {brand} cuando usas este sitio. Al usarlo, los aceptas. Los hicimos cortos y claros a propósito.",
    summary: {
      yours: "Tus currículums y todo lo que escribes o subes siguen siendo tuyos.",
      guidance:
        "Las revisiones y sugerencias de Otto son una orientación, no una garantía de entrevista ni de empleo.",
      price:
        "Pro cuesta {month} al mes o {year} al año. Las cuentas nuevas pueden probarlo {days} días por {trialPrice}, una vez por persona.",
      cancel:
        "Cancela cuando quieras desde la página de tu cuenta, y conservas tu plan hasta el final del período que pagaste.",
      kept: "Si termina un plan de pago, no se elimina nada de lo que creaste.",
    },
    who: {
      title: "Quiénes somos",
      body: "{brand} es el negocio que opera este sitio y vende sus planes, y la parte con la que celebras estos términos. Puedes escribirnos a <link>{email}</link>.",
    },
    service: {
      title: "El servicio",
      asIs: "{brand} te permite revisar, editar y adaptar tu currículum y descargarlo en PDF. Lo ofrecemos tal cual. Trabajamos duro para que sea preciso y esté en línea, pero no podemos prometer que siempre esté libre de errores o disponible.",
      guidance:
        "Las revisiones y sugerencias de Otto son una orientación, no una garantía. El software de selección varía entre empleadores, y ninguna herramienta puede prometerte una entrevista o un empleo. Tú decides qué va en tu currículum, así que lee cada sugerencia antes de conservarla.",
    },
    account: {
      title: "Tu cuenta",
      body: "Inicias sesión con un código que se envía a tu correo. Mantén segura tu cuenta de correo, ya que cualquiera que pueda leerla puede iniciar sesión como tú. Debes tener al menos 16 años para usar {brand}.",
    },
    content: {
      title: "Tu contenido es tuyo",
      yours:
        "Tus currículums y todo lo que escribes o subes siguen siendo tuyos. Nos das permiso para guardarlos y procesarlos solo para darte el servicio, por ejemplo para revisar un archivo, respaldar tus currículums o enviar texto a nuestro proveedor de IA cuando le pides ayuda a Otto. Nuestra <link>política de privacidad</link> explica cómo.",
      rights: "Sube solo contenido que tengas derecho a usar.",
    },
    misuse: {
      title: "No lo uses mal",
      items: {
        limits:
          "No intentes romper, sobrecargar o eludir el servicio o sus límites, por ejemplo con scripts, bots o muchas cuentas.",
        copy: "No copies, revendas ni extraigas datos del servicio (scraping).",
        harmful: "No subas nada ilegal o dañino, ni datos privados de otra persona.",
        pretend: "No lo uses para hacerte pasar por otra persona.",
      },
      outro: "Podemos suspender o cerrar las cuentas que incumplan estas reglas.",
    },
    ai: {
      title: "Las herramientas de escritura con IA",
      intro:
        "Las herramientas de IA (correcciones de línea, adaptación, resúmenes, cartas de presentación, mensajes de contacto, respuestas a preguntas de postulación, preparación para entrevistas y Crear con Otto) son solo para textos de búsqueda de empleo.",
      items: {
        explicit:
          "No las uses para crear contenido sexual, sexualmente explícito ni ningún otro tipo de contenido NSFW (no apto para el trabajo).",
        hateful: "No las uses para crear contenido de odio, acoso, violento, ilegal o engañoso.",
      },
      outro:
        "La IA está configurada para rechazar esas solicitudes y dejar fuera ese material. Además, controles de seguridad automáticos bloquean el contenido sexual o explícito en lo que escribe Otto y en las páginas que publicas. Podemos eliminar el contenido que incumpla esta regla y suspender o cerrar la cuenta que lo pidió. Nuestra <link>política de uso aceptable</link> tiene la lista completa.",
    },
    plans: {
      title: "Planes y sus límites",
      includes: {
        title: "Qué incluye cada plan",
        free: "<b>Free:</b> el lector básico para archivos subidos, la vista del reclutador, la edición a mano, {fixes} correcciones de línea al mes con Otto (la ayuda con el resumen profesional cuenta como una), {resumes}, los formatos Classic y Compact, las descargas en PDF, los {matches} empleos más compatibles y {applications} con su recordatorio.",
        paid: "<b>Pro y Max</b> suman más correcciones de línea y el resto de la ayuda con IA de Otto (adaptación, cartas, respuestas, preparación para entrevistas, Crear con Otto, borradores desde GitHub y lectura con IA de los archivos subidos), los demás formatos, las descargas en Word, todos los empleos compatibles con filtros y empleos guardados, los enlaces para compartir, la verificación del permiso de trabajo y los portafolios. {pro} y la prueba guardan hasta {proResumes} currículums y siguen hasta {proApplications} postulaciones; {max} guarda hasta {maxResumes} y sigue hasta {maxApplications}. Las versiones adaptadas cuentan como currículums.",
        ends: "<b>Si termina un plan de pago,</b> no se elimina nada de lo que creaste. Puedes seguir abriéndolo, editándolo y descargándolo, y los enlaces que compartiste siguen activos, pero no puedes agregar más hasta que vuelvas a mejorar tu plan. Pasar a un plan más pequeño funciona igual: los currículums y las postulaciones que superen sus límites se quedan, y puedes agregar más cuando estés por debajo de ellos.",
      },
      resumes: { one: "{count} currículum", other: "{count} currículums" },
      trackedApplications: {
        one: "{count} postulación en seguimiento",
        other: "{count} postulaciones en seguimiento",
      },
      resets: {
        title: "Cuándo se reinician los límites",
        intro:
          "Cada plan tiene un límite para cada cosa que Otto hace con IA, que se muestra en la tabla de abajo.",
        items: {
          free: "<b>Free:</b> las correcciones de línea se reinician al inicio de cada mes calendario (UTC).",
          monthly:
            "<b>Planes mensuales:</b> los límites van de una renovación a la siguiente y se reinician cuando se renueva tu plan.",
          yearly:
            "<b>Planes anuales:</b> los mismos límites por mes, que se reinician el día del mes en que empezó el plan. En un mes más corto se reinician su último día: un plan que empezó el día 31 se reinicia el 30 en un mes de 30 días.",
          trial: "<b>La prueba de Pro:</b> sus propios límites, más bajos, para toda la prueba.",
          unused: "Los límites no usados no se acumulan.",
          invites:
            "<b>Los extras por invitación</b> se suman al mes actual o a la prueba. En Free, las correcciones de línea extra cuentan para ese mes calendario; las versiones adaptadas extra cuentan cuando empiezas una prueba o mejoras tu plan ese mes, y los extras que no hayas usado pasan contigo cuando lo haces.",
        },
        next: "La página de tu cuenta muestra la fecha del próximo reinicio de tus límites.",
      },
      table: {
        eachMonth: "Cada mes",
        trial: "Prueba de Pro, en total",
        none: "Ninguno",
        features: {
          tailor: "Versiones adaptadas",
          letter:
            "Cartas de presentación, mensajes de contacto, respuestas y preparación para entrevistas",
          fix: "Correcciones de línea",
          import: "Lecturas con IA de un currículum subido",
          draft: "Borradores de Crear con Otto",
          github: "Borradores de proyectos de GitHub",
        },
      },
      atLimit: {
        title: "Al llegar a un límite",
        pauses:
          "Esa función se pausa hasta que se reinicien tus límites (en Free, al inicio del mes siguiente; en un plan mensual, en tu próxima renovación; en un plan anual, en el próximo día de reinicio mensual; en la prueba, hasta que empiece Pro), o hasta que pases a un plan más grande. Pasar de Pro a Max entre renovaciones no reinicia ningún límite: lo que usaste este mes cuenta en el nuevo plan. Las subidas nunca se detienen: pasadas las lecturas con IA, el lector básico lee tu archivo. La edición, las revisiones del reclutador y las descargas en PDF no tienen límite en ningún plan.",
        budget:
          "Cada plan de pago también tiene un presupuesto mensual de IA ({proTokens} tokens en {pro}, {maxTokens} en {max}, {trialTokens} en la prueba) que cubre el uso completo de los límites de arriba y solo frena el uso automatizado o abusivo.",
        halfMillion: "medio millón",
      },
      voice: {
        title: "Dictado por voz",
        body: "El dictado por voz es gratis e ilimitado en navegadores con reconocimiento de voz integrado (Chrome, Edge y Safari). En otros navegadores, como Brave y Firefox, usa nuestro servicio de voz: hasta {freeClips} clips al día en Free, {proClips} en {pro} y en la prueba, y {maxClips} en {max}, cada uno de hasta 2 minutos.",
      },
    },
    payments: {
      title: "Pagos y cancelación",
      prices:
        "Pro cuesta {proMonth} al mes o {proYear} al año. Max cuesta {maxMonth} al mes o {maxYear} al año. Los precios están en dólares estadounidenses, más los impuestos que apliquen donde vives.",
      trial:
        "Las cuentas nuevas pueden tener una prueba de Pro de {days} días por {price}, una vez por persona. Agregas una tarjeta al pagar, y el cargo de {price} (más los impuestos que apliquen) se cobra cuando empieza la prueba. Cuando termina la prueba, Pro empieza a {proMonth} al mes, a menos que canceles antes. Durante la prueba se puede crear y previsualizar un portafolio, pero solo se publica con un plan de pago.",
      merchant:
        "{disclosure} Sus <link>términos para compradores</link> también se aplican a la compra.",
      renewal:
        "Un plan de pago se renueva cada período que elegiste hasta que canceles. Cancela cuando quieras desde la <link>página de tu cuenta</link>, y lo conservas hasta el final del período que pagaste. Puedes pasar de Pro a Max en el período de facturación que ya tienes: tu suscripción cambia en el momento, así que nunca se te cobra dos veces, y la diferencia por el resto del período se cobra de inmediato. Durante la prueba de Pro puedes empezar Max en su lugar: la prueba termina en ese momento, el precio completo de Max por el período que elijas (más los impuestos que apliquen) se cobra de inmediato a tu tarjeta registrada, y el cargo de {price} de la prueba no se descuenta. Para pasar a Pro, o entre mensual y anual, cancela y elige el nuevo plan cuando termine tu período actual. Si bajas a Free, tu portafolio publicado queda fuera de línea, y sus datos se conservan por si vuelves.",
      credit:
        "Un plan de pago {pro} o {max}, pasada cualquier prueba, puede agregar crédito prepago, de {min} a {maxUsd} cada vez, en dólares enteros, más los impuestos que apliquen. Paga la ayuda con IA solo cuando se agota la asignación del mes para esa ayuda, o el presupuesto de IA, a los precios vigentes en el momento de usarlo. El crédito es prepago y no es reembolsable una vez usado. No vence mientras exista tu cuenta, solo se puede usar mientras tengas un plan de pago y se elimina cuando se borra tu cuenta.",
      failed:
        "Si un pago falla cuando se renueva tu plan o termina tu prueba, conservas el plan unos días mientras se vuelve a intentar el pago. Si sigue fallando, tu cuenta pasa a Free hasta que actualices tu tarjeta desde la página de tu cuenta y el pago se complete.",
      changes:
        "Los precios y los límites pueden cambiar. Si cambia el precio o los límites de tu plan, te avisaremos por correo antes de que el cambio te aplique, para que puedas cancelar antes si lo prefieres.",
      refunds:
        "Las solicitudes de reembolso las gestiona {merchant} según sus <link>términos para compradores</link>. Nuestra <link>página de reembolsos</link> explica cómo pedirlo.",
    },
    ending: {
      title: "Terminar la relación",
      body: "Puedes dejar de usar {brand} y eliminar tu cuenta en cualquier momento. Podemos suspender o cerrar una cuenta que incumpla estos términos, y te diremos por qué cuando podamos. También podemos cambiar o dejar de ofrecer partes del servicio con el tiempo.",
    },
    liability: {
      title: "Límites de nuestra responsabilidad",
      body: "En la medida en que la ley lo permita, {brand} no es responsable de pérdidas indirectas, como una oportunidad de empleo perdida o ingresos perdidos. Nuestra responsabilidad total ante ti se limita a lo que nos pagaste en los 12 meses anteriores al reclamo. Nada en estos términos limita los derechos que tengas según las leyes de protección al consumidor de donde vives.",
    },
    changes: {
      title: "Cambios en estos términos",
      body: "Podemos actualizar estos términos. Cuando lo hagamos, cambiaremos la fecha de arriba, y para cambios importantes avisaremos por correo a los usuarios con sesión iniciada antes de que entren en vigor. Usar {brand} después de un cambio significa que aceptas los nuevos términos.",
    },
    contact: {
      title: "Contacto",
      body: "¿Preguntas sobre estos términos? Escribe a <link>{email}</link>.",
    },
  },
  refunds: {
    meta: {
      title: "Política de reembolsos: cancelar Pro y Max",
      description:
        "{merchant}, nuestro comerciante registrado, gestiona los reembolsos de Pro y Max según sus términos para compradores. Cancela cuando quieras y no se te cobrará de nuevo.",
    },
    title: "Política de reembolsos",
    intro:
      "{merchant} es nuestro comerciante registrado, y en el estado de cuenta de tu tarjeta el cargo aparece a su nombre, empezando con <b>{prefix}</b>. Así funcionan los pagos, los reembolsos y la cancelación en Pro y Max.",
    summary: {
      cancel:
        "Cancela cuando quieras desde la página de tu cuenta. Conservas tu plan hasta el final del período que pagaste.",
      trial:
        "La prueba de Pro de {days} días cuesta {price}, que se cobra cuando empieza. Cancela antes de que termine y no pagarás nada más.",
      ask: "Para pedir un reembolso, contacta a {merchant} a través de su <link>página de ayuda para compradores</link>, o <link>escríbenos</link> desde la dirección con la que inicias sesión.",
    },
    manageBilling: "Gestionar facturación",
    pay: {
      title: "A quién le pagas",
      receipt:
        "Después de cada pago, {merchant} te envía por correo un recibo con un enlace para descargar tu factura.",
    },
    refunds: {
      title: "Reembolsos",
      body: "Las solicitudes de reembolso las gestiona {merchant} según sus <link>términos para compradores</link>. Para pedir uno, contacta a {merchant} a través de su <link>página de ayuda para compradores</link>, o escríbenos desde la dirección con la que inicias sesión y le pasaremos tu solicitud.",
    },
    cancel: {
      title: "Cancela cuando quieras",
      anytime:
        "Cancela desde la <link>página de tu cuenta</link> cuando quieras. Conservas tu plan hasta el final del período que pagaste, y luego tu cuenta pasa al plan Free. Tus currículums siguen siendo tuyos en cualquier caso.",
      trial:
        "La prueba de Pro de {days} días cuesta {price}, que se cobra cuando empieza. Cancela antes de que termine la prueba y no pagarás nada más; si no, tu primer pago de Pro se cobra cuando termine. Si empiezas Max durante la prueba, el precio completo de Max se cobra de inmediato y el cargo de {price} de la prueba no se descuenta.",
    },
    deleting: {
      title: "Eliminar tu cuenta",
      body: "Eliminar tu cuenta cancela tu plan de pago de inmediato, y no se te volverá a cobrar. Termina en ese momento, no al final del período que pagaste.",
    },
    questions: {
      title: "Preguntas sobre un cargo",
      email:
        "Escribe a <link>{email}</link> desde la dirección con la que inicias sesión. Para el pago en sí, también puedes contactar a {merchant} a través de su <link>página de ayuda para compradores</link>.",
      rights:
        "Esta política no afecta los derechos que tengas según las leyes de consumo de donde vives.",
    },
  },
  acceptableUse: {
    meta: {
      title: "Política de uso aceptable de las herramientas de IA",
      description:
        "Para qué se pueden usar {brand} y sus herramientas de escritura con IA: solo textos profesionales de búsqueda de empleo. Nada explícito, de odio, ilegal ni engañoso.",
    },
    title: "Política de uso aceptable",
    intro:
      "{brand} ayuda a las personas con su búsqueda de empleo: revisar y mejorar currículums, adaptarlos a un empleo, escribir cartas de presentación y respuestas a preguntas de postulación, prepararse para entrevistas, encontrar empleos y crear una página de portafolio. Esta política dice para qué se puede usar y para qué no. Forma parte de nuestros <link>términos del servicio</link>.",
    purpose: {
      title: "Para qué son las herramientas de IA",
      body: "Las herramientas de escritura con IA escriben y mejoran textos de búsqueda de empleo a partir de tu propio currículum y de las ofertas de empleo que les das. Úsalas solo para eso.",
    },
    forbidden: {
      title: "No permitido",
      items: {
        sexual:
          "Contenido sexual, sexualmente explícito o sexualmente sugerente, o cualquier otro contenido NSFW (no apto para el trabajo).",
        hateful: "Contenido de odio, acoso, amenazas o violencia.",
        illegal: "Contenido ilegal, o contenido que ayude a alguien a infringir la ley.",
        deceptive:
          "Contenido engañoso: credenciales falsas, empleadores o títulos inventados, o hacerse pasar por otra persona.",
        privateData: "Datos privados de otra persona subidos sin su permiso.",
        limits:
          "Eludir las protecciones o los límites del servicio, por ejemplo con scripts, bots o muchas cuentas.",
      },
    },
    enforcement: {
      title: "Cómo la hacemos cumplir",
      body: "La IA tiene instrucciones de escribir solo textos profesionales de búsqueda de empleo y de rechazar o dejar fuera todo lo que esta política prohíbe. Además, controles de seguridad automáticos bloquean el contenido sexual o explícito en lo que escribe Otto y en las páginas públicas (portafolios y enlaces de currículum compartidos). Podemos eliminar el contenido que incumpla esta política, y suspender o cerrar la cuenta que lo creó.",
    },
    models: {
      title: "La IA detrás",
      body: "{brand} es un producto independiente. Sus funciones de IA usan modelos de IA de terceros, a los que se accede a través de OpenRouter. No estamos afiliados a las empresas que crean esos modelos ni contamos con su respaldo. Nuestra <link>política de privacidad</link> explica qué texto se envía y cómo se protege.",
    },
    report: {
      title: "Reportar un problema",
      body: "¿Viste algo que incumple esta política? Escribe a <link>{email}</link>. Respondemos en un plazo de 3 días hábiles.",
    },
  },
} satisfies Translation<Messages["legal"]>;
