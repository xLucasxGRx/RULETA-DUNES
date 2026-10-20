/**
 * ==========================================================================
 * EL MISTERIO DEL AROMA — LÓGICA PRINCIPAL (VANILLA JS ES6+)
 * Perfumería Premium: Juego de frascos misteriosos con selección aleatoria ponderada
 * ==========================================================================
 */

'use strict';

/* --------------------------------------------------------------------------
   1. CONFIGURACIÓN CENTRALIZADA DEL JUEGO (FÁCILMENTE EDITABLE)
   -------------------------------------------------------------------------- */
// URL oficial y definitiva del juego publicado en GitHub Pages
const GAME_URL = "https://xlucasxgrx.github.io/RULETA-DUNES/";

const GAME_CONFIG = {
  // Título y subtítulo oficiales de la experiencia
  gameTitle: 'REGALITO DEL TÍO DUNES',
  gameSubtitle: '¡El Tío Dunes tiene una sorpresa para ti!',
  brandName: 'DUNES PARFUMS',
  brandTagline: 'Perfumes Originales Sellados',

  // URL oficial centralizada
  officialUrl: GAME_URL,

  // Duración de la animación de revelación en milisegundos (1.3s = dentro del rango de 1 a 2 segundos)
  revealDurationMs: 1300,

  // Duración del barajado automático en milisegundos (1.9s = dentro del rango de 1.5 a 2.5 segundos)
  shuffleDurationMs: 1900,

  // Activar respuesta háptica en celulares compatibles
  enableHaptics: true,

  // Efecto sonoro sutil sintetizado (Web Audio API nativo, sin archivos de audio externos)
  enableSound: true,

  // LISTA DE PREMIOS Y PROBABILIDADES
  // La suma de 'weight' es 100% (70 + 20 + 10). Modificar estos valores cambia la distribución.
  prizes: [
    {
      id: 'decant_3ml',
      type: 'decant_3ml',
      name: 'Decant de 3 ml',
      badge: '3 ML · SORPRESA',
      title: '¡FELICIDADES!',
      highlightTitle: 'DECANT DE 3 ML',
      subtitle: 'Ganaste un decant de 3 ml',
      description: 'Fragancia sorpresa seleccionada por nuestra perfumería.',
      weight: 70, // 70% de probabilidad
      icon: 'decant'
    },
    {
      id: 'decant_5ml',
      type: 'decant_5ml',
      name: 'Decant de 5 ml',
      badge: '5 ML · ESPECIAL',
      title: '¡FELICIDADES!',
      highlightTitle: 'DECANT DE 5 ML',
      subtitle: 'Ganaste un decant de 5 ml',
      description: 'Una nueva fragancia te espera.',
      weight: 20, // 20% de probabilidad
      icon: 'decant'
    },
    {
      id: 'discount_10',
      type: 'discount_10',
      name: 'S/ 10 de descuento',
      badge: 'S/ 10 · BENEFICIO',
      title: '¡FELICIDADES!',
      highlightTitle: 'S/ 10 DE DESCUENTO',
      subtitle: 'Ganaste S/ 10 de descuento',
      description: 'Para tu próxima compra. Coordina tu beneficio con el vendedor.',
      weight: 10, // 10% de probabilidad
      icon: 'ticket'
    }
  ]
};

/* --------------------------------------------------------------------------
   2. ESTADO DE LA APLICACIÓN
   -------------------------------------------------------------------------- */
const AppState = {
  // Estados posibles: 'INTRO' | 'SHUFFLING' | 'IDLE' | 'OPENING' | 'TRAVELING' | 'REVEALED'
  status: 'INTRO',
  selectedBottleIndex: null,
  currentPrize: null,
  lastFocusedElement: null,
  celebrationAnimId: null,
  activeTimers: []
};

/**
 * Registra un temporizador en el estado para cancelarlo de forma segura al reiniciar
 */
function registerTimer(fn, delay) {
  const id = setTimeout(() => {
    AppState.activeTimers = AppState.activeTimers.filter((t) => t !== id);
    fn();
  }, delay);
  AppState.activeTimers.push(id);
  return id;
}

/**
 * Limpia todos los temporizadores, fuegos artificiales, canvas y partículas activas
 */
function clearAllActiveFx() {
  AppState.activeTimers.forEach((id) => clearTimeout(id));
  AppState.activeTimers = [];

  if (AppState.celebrationAnimId) {
    cancelAnimationFrame(AppState.celebrationAnimId);
    AppState.celebrationAnimId = null;
  }

  const fxLayer = document.getElementById('fxLayer');
  if (fxLayer) {
    fxLayer.innerHTML = '';
  }

  const fireworksLayer = document.getElementById('fireworksLayer');
  if (fireworksLayer) {
    fireworksLayer.innerHTML = '';
  }

  const celebrationCanvas = document.getElementById('celebrationCanvas');
  if (celebrationCanvas) {
    const ctx = celebrationCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, celebrationCanvas.width, celebrationCanvas.height);
    }
  }

  const prizeHighlightBox = document.getElementById('prizeHighlightBox');
  if (prizeHighlightBox) {
    prizeHighlightBox.classList.remove('is-revealed');
  }
}

/* --------------------------------------------------------------------------
   3. GENERADOR DE NÚMEROS ALEATORIOS CRIPTOGRÁFICOS Y SELECCIÓN PONDERADA
   -------------------------------------------------------------------------- */

