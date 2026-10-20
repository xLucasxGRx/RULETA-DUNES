# REGALITO DEL TÍO DUNES ✦ DUNES PARFUMS
### Minijuego Web Premium para Clientes de Perfumería

Experiencia web interactiva *Mobile-First*, elegante y minimalista desarrollada para **DUNES PARFUMS**. Permite a los clientes elegibles descubrir un premio sorpresa presencial tras realizar una compra de perfume a precio regular.

---

## 1. Características Principales

- **Diseño Mobile-First de Alta Gama**: Diseñado con estética de perfumería de lujo (negro carbón, dorado champagne `#C8A66A` y blanco marfil `#F5F0E8`).
- **Apertura Física del Frasco y Esfera Viajera**: Al seleccionar un frasco, su tapón se eleva e inclina de forma realista, emanan chispas doradas desde el cuello y una esfera luminosa viaja en trayectoria curva continua hacia el centro de la pantalla hasta transformarse en el premio.
- **Premio Protagónico con Recuadro Destacado**: Tarjeta modal centrada con bloque de premio prominente (*PREMIO OBTENIDO* en mayúsculas de gran tamaño), diferenciación por tipo de fragancia y destaque especial para el beneficio mayor (S/ 10 de descuento).
- **Celebración con Fuegos Artificiales**: Partículas y chispas doradas/champagne sincronizadas con la revelación del premio mediante un canvas ultraligero que se auto-limpia en 1.8 segundos.
- **Barajado Automático de Frascos**: Mezcla fluida y dinámica de los tres frascos misteriosos mediante transformaciones matemáticas adaptadas al ancho de pantalla en tiempo real.
- **Panel Informativo de Premios y Probabilidades**: Botón discreto (?) que despliega un modal con los 3 premios, destacando con aura dorada el premio mayor (S/ 10 de descuento — 10%).
- **Bloqueo Inteligente de Interacciones**: Protección absoluta contra pulsaciones anticipadas o concurrentes durante el barajado, apertura o revelación.
- **Arquitectura 100% Estática**: Sin frameworks pesados, sin bases de datos, sin backend ni cuentas de usuario.
- **Gráficos Vectoriales SVG**: Frascos de perfume misteriosos en SVG con tapón facetado joya animable independientemente y medallón central.
- **Animaciones Fluidas**: Transiciones aceleradas por hardware (`transform`, `opacity`, `filter`) con soporte completo para `prefers-reduced-motion`.
- **Selección Aleatoria Criptográfica Ponderada**: Implementación mediante `crypto.getRandomValues()` cuando esté disponible, garantizando equidad sin patrones predecibles.
- **Efectos Sensoriales Ligeros**: Acordes sonoros discretos sintetizados mediante la **Web Audio API** nativa (sin archivos de audio pesados) y respuesta háptica (`navigator.vibrate`) en celulares compatibles.
- **Acceso mediante Código QR**: Modal integrado con generación de QR vectorial 100% local a la URL oficial `https://xlucasxgrx.github.io/RULETA-DUNES/` y botón para copiar enlace al portapapeles.
- **Listo para GitHub Pages**: Enlaces y recursos relativos para publicación directa en un clic.

---

## 2. Estructura del Proyecto

```text
RULETA-DUNES/
├── assets/
│   ├── logo.png             # Logo oficial horizontal en formato PNG
│   └── logo.webp            # Logo oficial optimizado en formato WebP
├── css/
│   └── styles.css           # Hoja de estilos con variables CSS y responsive design
├── js/
│   ├── app.js               # Lógica del juego, probabilidades y estados
│   └── qrcode.min.js        # Librería local y ligera para generación de QR en SVG
├── logo/                    # Archivos originales de la marca
├── index.html               # Estructura semántica HTML5 y frascos SVG
└── README.md                # Documentación técnica y guía de personalización
```

---

## 3. Cómo Ejecutar Localmente

No se requiere instalar Node.js ni paquetes de dependencias (`npm install`).

### Opción A (La más rápida):
Haz doble clic sobre el archivo `index.html` en tu explorador de archivos para abrirlo en cualquier navegador moderno (Chrome, Edge, Safari, Firefox).

### Opción B (Servidor local de desarrollo):
Si tienes Python o Node.js instalado:

- **Con Python:**
  ```bash
  python -m http.server 8080
  ```
  Abre `http://localhost:8080` en tu navegador.

- **Con Node (npx serve):**
  ```bash
  npx serve .
  ```

---

## 4. Guía de Personalización

