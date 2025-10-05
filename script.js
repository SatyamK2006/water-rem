// show username
const user = localStorage.getItem('loggedInUser');
if (!user) window.location = 'index.html';
document.getElementById('welcome').textContent = `Welcome, ${user}!`;

// water tracking
let total = parseFloat(localStorage.getItem(`${user}_total`) || 0);
document.getElementById('total').textContent = total.toFixed(2);

// goal progress (4L)
const GOAL_LITERS = 4;
function updateProgress() {
  const pct = Math.min(100, Math.round((total / GOAL_LITERS) * 100));
  const bar = document.getElementById('progressBar');
  const pctEl = document.getElementById('goalPct');
  if (bar) bar.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
  if (bar && pct >= 100) bar.classList.add('pulse');
  if (pct >= 100) maybeCelebrate();
}
updateProgress();

document.getElementById('addWater').onclick = () => {
  const liters = parseFloat(document.getElementById('liters').value);
  if (!liters) return alert('Enter amount!');
  total += liters;
  localStorage.setItem(`${user}_total`, total);
  document.getElementById('total').textContent = total.toFixed(2);
  updateProgress();

  const history = JSON.parse(localStorage.getItem(`${user}_history`) || "[]");
  history.push({ amount: liters, time: new Date().toLocaleTimeString() });
  localStorage.setItem(`${user}_history`, JSON.stringify(history));
  alert(`Added ${liters}L at ${history.at(-1).time}`);
};

// reminder
let countdownIntervalId = null;
let reminderIntervalId = null;
let nextReminderAt = null;

function startCountdown(mins) {
  if (countdownIntervalId) clearInterval(countdownIntervalId);
  const countdownEl = document.getElementById('countdown');
  nextReminderAt = Date.now() + mins * 60000;
  function renderCountdown() {
    const diff = Math.max(0, nextReminderAt - Date.now());
    const mm = String(Math.floor(diff / 60000)).padStart(2, '0');
    const ss = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    if (countdownEl) countdownEl.textContent = `${mm}:${ss}`;
    if (diff <= 0) {
      clearInterval(countdownIntervalId);
    }
  }
  renderCountdown();
  countdownIntervalId = setInterval(renderCountdown, 250);
}

document.getElementById('setReminder').onclick = () => {
  const mins = parseInt(document.getElementById('reminderTime').value);
  if (!mins) return alert('Enter time!');
  alert(`Reminder set for every ${mins} minutes.`);

  if (reminderIntervalId) clearInterval(reminderIntervalId);
  const trigger = () => {
    document.getElementById('reminderSound').play();
    alert('💧 Time to drink water!');
    startCountdown(mins);
  };
  trigger();
  reminderIntervalId = setInterval(trigger, mins * 60000);
};

// logout
document.getElementById('logout').onclick = () => {
  localStorage.removeItem('loggedInUser');
  window.location = 'index.html';
};

// Celebration (confetti + chime) once per day per user
function dayKey() {
  const today = new Date();
  return `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;
}

function maybeCelebrate() {
  const key = `${user}_celebrated_${dayKey()}`;
  if (localStorage.getItem(key) === 'yes') return;
  localStorage.setItem(key, 'yes');
  playChime();
  confettiBurst();
}

// Simple WebAudio chime
let audioCtx;
function playChime() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    const o1 = audioCtx.createOscillator();
    const g1 = audioCtx.createGain();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(880, now);
    g1.gain.setValueAtTime(0.0001, now);
    g1.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
    g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    o1.connect(g1).connect(audioCtx.destination);
    o1.start(now);
    o1.stop(now + 0.65);

    const o2 = audioCtx.createOscillator();
    const g2 = audioCtx.createGain();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(1320, now + 0.05);
    g2.gain.setValueAtTime(0.0001, now);
    g2.gain.exponentialRampToValueAtTime(0.15, now + 0.07);
    g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    o2.connect(g2).connect(audioCtx.destination);
    o2.start(now + 0.05);
    o2.stop(now + 0.55);
  } catch (e) {
    // ignore if blocked by autoplay policy
  }
}

// Lightweight confetti
function confettiBurst() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = window.innerWidth;
  const h = canvas.height = window.innerHeight;
  const colors = ['#38bdf8','#0ea5e9','#22d3ee','#67e8f9','#a5f3fc'];
  const pieces = Array.from({ length: 150 }, () => ({
    x: Math.random()*w,
    y: -20 - Math.random()*h*0.3,
    r: 4 + Math.random()*6,
    c: colors[Math.floor(Math.random()*colors.length)],
    s: 2 + Math.random()*3,
    a: Math.random()*Math.PI*2
  }));

  let start;
  function draw(ts) {
    if (!start) start = ts;
    const elapsed = ts - start;
    ctx.clearRect(0,0,w,h);
    pieces.forEach(p => {
      p.y += p.s;
      p.x += Math.sin((p.y+p.r)*0.02)*1.2;
      p.a += 0.05;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r*0.5, -p.r*0.5, p.r, p.r);
      ctx.restore();
    });
    if (elapsed < 5000) requestAnimationFrame(draw); else ctx.clearRect(0,0,w,h);
  }
  requestAnimationFrame(draw);
}