/**
 * Obtiene un número flotante pseudoaleatorio uniforme en el rango [0, 1),
 * utilizando crypto.getRandomValues cuando esté disponible para máxima equidad.
 */
function getSecureRandom() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const buffer = new Uint32Array(1);
    window.crypto.getRandomValues(buffer);
    // 0xFFFFFFFF + 1 = 2^32 = 4294967296
    return buffer[0] / 4294967296;
  }
  return Math.random();
}

/**
 * Realiza una selección aleatoria ponderada de la lista de premios.
 * No depende de la posición del frasco ni de patrones secuenciales.
 * @param {Array} prizes - Arreglo de objetos de premios con propiedad 'weight'
 * @returns {Object} El premio seleccionado
 */
function selectWeightedPrize(prizes) {
  const totalWeight = prizes.reduce((acc, item) => acc + item.weight, 0);
  let roll = getSecureRandom() * totalWeight;

  for (const prize of prizes) {
    if (roll < prize.weight) {
      return prize;
    }
    roll -= prize.weight;
  }

  // Fallback de seguridad al último premio en caso de redondeo de punto flotante
  return prizes[prizes.length - 1];
}

/* --------------------------------------------------------------------------
   4. EFECTOS MULTIMEDIA: AUDIO SINTETIZADO Y HÁPTICA
   -------------------------------------------------------------------------- */

let audioCtx = null;

/**
 * Sintetiza un acorde o campanada suave de cristal/lujo usando Web Audio API nativo.
 * No requiere cargar ningún archivo mp3 o wav.
 */
function playLuxuryChime(type = 'select') {
  if (!GAME_CONFIG.enableSound) return;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    if (!audioCtx) {
      audioCtx = new AudioContext();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    if (type === 'select') {
      // Tono suave al pulsar el frasco: campanada etérea a 784 Hz (Sol5)
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(783.99, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === 'reveal') {
      // Acorde triunfal sutil al revelar premio: arpegio dorado
      const notes = [659.25, 830.61, 987.77, 1318.51]; // Mi5, Sol#5, Si5, Mi6
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const startTime = now + idx * 0.08;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.07, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.8);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.85);
      });
    }
  } catch (err) {
    // Si el navegador bloquea audio o falla, se ignora de manera silenciosa
  }
}

/**
 * Aplica vibración táctil en teléfonos móviles compatibles
 */
function triggerHaptic(pattern = [25, 35, 20]) {
  if (GAME_CONFIG.enableHaptics && typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignorar si no está permitido
    }
  }
}

/* --------------------------------------------------------------------------
   5. PLANTILLAS SVG DE PREMIOS (3ML, 5ML, S/ 10)
   -------------------------------------------------------------------------- */
function getPrizeSvg(prizeType) {
  if (prizeType === 'discount_10') {
    // Emblema de boleto / medalla de descuento S/ 10
    return `
      <svg class="result-prize-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="24" cy="24" r="21" stroke="#E8D5AC" stroke-width="1.5" stroke-dasharray="2 2"/>
        <circle cx="24" cy="24" r="18" fill="url(#ticketGoldGrad)"/>
        <path d="M15 20C15 17.5 17.5 15 24 15C30.5 15 33 17.5 33 20C33 24 24 25 24 27V29" stroke="#12151C" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="24" cy="33" r="1.5" fill="#12151C"/>
        <defs>
          <linearGradient id="ticketGoldGrad" x1="10" y1="10" x2="38" y2="38" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FFF2D6"/>
            <stop offset="0.5" stop-color="#E8D5AC"/>
            <stop offset="1" stop-color="#C8A66A"/>
          </linearGradient>
        </defs>
      </svg>
    `;
  }

  // Decant 3ml o 5ml (frasco atomizador esbelto de muestra premium)
  const is5ml = prizeType === 'decant_5ml';
  const fillLiquid = is5ml ? '#F3E2C0' : '#E8D5AC';

  return `
    <svg class="result-prize-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <!-- Pulverizador superior -->
      <rect x="21" y="6" width="6" height="5" rx="1" fill="#E8D5AC"/>
      <rect x="22" y="11" width="4" height="4" fill="#C8A66A"/>
      <!-- Tubo decant de vidrio -->
      <rect x="17" y="15" width="14" height="26" rx="3" fill="#1E232F" stroke="#E8D5AC" stroke-width="1.5"/>
      <!-- Líquido de perfume ámbar -->
      <path d="M18.5 24C21 23 27 23 29.5 24V38C29.5 39.5 28.5 40 27 40H21C19.5 40 18.5 39.5 18.5 38V24Z" fill="${fillLiquid}" opacity="0.85"/>
      <!-- Reflejo de cristal -->
      <line x1="20" y1="18" x2="20" y2="38" stroke="#FFFFFF" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
      <!-- Etiqueta 3ml / 5ml -->
      <text x="24" y="32" font-family="'Montserrat', sans-serif" font-size="6.5" font-weight="700" fill="#111318" text-anchor="middle">
        ${is5ml ? '5ml' : '3ml'}
      </text>
    </svg>
  `;
}

/* --------------------------------------------------------------------------
   6. CONTROLADOR DE INTERACCIÓN Y BARAJADO DE FRASCOS
   -------------------------------------------------------------------------- */