### A. Modificar el Nombre de la Perfumería y Enlace Oficial
Abre el archivo [js/app.js](file:///c:/RULETA-DUNES/js/app.js) donde se encuentra centralizada la URL oficial:

```javascript
// URL oficial y definitiva del juego publicado en GitHub Pages
const GAME_URL = "https://xlucasxgrx.github.io/RULETA-DUNES/";

const GAME_CONFIG = {
  // Nombre de la marca o perfumería
  brandName: 'DUNES PARFUMS',
  brandTagline: 'Perfumes Originales Sellados',
  officialUrl: GAME_URL,
  ...
};
```

Para cambiar el logo gráfico o el texto del encabezado, edita la sección `<header class="app-header">` en [index.html](file:///c:/RULETA-DUNES/index.html).

---

### B. Modificar Premios y Probabilidades
En [js/app.js](file:///c:/RULETA-DUNES/js/app.js), localiza el arreglo `prizes`:

```javascript
prizes: [
  {
    id: 'decant_3ml',
    type: 'decant_3ml',
    name: 'Decant de 3 ml',
    badge: '3 ML • MISTERIO',
    title: '¡FELICIDADES!',
    subtitle: 'Ganaste un decant de 3 ml',
    description: 'Fragancia sorpresa seleccionada por nuestra perfumería.',
    weight: 70, // 70% de probabilidad
  },
  {
    id: 'decant_5ml',
    type: 'decant_5ml',
    name: 'Decant de 5 ml',
    badge: '5 ML • ESPECIAL',
    title: '¡FELICIDADES!',
    subtitle: 'Ganaste un decant de 5 ml',
    description: 'Una nueva fragancia te espera.',
    weight: 20, // 20% de probabilidad
  },
  {
    id: 'discount_10',
    type: 'discount_10',
    name: 'S/ 10 de descuento',
    badge: 'BENEFICIO EXCLUSIVO',
    title: '¡FELICIDADES!',
    subtitle: 'Ganaste S/ 10 de descuento',
    description: 'Para tu próxima compra. Coordina tu beneficio con el vendedor.',
    weight: 10, // 10% de probabilidad
  }
]
```

> **Nota:** La suma recomendada de los valores `weight` es 100. El algoritmo normaliza la probabilidad acumulada de forma proporcional. Todos los frascos comparten la misma distribución equitativa.

---

### C. Modificar Colores y Apariencia Visual
En [css/styles.css](file:///c:/RULETA-DUNES/css/styles.css), edita las variables en `:root`:

```css
:root {
  /* Fondo general */
  --bg-primary: #0e1015;
  --bg-surface: #171a21;
  --bg-surface-elevated: #20242e;

  /* Tonos dorados champagne */
  --gold-200: #e8d5ac;  /* Dorado claro */
  --gold-400: #c8a66a;  /* Dorado principal */
  --gold-600: #967439;  /* Dorado oscuro */
  --gold-glow: rgba(200, 166, 106, 0.45);

  /* Textos */
  --text-primary: #f5f0e8;   /* Marfil */
  --text-secondary: #b8b4ae; /* Gris cálido */
}
```

---

## 5. Cómo Publicar en GitHub Pages

1. **Crear repositorio en GitHub**:
   Crea un nuevo repositorio en tu cuenta de GitHub (por ejemplo `ruleta-dunes` o `el-misterio-del-aroma`).

2. **Subir los archivos**:
   Desde tu terminal en la carpeta del proyecto:
   ```bash
   git init
   git add .
   git commit -m "feat: lanzamiento de El Misterio del Aroma"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/NOMBRE-DEL-REPOSITORIO.git
   git push -u origin main
   ```

3. **Activar GitHub Pages**:
   - Ingresa a tu repositorio en GitHub y ve a **Settings** > **Pages**.
   - En **Build and deployment** > **Source**, selecciona `Deploy from a branch`.
   - Selecciona la rama `main` y la carpeta `/ (root)`.
   - Guarda los cambios (**Save**).

En unos minutos, GitHub te proporcionará el enlace público (ej. `https://tu-usuario.github.io/ruleta-dunes/`). Ese mismo enlace se cargará automáticamente en el generador de Código QR del juego.

---

## 6. Consideraciones de Seguridad y Modelo Operativo

> [!IMPORTANT]
> **Supervisión Presencial Requerida:**
> La aplicación web es completamente estática y se ejecuta en el navegador del cliente. Por diseño y según las especificaciones del negocio:
> - **NO verifica compras automáticamente ni se conecta a un sistema de facturación.**
> - **NO registra ganadores en una base de datos central.**
> - **NO impide que una persona vuelva a jugar al recargar la página.**
>
> Por estos motivos, **el propietario o vendedor debe estar presente durante la entrega del pedido** para invitar al cliente a escanear el QR o jugar en su presencia, verificar el resultado en pantalla y hacer la entrega física del decant o el registro manual del descuento.
