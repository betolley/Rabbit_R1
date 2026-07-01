import { inputState } from './device-controls.js';
export const renderGameUI = (container) => {
  container.innerHTML = `
    <div id="debug-overlay">FPS: 0 | Score: 00000 | Lap: 1</div>
    <canvas id="game-canvas" width="240" height="180"></canvas>
    <div class="controls-panel">
      <div class="dpad">
        <div class="empty-slot"></div>
        <div class="dpad-btn" id="pad-up">▲</div>
        <div class="empty-slot"></div>
        <div class="dpad-btn" id="pad-left">◀</div>
        <div class="empty-slot"></div>
        <div class="dpad-btn" id="pad-right">▶</div>
        <div class="empty-slot"></div>
        <div class="dpad-btn" id="pad-down">▼</div>
        <div class="empty-slot"></div>
      </div>
      <div class="action-buttons">
        <button class="action-btn" id="btn-b">B</button>
        <button class="action-btn" id="btn-a">A</button>
      </div>
    </div>
  `;
  const bindTouch = (elementId, stateProperty) => {
    const btn = document.getElementById(elementId);
    if (!btn) return;
    const start = (e) => { e.preventDefault(); inputState[stateProperty] = true; btn.classList.add('active'); };
    const end = (e) => { e.preventDefault(); inputState[stateProperty] = false; btn.classList.remove('active'); };
    btn.addEventListener('pointerdown', start);
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointerleave', end);
    btn.addEventListener('pointercancel', end);
  };
  bindTouch('pad-up', 'up'); bindTouch('pad-down', 'down');
  bindTouch('pad-left', 'left'); bindTouch('pad-right', 'right');
  bindTouch('btn-a', 'gas'); bindTouch('btn-b', 'brake');
};