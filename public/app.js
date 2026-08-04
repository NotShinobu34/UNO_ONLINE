/* ═══════════════════════════════════════════════════════════
   UNO Online — Main Application Controller
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────
  let myId = null;
  let roomCode = null;
  let isHost = false;
  let gameState = null;
  let pendingWildCardId = null;   // card id waiting for color pick
  let pendingDrawnWild = false;   // drawn card is wild, waiting for color pick
  let pendingStackWild = false;   // stacked +4 is waiting for color pick
  let drawnCardData = null;       // { card, canPlay }

  // Profile and PFP Crop State
  let customPfp = null;           // base64 cropped pfp data URI
  let cropImage = null;           // Image object loaded for cropping
  let cropScale = 1.0;            // zoom scale of cropped image
  let cropX = 0;                  // image viewport X offset
  let cropY = 0;                  // image viewport Y offset
  let isDraggingCrop = false;     // drag panning trigger
  let dragStartX = 0;             // drag pan coordinate history X
  let dragStartY = 0;             // drag pan coordinate history Y

  const THEMES = [
    { id: 'classic', name: 'Classic Felt', color: '#151e27' },
    { id: 'cyberpunk', name: 'Neon Cyberpunk', color: '#00ffff' },
    { id: 'casino', name: 'Royal Casino', color: '#a21c1c' },
    { id: 'arcade', name: 'Retro Arcade', color: '#ffff00' },
    { id: 'glass', name: 'Ethereal Glass', color: '#e0c3fc' },
    { id: 'void', name: 'Dark Matter Void', color: '#1a0033' }
  ];

  // ─── Card Type Constants ────────────────────────────────
  const WILD_TYPES = new Set(['wild', 'wild4', 'wild6', 'wild10']);

  // ── DOM References ─────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const screens = {
    home: $('#home-screen'),
    lobby: $('#lobby-screen'),
    game: $('#game-screen'),
    victory: $('#victory-screen')
  };

  // Home & Profile Setup
  const nameInput = $('#player-name-input');
  const createRoomBtn = $('#create-room-btn');
  const codeInput = $('#room-code-input');
  const joinRoomBtn = $('#join-room-btn');
  const pfpUploadInput = $('#pfp-upload-input');
  const avatarPreviewBtn = $('#avatar-preview-btn');
  const avatarPreviewImg = $('#avatar-preview-img');
  const saveProfileBtn = $('#save-profile-btn');

  // Crop Modal
  const cropModal = $('#crop-modal');
  const cropCanvas = $('#crop-canvas');
  const cropZoomSlider = $('#crop-zoom-slider');
  const cropCancelBtn = $('#crop-cancel-btn');
  const cropSaveBtn = $('#crop-save-btn');

  // Lobby
  const lobbyCode = $('#lobby-room-code');
  const copyCodeBtn = $('#copy-code-btn');
  const lobbyPlayers = $('#lobby-players');
  const startGameBtn = $('#start-game-btn');
  const leaveRoomBtn = $('#leave-room-btn');

  // Game
  const opponentsBar = $('#opponents-bar');
  const drawPile = $('#draw-pile');
  const drawCount = $('#draw-count');
  const discardPile = $('#discard-pile');
  const colorRing = $('#color-ring');
  const turnLabel = $('#turn-label');
  const actionLog = $('#action-log');
  const playerHand = $('#player-hand');
  const unoBtn = $('#uno-btn');
  const catchButtons = $('#catch-buttons');
  const dirIndicator = $('#direction-indicator');
  const gameLeaveBtn = $('#game-leave-btn');

  // Drawn card prompt
  const drawnPrompt = $('#drawn-card-prompt');
  const drawnPreview = $('#drawn-card-preview');
  const playDrawnBtn = $('#play-drawn-btn');
  const keepDrawnBtn = $('#keep-drawn-btn');

  // Color modal
  const colorModal = $('#color-modal');

  // Penalty modal
  const penaltyModal = $('#penalty-modal');
  const penaltyTitle = $('#penalty-modal-title');
  const penaltyDesc = $('#penalty-modal-desc');
  const penaltyTimer = $('#penalty-timer');
  const penaltyStackBtn = $('#penalty-stack-btn');
  const penaltyDrawBtn = $('#penalty-draw-btn');

  let penaltyCountdownTimer = null;
  let penaltySecondsLeft = 10;

  // Game Start Popup
  const gameStartOverlay = $('#game-start-overlay');
  const startCountdownText = $('#start-countdown-text');
  const closeStartPopupBtn = $('#close-start-popup-btn');
  let startPopupInterval = null;
  let currentScreenName = 'home';

  // Victory
  const winnerName = $('#winner-name');
  const winnerScore = $('#winner-score');
  const playAgainBtn = $('#play-again-btn');
  const leaveGameBtn = $('#leave-game-btn');

  // ── Orientation Control ───────────────────────────────
  function lockLandscape() {
    try {
      if (screen.orientation && screen.orientation.lock) {
        // Attempt to lock to landscape
        screen.orientation.lock('landscape').catch(e => {
          console.warn('Orientation lock failed (might require full screen or not supported on iOS):', e);
        });
      }
    } catch (e) {
      console.warn('Orientation API error:', e);
    }
  }

  function unlockOrientation() {
    try {
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    } catch (e) {
      console.warn('Orientation API error:', e);
    }
  }

  // ── Screen Management ─────────────────────────────────
  function showScreen(name) {
    if (currentScreenName === 'lobby' && name === 'game') {
      showGameStartPopup();
    }
    
    // Custom transition from home to lobby
    if (currentScreenName === 'home' && name === 'lobby') {
      const homeScr = document.getElementById('home-screen');
      if (homeScr) homeScr.classList.add('anim-space-zoom-out');
      
      if (window.triggerWarpSpeed) window.triggerWarpSpeed();

      setTimeout(() => {
        if (homeScr) homeScr.classList.remove('active', 'anim-space-zoom-out');
        currentScreenName = name;
        const scr = document.getElementById(name + '-screen');
        if (scr) scr.classList.add('active');
        lockLandscape();
      }, 500); // wait for exit animation
      return;
    }

    currentScreenName = name;

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active', 'anim-space-zoom-out'));
    const scr = document.getElementById(name + '-screen');
    if (scr) scr.classList.add('active');

    if (name === 'home') {
      unlockOrientation();
    } else {
      lockLandscape();
    }
  }

  // ── Particle Background (Warp Speed Starfield & Gravity Card Rain) ──
  function initParticles() {
    const canvas = $('#particles-canvas');
    const ctx = canvas.getContext('2d');

    let centerX = window.innerWidth / 2;
    let centerY = window.innerHeight / 2;
    let maxDepth = Math.max(window.innerWidth, 1000);
    const stars = []; // Declare stars here at the top to avoid ReferenceError in resize() TDZ

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      centerX = canvas.width / 2;
      centerY = canvas.height / 2;
      maxDepth = Math.max(canvas.width, 1000);

      // Redistribute static stars to fill the new screen size on window resize
      if (stars.length > 0) {
        stars.forEach(star => {
          star.staticX = Math.random() * canvas.width;
          star.staticY = Math.random() * canvas.height;
        });
      }
    }
    resize();
    window.addEventListener('resize', resize);

    // Mouse state with velocity tracking
    let mouse = {
      x: centerX,
      y: centerY,
      targetX: centerX,
      targetY: centerY,
      vx: 0,
      vy: 0,
      lastX: centerX,
      lastY: centerY,
      isIdle: true
    };
    let idleTimer = null;
    let manualWarp = 0;

    window.triggerWarpSpeed = function() {
      manualWarp = 60;
    };

    window.addEventListener('mousemove', (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.isIdle = false;

      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        mouse.isIdle = true;
      }, 5000);
    });

    window.addEventListener('mouseleave', () => {
      mouse.isIdle = true;
    });

    // 1. Starfield Hyperdrive Background Layer
    const STAR_COUNT = 65;
    const starScaleFactor = 200;
    const starColors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7']; // Red, Blue, Green, Yellow, Purple (Wild)

    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: (Math.random() - 0.5) * canvas.width * 2,
        y: (Math.random() - 0.5) * canvas.height * 2,
        z: Math.random() * maxDepth,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        // Static coordinates for quiet gameplay background mode
        staticX: Math.random() * canvas.width,
        staticY: Math.random() * canvas.height,
        staticRadius: Math.random() * 1.5 + 0.8
      });
    }



    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Check if the game screen is active to toggle quiet static background mode
      const isGameActive = screens.game && screens.game.classList.contains('active');

      if (isGameActive) {
        // Draw static space background (soft quiet stars, no card rain, no hyperdrive lines, no mouse halo)
        for (const star of stars) {
          ctx.save();
          ctx.fillStyle = star.color;
          ctx.globalAlpha = 0.25; // extremely subtle and calm
          ctx.beginPath();
          ctx.arc(star.staticX, star.staticY, star.staticRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        requestAnimationFrame(draw);
        return; // skip gravity simulation, warp trails, and mouse events
      }

      // Smooth mouse tracking interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.12;
      mouse.y += (mouse.targetY - mouse.y) * 0.12;

      // Track mouse velocity
      mouse.vx = mouse.x - mouse.lastX;
      mouse.vy = mouse.y - mouse.lastY;
      mouse.lastX = mouse.x;
      mouse.lastY = mouse.y;

      const mouseSpeed = Math.hypot(mouse.vx, mouse.vy);

      // Limit mouse velocity applied to cards
      const maxMouseSpeed = 16;
      if (mouseSpeed > maxMouseSpeed) {
        mouse.vx = (mouse.vx / mouseSpeed) * maxMouseSpeed;
        mouse.vy = (mouse.vy / mouseSpeed) * maxMouseSpeed;
      }

      // If mouse is idle, make the virtual collider circle drift slowly around the center
      if (mouse.isIdle) {
        const time = Date.now() * 0.001;
        mouse.targetX = centerX + Math.sin(time * 1.5) * (centerX * 0.25);
        mouse.targetY = centerY + Math.cos(time * 1.1) * (centerY * 0.25);
      }

      // Calculate dynamic mouse interaction radius
      const mouseRadius = Math.max(60, Math.min(90, canvas.width * 0.06));

      // ──────────────────────────────────────────────────────────
      // LAYER 1: Deep Background Starfield Hyperdrive Warp
      // ──────────────────────────────────────────────────────────
      if (manualWarp > 0.1) {
        manualWarp *= 0.92; // smooth decay
      } else {
        manualWarp = 0;
      }
      
      const baseStarSpeed = 1.0;
      const warpModifier = Math.min(18, mouseSpeed * 1.2) + manualWarp;
      const currentStarSpeed = baseStarSpeed + warpModifier;

      for (const star of stars) {
        // Move star closer to the observer
        star.z -= currentStarSpeed;

        // Respawn star if it gets too close
        if (star.z <= 0) {
          star.z = maxDepth;
          star.x = (Math.random() - 0.5) * canvas.width * 2;
          star.y = (Math.random() - 0.5) * canvas.height * 2;
          star.color = starColors[Math.floor(Math.random() * starColors.length)];
        }

        // Project 3D coordinate onto 2D screen
        const px = centerX + (star.x / star.z) * starScaleFactor;
        const py = centerY + (star.y / star.z) * starScaleFactor;

        // Draw star streak from previous frame projected position
        const prevZ = star.z + currentStarSpeed;
        const ppx = centerX + (star.x / prevZ) * starScaleFactor;
        const ppy = centerY + (star.y / prevZ) * starScaleFactor;

        // Respawn if projected position is completely off-screen
        if (px < 0 || px > canvas.width || py < 0 || py > canvas.height) {
          star.z = maxDepth;
          star.x = (Math.random() - 0.5) * canvas.width * 2;
          star.y = (Math.random() - 0.5) * canvas.height * 2;
          star.color = starColors[Math.floor(Math.random() * starColors.length)];
          continue;
        }

        // Star opacity based on depth (guaranteeing minimum visibility at rest)
        const depthPercent = 1 - (star.z / maxDepth);
        const opacity = Math.min(0.75, 0.28 + depthPercent * 0.47);

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = star.color;

        // Thicker lines for strong visual appearance
        ctx.lineWidth = Math.max(2.0, depthPercent * 4.0 + (warpModifier * 0.12));

        // Ensure a minimum visual streak length of 3.5px so stars don't look like dim single pixels at rest
        let drawPpx = ppx;
        let drawPpy = ppy;
        const dx_streak = px - ppx;
        const dy_streak = py - ppy;
        const streakLen = Math.sqrt(dx_streak * dx_streak + dy_streak * dy_streak);
        if (streakLen < 3.5 && streakLen > 0) {
          const ratio = 3.5 / streakLen;
          drawPpx = px - dx_streak * ratio;
          drawPpy = py - dy_streak * ratio;
        }

        ctx.beginPath();
        ctx.moveTo(drawPpx, drawPpy);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.restore();
      }

      // ──────────────────────────────────────────────────────────
      // LAYER 2: Mouse Interaction Ring & Forcefield Aura
      // ──────────────────────────────────────────────────────────
      ctx.save();
      const mouseGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, mouseRadius);
      mouseGrad.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
      mouseGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.015)');
      mouseGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = mouseGrad;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, mouseRadius, 0, Math.PI * 2);
      ctx.fill();

      // Faint boundary dash outline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, mouseRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();



      requestAnimationFrame(draw);
    }

    draw();
  }

  // ── Toast Notifications ───────────────────────────────
  function showToast(message, duration = 3000) {
    const container = $('#toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ── Confetti ──────────────────────────────────────────
  function launchConfetti() {
    const wrapper = $('#confetti-wrapper');
    wrapper.innerHTML = '';
    const colors = ['#EF4444', '#3B82F6', '#22C55E', '#EAB308', '#A855F7', '#EC4899', '#F97316'];
    for (let i = 0; i < 80; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
      piece.style.animationDelay = (Math.random() * 1.5) + 's';
      piece.style.width = (Math.random() * 8 + 6) + 'px';
      piece.style.height = (Math.random() * 8 + 6) + 'px';
      wrapper.appendChild(piece);
    }
  }

  // ── Penalty Timer ───────────────────────────────────
  function startPenaltyTimer() {
    if (penaltyCountdownTimer) return; // already running
    penaltySecondsLeft = 10;
    penaltyTimer.textContent = `${penaltySecondsLeft}s`;

    penaltyCountdownTimer = setInterval(() => {
      penaltySecondsLeft--;
      if (penaltySecondsLeft <= 0) {
        penaltyTimer.textContent = '0s';
        stopPenaltyTimer();
        penaltyModal.style.display = 'none';
      } else {
        penaltyTimer.textContent = `${penaltySecondsLeft}s`;
      }
    }, 1000);
  }

  function stopPenaltyTimer() {
    if (penaltyCountdownTimer) {
      clearInterval(penaltyCountdownTimer);
      penaltyCountdownTimer = null;
    }
  }

  function showCustomConfirm(title, desc, onYes) {
    const modal = $('#confirm-modal');
    const titleEl = $('#confirm-modal-title');
    const descEl = $('#confirm-modal-desc');
    const yesBtn = $('#confirm-yes-btn');
    const noBtn = $('#confirm-no-btn');

    titleEl.textContent = title;
    descEl.textContent = desc;
    modal.style.display = 'flex';

    // Clone buttons to clear existing listeners
    const newYesBtn = yesBtn.cloneNode(true);
    const newNoBtn = noBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
    noBtn.parentNode.replaceChild(newNoBtn, noBtn);

    newYesBtn.addEventListener('click', () => {
      modal.style.display = 'none';
      if (onYes) onYes();
    });

    newNoBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  function leaveGameAction() {
    Network.disconnect();
    myId = null;
    roomCode = null;
    isHost = false;
    stopPenaltyTimer();
    showScreen('home');
    // Reconnect the WebSocket for future use
    setTimeout(() => Network.connect(onMessage), 500);
  }

  // ── Network Message Handler ───────────────────────────
  function onMessage(data) {
    switch (data.type) {
      case 'roomCreated':
        myId = data.playerId;
        roomCode = data.roomCode;
        isHost = true;
        showLobby();
        break;

      case 'roomJoined':
        myId = data.playerId;
        roomCode = data.roomCode;
        isHost = false;
        showLobby();
        break;

      case 'lobbyUpdate':
        if (currentScreenName !== 'lobby') showScreen('lobby');
        renderLobby(data);
        break;

      case 'gameState':
        gameState = data;
        renderGame(data);
        break;

      case 'drawnCard':
        drawnCardData = { card: data.card, canPlay: data.canPlay };
        if (data.canPlay) {
          showDrawnCardPrompt(data.card);
        }
        break;

      case 'notification':
        showToast(data.message);
        break;

      case 'gameOver':
        showVictory(data);
        break;

      case 'roomClosed':
        showToast('🚪 ' + (data.reason || 'Room closed by host'));
        leaveGameAction();
        break;

      case 'kicked':
        showToast('🚪 ' + (data.reason || 'You were kicked from the room'));
        leaveGameAction();
        break;

      case 'error':
        showToast('⚠️ ' + data.message, 4000);
        break;
    }
  }

  // ── Show Lobby ────────────────────────────────────────
  function showLobby() {
    lobbyCode.textContent = roomCode;
    showScreen('lobby');
  }

  function renderLobby(data) {
    console.log("🎲 renderLobby received data:", data.players.map(p => ({ id: p.id, name: p.name, hasPfp: !!p.pfp })));
    // Check if I'm host
    isHost = data.hostId === myId;

    // Players list
    lobbyPlayers.innerHTML = '';
    data.players.forEach((p, i) => {
      const item = document.createElement('div');
      item.className = 'player-item';

      const avatar = document.createElement('div');
      avatar.className = 'player-avatar';
      if (p.pfp) {
        avatar.style.background = 'transparent';
        avatar.style.backgroundImage = `url("${p.pfp}")`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
        avatar.textContent = '';
      } else {
        avatar.style.background = CardRenderer.getAvatarColor(i);
        avatar.style.backgroundImage = '';
        avatar.textContent = CardRenderer.getAvatarEmoji(i);
      }
      const name = document.createElement('div');
      name.className = 'player-name';
      name.textContent = p.name + (p.id === myId ? ' (You)' : '');

      item.appendChild(avatar);
      item.appendChild(name);

      if (p.isHost) {
        const badge = document.createElement('span');
        badge.className = 'player-badge';
        badge.textContent = '👑 Host';
        item.appendChild(badge);
      }

      if (p.isBot) {
        const botBadge = document.createElement('span');
        botBadge.className = 'player-badge player-badge-bot';
        botBadge.textContent = '🤖 Bot';
        item.appendChild(botBadge);
      }

      if (isHost && p.id !== myId) {
        const kickBtn = document.createElement('button');
        kickBtn.className = 'btn-kick';
        kickBtn.innerHTML = '✕';
        kickBtn.title = `Kick ${p.name}`;
        kickBtn.addEventListener('click', () => {
          showCustomConfirm(
            'Remove Player?',
            `Are you sure you want to remove ${p.name} from the room?`,
            () => {
              Network.send({ type: 'kickPlayer', targetId: p.id });
            }
          );
        });
        item.appendChild(kickBtn);
      }

      lobbyPlayers.appendChild(item);
    });

    // Start button (host only, 2+ players)
    if (isHost && data.players.length >= 2) {
      startGameBtn.style.display = '';
    } else {
      startGameBtn.style.display = 'none';
    }

    // Add Bot button — host only, lobby only, max 4 bots, room not full
    const existingAddBotBtn = document.getElementById('add-bot-btn');
    if (existingAddBotBtn) existingAddBotBtn.remove();
    const botCount = data.players.filter(p => p.isBot).length;
    if (isHost && botCount < 4 && data.players.length < 8) {
      const addBotBtn = document.createElement('button');
      addBotBtn.id = 'add-bot-btn';
      addBotBtn.className = 'btn btn-secondary';
      addBotBtn.innerHTML = '🤖 Add Bot';
      addBotBtn.addEventListener('click', () => Network.send({ type: 'addBot' }));
      startGameBtn.insertAdjacentElement('afterend', addBotBtn);
    }

    // Game mode selector & rules description
    const modeSelect = $('#game-mode-select');
    const rulesList = $('#mode-rules-list');
    if (modeSelect) {
      modeSelect.value = data.gameMode || 'classic';
      modeSelect.disabled = !isHost;
      modeSelect.onchange = (e) => {
        if (isHost) {
          Network.send({ type: 'changeMode', mode: e.target.value });
        }
      };
    }
    if (rulesList) {
      if ((data.gameMode || 'classic') === 'nomercy') {
        rulesList.innerHTML = `
          <li><strong>Mercy Rule:</strong> 25+ cards in hand = Eliminated!</li>
          <li><strong>Aggressive Stacking:</strong> Stack +2, +4, +6, +10 on ANY draw card!</li>
          <li><strong>7 & 0 Rules:</strong> Play 7 to swap hands; Play 0 to rotate all hands!</li>
          <li><strong>Discard All:</strong> Discards all cards of matching color!</li>
        `;
      } else {
        rulesList.innerHTML = `
          <li>Standard UNO deck (108 cards).</li>
          <li>Match by color or number.</li>
          <li>First to empty their hand wins!</li>
        `;
      }
    }

    // Render themes in lobby
    const themeGrid = $('#theme-grid');
    if (themeGrid) {
      themeGrid.innerHTML = '';
      const currentThemeId = data.currentTheme || 'classic';
      
      applyTheme(currentThemeId);

      THEMES.forEach(t => {
        const btn = document.createElement('div');
        btn.className = 'theme-btn' + (t.id === currentThemeId ? ' active' : '');
        if (!isHost) btn.classList.add('disabled');
        
        btn.classList.add('theme-btn-' + t.id);

        // Add a visual preview element containing a mini table and card representation
        const preview = document.createElement('div');
        preview.className = 'theme-btn-preview';
        const miniTable = document.createElement('div');
        miniTable.className = 'mini-table';
        const miniCard = document.createElement('div');
        miniCard.className = 'mini-card';
        miniTable.appendChild(miniCard);
        preview.appendChild(miniTable);
        btn.appendChild(preview);
        
        const span = document.createElement('span');
        span.textContent = t.name;
        btn.appendChild(span);

        if (isHost) {
          btn.addEventListener('click', () => {
            if (t.id !== currentThemeId) {
              Network.send({ type: 'changeTheme', theme: t.id });
            }
          });
        }
        themeGrid.appendChild(btn);
      });
    }
  }

  function applyTheme(themeId) {
    document.body.className = '';
    if (themeId !== 'classic') {
      document.body.classList.add('theme-' + themeId);
    }
  }

  // ── Render Game ───────────────────────────────────────
  function renderGame(state) {
    console.log("🎮 renderGame received state for players:", state.players.map(p => ({ id: p.id, name: p.name, hasPfp: !!p.pfp })));
    showScreen('game');
    $('#game-room-code-val').textContent = roomCode;

    applyTheme(state.currentTheme || 'classic');

    // Opponents bar
    renderOpponents(state);

    // Draw pile count
    drawCount.textContent = state.drawPileCount;

    // Discard pile
    renderDiscardPile(state.topCard);

    // Color ring
    colorRing.className = 'current-color-ring ring-' + state.topColor;

    // Turn label & Penalty Modal
    if (state.pendingDraw) {
      if (state.pendingDraw.victimId === myId) {
        const accumulated = state.pendingDraw.accumulatedDraw || 4;
        const typeNames = { wild4: 'Wild Draw 4', wild6: 'Wild Draw 6', wild10: 'Wild Draw 10', draw2: 'Draw 2' };
        const cardType = typeNames[state.pendingDraw.cardType] || 'Draw Penalty';
        // I am the victim! Show the penalty dialog.
        penaltyModal.style.display = 'flex';
        penaltyTitle.textContent = `${cardType}! (+${accumulated})`;
        penaltyDesc.textContent = `${state.pendingDraw.playerName} played a ${cardType} against you! You face a +${accumulated} penalty.`;

        penaltyDrawBtn.textContent = `Decline (Draw ${accumulated})`;

        const drawTypes = ['draw2', 'wild4', 'wild6', 'wild10'];
        const stackCard = state.hand.find(c => {
          if (state.gameMode === 'nomercy') return drawTypes.includes(c.type);
          return c.type === state.pendingDraw.cardType;
        });
        if (stackCard) {
          const incMap = { draw2: 2, wild4: 4, wild6: 6, wild10: 10 };
          const inc = incMap[stackCard.type] || 2;
          penaltyStackBtn.style.display = 'inline-block';
          penaltyStackBtn.textContent = `💥 Stack ${typeNames[stackCard.type] || '+2'} (Pass +${accumulated + inc})`;
          penaltyStackBtn.onclick = () => {
            penaltyModal.style.display = 'none';
            stopPenaltyTimer();
            pendingWildCardId = stackCard.id;

            if (['wild4', 'wild6', 'wild10'].includes(stackCard.type)) {
              pendingStackWild = true;
              colorModal.style.display = 'flex';
            } else {
              Network.send({ type: 'stackDraw', cardId: pendingWildCardId });
            }
          };
        } else {
          penaltyStackBtn.style.display = 'none';
        }

        // Start countdown timer if not already running
        startPenaltyTimer();
        turnLabel.textContent = 'Stack or Draw!';
        turnLabel.classList.add('my-turn');
      } else {
        // Someone else is the victim. Hide the modal and update turn label.
        penaltyModal.style.display = 'none';
        stopPenaltyTimer();
        const victimPlayer = state.players.find(p => p.id === state.pendingDraw.victimId);
        const victimName = victimPlayer ? victimPlayer.name : 'opponent';
        turnLabel.textContent = `Waiting for ${victimName} to decide...`;
        turnLabel.classList.add('my-turn');
      }
    } else {
      // No pending draw, hide modal and stop timer
      penaltyModal.style.display = 'none';
      stopPenaltyTimer();

      // Normal turn label logic
      if (state.isMyTurn) {
        turnLabel.textContent = state.hasDrawnCard ? 'Play or keep your drawn card' : 'Your Turn!';
        turnLabel.classList.add('my-turn');
      } else {
        const current = state.players.find(p => p.id === state.currentPlayerId);
        turnLabel.textContent = current ? `${current.name}'s turn` : 'Waiting...';
        turnLabel.classList.remove('my-turn');
      }
    }

    // Direction
    if (state.direction === -1) {
      dirIndicator.style.transform = 'translateY(-50%) scaleX(-1)';
    } else {
      dirIndicator.style.transform = 'translateY(-50%) scaleX(1)';
    }

    // Player hand
    renderHand(state);

    // UNO button — show if I have exactly 1 card and haven't called UNO
    const me = state.players.find(p => p.id === myId);
    if (me && me.cardCount === 1 && !me.calledUno) {
      unoBtn.style.display = '';
    } else {
      unoBtn.style.display = 'none';
    }

    // Catch buttons
    renderCatchButtons(state.catchable);

    // Action log
    renderLog(state.log);

    // Draw pile interactivity
    drawPile.style.pointerEvents = state.isMyTurn && !state.hasDrawnCard ? 'auto' : 'none';
    drawPile.style.opacity = state.isMyTurn && !state.hasDrawnCard ? '1' : '0.6';

    // Drawn card prompt
    if (state.drawnCard) {
      drawnCardData = { card: state.drawnCard, canPlay: true };
      showDrawnCardPrompt(state.drawnCard);
    } else {
      drawnPrompt.style.display = 'none';
      drawnCardData = null;
    }

    // 7-Swap Modal check
    const swapModal = $('#swap-modal');
    const swapTargetsList = $('#swap-targets-list');
    if (swapModal && swapTargetsList) {
      if (state.pendingSwap && state.pendingSwap.playerId === myId) {
        swapTargetsList.innerHTML = '';
        const targets = state.players.filter(p => p.id !== myId && !p.eliminated && p.connected);
        targets.forEach(t => {
          const item = document.createElement('div');
          item.className = 'swap-target-item';
          item.innerHTML = `<span>👤 ${t.name}</span><span>${t.cardCount} cards</span>`;
          item.addEventListener('click', () => {
            Network.send({ type: 'selectSwapTarget', targetId: t.id });
            swapModal.style.display = 'none';
          });
          swapTargetsList.appendChild(item);
        });
        swapModal.style.display = 'flex';
      } else {
        swapModal.style.display = 'none';
      }
    }

    // Update bottom player HUD metadata dynamically
    if (me) {
      const meIndex = state.players.findIndex(p => p.id === myId);
      const hudAvatar = $('#my-hud-avatar');
      if (hudAvatar) {
        if (me && me.pfp) {
          hudAvatar.style.background = 'transparent';
          hudAvatar.style.backgroundImage = `url("${me.pfp}")`;
          hudAvatar.style.backgroundSize = 'cover';
          hudAvatar.style.backgroundPosition = 'center';
          hudAvatar.textContent = '';
        } else {
          hudAvatar.style.background = CardRenderer.getAvatarColor(meIndex);
          hudAvatar.style.backgroundImage = '';
          hudAvatar.textContent = CardRenderer.getAvatarEmoji(meIndex);
        }
      }

      const hudName = $('.hud-name');
      if (hudName) {
        hudName.textContent = me.name + ' (You)';
      }
      const hudScore = $('#my-hud-score');
      if (hudScore) {
        hudScore.textContent = `Score: ${me.score || 0}`;
      }
    }
  }

  function getSlotClass(index, total) {
    if (total === 1) {
      return 'pos-top';
    }
    if (total === 2) {
      return index === 0 ? 'pos-left' : 'pos-right';
    }
    if (total === 3) {
      const classes = ['pos-left', 'pos-top', 'pos-right'];
      return classes[index];
    }
    if (total === 4) {
      const classes = ['pos-left', 'pos-top-left', 'pos-top-right', 'pos-right'];
      return classes[index];
    }
    // Up to 7 players
    const classes = ['pos-left', 'pos-top-left', 'pos-top', 'pos-top-right', 'pos-right', 'pos-bottom-left', 'pos-bottom-right'];
    return classes[index % classes.length];
  }

  function renderOpponents(state) {
    opponentsBar.innerHTML = '';

    // Filter out self
    const opponentList = state.players.filter(p => p.id !== myId);
    const totalOpponents = opponentList.length;

    opponentList.forEach((p, index) => {
      // Find original index in state.players to preserve their avatar colors
      const originalIndex = state.players.findIndex(player => player.id === p.id);

      const slot = document.createElement('div');
      slot.className = 'opponent-slot';

      // Get positioning class based on dynamic opponent count
      const slotClass = getSlotClass(index, totalOpponents);
      slot.classList.add(slotClass);

      if (p.id === state.currentPlayerId) slot.classList.add('active-turn');
      if (!p.connected) slot.classList.add('disconnected');

      // 1. Avatar
      const avatar = document.createElement('div');
      avatar.className = 'opp-avatar';
      if (p.pfp) {
        avatar.style.background = 'transparent';
        avatar.style.backgroundImage = `url("${p.pfp}")`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
        avatar.textContent = '';
      } else {
        avatar.style.background = CardRenderer.getAvatarColor(originalIndex);
        avatar.style.backgroundImage = '';
        avatar.textContent = CardRenderer.getAvatarEmoji(originalIndex);
      }

      // 2. Info container (Name, Score, Card Count)
      const info = document.createElement('div');
      info.className = 'opp-info';

      const nameSpan = document.createElement('div');
      nameSpan.className = 'opp-name';
      nameSpan.textContent = p.name;

      const scoreSpan = document.createElement('div');
      scoreSpan.className = 'opp-score';
      scoreSpan.textContent = `Score: ${p.score || 0}`;

      const cardCountText = document.createElement('div');
      cardCountText.className = 'opp-card-count-text';
      cardCountText.textContent = `${p.cardCount} cards`;

      info.appendChild(nameSpan);
      info.appendChild(scoreSpan);
      info.appendChild(cardCountText);

      // 3. Card Fan Visual Preview (overlapping card backs)
      const cardFan = document.createElement('div');
      cardFan.className = 'opp-card-fan';

      const visibleCardsCount = Math.min(4, p.cardCount);
      for (let c = 0; c < visibleCardsCount; c++) {
        const miniCard = document.createElement('div');
        miniCard.className = 'opp-card-back-mini';

        // Fan angles based on count
        const rot = (c - (visibleCardsCount - 1) / 2) * 10;
        miniCard.style.transform = `rotate(${rot}deg)`;
        cardFan.appendChild(miniCard);
      }

      slot.appendChild(avatar);
      slot.appendChild(info);
      slot.appendChild(cardFan);

      if (p.calledUno && p.cardCount === 1 && !p.eliminated) {
        const unoBadge = document.createElement('span');
        unoBadge.className = 'opp-uno-badge';
        unoBadge.textContent = 'UNO';
        slot.appendChild(unoBadge);
      }

      if (p.eliminated) {
        slot.classList.add('eliminated-player');
        const elimBadge = document.createElement('span');
        elimBadge.className = 'player-badge player-badge-eliminated';
        elimBadge.textContent = '💀 ELIMINATED';
        slot.appendChild(elimBadge);
      }

      opponentsBar.appendChild(slot);
    });
  }

  function renderDiscardPile(topCard) {
    discardPile.innerHTML = '';
    if (!topCard) return;
    const el = CardRenderer.createCard(topCard, { playable: true });
    el.classList.add('card-played');
    el.style.cursor = 'default';
    discardPile.appendChild(el);
  }

  function renderHand(state) {
    playerHand.innerHTML = '';

    // Determine which cards are playable
    const playable = state.isMyTurn && !state.hasDrawnCard
      ? new Set(state.hand.filter(c => isPlayableClient(c, state)).map(c => c.id))
      : new Set();

    // Sort hand: by color then value
    const colorOrder = { red: 0, blue: 1, green: 2, yellow: 3 };
    const sorted = [...state.hand].sort((a, b) => {
      const ca = a.color ? colorOrder[a.color] : 5;
      const cb = b.color ? colorOrder[b.color] : 5;
      if (ca !== cb) return ca - cb;
      const va = a.type === 'number' ? a.value : 10;
      const vb = b.type === 'number' ? b.value : 10;
      return va - vb;
    });

    const totalCards = sorted.length;
    const cardWidth = window.innerWidth < 480 ? 62 : (window.innerWidth < 768 ? 72 : 90);
    const maxHandWidth = Math.min(window.innerWidth - 60, 800);

    let spacing = -20; // default overlap in pixels
    if (totalCards > 1) {
      const neededWidth = totalCards * cardWidth + (totalCards - 1) * spacing;
      if (neededWidth > maxHandWidth) {
        spacing = (maxHandWidth - totalCards * cardWidth) / (totalCards - 1);
      }
    }

    const mid = (totalCards - 1) / 2;
    const maxAngle = Math.min(25, totalCards * 2.5);
    const angleStep = totalCards > 1 ? (maxAngle * 2) / (totalCards - 1) : 0;

    sorted.forEach((card, i) => {
      const canPlay = playable.has(card.id);
      const el = CardRenderer.createCard(card, {
        playable: state.isMyTurn ? canPlay : undefined,
        onClick: canPlay ? () => handlePlayCard(card) : null
      });
      el.style.zIndex = i;

      let angle = 0;
      if (totalCards > 1) {
        angle = -maxAngle + i * angleStep;
      }

      const offset = i - mid;
      const translateValY = Math.abs(offset) * Math.abs(offset) * 2.0;
      const cardCenterOffset = offset * (cardWidth + spacing);

      el.style.setProperty('--card-rot', `${angle}deg`);
      el.style.setProperty('--card-tx', `${cardCenterOffset}px`);
      el.style.setProperty('--card-ty', `${translateValY}px`);

      playerHand.appendChild(el);
    });
  }

  function isPlayableClient(card, state) {
    if (WILD_TYPES.has(card.type)) return true;
    if (card.color === state.topColor) return true;
    const top = state.topCard;
    if (card.type === 'number' && top.type === 'number') return card.value === top.value;
    return card.type !== 'number' && card.type === top.type;
  }

  function renderCatchButtons(catchable) {
    catchButtons.innerHTML = '';
    if (!catchable || catchable.length === 0) return;

    catchable.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-catch';
      btn.textContent = `🚨 Catch ${p.name}!`;
      btn.addEventListener('click', () => {
        Network.send({ type: 'catchUno', targetId: p.id });
      });
      catchButtons.appendChild(btn);
    });
  }

  function renderLog(log) {
    if (!log) return;
    const frag = document.createDocumentFragment();
    for (const entry of log) {
      const el = document.createElement('div');
      el.className = 'log-entry';
      el.textContent = entry.message;
      frag.appendChild(el);
    }
    actionLog.replaceChildren(frag);
    actionLog.scrollTop = actionLog.scrollHeight;
  }

  // ── Card Play Handler ─────────────────────────────────
  function handlePlayCard(card) {
    if (WILD_TYPES.has(card.type)) {
      pendingWildCardId = card.id;
      pendingDrawnWild = false;
      colorModal.style.display = 'flex';
    } else {
      Network.send({ type: 'playCard', cardId: card.id });
    }
  }

  // ── Drawn Card Prompt ─────────────────────────────────
  function showDrawnCardPrompt(card) {
    drawnPreview.innerHTML = '';
    const el = CardRenderer.createCard(card, { playable: true });
    el.style.margin = '0';
    el.style.cursor = 'default';
    drawnPreview.appendChild(el);
    drawnPrompt.style.display = '';
  }

  // ── Victory Screen ────────────────────────────────────
  function showVictory(data) {
    showScreen('victory');
    winnerName.textContent = `${data.winnerName} Wins!`;
    winnerScore.textContent = `Score: ${data.score} points`;
    launchConfetti();
    playAgainBtn.style.display = isHost ? '' : 'none';
  }

  // ── Event Listeners ───────────────────────────────────

  // Home — Create Room
  createRoomBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) {
      showToast('Please enter your name');
      nameInput.focus();
      return;
    }
    console.log("🚀 Sending createRoom! customPfp present?:", !!customPfp);
    Network.send({ type: 'createRoom', playerName: name, pfp: customPfp });
  });

  // Home — Join Room
  joinRoomBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const code = codeInput.value.trim().toUpperCase();
    if (!name) {
      showToast('Please enter your name');
      nameInput.focus();
      return;
    }
    if (!code || code.length !== 4) {
      showToast('Enter a 4-character room code');
      codeInput.focus();
      return;
    }
    console.log("🚀 Sending joinRoom! customPfp present?:", !!customPfp);
    Network.send({ type: 'joinRoom', playerName: name, roomCode: code, pfp: customPfp });
  });

  // Allow Enter key on inputs
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createRoomBtn.click();
  });
  codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinRoomBtn.click();
  });

  // Lobby — Copy Code
  copyCodeBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      showToast('Room code copied! 📋');
    } catch {
      showToast('Code: ' + roomCode);
    }
  });

  // Lobby — Start Game
  startGameBtn.addEventListener('click', () => {
    Network.send({ type: 'startGame' });
  });

  // Lobby — Leave Room
  leaveRoomBtn.addEventListener('click', () => {
    leaveGameAction();
  });

  // Game — Draw Pile
  drawPile.addEventListener('click', () => {
    if (gameState && gameState.isMyTurn && !gameState.hasDrawnCard) {
      Network.send({ type: 'drawCard' });
    }
  });

  // Game — UNO Button
  unoBtn.addEventListener('click', () => {
    Network.send({ type: 'callUno' });
    unoBtn.style.display = 'none';
  });

  // Game — Play Drawn Card
  playDrawnBtn.addEventListener('click', () => {
    if (!drawnCardData) return;
    const card = drawnCardData.card;
    if (card.type === 'wild' || card.type === 'wild4') {
      pendingWildCardId = card.id;
      pendingDrawnWild = true;
      colorModal.style.display = 'flex';
      drawnPrompt.style.display = 'none';
    } else {
      Network.send({ type: 'playDrawnCard' });
      drawnPrompt.style.display = 'none';
      drawnCardData = null;
    }
  });

  // Game — Keep Drawn Card
  keepDrawnBtn.addEventListener('click', () => {
    Network.send({ type: 'keepDrawnCard' });
    drawnPrompt.style.display = 'none';
    drawnCardData = null;
  });

  // Color Modal — Color Choice
  $$('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      colorModal.style.display = 'none';

      if (pendingStackWild) {
        Network.send({ type: 'stackDraw', cardId: pendingWildCardId, chosenColor: color });
      } else if (pendingDrawnWild) {
        Network.send({ type: 'playDrawnCard', chosenColor: color });
        drawnCardData = null;
      } else {
        Network.send({ type: 'playCard', cardId: pendingWildCardId, chosenColor: color });
      }
      pendingWildCardId = null;
      pendingDrawnWild = false;
      pendingStackWild = false;
    });
  });

  // Game — Penalty Draw
  penaltyDrawBtn.addEventListener('click', () => {
    Network.send({ type: 'acceptDraw' });
    penaltyModal.style.display = 'none';
    stopPenaltyTimer();
  });

  // Game — Leave Game button
  gameLeaveBtn.addEventListener('click', () => {
    showCustomConfirm(
      'Leave Game?',
      'Are you sure you want to leave the game?',
      () => {
        leaveGameAction();
      }
    );
  });

  // Victory — Play Again
  playAgainBtn.addEventListener('click', () => {
    Network.send({ type: 'playAgain' });
  });

  // Victory — Leave
  leaveGameBtn.addEventListener('click', () => {
    leaveGameAction();
  });

  // ── Profile and Image Cropping Implementation ───────────
  function saveProfileData() {
    const name = nameInput.value.trim();
    if (!name) {
      showToast('Please enter your name first');
      return;
    }
    localStorage.setItem('uno_player_name', name);
    if (customPfp) {
      localStorage.setItem('uno_player_pfp', customPfp);
    } else {
      localStorage.removeItem('uno_player_pfp');
    }
    showToast('Profile saved successfully! 💾');
  }

  function loadProfileData() {
    const savedName = localStorage.getItem('uno_player_name');
    if (savedName) {
      nameInput.value = savedName;
    }
    const savedPfp = localStorage.getItem('uno_player_pfp');
    if (savedPfp) {
      customPfp = savedPfp;
      avatarPreviewImg.textContent = '';
      avatarPreviewImg.style.backgroundImage = `url(${savedPfp})`;
      avatarPreviewImg.style.backgroundSize = 'cover';
      avatarPreviewImg.style.backgroundPosition = 'center';
    }
  }

  // Draw the image on the crop canvas (scaled and translated)
  function drawCropCanvas() {
    const ctx = cropCanvas.getContext('2d');
    ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
    if (!cropImage) return;

    const canvasW = cropCanvas.width;
    const canvasH = cropCanvas.height;

    const baseWidth = cropImage.width;
    const baseHeight = cropImage.height;
    const baseRatio = baseWidth / baseHeight;

    let drawW, drawH;
    if (baseRatio > 1) {
      drawH = canvasH * cropScale;
      drawW = drawH * baseRatio;
    } else {
      drawW = canvasW * cropScale;
      drawH = drawW / baseRatio;
    }

    const x = (canvasW - drawW) / 2 + cropX;
    const y = (canvasH - drawH) / 2 + cropY;

    ctx.drawImage(cropImage, x, y, drawW, drawH);
  }

  // Set up Crop canvas event listeners
  function initCropEvents() {
    avatarPreviewBtn.addEventListener('click', () => {
      pfpUploadInput.click();
    });

    pfpUploadInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        cropImage = new Image();
        cropImage.onload = () => {
          // Reset crop state variables
          cropScale = 1.0;
          cropX = 0;
          cropY = 0;
          cropZoomSlider.value = 1.0;

          cropModal.style.display = 'flex';
          drawCropCanvas();
        };
        cropImage.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });

    saveProfileBtn.addEventListener('click', () => {
      saveProfileData();
    });

    cropZoomSlider.addEventListener('input', (e) => {
      cropScale = parseFloat(e.target.value);
      drawCropCanvas();
    });

    // Drag-to-pan implementation
    const getCoords = (e) => {
      if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    };

    const dragStart = (e) => {
      if (!cropImage) return;
      isDraggingCrop = true;
      const coords = getCoords(e);
      dragStartX = coords.x - cropX;
      dragStartY = coords.y - cropY;
      e.preventDefault();
    };

    const dragMove = (e) => {
      if (!isDraggingCrop || !cropImage) return;
      const coords = getCoords(e);
      cropX = coords.x - dragStartX;
      cropY = coords.y - dragStartY;
      drawCropCanvas();
      e.preventDefault();
    };

    const dragEnd = () => {
      isDraggingCrop = false;
    };

    // Mouse listeners
    cropCanvas.addEventListener('mousedown', dragStart);
    window.addEventListener('mousemove', dragMove);
    window.addEventListener('mouseup', dragEnd);

    // Touch listeners
    cropCanvas.addEventListener('touchstart', dragStart, { passive: false });
    window.addEventListener('touchmove', dragMove, { passive: false });
    window.addEventListener('touchend', dragEnd);

    // Cancel
    cropCancelBtn.addEventListener('click', () => {
      cropModal.style.display = 'none';
      pfpUploadInput.value = ''; // clear input
    });

    // Save cropped area
    cropSaveBtn.addEventListener('click', () => {
      if (!cropImage) return;

      // Extract center 150x150 square matching the circular frame
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 150;
      tempCanvas.height = 150;
      const tempCtx = tempCanvas.getContext('2d');

      // Draw the center portion (75, 75) of width/height 150 from cropCanvas
      tempCtx.drawImage(cropCanvas, 75, 75, 150, 150, 0, 0, 150, 150);

      // Convert to Base64 data URL
      const croppedBase64 = tempCanvas.toDataURL('image/jpeg', 0.85);

      // Save to local pfp state variable
      customPfp = croppedBase64;

      // Update avatar preview
      avatarPreviewImg.textContent = '';
      avatarPreviewImg.style.backgroundImage = `url(${customPfp})`;
      avatarPreviewImg.style.backgroundSize = 'cover';
      avatarPreviewImg.style.backgroundPosition = 'center';

      cropModal.style.display = 'none';
      pfpUploadInput.value = '';

      showToast('Avatar cropped! Click Save to remember it. 💾');
    });
  }

  // ── Initialization ────────────────────────────────────
  function showGameStartPopup() {
    if (!gameStartOverlay) return;
    gameStartOverlay.style.display = 'flex';
    let timeLeft = 3;
    startCountdownText.textContent = `Closing in ${timeLeft}...`;

    if (startPopupInterval) clearInterval(startPopupInterval);
    startPopupInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        closeGameStartPopup();
      } else {
        startCountdownText.textContent = `Closing in ${timeLeft}...`;
      }
    }, 1000);
  }

  function closeGameStartPopup() {
    if (startPopupInterval) clearInterval(startPopupInterval);
    if (gameStartOverlay) gameStartOverlay.style.display = 'none';
  }

  function init() {
    initParticles();
    loadProfileData();
    initCropEvents();

    if (closeStartPopupBtn) {
      closeStartPopupBtn.addEventListener('click', closeGameStartPopup);
    }
    Network.connect(onMessage);
    showScreen('home');

    // Focus name input
    setTimeout(() => nameInput.focus(), 500);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