/**
 * Ejecuta la animación de barajado automático de los tres frascos.
 * Intercambia posiciones de forma real y visual mediante Web Animations API / CSS transforms,
 * calculando distancias exactas en tiempo de ejecución para adaptarse a cualquier ancho de pantalla.
 * @param {Function} onComplete Callback opcional al finalizar el barajado
 */
function runBottleShuffleAnimation(onComplete) {
  const bottleCards = Array.from(document.querySelectorAll('.bottle-card'));
  const gameArea = document.getElementById('gameArea');
  const instructionText = document.getElementById('instructionText');
  const instructionBox = document.getElementById('instructionBox');

  if (bottleCards.length !== 3) {
    AppState.status = 'IDLE';
    if (typeof onComplete === 'function') onComplete();
    return;
  }

  // Comprobar preferencia de movimiento reducido
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    bottleCards.forEach((b) => {
      b.disabled = false;
      b.removeAttribute('aria-disabled');
      b.classList.remove('is-selected', 'is-dimmed');
    });
    if (instructionText) {
      instructionText.textContent = '¡Elige tu regalito!';
    }
    if (instructionBox) {
      instructionBox.classList.add('is-ready-pulse');
      setTimeout(() => instructionBox.classList.remove('is-ready-pulse'), 1500);
    }
    AppState.status = 'IDLE';
    if (typeof onComplete === 'function') onComplete();
    return;
  }

  AppState.status = 'SHUFFLING';
  if (gameArea) {
    gameArea.classList.add('is-shuffling');
  }

  // 1. Bloquear interacción en todos los frascos durante el barajado
  bottleCards.forEach((b) => {
    b.disabled = true;
    b.setAttribute('aria-disabled', 'true');
    b.classList.remove('is-selected', 'is-dimmed');
  });

  if (instructionText) {
    instructionText.textContent = 'Mezclando los frascos de la suerte...';
  }

  // 2. Calcular distancia horizontal real en píxeles entre columnas adyacentes
  const rect0 = bottleCards[0].getBoundingClientRect();
  const rect1 = bottleCards[1].getBoundingClientRect();
  const d = Math.round(rect1.left - rect0.left);
  const dist = d > 20 ? d : 110;

  playLuxuryChime('select');
  triggerHaptic([15, 20]);

  // Duración configurada (1.9s)
  const duration = GAME_CONFIG.shuffleDurationMs || 1900;

  // Keyframes con desplazamientos horizontales, arcos verticales y profundidad (escala/z-index):
  // Frasco 1 (Izquierdo): Se desplaza al centro por arriba (+dist, -12px), luego a la derecha (+2*dist, +6px), y regresa fluido
  const keyframes1 = [
    { transform: 'translate(0px, 0px) scale(1)', zIndex: 1 },
    { transform: 'translate(0px, -4px) scale(1.02)', zIndex: 2, offset: 0.12 },
    { transform: `translate(${dist}px, -12px) scale(1.06)`, zIndex: 5, offset: 0.42 },
    { transform: `translate(${2 * dist}px, 6px) scale(0.95)`, zIndex: 2, offset: 0.72 },
    { transform: 'translate(0px, 0px) scale(1)', zIndex: 1, offset: 1.0 }
  ];

  // Frasco 2 (Centro): Pasa a la izquierda (-dist, +6px), flota y regresa fluido
  const keyframes2 = [
    { transform: 'translate(0px, 0px) scale(1)', zIndex: 1 },
    { transform: 'translate(0px, -4px) scale(1.02)', zIndex: 2, offset: 0.12 },
    { transform: `translate(${-dist}px, 6px) scale(0.95)`, zIndex: 2, offset: 0.42 },
    { transform: `translate(${-dist}px, -4px) scale(1.0)`, zIndex: 3, offset: 0.72 },
    { transform: 'translate(0px, 0px) scale(1)', zIndex: 1, offset: 1.0 }
  ];

  // Frasco 3 (Derecha): Anticipa, luego se desplaza al centro (-dist, -12px) por arriba, y regresa fluido
  const keyframes3 = [
    { transform: 'translate(0px, 0px) scale(1)', zIndex: 1 },
    { transform: 'translate(0px, -4px) scale(1.02)', zIndex: 2, offset: 0.12 },
    { transform: 'translate(0px, 2px) scale(1.0)', zIndex: 3, offset: 0.42 },
    { transform: `translate(${-dist}px, -12px) scale(1.06)`, zIndex: 5, offset: 0.72 },
    { transform: 'translate(0px, 0px) scale(1)', zIndex: 1, offset: 1.0 }
  ];

  const timing = {
    duration: duration,
    easing: 'cubic-bezier(0.28, 0.84, 0.42, 1)',
    fill: 'none'
  };

  let finished = false;
  function finishShuffle() {
    if (finished) return;
    finished = true;

    bottleCards.forEach((b) => {
      b.style.transform = '';
      b.style.zIndex = '';
      b.classList.remove('is-shuffling-active');
    });

    if (gameArea) {
      gameArea.classList.remove('is-shuffling');
    }

    // Actualizar instrucción al finalizar barajado
    if (instructionText) {
      instructionText.textContent = '¡Elige tu regalito!';
    }
    if (instructionBox) {
      instructionBox.classList.add('is-ready-pulse');
      setTimeout(() => instructionBox.classList.remove('is-ready-pulse'), 1800);
    }

    triggerHaptic([25]);

    // Habilitar todos los frascos para que el cliente pueda jugar
    bottleCards.forEach((b) => {
      b.disabled = false;
      b.removeAttribute('aria-disabled');
    });

    AppState.status = 'IDLE';

    if (typeof onComplete === 'function') {
      onComplete();
    }
  }

  try {
    if (typeof bottleCards[0].animate === 'function') {
      bottleCards.forEach(b => b.classList.add('is-shuffling-active'));
      const a1 = bottleCards[0].animate(keyframes1, timing);
      const a2 = bottleCards[1].animate(keyframes2, timing);
      const a3 = bottleCards[2].animate(keyframes3, timing);

      Promise.all([a1.finished, a2.finished, a3.finished])
        .then(finishShuffle)
        .catch(finishShuffle);

      // Respaldo de tiempo de seguridad
      setTimeout(finishShuffle, duration + 100);
    } else {
      setTimeout(finishShuffle, duration);
    }
  } catch (err) {
    setTimeout(finishShuffle, duration);
  }
}

