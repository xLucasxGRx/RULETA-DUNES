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
const GAME_CONFIG = {
  // Nombre de la marca o perfumería
  brandName: 'DUNES PARFUMS',
  brandTagline: 'Perfumes Originales Sellados',

  // URL pública de respaldo para pruebas locales (se usa automáticamente window.location.href en producción)
  // Al desplegar en GitHub Pages, el código QR toma automáticamente la URL pública real.
  publicUrlFallback: 'https://lucas.github.io/ruleta-dunes/',

  // Duración de la animación de revelación en milisegundos (1.3s = dentro del rango de 1 a 2 segundos)
  revealDurationMs: 1300,

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
      badge: '3 ML • MISTERIO',
      title: '¡FELICIDADES!',
      subtitle: 'Ganaste un decant de 3 ml',
      description: 'Fragancia sorpresa seleccionada por nuestra perfumería.',
      weight: 70, // 70% de probabilidad
      icon: 'decant'
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
      icon: 'decant'
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
      icon: 'ticket'
    }
  ]
};

/* --------------------------------------------------------------------------
   2. ESTADO DE LA APLICACIÓN
   -------------------------------------------------------------------------- */
const AppState = {
  // Estados posibles: 'IDLE' | 'ANIMATING' | 'REVEALED'
  status: 'IDLE',
  selectedBottleIndex: null,
  currentPrize: null,
  lastFocusedElement: null
};

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
   6. CONTROLADOR DE INTERACCIÓN CON LOS FRASCOS
   -------------------------------------------------------------------------- */

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
}

/**
 * Gestiona la selección de un frasco
 */
function handleBottleSelect(selectedBottle, allBottles, gameArea, resultSection, bottlesHelper, instructionText) {
  // 1. Bloqueo estricto: Si ya se está jugando o ya se reveló, evitar pulsaciones repetidas
  if (AppState.status !== 'IDLE') {
    return;
  }

  // Cambiar estado a ANIMANDO
  AppState.status = 'ANIMATING';
  AppState.selectedBottleIndex = parseInt(selectedBottle.getAttribute('data-bottle-index'), 10);

  // Respuesta táctil y sonora inmediata
  triggerHaptic([20, 30]);
  playLuxuryChime('select');

  // 2. Inmediatamente deshabilitar todos los frascos para evitar clics concurrentes
  allBottles.forEach((b) => {
    b.disabled = true;
    b.setAttribute('aria-disabled', 'true');
  });

  // Indicar que la zona de juego está en animación
  if (gameArea) {
    gameArea.classList.add('is-animating');
  }

  // 3. Resaltar el frasco seleccionado y atenuar los otros dos
  allBottles.forEach((b) => {
    if (b === selectedBottle) {
      b.classList.add('is-selected');
    } else {
      b.classList.add('is-dimmed');
    }
  });

  // Ocultar la indicación auxiliar
  if (bottlesHelper) {
    bottlesHelper.classList.add('is-hidden');
  }

  // Actualizar instrucción durante la revelación
  if (instructionText) {
    instructionText.textContent = 'Revelando tu aroma de la suerte...';
  }

  // 4. Seleccionar el premio según las probabilidades configuradas
  AppState.currentPrize = selectWeightedPrize(GAME_CONFIG.prizes);

  // 5. Esperar la duración de la animación (entre 1 y 2 segundos) y mostrar el resultado
  setTimeout(() => {
    revealPrize(AppState.currentPrize, resultSection, instructionText);
  }, GAME_CONFIG.revealDurationMs);
}

