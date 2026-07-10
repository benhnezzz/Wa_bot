# WA-Bot — Bot de WhatsApp con moderación de grupo

Bot hecho con [Baileys](https://github.com/WhiskeySockets/Baileys), la librería no oficial de WhatsApp Web más usada para este tipo de proyectos.

## ⚠️ Antes de empezar

- Esto usa la **API no oficial** de WhatsApp. WhatsApp puede banear números que usen bots de forma agresiva o para spam. Úsalo con un número secundario y con criterio (no agregues/elimines gente en masa, no lo uses para hacer spam).
- Necesitas Node.js 18 o superior instalado.
- Necesitas **ffmpeg** instalado en el sistema (se usa para generar los stickers):
  - Termux: `pkg install ffmpeg -y`
  - Ubuntu/Debian: `sudo apt install ffmpeg -y`
  - Mac: `brew install ffmpeg`

## Instalación

```bash
npm install
node index.js
```

La primera vez va a aparecer un **código QR en la terminal**. Escanéalo desde WhatsApp:
`Ajustes > Dispositivos vinculados > Vincular un dispositivo`.

Se creará una carpeta `auth_info/` con la sesión — no la subas a ningún repo público ni la compartas, es literalmente el acceso a tu cuenta.

## Configuración

Edita `config.js`:

```js
module.exports = {
  OWNER_NUMBERS: ["56977776666"], // tu número, sin + ni espacios
  PREFIX: ".",
  DEFAULT_PACK_NAME: "Mi Bot",
  DEFAULT_AUTHOR: "WA-Bot",
  AUTO_ADMIN_OWNER: true,
};
```

## Comandos

| Comando | Descripción | Requisito |
|---|---|---|
| `.join <link>` | Une el bot a un grupo desde un link de invitación | Owner o co-owner |
| `.sticker <paquete>` / `.s` | Convierte imagen/video (respondido o enviado con caption) en sticker | — |
| `.agg <número>` | Agrega un número al grupo (ej: `.agg 56977776666`) | Owner o co-owner |
| `.kick <número/mención/respuesta>` | Elimina a alguien del grupo | Owner o co-owner |
| `.setpp` | Cambia la foto del grupo (respondiendo a una imagen) | Owner o co-owner |
| `.setname <texto>` | Cambia el nombre del grupo | Owner o co-owner |
| `.setdesc <texto>` | Cambia la descripción del grupo | Owner o co-owner |
| `.admin` | Te autoasciendes a admin | Owner o co-owner |
| `.co <número>` | Da permisos de co-owner a ese número | Solo owner |
| `.co del <número>` | Quita permisos de co-owner | Solo owner |
| `.co list` | Muestra los co-owners actuales | Owner o co-owner |
| `.menu` | Muestra la lista de comandos | — |

Todos los comandos que necesitan que el bot sea admin del grupo (`.agg`, `.kick`, `.setpp`, `.setname`, `.setdesc`, `.admin`) **intentan la acción directamente** y muestran el error real que devuelve WhatsApp si el bot no tiene permisos, en vez de bloquear antes por una detección propia (que podía fallar con el sistema `@lid` nuevo de WhatsApp).

## Co-owners

Los co-owners se guardan en `data/coowners.json` (se crea solo, no se sube a GitHub por el `.gitignore`) y sobreviven a reinicios del bot. Solo el owner definido en `config.js` puede agregar o quitar co-owners — un co-owner no puede agregar a otro.

## Funciones automáticas

- **Aviso de admin**: cada vez que alguien da o quita admin dentro de un grupo, el bot manda un mensaje etiquetando (mencionando) tanto a quien lo dio/quitó como a quien lo recibió.
- **Auto-admin al owner**: si `AUTO_ADMIN_OWNER` está en `true` y el bot ya es admin del grupo, cuando el owner se une, el bot lo asciende automáticamente.

## Estructura del proyecto

```
wa-bot/
├── index.js                 # conexión + router de comandos
├── config.js                # owner, prefijo, ajustes
├── lib/
│   └── utils.js             # helpers (JIDs, permisos, etc.)
└── commands/
    ├── join.js
    ├── sticker.js
    ├── participants.js      # .agg / .kick
    ├── groupSettings.js     # .setpp / .setname / .setdesc
    └── selfAdmin.js         # .admin
```

## Notas sobre `.agg`

WhatsApp a veces bloquea agregar directamente a alguien por su configuración de privacidad ("quién puede agregarme a grupos"). En ese caso, la API devuelve un status `403` y en su lugar se le manda una invitación privada al número — el bot lo informa en el chat.

## Ampliar el bot

Cada comando es un archivo independiente en `commands/`. Para agregar uno nuevo:
1. Crea `commands/tuComando.js` exportando una función `async (sock, msg, args, ...) => {}`.
2. Impórtalo en `index.js` y agrega un `case` en el switch del router.