/**
 * Inicializa los eventos de interacción de la página
 */
function initGame() {
  const bottleCards = document.querySelectorAll('.bottle-card');
  const gameArea = document.getElementById('gameArea');
  const resultSection = document.getElementById('resultSection');
  const btnNewGame = document.getElementById('btnNewGame');
  const bottlesHelper = document.getElementById('bottlesHelper');
  const instructionText = document.getElementById('instructionText');
  const introSplash = document.getElementById('introSplash');

  // Inicializar estado en INTRO y frascos deshabilitados
  AppState.status = 'INTRO';
  bottleCards.forEach((b) => {
    b.disabled = true;
    b.setAttribute('aria-disabled', 'true');
  });

  // Asignar eventos de clic a cada uno de los 3 frascos
  bottleCards.forEach((bottle) => {
    bottle.addEventListener('click', (e) => {
      e.preventDefault();
      handleBottleSelect(bottle, bottleCards, gameArea, resultSection, bottlesHelper, instructionText);
    });

    // Soporte para teclado (Enter o Espacio)
    bottle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        bottle.click();
      }
    });
  });

  // Botón "Nueva partida"
  if (btnNewGame) {
    btnNewGame.addEventListener('click', (e) => {
      e.preventDefault();
      resetGame(bottleCards, gameArea, resultSection, bottlesHelper, instructionText);
    });
  }

  // Inicializar Modal QR
  initQrModal();

  // Inicializar Modal de Información de Premios
  initInfoModal();

  // Secuencia inicial: Presentación animada (aprox. 1 segundo) seguida del barajado automático
  if (introSplash) {
    setTimeout(() => {
      introSplash.classList.add('is-hidden');
      setTimeout(() => {
        introSplash.hidden = true;
        // Iniciar barajado de los tres frascos
        runBottleShuffleAnimation();
      }, 450);
    }, 1050);
  } else {
    runBottleShuffleAnimation();
  }
}

/**
 * Emite chispas doradas desde el cuello del frasco seleccionado
 */
function emitNeckSparks(selectedBottle) {
  const fxLayer = document.getElementById('fxLayer');
  if (!fxLayer || !selectedBottle) return;

  const rect = selectedBottle.getBoundingClientRect();
  const originX = Math.round(rect.left + rect.width * 0.5);
  const originY = Math.round(rect.top + rect.height * 0.22);

  const sparkCount = 7;
  for (let i = 0; i < sparkCount; i++) {
    const spark = document.createElement('div');
    spark.className = 'neck-spark-particle';
    const angle = ((Math.PI * 0.8) / (sparkCount - 1)) * i - (Math.PI * 0.9);
    const distance = 24 + Math.random() * 26;
    const dx = Math.round(Math.cos(angle) * distance);
    const dy = Math.round(Math.sin(angle) * distance);
    const size = 3 + Math.random() * 3.5;

    spark.style.left = `${originX}px`;
    spark.style.top = `${originY}px`;
    spark.style.width = `${size}px`;
    spark.style.height = `${size}px`;
    spark.style.setProperty('--dx', `${dx}px`);
    spark.style.setProperty('--dy', `${dy}px`);

    fxLayer.appendChild(spark);
    setTimeout(() => {
      if (spark.parentNode) spark.parentNode.removeChild(spark);
    }, 680);
  }
}

/**
 * Lanza la esfera luminosa viajera desde el frasco hacia el centro de la pantalla
 */
