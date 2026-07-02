// Macro Tracker - R1 Food Logging Plugin

const STORAGE_KEY = 'macro_tracker_data';

let currentDate = new Date();
let foodLog = {};
let isRecording = false;
let touchStartX = 0;
let pendingPhotoIndex = null;

const PHOTO_STORAGE_KEY = 'macro_tracker_photos';
let photoStore = {};

// ===== Storage =====

async function saveData() {
  const payload = JSON.stringify(foodLog);
  const photoPayload = JSON.stringify(photoStore);
  if (window.creationStorage) {
    try {
      await window.creationStorage.plain.setItem(STORAGE_KEY, btoa(payload));
      await window.creationStorage.plain.setItem(PHOTO_STORAGE_KEY, btoa(photoPayload));
    } catch (e) {
      localStorage.setItem(STORAGE_KEY, payload);
      localStorage.setItem(PHOTO_STORAGE_KEY, photoPayload);
    }
  } else {
    localStorage.setItem(STORAGE_KEY, payload);
    localStorage.setItem(PHOTO_STORAGE_KEY, photoPayload);
  }
}

async function loadData() {
  if (window.creationStorage) {
    try {
      const stored = await window.creationStorage.plain.getItem(STORAGE_KEY);
      if (stored) {
        foodLog = JSON.parse(atob(stored));
      }
      const photoStored = await window.creationStorage.plain.getItem(PHOTO_STORAGE_KEY);
      if (photoStored) {
        photoStore = JSON.parse(atob(photoStored));
      }
      return;
    } catch (e) { /* fallback */ }
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    foodLog = JSON.parse(stored);
  }
  const photoStored = localStorage.getItem(PHOTO_STORAGE_KEY);
  if (photoStored) {
    photoStore = JSON.parse(photoStored);
  }
}

// ===== Date Helpers =====

function getDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDate(date) {
  const today = new Date();
  const key = getDateKey(date);
  const todayKey = getDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getDateKey(yesterday);

  if (key === todayKey) return 'Today';
  if (key === yesterdayKey) return 'Yesterday';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function navigateDate(direction) {
  currentDate.setDate(currentDate.getDate() + direction);
  render();
}

// ===== Food Log Management =====

function getEntriesForDate(date) {
  const key = getDateKey(date);
  return foodLog[key] || [];
}

function addFoodEntry(entry) {
  const key = getDateKey(currentDate);
  if (!foodLog[key]) foodLog[key] = [];
  foodLog[key].push(entry);
  saveData();
  render();
}

function calculateTotals(entries) {
  return entries.reduce((acc, e) => {
    acc.calories += e.calories || 0;
    acc.protein += e.protein || 0;
    acc.carbs += e.carbs || 0;
    acc.fat += e.fat || 0;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

function deleteFoodEntry(index) {
  const key = getDateKey(currentDate);
  if (foodLog[key] && foodLog[key][index] !== undefined) {
    foodLog[key].splice(index, 1);
    // Also remove associated photo
    const photoKey = `${key}_${index}`;
    delete photoStore[photoKey];
    // Re-index photos for entries after deleted one
    const reindexed = {};
    Object.keys(photoStore).forEach(k => {
      if (k.startsWith(key + '_')) {
        const i = parseInt(k.split('_').pop());
        if (i > index) {
          reindexed[`${key}_${i - 1}`] = photoStore[k];
        } else {
          reindexed[k] = photoStore[k];
        }
      } else {
        reindexed[k] = photoStore[k];
      }
    });
    photoStore = reindexed;
    if (foodLog[key].length === 0) delete foodLog[key];
    saveData();
    render();
    setStatus('Item removed', false);
  }
}

// ===== Day Picker =====

function getSavedDays() {
  return Object.keys(foodLog).sort().reverse();
}

function openDayPicker() {
  const overlay = document.getElementById('day-picker-overlay');
  const list = document.getElementById('day-picker-list');
  const days = getSavedDays();

  if (days.length === 0) {
    list.innerHTML = '<div class="day-picker-empty">No saved days</div>';
  } else {
    list.innerHTML = days.map(key => {
      const entries = foodLog[key];
      const totals = calculateTotals(entries);
      const d = new Date(key + 'T12:00:00');
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      return `<button class="day-picker-item" data-key="${key}">
        <span class="day-label">${label}</span>
        <span class="day-summary">${entries.length} items · ${totals.calories} cal</span>
      </button>`;
    }).join('');
  }

  overlay.classList.remove('hidden');

  list.querySelectorAll('.day-picker-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      currentDate = new Date(key + 'T12:00:00');
      closeDayPicker();
      render();
    });
  });
}

function closeDayPicker() {
  document.getElementById('day-picker-overlay').classList.add('hidden');
}

// ===== Photo Capture =====

function capturePhoto(index) {
  pendingPhotoIndex = index;
  const input = document.getElementById('camera-input');
  input.value = '';
  input.click();
}

function handlePhotoCapture(event) {
  const file = event.target.files[0];
  if (!file || pendingPhotoIndex === null) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const key = getDateKey(currentDate);
    const photoKey = `${key}_${pendingPhotoIndex}`;
    // Resize image to save storage space
    resizeImage(e.target.result, 120, (dataUrl) => {
      photoStore[photoKey] = dataUrl;
      saveData();
      render();
      setStatus('Photo saved ✓', false);
      pendingPhotoIndex = null;
    });
  };
  reader.readAsDataURL(file);
}

