import './style.css';
import { renderGameUI } from './lib/ui-design.js';
import { initControls, inputState } from './lib/device-controls.js';
import { sendToFlutter } from './lib/flutter-channel.js';

const app = document.querySelector('#app') || document.body;
renderGameUI(app);

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const debugOverlay = document.getElementById('debug-overlay');

let score = 0;
let lap = 1;
let lastTime = performance.now();
let fps = 0;
let checkpointPassed = false;

// Player physics tracking at stable micro velocities
const car = {
  x: 120, y: 155, vx: 0, vy: 0, speed: 0, angle: -Math.PI / 2,
  maxSpeed: 0.56, accel: 0.016, decel: 0.024, friction: 0.94, turnSpeed: 0.07,
  width: 10, length: 14
};

const aiWaypoints = [
  { x: 35, y: 145 }, { x: 35, y: 35 }, { x: 205, y: 35 }, { x: 205, y: 145 }
];

const aiCars = [
  { id: "AI_Yellow", x: 100, y: 142, speed: 0.38, angle: Math.PI, waypointIndex: 0, color: '#f1c40f', width: 10, length: 14 },
  { id: "AI_Blue", x: 80, y: 148, speed: 0.32, angle: Math.PI, waypointIndex: 0, color: '#3498db', width: 10, length: 14 }
];

const API_URL = 'https://api.example.com/rc-racing/leaderboard'; 

async function fetchRemoteHighScore() {
  try {
    const response = await fetch(`${API_URL}?device=r1`, { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (response.ok) { const data = await response.json(); }
  } catch (e) { console.error("[Data Sync Error]", e.message); }
}

async function uploadScoreToBackend(finalScore) {
  sendToFlutter('vibrate', { duration: 200 });
  try {
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: finalScore, timestamp: new Date().toISOString() })
    });
  } catch (e) { console.error("[Data Sync Error]", e.message); }
}

function drawTrack() {
  ctx.fillStyle = '#555555'; ctx.fillRect(15, 15, 210, 150);
  ctx.fillStyle = '#3b7a57'; ctx.fillRect(55, 55, 130, 70);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
  ctx.strokeRect(15, 15, 210, 150); ctx.strokeRect(55, 55, 130, 70);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 40; i += 8) {
    ctx.fillRect(120, 125 + i, 4, 4);
    ctx.fillStyle = ctx.fillStyle === '#ffffff' ? '#000000' : '#ffffff';
    ctx.fillRect(124, 125 + i, 4, 4);
  }
}

function evaluateCollision(x, y) {
  if (x < 15 || x > 225 || y < 15 || y > 165) return true;
  if (x > 55 && x < 185 && y > 55 && y < 125) return true;
  return false;
}

function updateGameStep(timestamp) {
  fps = Math.round(1000 / (timestamp - lastTime));
  lastTime = timestamp;
  debugOverlay.innerText = `FPS: ${fps} | Score: ${score} | Lap: ${lap}`;

  // Direct, absolute D-pad rotation handling matrix (unthrottled by speed vectors)
  if (inputState.left) car.angle -= car.turnSpeed;
  if (inputState.right) car.angle += car.turnSpeed;

  if (inputState.gas || inputState.up) {
    car.speed += car.accel; if (car.speed > car.maxSpeed) car.speed = car.maxSpeed;
  } else if (inputState.brake || inputState.down) {
    car.speed -= car.decel; if (car.speed < -car.maxSpeed / 2) car.speed = -car.maxSpeed / 2;
  } else {
    car.speed *= car.friction; if (Math.abs(car.speed) < 0.01) car.speed = 0;
  }

  const nextPlayerX = car.x + Math.cos(car.angle) * car.speed;
  const nextPlayerY = car.y + Math.sin(car.angle) * car.speed;

  if (evaluateCollision(nextPlayerX, nextPlayerY)) {
    car.speed = -car.speed * 0.4; score = Math.max(0, score - 5);
    sendToFlutter('vibrate', { intensity: 'light' });
  } else {
    car.x = nextPlayerX; car.y = nextPlayerY;
  }

  aiCars.forEach(ai => {
    let target = aiWaypoints[ai.waypointIndex];
    let dx = target.x - ai.x; let dy = target.y - ai.y;
    let distance = Math.hypot(dx, dy);
    if (distance < 12) { ai.waypointIndex = (ai.waypointIndex + 1) % aiWaypoints.length; }
    let targetAngle = Math.atan2(dy, dx);
    let angleDifference = Math.atan2(Math.sin(targetAngle - ai.angle), Math.cos(targetAngle - ai.angle));
    ai.angle += Math.sign(angleDifference) * Math.min(0.06, Math.abs(angleDifference));
    ai.x += Math.cos(ai.angle) * ai.speed; ai.y += Math.sin(ai.angle) * ai.speed;
  });

  if (car.x > 115 && car.x < 125 && car.y < 55) { checkpointPassed = true; }
  if (checkpointPassed && car.x > 120 && car.x < 128 && car.y > 125 && car.y < 165) {
    lap++; score += 1000; checkpointPassed = false; uploadScoreToBackend(score);
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTrack();

  aiCars.forEach(ai => {
    ctx.save(); ctx.translate(ai.x, ai.y); ctx.rotate(ai.angle);
    ctx.fillStyle = ai.color; ctx.fillRect(-ai.length / 2, -ai.width / 2, ai.length, ai.width);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(2, -3, 3, 6);
    ctx.fillStyle = '#111111'; ctx.fillRect(-5, -6, 3, 1.5); ctx.fillRect(-5, 4.5, 3, 1.5);
    ctx.fillRect(2, -6, 3, 1.5); ctx.fillRect(2, 4.5, 3, 1.5);
    ctx.restore();
  });

  ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
  ctx.fillStyle = '#ff3333'; ctx.fillRect(-car.length / 2, -car.width / 2, car.length, car.width);
  ctx.fillStyle = '#99ccff'; ctx.fillRect(2, -3, 4, 6);
  ctx.fillStyle = '#111111'; ctx.fillRect(-6, -6, 3, 2); ctx.fillRect(-6, 4, 3, 2);
  ctx.fillRect(3, -6, 3, 2); ctx.fillRect(3, 4, 3, 2);
  ctx.restore();

  requestAnimationFrame(updateGameStep);
}

initControls(); fetchRemoteHighScore(); requestAnimationFrame(updateGameStep);