function launchTravelingOrb(selectedBottle, onArrival) {
  const fxLayer = document.getElementById('fxLayer');
  if (!fxLayer || !selectedBottle) {
    if (typeof onArrival === 'function') onArrival();
    return;
  }

  AppState.status = 'TRAVELING';

  // 1. Origen dinámico: Cuello del frasco seleccionado en coordenadas del viewport
  const rect = selectedBottle.getBoundingClientRect();
  const startX = Math.round(rect.left + rect.width * 0.5);
  const startY = Math.round(rect.top + rect.height * 0.22);

  // 2. Destino dinámico: Centro del viewport donde aterriza el modal
  const targetX = Math.round(window.innerWidth * 0.5);
  const targetY = Math.round(window.innerHeight * 0.44);

  // 3. Trayectoria curva suave con arco elevado
  const deltaX = targetX - startX;
  const isLeft = deltaX > 25;
  const isRight = deltaX < -25;
  const midX = Math.round(startX + deltaX * 0.52 + (isLeft ? -18 : (isRight ? 18 : 0)));
  const arcElevation = window.innerWidth < 600 ? 50 : 80;
  const midY = Math.round(Math.min(startY, targetY) - arcElevation);

  // Crear la esfera luminosa
  const orb = document.createElement('div');
  orb.className = 'flying-prize-orb';
  orb.innerHTML = `
    <div class="flying-orb-core"></div>
    <div class="flying-orb-glow"></div>
    <div class="flying-orb-sparkle">✦</div>
  `;
  fxLayer.appendChild(orb);

  // Estela de micropartículas doradas a lo largo de la trayectoria
  let trailStep = 0;
  const trailInterval = setInterval(() => {
    trailStep++;
    const t = trailStep / 6;
    const curX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * targetX;
    const curY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * targetY;

    const trail = document.createElement('div');
    trail.className = 'flying-trail-particle';
    const sz = Math.max(3, 9 - trailStep);
    trail.style.width = `${sz}px`;
    trail.style.height = `${sz}px`;
    trail.style.left = `${Math.round(curX)}px`;
    trail.style.top = `${Math.round(curY)}px`;
    fxLayer.appendChild(trail);

    setTimeout(() => {
      if (trail.parentNode) trail.parentNode.removeChild(trail);
    }, 520);

    if (trailStep >= 6) {
      clearInterval(trailInterval);
    }
  }, 90);

  // Keyframes suaves de la esfera
  const keyframes = [
    { transform: `translate(${startX}px, ${startY}px) scale(0.35)`, opacity: 0 },
    { transform: `translate(${startX}px, ${startY - 18}px) scale(1.15)`, opacity: 1, offset: 0.18 },
    { transform: `translate(${midX}px, ${midY}px) scale(1.35)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${targetX}px, ${targetY}px) scale(1.6)`, opacity: 1, offset: 0.90 },
    { transform: `translate(${targetX}px, ${targetY}px) scale(2.8)`, opacity: 0, offset: 1.0 }
  ];

  const timing = {
    duration: 580,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    fill: 'forwards'
  };

  let finished = false;
  function handleArrival() {
    if (finished) return;
    finished = true;
    clearInterval(trailInterval);
    if (orb.parentNode) orb.parentNode.removeChild(orb);

    // Destello de llegada en el centro
    const flash = document.createElement('div');
    flash.className = 'arrival-flash';
    flash.style.left = `${targetX}px`;
    flash.style.top = `${targetY}px`;
    fxLayer.appendChild(flash);
    setTimeout(() => {
      if (flash.parentNode) flash.parentNode.removeChild(flash);
    }, 500);

    if (typeof onArrival === 'function') {
      onArrival();
    }
  }

  try {
    if (typeof orb.animate === 'function') {
      const anim = orb.animate(keyframes, timing);
      anim.finished.then(handleArrival).catch(handleArrival);
      registerTimer(handleArrival, 650);
    } else {
      registerTimer(handleArrival, 580);
    }
  } catch (err) {
    registerTimer(handleArrival, 580);
  }
}

/**
 * Dispara una explosión individual de fuegos artificiales con onda, destello y partículas
 */
function createFireworkBurst(layer, originX, originY, isSpecial) {
  if (!layer) return;

  // 1. Onda expansiva dorada
  const ring = document.createElement('div');
  ring.className = 'firework-ring';
  ring.style.left = `${originX}px`;
  ring.style.top = `${originY}px`;
  layer.appendChild(ring);
  setTimeout(() => {
    if (ring.parentNode) ring.parentNode.removeChild(ring);
  }, 750);

  // 2. Destello nuclear central
  const flash = document.createElement('div');
  flash.className = 'firework-flash';
  flash.style.left = `${originX}px`;
  flash.style.top = `${originY}px`;
  layer.appendChild(flash);
  setTimeout(() => {
    if (flash.parentNode) flash.parentNode.removeChild(flash);
  }, 450);

  // 3. Chispas radiales que salen a gran velocidad y caen suavemente con gravedad
  const particleCount = isSpecial ? 22 : 18;
  const colors = isSpecial
    ? ['#FFFFFF', '#FFF5E0', '#F6E09A', '#FFE8A3', '#D4A44C']
    : ['#FFFFFF', '#FFF8E7', '#F6E09A', '#E8D5AC', '#C8A66A'];

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('span');
    particle.className = 'firework-spark';
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.35;
    const distance = 35 + Math.random() * (isSpecial ? 48 : 40);
    const dx = Math.round(Math.cos(angle) * distance);
    const dy = Math.round(Math.sin(angle) * distance);
    const color = colors[i % colors.length];
    const size = 3.5 + Math.random() * 3.5;
    const dur = 0.85 + Math.random() * 0.45;

    particle.style.left = `${originX}px`;
    particle.style.top = `${originY}px`;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.backgroundColor = color;
    particle.style.boxShadow = `0 0 10px ${color}, 0 0 18px rgba(246, 224, 154, 0.85)`;
    particle.style.setProperty('--dx', `${dx}px`);
    particle.style.setProperty('--dy', `${dy}px`);
    particle.style.animationDuration = `${dur}s`;

    layer.appendChild(particle);
    setTimeout(() => {
      if (particle.parentNode) particle.parentNode.removeChild(particle);
    }, dur * 1000 + 50);
  }
}

/**
 * Lanza la celebración con 3 explosiones de fuegos artificiales alrededor del recuadro
 */