function resizeImage(dataUrl, maxSize, callback) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    let w = img.width, h = img.height;
    if (w > h) { h = (maxSize * h) / w; w = maxSize; }
    else { w = (maxSize * w) / h; h = maxSize; }
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    callback(canvas.toDataURL('image/jpeg', 0.6));
  };
  img.src = dataUrl;
}

// ===== Voice / LLM Integration =====

function startVoiceInput() {
  if (isRecording) return;
  isRecording = true;
  document.getElementById('mic-btn').classList.add('recording');
  setStatus('Listening...', true);

  if (typeof CreationVoiceHandler !== 'undefined') {
    CreationVoiceHandler.postMessage('start');
  }
}

// ===== Message Handler =====

window.onPluginMessage = function(data) {
  // Handle STT transcript
  if (data.type === 'sttEnded' && data.transcript) {
    processTranscript(data.transcript);
    return;
  }

  // Handle LLM response
  let responseText = null;
  if (data.data) {
    responseText = typeof data.data === 'string' ? data.data : JSON.stringify(data.data);
  } else if (data.message) {
    responseText = data.message;
  }

  if (responseText) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        handleMacroResponse(parsed);
      } else {
        setStatus('No valid data in response', false);
      }
    } catch (e) {
      setStatus('Error parsing response', false);
    }
  }
};

function stopVoiceInput() {
  if (!isRecording) return;
  isRecording = false;
  document.getElementById('mic-btn').classList.remove('recording');
  setStatus('Processing...', true);

  if (typeof CreationVoiceHandler !== 'undefined') {
    CreationVoiceHandler.postMessage('stop');
  }
}

function processTranscript(transcript) {
  if (!transcript || !transcript.trim()) {
    setStatus('No input detected', false);
    return;
  }
  setStatus('Analyzing: ' + transcript, true);
  requestMacros(transcript);
}

function requestMacros(foodText) {
  const prompt = `I ate: "${foodText}". Determine the macro breakdown. Respond ONLY with valid JSON in this exact format, no other text: {"foods":[{"name":"food name","calories":000,"protein":00,"carbs":00,"fat":00}]}. If multiple foods are mentioned, include each as a separate item. Use realistic nutritional values for typical serving sizes.`;

  if (typeof PluginMessageHandler !== 'undefined') {
    PluginMessageHandler.postMessage(JSON.stringify({
      message: prompt,
      useLLM: true
    }));
  } else {
    // Demo fallback for browser testing
    setTimeout(() => {
      const demo = {
        foods: [{ name: foodText, calories: 250, protein: 12, carbs: 30, fat: 8 }]
      };
      handleMacroResponse(demo);
    }, 500);
  }
}

function handleMacroResponse(data) {
  if (data && data.foods && Array.isArray(data.foods)) {
    data.foods.forEach(food => {
      addFoodEntry({
        name: food.name || 'Unknown',
        calories: Math.round(food.calories || 0),
        protein: Math.round(food.protein || 0),
        carbs: Math.round(food.carbs || 0),
        fat: Math.round(food.fat || 0),
        time: Date.now()
      });
    });
    setStatus('Added ' + data.foods.length + ' item(s)', false);
  } else {
    setStatus('Could not parse food data', false);
  }
}