/**
 * Muestra la pantalla de resultados con el premio obtenido
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
  const resultBadge = document.getElementById('resultBadge');
  const resultCongrats = document.getElementById('resultCongrats');
  const resultPrizeName = document.getElementById('resultPrizeName');
  const resultDescription = document.getElementById('resultDescription');

  // Inyectar datos del premio
  if (resultCard) {
    resultCard.setAttribute('data-prize-type', prize.type);
  }

  if (resultPrizeEmblem) {
    resultPrizeEmblem.innerHTML = getPrizeSvg(prize.type);
  }

  if (resultBadge) {
    resultBadge.textContent = prize.badge;
  }

  if (resultCongrats) {
    resultCongrats.textContent = prize.title; // "¡FELICIDADES!"
  }

  if (resultPrizeName) {
    resultPrizeName.textContent = prize.subtitle; // "Ganaste un decant de 3 ml", etc.
  }

  if (resultDescription) {
    resultDescription.textContent = prize.description;
  }

  // Mostrar la sección de resultados
  resultSection.hidden = false;

  // Desplazar suavemente a la tarjeta de resultados si está fuera del viewport en pantallas pequeñas
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Foco accesible al botón o tarjeta
  const btnNewGame = document.getElementById('btnNewGame');
  if (btnNewGame) {
    btnNewGame.focus({ preventScroll: true });
  }
}

/**
 * Restablece el juego para una nueva partida con otro cliente
 */
function resetGame(allBottles, gameArea, resultSection, bottlesHelper, instructionText) {
  // Ocultar sección de resultados
  if (resultSection) {
    resultSection.hidden = true;
  }

  // Restablecer área de juego
  if (gameArea) {
    gameArea.classList.remove('is-animating');
  }

  // Restablecer clases y estados de los frascos
  allBottles.forEach((b) => {
    b.disabled = false;
    b.removeAttribute('aria-disabled');
    b.classList.remove('is-selected', 'is-dimmed');
  });

  // Mostrar nuevamente la ayuda inferior
  if (bottlesHelper) {
    bottlesHelper.classList.remove('is-hidden');
  }

  // Restaurar instrucción inicial
  if (instructionText) {
    instructionText.textContent = 'Elige uno de los tres frascos y descubre tu regalo.';
  }

  // Resetear estado
  AppState.status = 'IDLE';
  AppState.selectedBottleIndex = null;
  AppState.currentPrize = null;

  // Devolver foco al primer frasco para usabilidad con teclado
  if (allBottles.length > 0) {
    allBottles[0].focus();
  }

  // Respuesta táctil suave al reiniciar
  triggerHaptic([15]);
}

/* --------------------------------------------------------------------------
   7. MODAL DE CÓDIGO QR Y COMPARTIR ENLACE
   -------------------------------------------------------------------------- */

/**
 * Determina la URL que debe codificarse en el código QR
 */
function getGameUrl() {
  const currentUrl = window.location.href;

  // Si se abre directamente como archivo local (file://) o localhost,
  // usar la URL de GitHub Pages configurada en GAME_CONFIG para que el QR sea escaneable desde otros celulares.
  if (currentUrl.startsWith('file:') || currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) {
    return GAME_CONFIG.publicUrlFallback;
  }

  return currentUrl;
}

/**
 * Inicializa el comportamiento del modal del código QR
 */
function initQrModal() {
  const btnQrTrigger = document.getElementById('btnQrTrigger');
  const qrModal = document.getElementById('qrModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const btnCopyUrl = document.getElementById('btnCopyUrl');
  const qrDisplay = document.getElementById('qrCodeDisplay');
  const qrUrlText = document.getElementById('qrUrlText');
  const toastNotice = document.getElementById('toastNotice');

  if (!btnQrTrigger || !qrModal) return;

  // Abrir modal
  btnQrTrigger.addEventListener('click', () => {
    openQrModal(qrModal, qrDisplay, qrUrlText, btnQrTrigger);
  });

  // Cerrar con botón X
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
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
    if (e.key === 'Escape' && qrModal.classList.contains('is-open')) {
      closeQrModal(qrModal);
    }
  });

  // Copiar URL al portapapeles
  if (btnCopyUrl) {
    btnCopyUrl.addEventListener('click', () => {
      const targetUrl = getGameUrl();
      copyToClipboard(targetUrl, toastNotice);
    });
  }
}

/**
 * Abre el modal y renderiza el código QR mediante la librería local qrcode
 */
function openQrModal(modal, container, urlDisplay, triggerButton) {
  AppState.lastFocusedElement = triggerButton;
  const targetUrl = getGameUrl();

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
        // Genera elemento SVG escalable directamente
        container.innerHTML = qr.createSvgTag({ scalable: true, margin: 1 });
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
   8. ARRANQUE AL CARGAR EL DOM
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initGame();
});