function launchFireworksCelebration(prizeType) {
  const layer = document.getElementById('fireworksLayer');
  if (!layer) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  layer.innerHTML = '';

  const prizeBox = document.getElementById('prizeHighlightBox');
  if (!prizeBox) return;

  const rect = prizeBox.getBoundingClientRect();
  const isSpecial = prizeType === 'discount_10';

  // Coordenadas exactas alrededor del recuadro destacado
  const leftX = Math.round(rect.left + 24);
  const leftY = Math.round(rect.top + 8);
  const rightX = Math.round(rect.right - 24);
  const rightY = Math.round(rect.top + 8);
  const centerX = Math.round(rect.left + rect.width * 0.5);
  const centerY = Math.round(rect.top - 28);

  // Explosión 1: Superior izquierdo del recuadro
  registerTimer(() => {
    createFireworkBurst(layer, leftX, leftY, isSpecial);
  }, 60);

  // Explosión 2: Superior derecho del recuadro
  registerTimer(() => {
    createFireworkBurst(layer, rightX, rightY, isSpecial);
  }, 220);

  // Explosión 3: Superior central arriba del recuadro
  registerTimer(() => {
    createFireworkBurst(layer, centerX, centerY, isSpecial);
  }, 380);
}

/**
 * Gestiona la selección de un frasco y orquesta la secuencia cinematográfica
 */
function handleBottleSelect(selectedBottle, allBottles, gameArea, resultSection, bottlesHelper, instructionText) {
  // 1. Bloqueo estricto: Si ya se está jugando, abriendo o ya se reveló, evitar pulsaciones repetidas
  if (AppState.status !== 'IDLE') {
    return;
  }

  // Cambiar estado a OPENING
  AppState.status = 'OPENING';
  AppState.selectedBottleIndex = parseInt(selectedBottle.getAttribute('data-bottle-index'), 10);

  // Respuesta táctil y sonora inmediata
  triggerHaptic([20, 30]);
  playLuxuryChime('select');

  // 2. Inmediatamente deshabilitar todos los frascos para impedir selecciones simultáneas
  allBottles.forEach((b) => {
    b.disabled = true;
    b.setAttribute('aria-disabled', 'true');
  });

  // Indicar que la zona de juego está en animación
  if (gameArea) {
    gameArea.classList.add('is-animating');
  }

  // 3. Resaltar el frasco seleccionado y atenuar suavemente los otros dos
  allBottles.forEach((b) => {
    if (b === selectedBottle) {
      b.classList.add('is-selected', 'is-opening');
    } else {
      b.classList.add('is-dimmed');
    }
  });

  // Ocultar la indicación auxiliar
  if (bottlesHelper) {
    bottlesHelper.classList.add('is-hidden');
  }

  // Actualizar instrucción durante la apertura
  if (instructionText) {
    instructionText.textContent = '¡Abriendo tu aroma de la suerte!...';
  }

  // 4. Seleccionar el premio según las probabilidades configuradas (una sola vez por partida)
  AppState.currentPrize = selectWeightedPrize(GAME_CONFIG.prizes);

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    registerTimer(() => {
      revealPrize(AppState.currentPrize, resultSection, instructionText);
    }, 350);
    return;
  }

  // 5. Secuencia cinematográfica sincronizada:
  // Etapa 2 y 3: Apertura física de tapa + chispas del cuello (a los 280ms)
  registerTimer(() => {
    emitNeckSparks(selectedBottle);
  }, 280);

  // Etapa 4: La esfera de luz emerge y viaja hacia el centro del viewport (a los 460ms)
  registerTimer(() => {
    launchTravelingOrb(selectedBottle, () => {
      // Etapa 5 y 6: Destello de llegada + revelación sincronizada del modal + fuegos artificiales
      revealPrize(AppState.currentPrize, resultSection, instructionText);
    });
  }, 460);
}

/**
 * Muestra la pantalla de resultados con el premio obtenido y lanza la celebración
 */
