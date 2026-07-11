# Wa-Bot

Bot de WhatsApp con moderación de grupo, hecho con [Baileys](https://github.com/WhiskeySockets/Baileys).

## Requisitos

- Node.js 18 o superior
- Git (para que `.re` pueda actualizar el repo con `git pull`)

## Instalación

```bash
git clone <url-del-repo>
cd wa-bot
npm install
```

`npm install` corre automáticamente `scripts/patch-baileys-jimp.js` (postinstall) para dejar bien
configurado el procesamiento de imágenes (`jimp`) que usan comandos como `.sticker` o `.setpp`.

## Configuración

Toda la configuración vive en `config.js` (se puede sobreescribir con variables de entorno):

| Variable | Descripción |
|---|---|
| `OWNER_NUMBER` | Número real del owner (con código de país, sin `+`). |
| `OWNER_LIDS` | LIDs del owner separados por coma (solo si WhatsApp no te reconoce por número). |
| `PAIRING_NUMBER` | Número del propio bot para vincularse por código en vez de QR. Si se deja vacío, se pide por consola. |

Otras opciones dentro de `config.js`:

- `PREFIX`: prefijo de los comandos (por defecto `.`).
- `DEFAULT_PACK_NAME` / `DEFAULT_AUTHOR`: metadata por defecto de los stickers.
- `AUTO_ADMIN_OWNER`: si es `true`, al owner se le da admin automático al entrar a un grupo donde el bot ya es admin.

## Uso

```bash
npm start
```

La primera vez pedirá el número del bot (si no está en `PAIRING_NUMBER`) y entregará un código de
emparejamiento para vincular desde WhatsApp > Dispositivos vinculados > Vincular con número de
teléfono. La sesión se guarda en `auth_info/`, así que las siguientes veces no hace falta
volver a vincular.

## Comandos

### Para cualquier miembro

| Comando | Descripción |
|---|---|
| `.sticker` / `.s <nombre>` | Crea un sticker (respondiendo a una imagen o video). |
| `.mp3 <link YouTube>` | Descarga audio en MP3. |
| `.mp4 <link YouTube>` | Descarga video en MP4. |
| `.tik <link TikTok>` | Descarga video de TikTok. |
| `.ig <link Instagram>` | Descarga video de Instagram. |
| `.sc <link SoundCloud>` | Descarga audio en MP3. |
| `.wa <número>` | Revisa si un número tiene cuenta de WhatsApp. |
| `.ping` / `.p` | Latencia y estado del bot. |
| `.pull p: <pregunta> o1: <op1> o2: <op2>...` | Crea una encuesta y la fija. |
| `.stalker <nombre>` | Reporte gracioso de edad/género/nacionalidad probable. |
| `.owner` | Contacto del owner y co-owners. |
| `.menu` / `.help` | Ve esta lista de comandos (adaptada según tu rol). |

### Para administradores del grupo

| Comando | Descripción |
|---|---|
| `.agg <número>` | Agrega a alguien al grupo. |
| `.kick <número/mención/respuesta>` | Elimina a alguien del grupo. |
| `.setpp` | Cambia la foto del grupo (respondiendo a una imagen). |
| `.setname <texto>` | Cambia el nombre del grupo. |
| `.setdesc <texto>` | Cambia la descripción del grupo. |
| `.promote <número/mención/respuesta>` | Da admin a alguien. |
| `.demote <número/mención/respuesta>` | Quita admin a alguien. |
| `.open` | Abre el grupo (todos pueden escribir). |
| `.close` | Cierra el grupo (solo admins escriben). |

### Solo owner / co-owner

| Comando | Descripción |
|---|---|
| `.join <link>` | Se une a un grupo. |
| `.admin` | Auto-ascenderse a admin. |
| `.vc <id de grupo>` | Vacía TODOS los participantes de ese grupo (sin confirmación, cuidado). Se puede mandar desde cualquier chat pasando el ID (igual que `.block`/`.unblock`, usa `.libgp` para verlos), o directamente dentro del grupo sin ID para vaciar el actual. |
| `.rob` | Quita admin a todos y se lo da al owner (broma). |
| `.co <número>` | Da permisos de co-owner. |
| `.co del <número>` | Quita co-owner. |
| `.co list` | Ve los co-owners actuales. |
| `.re` | Actualiza el repo (`git pull`) y reinicia el bot una sola vez. |
| `.lib @mención` | Saca el LID/JID real de una persona mencionada. |
| `.libgp` | Lista los IDs de los grupos donde está el bot. |
| `.block <id de grupo>` | Bloquea un grupo (el bot deja de responder ahí por completo). |
| `.unblock <id de grupo>` | Desbloquea un grupo. |
| `.debugadmin` | Diagnóstico de admins del grupo (JID/LID del bot y de los admins que ve WhatsApp). |

> Solo el número/LID definido como owner en `config.js` puede usar `.co`, `.re`, `.lib`, `.block`
> y `.unblock`. Los co-owners (agregados con `.co`) pueden usar `.vc` y `.rob` además de todo lo
> de administrador.

## Notas sobre `.re`

Al correr `.re` el bot:

1. Ejecuta `git pull` en la carpeta del proyecto.
2. Te avisa si el `git pull` fue exitoso o falló (si falla, igual reinicia con el código que ya tenía).
3. Lanza un proceso nuevo (ya con el código actualizado) y cierra el actual — la sesión de
   WhatsApp (`auth_info/`) se mantiene, no hay que volver a vincular.

Internamente usa una bandera (`lib/restartFlag.js`) para evitar que el proceso viejo intente
reconectarse por su cuenta justo antes de cerrarse, que era lo que antes causaba que el bot se
reiniciara dos veces.

## Estructura del proyecto

```
.
├── index.js                 # Entrypoint: conexión a WhatsApp y router de comandos
├── config.js                 # Configuración (owners, prefijo, etc.)
├── commands/                 # Un archivo por comando (o grupo de comandos relacionados)
├── lib/
│   ├── utils.js               # Helpers (JIDs, permisos, errores de grupo, etc.)
│   ├── db.js                   # Persistencia simple en disco
│   ├── coowners.js             # Manejo de la lista de co-owners
│   ├── blockedGroups.js        # Manejo de la lista de grupos bloqueados
│   └── restartFlag.js          # Bandera para evitar doble reinicio en .re
├── scripts/
│   └── patch-baileys-jimp.js   # Ajuste post-install para jimp
└── assets/                    # Imágenes usadas por algunos comandos (ej. .vc)
```

## Aviso

Comandos como `.vc` y `.rob` son destructivos e irreversibles (no piden confirmación). Úsalos con
cuidado, especialmente `.vc` desde que acepta un ID de grupo remoto: revisa bien el ID antes de
mandarlo.
