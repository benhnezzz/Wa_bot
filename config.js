module.exports = {
  // Número(s) del owner en formato internacional SIN "+" ni espacios.
  // Ej: Chile +56 9 7777 6666 -> "56977776666"
  // OJO: este es el número de la PERSONA dueña del bot (desde donde vas a escribirle
  // los comandos), NO tiene que ser el mismo número donde está corriendo/vinculado el bot.
  //
  // IMPORTANTE sobre WhatsApp "LID": WhatsApp ahora identifica a algunas cuentas con un ID
  // anónimo interno (formato "12345@lid") en vez del número de teléfono real. Si el bot no
  // te reconoce como owner usando tu número, corre el bot, escríbele un comando y revisa la
  // consola: vas a ver una línea "[debug] sender JID: ...". Copia ese identificador (la parte
  // antes de "@lid" o "@s.whatsapp.net") y agrégalo aquí tal cual, junto a tu número.
  // Se puede sobreescribir con la variable de entorno OWNER_NUMBERS separada por comas.
  OWNER_NUMBERS: process.env.OWNER_NUMBERS
    ? process.env.OWNER_NUMBERS.split(",")
    : ["56512222222", "79401697992881"],

  // Prefijo de los comandos
  PREFIX: ".",

  // Nombre por defecto del paquete de stickers si no se especifica uno
  DEFAULT_PACK_NAME: "Mi Bot",
  DEFAULT_AUTHOR: "WA-Bot",

  // Si es true, cuando el owner entra a un grupo donde el bot YA es admin,
  // el bot lo asciende automáticamente
  AUTO_ADMIN_OWNER: true,
};
