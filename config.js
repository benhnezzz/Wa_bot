module.exports = {
  // Número(s) del owner en formato internacional SIN "+" ni espacios.
  // Ej: Chile +56 9 7777 6666 -> "56977776666"
  // OJO: este es el número de la PERSONA dueña del bot (desde donde vas a escribirle
  // los comandos), NO tiene que ser el mismo número donde está corriendo/vinculado el bot.
  // Se puede sobreescribir con la variable de entorno OWNER_NUMBERS separada por comas.
  OWNER_NUMBERS: process.env.OWNER_NUMBERS
    ? process.env.OWNER_NUMBERS.split(",")
    : ["56512222222"],

  // Prefijo de los comandos
  PREFIX: ".",

  // Nombre por defecto del paquete de stickers si no se especifica uno
  DEFAULT_PACK_NAME: "Mi Bot",
  DEFAULT_AUTHOR: "WA-Bot",

  // Si es true, cuando el owner entra a un grupo donde el bot YA es admin,
  // el bot lo asciende automáticamente
  AUTO_ADMIN_OWNER: true,
};
