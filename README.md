# 🕯️ Calculadora de Velas — InsumoVela

App web (PWA) que calcula automáticamente cuánta cera, endurecedor y esencia necesitás para fabricar velas, qué tenés que comprar, cuánto te cuesta producirlas y a qué precio conviene venderlas.

Pensada para alguien que **nunca fabricó una vela**: elegís opciones tocando la pantalla, la app hace todas las cuentas.

## 📁 Estructura

```
calculadora-velas/
├── index.html          → toda la estructura de pantallas
├── css/style.css        → estilos (paleta InsumoVela)
├── js/app.js             → lógica y cálculos
├── manifest.json         → configuración PWA
├── sw.js                 → service worker (funciona offline)
└── icons/                → íconos para instalar en el celular
```

## 🚀 Cómo subirlo a GitHub Pages

### 1. Crear el repositorio
En GitHub, creá un repositorio nuevo (por ejemplo `calculadora-velas`). Puede ser público.

### 2. Subir los archivos
Desde tu computadora, dentro de esta carpeta:

```bash
git init
git add .
git commit -m "Primera versión de la Calculadora de Velas"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/calculadora-velas.git
git push -u origin main
```

(Reemplazá `TU-USUARIO` por tu usuario de GitHub.)

**Alternativa sin usar la terminal:** entrá al repositorio en GitHub → botón **"Add file" → "Upload files"** → arrastrá todos los archivos y carpetas de esta carpeta → **Commit changes**.

### 3. Activar GitHub Pages
1. En tu repositorio, andá a **Settings → Pages**.
2. En "Source", elegí la rama `main` y la carpeta `/ (root)`.
3. Guardá. GitHub te va a dar un link parecido a:
   `https://TU-USUARIO.github.io/calculadora-velas/`
4. Esperá 1-2 minutos y entrá al link.

### 4. Instalarla en el celular (como app)
- **Android (Chrome):** abrí el link → menú (⋮) → **"Instalar app"** o **"Agregar a pantalla de inicio"**.
- **iPhone (Safari):** abrí el link → botón de compartir (□↑) → **"Agregar a pantalla de inicio"**.

Una vez instalada, funciona como una app normal (ícono propio, pantalla completa, y sigue funcionando aunque no tengas señal, gracias al service worker).

## ✏️ Editar precios

Los precios de cera, endurecedor, esencia, frascos y tapas se pueden editar desde adentro de la app tocando el ícono de ⚙️ arriba a la derecha, o el link "Editar precios" en la pantalla de costo. No hace falta tocar el código para actualizarlos.

Si querés cambiar los precios **por defecto** (los que aparecen la primera vez), están centralizados en `js/app.js`, dentro del objeto `CONFIG.precios` al principio del archivo.

## 🎨 Paleta de diseño

| Color | Hex | Uso |
|---|---|---|
| Pizarra Profundo | `#2B3A42` | textos, header, acentos oscuros |
| Oro Champaña | `#C8A874` | detalles, progreso |
| Verde Oliva | `#78805C` | endurecedor vegetal, packaging |
| Terracota | `#BC6547` | acciones principales, endurecedor animal |
| Crema | `#F7F3EA` | fondo general |

Tipografías: **Fraunces** (títulos) + **Montserrat** (texto e interfaz), cargadas desde Google Fonts.

## 🧮 Lógica de cálculo (resumen)

- Peso total de producción = cantidad de velas × peso de cada vela.
- La cera se calcula de forma que **cera + endurecedor + esencia = peso total**, usando las proporciones:
  - Endurecedor animal: 10% de la cera
  - Endurecedor vegetal: 6% de la cera
  - Esencia: 6% de la cera (si se eligió agregar)
- Las cantidades a comprar se redondean siempre **hacia arriba** según la presentación de cada producto.
- El precio de venta se calcula como un **recargo** sobre el costo unitario (30%, 50% o 100%).

## 🔜 No incluido en esta versión (a propósito)

Login, base de datos, historial, proveedores, comparador de precios, mano de obra, gastos indirectos. Se puede agregar en una futura versión sin romper esta base.