function revealPrize(prize, resultSection, instructionText) {
  if (!resultSection || !prize) return;

  AppState.status = 'REVEALED';

  // Sonido de revelación y vibración de éxito
  playLuxuryChime('reveal');
  triggerHaptic([30, 40, 50]);

  // Actualizar instrucción superior
  if (instructionText) {
    instructionText.textContent = '¡Felicidades por tu compra elegible!';
  }

  // Elementos internos de la tarjeta de resultados
  const resultCard = resultSection.querySelector('.result-card');
  const resultPrizeEmblem = document.getElementById('resultPrizeEmblem');
  const resultCongrats = document.getElementById('resultCongrats');
  const prizeHighlightBox = document.getElementById('prizeHighlightBox');
  const prizeHighlightBadge = document.getElementById('prizeHighlightBadge');
  const prizeTag = document.getElementById('prizeTag');
  const prizeTitlePrefix = document.getElementById('prizeTitlePrefix');
  const prizeTitleMain = document.getElementById('prizeTitleMain');
  const resultDescription = document.getElementById('resultDescription');

  // Inyectar datos del premio
  if (resultCard) {
    resultCard.setAttribute('data-prize-type', prize.type);
  }

  if (resultPrizeEmblem) {
    resultPrizeEmblem.innerHTML = getPrizeSvg(prize.type);
  }

  if (resultCongrats) {
    resultCongrats.textContent = prize.title; // "¡FELICIDADES!"
  }

  if (prizeTag) {
    prizeTag.textContent = '✦ TU PREMIO ✦';
  }

  // Configuración del Gran Recuadro Central según FASE 2
  if (prizeHighlightBox) {
    prizeHighlightBox.setAttribute('data-prize', prize.type);

    if (prize.type === 'decant_3ml') {
      if (prizeTitlePrefix) prizeTitlePrefix.textContent = 'DECANT DE';
      if (prizeTitleMain) prizeTitleMain.textContent = '3 ML';
      if (prizeHighlightBadge) prizeHighlightBadge.hidden = true;
    } else if (prize.type === 'decant_5ml') {
      if (prizeTitlePrefix) prizeTitlePrefix.textContent = 'DECANT DE';
      if (prizeTitleMain) prizeTitleMain.textContent = '5 ML';
      if (prizeHighlightBadge) prizeHighlightBadge.hidden = true;
    } else if (prize.type === 'discount_10') {
      if (prizeTitlePrefix) prizeTitlePrefix.textContent = 'S/ 10';
      if (prizeTitleMain) prizeTitleMain.textContent = 'DE DESCUENTO';
      if (prizeHighlightBadge) prizeHighlightBadge.hidden = false;
    }

    // Efecto 1 y 2: Entrada luminosa y barrido de luz diagonal único
    prizeHighlightBox.classList.remove('is-revealed');
    void prizeHighlightBox.offsetWidth; // Forzar reflow para reiniciar animación
    prizeHighlightBox.classList.add('is-revealed');
  }

  if (resultDescription) {
    resultDescription.textContent = prize.description;
  }

  // Cerrar modales que estuvieran abiertos para evitar superposiciones
  closeInfoModal();
  const qrModal = document.getElementById('qrModal');
  if (qrModal && !qrModal.hidden) {
    closeQrModal(qrModal);
  }

  // Mostrar la sección de resultados (modal centrado superpuesto)
  resultSection.hidden = false;

  // FASE 3: Disparar fuegos artificiales reales y notorios en viewport z-index 250
  launchFireworksCelebration(prize.type);

  // Foco accesible al botón de nueva partida dentro del modal
  const btnNewGame = document.getElementById('btnNewGame');
  if (btnNewGame) {
    btnNewGame.focus({ preventScroll: true });
  }
}

/**
 * Restablece el juego para una nueva partida con otro cliente
 */
function resetGame(allBottles, gameArea, resultSection, bottlesHelper, instructionText) {
  // Evitar restablecer si el juego está actualmente en barajado, apertura o vuelo de la esfera
  if (AppState.status === 'SHUFFLING' || AppState.status === 'OPENING' || AppState.status === 'TRAVELING') {
    return;
  }

  // Limpiar todos los efectos visuales, temporizadores y partículas activas
  clearAllActiveFx();

  // Ocultar sección de resultados
  if (resultSection) {
    resultSection.hidden = true;
  }

  // Restablecer área de juego
  if (gameArea) {
    gameArea.classList.remove('is-animating');
  }

  // Restablecer clases y tapones de los frascos
  allBottles.forEach((b) => {
    b.classList.remove('is-selected', 'is-dimmed', 'is-opening');
    const cap = b.querySelector('.bottle-cap-group');
    if (cap) {
      cap.style.transform = '';
      cap.style.filter = '';
    }
  });

  // Mostrar nuevamente la ayuda inferior
  if (bottlesHelper) {
    bottlesHelper.classList.remove('is-hidden');
  }

  // Resetear variables de premio
  AppState.selectedBottleIndex = null;
  AppState.currentPrize = null;

  // Ejecutar nuevamente la animación de barajado automático para la nueva partida
  runBottleShuffleAnimation(() => {
    if (allBottles.length > 0) {
      allBottles[0].focus();
    }
  });
}

/* --------------------------------------------------------------------------
   7. MODAL DE CÓDIGO QR Y COMPARTIR ENLACE
   -------------------------------------------------------------------------- */

/**
 * Determina la URL que debe codificarse en el código QR y compartirse.
 * Siempre retorna la URL oficial definitiva de GitHub Pages.
 */
function getGameUrl() {
  return GAME_URL;
}

/**
 * Inicializa el comportamiento del modal del código QR
 */
function initQrModal() {
  const btnQrTrigger = document.getElementById('btnQrTrigger');
  const qrModal = document.getElementById('qrModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const btnModalClose = document.getElementById('btnModalClose');
  const btnCopyUrl = document.getElementById('btnCopyUrl');
  const qrDisplay = document.getElementById('qrCodeDisplay');
  const qrUrlText = document.getElementById('qrUrlText');
  const toastNotice = document.getElementById('toastNotice');

  if (!btnQrTrigger || !qrModal) return;

  // Abrir modal
  btnQrTrigger.addEventListener('click', () => {
    openQrModal(qrModal, qrDisplay, qrUrlText, btnQrTrigger);
  });

  // Cerrar con botón X superior
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      closeQrModal(qrModal);
    });
  }

  // Cerrar con botón de texto inferior "Cerrar"
  if (btnModalClose) {
    btnModalClose.addEventListener('click', () => {
      closeQrModal(qrModal);
    });
  }

  // Cerrar al hacer clic en el fondo oscuro exterior
  qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) {
      closeQrModal(qrModal);
    }
  });

  // Cerrar con tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (qrModal && qrModal.classList.contains('is-open')) {
        closeQrModal(qrModal);
      }
      closeInfoModal();
    }
  });

  // Copiar URL al portapapeles (utiliza siempre GAME_URL oficial)
  if (btnCopyUrl) {
    btnCopyUrl.addEventListener('click', () => {
      copyToClipboard(GAME_URL, toastNotice);
    });
  }
}

