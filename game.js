/* ═══════════════════════════════════════════════
   ZEN MATCH — Game Engine
   ═══════════════════════════════════════════════ */

(() => {
  'use strict';

  // ─── TILE ICON POOL ───
  const ICONS = [
    '🍎','🍊','🍋','🍇','🍓','🌸','🌺','🍀',
    '🌙','⭐','🔮','💎','🎵','🦋','🐚','🍂',
    '🌿','🪷','🧊','🪻','🫧','🪸','🍄','🪺'
  ];

  // ─── LEVEL CONFIG ───
  function getLevelConfig(level) {
    // types: how many different icons, extras: extra sets of 3
    // total tiles = types * 3
    const base = Math.min(4 + Math.floor((level - 1) * 0.8), 12);
    const types = Math.max(4, base);
    const totalTiles = types * 3;

    return {
      level,
      types,
      totalTiles,
      // Layers: from level 3+, some tiles get stacked
      layers: level >= 3 ? Math.min(Math.floor((level - 1) / 2), 3) : 0,
      timeBonus: Math.max(300 - (level - 1) * 10, 60),
    };
  }

  // ─── STATE ───
  let state = {
    level: 1,
    score: 0,
    slots: [],        // Array of {icon, tileId} — max 7
    tiles: [],        // All tiles on board [{id, icon, layer, element, collected}]
    combo: 0,
    undosLeft: 3,
    shufflesLeft: 1,
    isAnimating: false,
    bestLevel: 1,
    bestScore: 0,
    totalGames: 0,
  };

  // ─── DOM ───
  const $board = document.getElementById('board');
  const $slotBar = document.getElementById('slotBar');
  const $levelNum = document.getElementById('levelNum');
  const $scoreVal = document.getElementById('scoreVal');
  const $undoBtn = document.getElementById('undoBtn');
  const $shuffleBtn = document.getElementById('shuffleBtn');
  const $undoCount = document.getElementById('undoCount');
  const $shuffleCount = document.getElementById('shuffleCount');

  // Overlays
  const $menuOverlay = document.getElementById('menuOverlay');
  const $levelCompleteOverlay = document.getElementById('levelCompleteOverlay');
  const $gameOverOverlay = document.getElementById('gameOverOverlay');

  // ─── STORAGE ───
  function saveStats() {
    const data = {
      bestLevel: state.bestLevel,
      bestScore: state.bestScore,
      totalGames: state.totalGames,
      currentLevel: state.level,
      currentScore: state.score,
    };
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set(data);
      }
      localStorage.setItem('zenMatchStats', JSON.stringify(data));
    } catch (e) { /* ignore */ }
  }

  function loadStats() {
    try {
      const raw = localStorage.getItem('zenMatchStats');
      if (raw) {
        const d = JSON.parse(raw);
        state.bestLevel = d.bestLevel || 1;
        state.bestScore = d.bestScore || 0;
        state.totalGames = d.totalGames || 0;
        // Check for continue
        if (d.currentLevel && d.currentLevel > 1) {
          state.level = d.currentLevel;
          state.score = d.currentScore || 0;
          const $cont = document.getElementById('continueBtn');
          const $contLvl = document.getElementById('continueLevel');
          $cont.style.display = 'block';
          $contLvl.textContent = d.currentLevel;
        }
      }
    } catch (e) { /* ignore */ }

    // Also try chrome.storage
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['bestLevel', 'bestScore', 'totalGames', 'currentLevel', 'currentScore'], (d) => {
          if (d.bestLevel) state.bestLevel = Math.max(state.bestLevel, d.bestLevel);
          if (d.bestScore) state.bestScore = Math.max(state.bestScore, d.bestScore);
          if (d.totalGames) state.totalGames = Math.max(state.totalGames, d.totalGames);
          updateMenuStats();
        });
      }
    } catch (e) { /* ignore */ }

    updateMenuStats();
  }

  function updateMenuStats() {
    const $bl = document.getElementById('menuBestLevel');
    const $bs = document.getElementById('menuBestScore');
    if ($bl) $bl.textContent = state.bestLevel;
    if ($bs) $bs.textContent = state.bestScore;
  }

  // ─── INIT LEVEL ───
  function initLevel() {
    const cfg = getLevelConfig(state.level);
    state.slots = [];
    state.tiles = [];
    state.combo = 0;
    state.undosLeft = 3;
    state.shufflesLeft = 1;
    state.isAnimating = false;

    // Update UI
    $levelNum.textContent = state.level;
    $scoreVal.textContent = state.score;
    $undoCount.textContent = state.undosLeft;
    $shuffleCount.textContent = state.shufflesLeft;
    $undoBtn.disabled = false;
    $shuffleBtn.disabled = false;

    // Clear board and slots
    $board.innerHTML = '';
    renderSlots();

    // Generate tile pool: each icon appears 3 times
    const chosenIcons = shuffleArray([...ICONS]).slice(0, cfg.types);
    let pool = [];
    chosenIcons.forEach(icon => {
      pool.push(icon, icon, icon);
    });
    pool = shuffleArray(pool);

    // Determine layout
    const cols = Math.ceil(Math.sqrt(cfg.totalTiles * 1.3));
    const rows = Math.ceil(cfg.totalTiles / cols);

    // Board size
    const tileSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tile-size')) || 62;
    const gap = 6;
    $board.style.width = (cols * (tileSize + gap)) + 'px';

    // Layer assignment
    let layerAssignments = pool.map(() => 0);
    if (cfg.layers > 0) {
      // Put some tiles on higher layers
      const layerCount = Math.min(Math.floor(pool.length * 0.3), 9);
      for (let i = 0; i < layerCount; i++) {
        layerAssignments[i] = Math.min(Math.ceil(Math.random() * cfg.layers), 2);
      }
      layerAssignments = shuffleArray(layerAssignments);
    }

    // Create tile elements
    pool.forEach((icon, i) => {
      const layer = layerAssignments[i];
      const tile = {
        id: i,
        icon,
        layer,
        collected: false,
        element: null,
      };

      const el = document.createElement('div');
      el.className = 'tile';
      el.dataset.id = i;
      el.dataset.layer = layer;
      el.textContent = icon;
      el.style.animationDelay = `${i * 30}ms`;

      // Layer offset for visual depth
      if (layer > 0) {
        const offsetX = (Math.random() - 0.5) * 20;
        const offsetY = (Math.random() - 0.5) * 20;
        el.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        el.style.zIndex = layer * 10;
      }

      el.addEventListener('click', () => onTileClick(tile));
      tile.element = el;
      state.tiles.push(tile);
      $board.appendChild(el);
    });

    // Update blocked state for layered tiles
    updateBlockedTiles();
  }

  // ─── BLOCKED TILES (layer system) ───
  function updateBlockedTiles() {
    // Simple approach: tiles on layer 0 are blocked if a layer 1+ tile is "near" them
    // For simplicity, skip full overlap detection — use a grid position heuristic
    const cfg = getLevelConfig(state.level);
    if (cfg.layers === 0) return;

    // Get positions of all non-collected tiles
    const tileRects = [];
    state.tiles.forEach(t => {
      if (t.collected) return;
      const rect = t.element.getBoundingClientRect();
      tileRects.push({ tile: t, rect });
    });

    // Mark tiles as blocked if a higher-layer tile overlaps them
    state.tiles.forEach(t => {
      if (t.collected) return;
      const myRect = t.element.getBoundingClientRect();
      let blocked = false;

      tileRects.forEach(({ tile: other, rect: otherRect }) => {
        if (other.id === t.id || other.collected) return;
        if (other.layer <= t.layer) return;

        // Check overlap
        const overlap = !(otherRect.right < myRect.left + 15 ||
                         otherRect.left > myRect.right - 15 ||
                         otherRect.bottom < myRect.top + 15 ||
                         otherRect.top > myRect.bottom - 15);
        if (overlap) blocked = true;
      });

      t.element.classList.toggle('blocked', blocked);
    });
  }

  // ─── TILE CLICK ───
  function onTileClick(tile) {
    if (state.isAnimating) return;
    if (tile.collected) return;
    if (tile.element.classList.contains('blocked')) return;
    if (state.slots.length >= 7) return;

    state.isAnimating = true;

    // Collect tile
    tile.collected = true;
    tile.element.classList.add('collected');

    // Add to slots — always append to the end (no auto-grouping!)
    // Player must strategically click same icons consecutively
    state.slots.push({ icon: tile.icon, tileId: tile.id });

    renderSlots();
    updateBlockedTiles();

    // Check for 3-match
    setTimeout(() => {
      checkMatch();
    }, 200);
  }

  // ─── CHECK MATCH ───
  function checkMatch() {
    // Look for 3 consecutive same icons
    for (let i = 0; i <= state.slots.length - 3; i++) {
      if (state.slots[i].icon === state.slots[i+1].icon &&
          state.slots[i].icon === state.slots[i+2].icon) {
        // MATCH!
        const matchIcon = state.slots[i].icon;
        const matchSlots = [i, i+1, i+2];

        // Animate match
        const slotEls = $slotBar.querySelectorAll('.slot');
        matchSlots.forEach(idx => {
          if (slotEls[idx]) slotEls[idx].classList.add('matched');
        });

        // Score
        state.combo++;
        const points = 100 * state.combo;
        state.score += points;
        $scoreVal.textContent = state.score;

        // Show score popup
        showScorePopup(points, slotEls[i+1]);

        // Particles
        spawnParticles(matchIcon, slotEls[i+1]);

        if (state.combo > 1) {
          showComboFlash();
        }

        // Remove after animation
        setTimeout(() => {
          state.slots.splice(i, 3);
          renderSlots();
          state.isAnimating = false;

          // Check win
          const remaining = state.tiles.filter(t => !t.collected).length;
          if (remaining === 0 && state.slots.length === 0) {
            onLevelComplete();
          } else {
            // Chain check
            checkMatch();
          }
        }, 450);
        return;
      }
    }

    // No match found — reset combo
    state.combo = 0;
    state.isAnimating = false;

    // Check game over (bar full)
    if (state.slots.length >= 7) {
      setTimeout(() => onGameOver(), 300);
    }

    // Warn if bar is getting full
    renderSlotDanger();
  }

  // ─── RENDER SLOTS ───
  function renderSlots() {
    const slotEls = $slotBar.querySelectorAll('.slot');
    slotEls.forEach((el, i) => {
      if (i < state.slots.length) {
        el.textContent = state.slots[i].icon;
        el.classList.add('filled');
        el.classList.remove('matched', 'danger');
      } else {
        el.textContent = '';
        el.classList.remove('filled', 'matched', 'danger');
      }
    });
    renderSlotDanger();
  }

  function renderSlotDanger() {
    if (state.slots.length >= 5) {
      const slotEls = $slotBar.querySelectorAll('.slot');
      for (let i = state.slots.length; i < 7; i++) {
        slotEls[i].classList.add('danger');
      }
    }
  }

  // ─── EFFECTS ───
  function showScorePopup(points, refEl) {
    const rect = refEl ? refEl.getBoundingClientRect() : { left: window.innerWidth/2, top: window.innerHeight/2 };
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = `+${points}`;
    popup.style.left = rect.left + 'px';
    popup.style.top = (rect.top - 20) + 'px';
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1000);
  }

  function spawnParticles(icon, refEl) {
    const rect = refEl ? refEl.getBoundingClientRect() : { left: window.innerWidth/2, top: window.innerHeight/2 };
    for (let i = 0; i < 6; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.textContent = icon;
      p.style.left = rect.left + 'px';
      p.style.top = rect.top + 'px';
      p.style.setProperty('--px', (Math.random() - 0.5) * 120 + 'px');
      p.style.setProperty('--py', (Math.random() - 0.5) * 120 + 'px');
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 800);
    }
  }

  function showComboFlash() {
    const flash = document.createElement('div');
    flash.className = 'combo-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 400);
  }

  // ─── LEVEL COMPLETE ───
  function onLevelComplete() {
    const bonusPoints = getLevelConfig(state.level).timeBonus;
    state.score += bonusPoints;
    $scoreVal.textContent = state.score;

    // Update records
    if (state.level >= state.bestLevel) {
      state.bestLevel = state.level + 1;
    }
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
    }
    saveStats();

    /* [AD_PLACEMENT: INTERSTITIAL_AD_CHECK]
       Future: show a full-screen ad every 3 levels.
       if (state.level % 3 === 0) {
         showInterstitialAd().then(() => showLevelComplete(bonusPoints));
         return;
       }
    */

    showLevelComplete(bonusPoints);
  }

  function showLevelComplete(bonus) {
    document.getElementById('levelScoreDetail').innerHTML =
      `Level ${state.level} complete!<br>` +
      `Bonus: <strong>+${bonus}</strong> pts<br>` +
      `Total Score: <strong>${state.score}</strong>`;
    showOverlay($levelCompleteOverlay);
  }

  // ─── GAME OVER ───
  function onGameOver() {
    state.totalGames++;
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
    }
    if (state.level > state.bestLevel) {
      state.bestLevel = state.level;
    }
    saveStats();

    document.getElementById('gameOverDetail').innerHTML =
      `You reached level ${state.level}.<br>` +
      `Score: <strong>${state.score}</strong>`;

    /* [AD_PLACEMENT: REWARDED_AD_SETUP]
       Future: activate the rewarded ad button here.
       document.getElementById('reviveAdBtn').style.display = 'block';
       document.getElementById('reviveAdBtn').onclick = () => {
         showRewardedAd().then(() => {
           // Clear 3 slots from the bar (from the end)
           state.slots.splice(-3, 3);
           renderSlots();
           hideOverlay($gameOverOverlay);
         });
       };
    */

    showOverlay($gameOverOverlay);
  }

  // ─── UNDO ───
  function onUndo() {
    if (state.undosLeft <= 0 || state.slots.length === 0 || state.isAnimating) return;

    const last = state.slots.pop();
    state.undosLeft--;
    $undoCount.textContent = state.undosLeft;
    if (state.undosLeft <= 0) $undoBtn.disabled = true;

    // Restore tile on board
    const tile = state.tiles.find(t => t.id === last.tileId);
    if (tile) {
      tile.collected = false;
      tile.element.classList.remove('collected');
    }

    renderSlots();
    updateBlockedTiles();

    // Close game over if it was open
    hideOverlay($gameOverOverlay);
  }

  // ─── SHUFFLE ───
  function onShuffle() {
    if (state.shufflesLeft <= 0 || state.isAnimating) return;
    state.shufflesLeft--;
    $shuffleCount.textContent = state.shufflesLeft;
    if (state.shufflesLeft <= 0) $shuffleBtn.disabled = true;

    // Collect all non-collected tile icons
    const activeTiles = state.tiles.filter(t => !t.collected);
    const icons = activeTiles.map(t => t.icon);
    const shuffled = shuffleArray(icons);

    // Reassign icons
    activeTiles.forEach((t, i) => {
      t.icon = shuffled[i];
      t.element.textContent = shuffled[i];
      // Quick animation
      t.element.style.animation = 'none';
      t.element.offsetHeight; // reflow
      t.element.style.animation = `tileAppear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 20}ms backwards`;
    });
  }

  // ─── OVERLAY HELPERS ───
  function showOverlay(el) {
    el.classList.add('active');
  }
  function hideOverlay(el) {
    el.classList.remove('active');
  }

  // ─── UTIL ───
  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ─── EVENTS ───
  document.getElementById('startBtn').addEventListener('click', () => {
    state.level = 1;
    state.score = 0;
    state.totalGames++;
    saveStats();
    hideOverlay($menuOverlay);
    initLevel();
  });

  document.getElementById('continueBtn')?.addEventListener('click', () => {
    hideOverlay($menuOverlay);
    initLevel();
  });

  document.getElementById('nextLevelBtn').addEventListener('click', () => {
    state.level++;
    hideOverlay($levelCompleteOverlay);
    saveStats();
    initLevel();
  });

  document.getElementById('retryBtn').addEventListener('click', () => {
    state.score = 0;
    hideOverlay($gameOverOverlay);
    initLevel();
  });

  document.getElementById('menuBtn').addEventListener('click', () => {
    hideOverlay($gameOverOverlay);
    updateMenuStats();
    showOverlay($menuOverlay);
  });

  $undoBtn.addEventListener('click', onUndo);
  $shuffleBtn.addEventListener('click', onShuffle);

  // ─── KEYBOARD SHORTCUTS ───
  document.addEventListener('keydown', (e) => {
    if (e.key === 'z' || e.key === 'Z') onUndo();
    if (e.key === 's' || e.key === 'S') onShuffle();
  });

  // ─── BOOT ───
  loadStats();

})();