// ===== Rendering =====

function render() {
  const entries = getEntriesForDate(currentDate);
  const totals = calculateTotals(entries);

  document.getElementById('date-display').textContent = formatDate(currentDate);
  document.getElementById('total-cal').textContent = totals.calories;
  document.getElementById('total-protein').textContent = totals.protein + 'g';
  document.getElementById('total-carbs').textContent = totals.carbs + 'g';
  document.getElementById('total-fat').textContent = totals.fat + 'g';

  const listEl = document.getElementById('food-list');

  if (entries.length === 0) {
    listEl.innerHTML = '<div class="empty-state"><div class="icon">🍽️</div><div>No food logged</div><div>Tap 🎤 or hold PTT to add</div></div>';
    return;
  }

  const dateKey = getDateKey(currentDate);
  listEl.innerHTML = entries.map((e, i) => {
    const photoKey = `${dateKey}_${i}`;
    const hasPhoto = photoStore[photoKey];
    return `
    <div class="food-entry">
      <div class="food-row">
        <div class="food-name">${e.name}</div>
        <div class="food-actions">
          <button class="camera-btn" data-index="${i}" aria-label="Photo">${hasPhoto ? '🖼️' : '📷'}</button>
          <button class="delete-btn" data-index="${i}" aria-label="Delete">✕</button>
        </div>
      </div>
      ${hasPhoto ? `<img class="food-photo" src="${photoStore[photoKey]}" alt="${e.name}">` : ''}
      <div class="food-macros">
        <span>${e.calories} cal</span>
        <span>${e.protein}g P</span>
        <span>${e.carbs}g C</span>
        <span>${e.fat}g F</span>
      </div>
    </div>`;
  }).join('');

  listEl.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteFoodEntry(parseInt(btn.dataset.index));
    });
  });

  listEl.querySelectorAll('.camera-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      capturePhoto(parseInt(btn.dataset.index));
    });
  });
}

function setStatus(text, active) {
  const el = document.getElementById('status-bar');
  el.textContent = text;
  el.className = active ? 'active' : '';
  if (!active) {
    setTimeout(() => { el.textContent = ''; }, 3000);
  }
}

// ===== Event Handlers =====

// Scroll wheel for date navigation
window.addEventListener('scrollUp', () => navigateDate(1));
window.addEventListener('scrollDown', () => navigateDate(-1));

// PTT button for voice input
window.addEventListener('longPressStart', () => startVoiceInput());
window.addEventListener('longPressEnd', () => stopVoiceInput());

// Side click as alternative trigger
window.addEventListener('sideClick', () => {
  if (isRecording) {
    stopVoiceInput();
  } else {
    startVoiceInput();
    setTimeout(() => stopVoiceInput(), 5000);
  }
});

// Touch swipe for date navigation
document.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
}, { passive: true });

document.addEventListener('touchend', (e) => {
  const diff = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(diff) > 50) {
    navigateDate(diff > 0 ? -1 : 1);
  }
}, { passive: true });

// ===== Initialization =====

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  render();

  // Save button handler
  const saveBtn = document.getElementById('save-btn');
  saveBtn.addEventListener('click', async () => {
    saveBtn.classList.add('saving');
    await saveData();
    setStatus('Saved ✓', false);
    setTimeout(() => saveBtn.classList.remove('saving'), 600);
  });

  // Open button handler
  const openBtn = document.getElementById('open-btn');
  openBtn.addEventListener('click', () => openDayPicker());

  // Day picker close
  document.getElementById('day-picker-close').addEventListener('click', closeDayPicker);
  document.getElementById('day-picker-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDayPicker();
  });

  // Camera input handler
  document.getElementById('camera-input').addEventListener('change', handlePhotoCapture);

  // Mic button handler
  const micBtn = document.getElementById('mic-btn');
  micBtn.addEventListener('click', () => {
    if (isRecording) {
      stopVoiceInput();
    } else {
      startVoiceInput();
      setTimeout(() => {
        if (isRecording) stopVoiceInput();
      }, 5000);
    }
  });

  // Keyboard fallback for development
  if (typeof PluginMessageHandler === 'undefined') {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('sideClick'));
      }
      if (e.code === 'ArrowLeft') navigateDate(-1);
      if (e.code === 'ArrowRight') navigateDate(1);
    });
  }

  setStatus('Ready', false);
});