/**
 * Abre el modal y renderiza el código QR mediante la librería local qrcode
 */
function openQrModal(modal, container, urlDisplay, triggerButton) {
  // Cerrar modal informativo si estuviera abierto
  closeInfoModal();

  AppState.lastFocusedElement = triggerButton;
  const targetUrl = GAME_URL;

  // Mostrar URL en texto plano
  if (urlDisplay) {
    urlDisplay.textContent = targetUrl;
  }

  // Generar código QR utilizando qrcode-generator local
  if (container) {
    try {
      if (typeof window.qrcode === 'function') {
        // Tipo 0 (autodetección de versión), corrección de error 'M' (15%)
        const qr = window.qrcode(0, 'M');
        qr.addData(targetUrl);
        qr.make();
        // Genera elemento SVG escalable con margen blanco de protección para lectura inmediata de cámara
        container.innerHTML = qr.createSvgTag({ scalable: true, margin: 2 });
      } else {
        container.innerHTML = `<p style="font-size:0.8rem;color:#b8b4ae;">${targetUrl}</p>`;
      }
    } catch (err) {
      container.innerHTML = `<p style="font-size:0.8rem;color:#b8b4ae;">${targetUrl}</p>`;
    }
  }

  modal.hidden = false;
  // Forzar reflujo para activar animación CSS
  void modal.offsetWidth;
  modal.classList.add('is-open');

  // Foco accesible al botón de cerrar
  const closeBtn = document.getElementById('modalCloseBtn');
  if (closeBtn) {
    closeBtn.focus();
  }
}

/**
 * Cierra el modal y restablece el foco
 */
function closeQrModal(modal) {
  modal.classList.remove('is-open');
  setTimeout(() => {
    modal.hidden = true;
    if (AppState.lastFocusedElement) {
      AppState.lastFocusedElement.focus();
    }
  }, 250);
}

/**
 * Copia texto al portapapeles con fallback seguro y muestra notificación toast
 */
function copyToClipboard(text, toast) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(showToast).catch(fallbackCopy);
  } else {
    fallbackCopy();
  }

  function fallbackCopy() {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast();
    } catch (err) {
      showToast('No se pudo copiar automáticamente');
    }
  }

  function showToast(customMsg) {
    if (!toast) return;
    if (customMsg) {
      toast.querySelector('.toast-text').textContent = customMsg;
    } else {
      toast.querySelector('.toast-text').textContent = '¡Enlace copiado al portapapeles!';
    }
    toast.classList.add('is-visible');
    triggerHaptic([15, 20]);
    setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 2400);
  }
}

/* --------------------------------------------------------------------------
   7.5 MODAL DE INFORMACIÓN DE PREMIOS Y PROBABILIDADES
   -------------------------------------------------------------------------- */

/**
 * Inicializa los eventos del modal informativo de premios
 */
function initInfoModal() {
  const btnInfoTrigger = document.getElementById('btnInfoTrigger');
  const infoModal = document.getElementById('infoModal');
  const infoModalCloseBtn = document.getElementById('infoModalCloseBtn');
  const btnInfoModalClose = document.getElementById('btnInfoModalClose');

  if (!btnInfoTrigger || !infoModal) return;

  btnInfoTrigger.addEventListener('click', () => {
    openInfoModal();
  });

  if (infoModalCloseBtn) {
    infoModalCloseBtn.addEventListener('click', () => {
      closeInfoModal();
    });
  }

  if (btnInfoModalClose) {
    btnInfoModalClose.addEventListener('click', () => {
      closeInfoModal();
    });
  }

  infoModal.addEventListener('click', (e) => {
    if (e.target === infoModal) {
      closeInfoModal();
    }
  });
}

/**
 * Abre el modal informativo de premios y probabilidades
 */
function openInfoModal() {
  const infoModal = document.getElementById('infoModal');
  const btnInfoTrigger = document.getElementById('btnInfoTrigger');
  const qrModal = document.getElementById('qrModal');

  if (!infoModal) return;

  // Cerrar modal QR si estuviera abierto para evitar colisión
  if (qrModal && !qrModal.hidden) {
    closeQrModal(qrModal);
  }

  AppState.lastFocusedElement = btnInfoTrigger;

  infoModal.hidden = false;
  void infoModal.offsetWidth;
  infoModal.classList.add('is-open');

  const closeBtn = document.getElementById('infoModalCloseBtn');
  if (closeBtn) {
    closeBtn.focus();
  }
}

/**
 * Cierra el modal informativo y restablece el foco accesible
 */
function closeInfoModal() {
  const infoModal = document.getElementById('infoModal');
  if (!infoModal || infoModal.hidden) return;

  infoModal.classList.remove('is-open');
  setTimeout(() => {
    infoModal.hidden = true;
    const btnInfoTrigger = document.getElementById('btnInfoTrigger');
    if (btnInfoTrigger && AppState.lastFocusedElement === btnInfoTrigger) {
      btnInfoTrigger.focus();
    }
  }, 220);
}

/* --------------------------------------------------------------------------
   8. ARRANQUE AL CARGAR EL DOM
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initGame();
});
