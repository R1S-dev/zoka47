/* Mini game PWA: ugasi 47 svećica (klik na plamen) - smooth + no vibrate warning */

(() => {
  const TOTAL = 47;

  const doneEl = document.getElementById("done");
  const totalEl = document.getElementById("total");
  const flameBtn = document.getElementById("flameBtn");
  const flameEl = document.getElementById("flame");
  const candleWrap = document.getElementById("candleWrap");
  const candleEl = document.getElementById("candle");
  const finalEl = document.getElementById("final");
  const heartsEl = document.getElementById("hearts");
  const finalAgainBtn = document.getElementById("finalAgainBtn");

  let done = 0;
  let locked = false;
  let heartsTimer = null;
  let canVibrate = false; // <-- prevents the Intervention warning

  if (!doneEl || !totalEl || !flameBtn || !flameEl || !candleWrap || !finalEl || !candleEl) {
    console.error("Missing DOM elements. Check ids in index.html.");
    return;
  }

  // Enable vibrate only AFTER first real user gesture on the page
  window.addEventListener("pointerdown", () => { canVibrate = true; }, { once: true });

  // SW
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  // Sound
  const Audio = (() => {
    let ctx = null;
    function beep(freq, dur = 0.06, type = "triangle", gainVal = 0.03) {
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        const t = ctx.currentTime + 0.01;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.value = gainVal;
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t);
        o.stop(t + dur);
      } catch {}
    }
    function pop() {
      beep(900, 0.05, "triangle", 0.028);
      setTimeout(() => beep(620, 0.05, "triangle", 0.022), 35);
    }
    function win() {
      const notes = [523, 659, 784, 1046, 1318, 1568];
      notes.forEach((f, i) => setTimeout(() => beep(f, 0.085, "triangle", 0.038), i * 110));
    }
    return { pop, win };
  })();

  function vibrate(ms = 10) {
    if (!canVibrate) return;
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch {}
  }

  function setCounter() {
    doneEl.textContent = String(done);
    totalEl.textContent = String(TOTAL);
  }

  function spawnSmoke() {
    const s = document.createElement("div");
    s.className = "smoke";
    flameBtn.appendChild(s);
    setTimeout(() => s.remove(), 850);
  }

  // Solid colors (nice “birthday” set)
  const colors = [
    "#22c55e","#16a34a","#4ade80",
    "#ef4444","#dc2626","#f87171",
    "#3b82f6","#2563eb","#60a5fa",
    "#a855f7","#7c3aed","#c084fc",
    "#f59e0b","#fbbf24","#fde047",
    "#14b8a6","#06b6d4","#0ea5e9"
  ];

  // shuffle bag so you don't get same color too often
  let bag = [];
  function refillBag() {
    bag = colors.slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  function nextColor() {
    if (bag.length === 0) refillBag();
    return bag.pop();
  }

  function applySolidColor() {
    candleEl.style.setProperty("--candleColor", nextColor());
  }

  function stopHearts() {
    if (heartsTimer) clearInterval(heartsTimer);
    heartsTimer = null;
    if (heartsEl) heartsEl.innerHTML = "";
  }

  function startHeartsSlowBig() {
    stopHearts();
    if (!heartsEl) return;

    heartsTimer = setInterval(() => {
      // fewer per tick but bigger + slower
      for (let k = 0; k < 6; k++) {
        const heart = document.createElement("div");
        heart.className = "heart";

        const left = 2 + Math.random() * 96;
        const size = 22 + Math.random() * 26; // bigger
        const hue = 330 + Math.random() * 35;

        heart.style.left = left + "%";
        heart.style.width = size + "px";
        heart.style.height = size + "px";
        heart.style.background = `hsla(${hue}, 95%, ${60 + Math.random() * 12}%, 0.98)`;

        const dur = 4200 + Math.random() * 2600; // slower
        const drift = (Math.random() - 0.5) * 220;

        heartsEl.appendChild(heart);

        heart.animate(
          [
            { transform: `translateX(-50%) translateY(0) rotate(45deg) scale(.96)`, opacity: 0.0 },
            { opacity: 0.98, offset: 0.10 },
            { transform: `translateX(calc(-50% + ${drift}px)) translateY(-120vh) rotate(45deg) scale(1.06)`, opacity: 0.0 }
          ],
          { duration: dur, easing: "cubic-bezier(.2,.85,.2,1)", fill: "forwards" }
        );

        setTimeout(() => heart.remove(), dur + 120);
      }
    }, 170);
  }

  function hideFinal() {
    finalEl.classList.add("isHidden");
    finalEl.setAttribute("aria-hidden", "true");
    stopHearts();
  }

  function showFinal() {
    finalEl.classList.remove("isHidden");
    finalEl.setAttribute("aria-hidden", "false");
    startHeartsSlowBig();
  }

  function swapCandleFast() {
    candleWrap.classList.remove("swapIn", "swapOut");
    candleWrap.classList.add("swapOut");

    setTimeout(() => {
      applySolidColor();
      candleWrap.classList.remove("swapOut");
      candleWrap.classList.add("swapIn");
      setTimeout(() => candleWrap.classList.remove("swapIn"), 220);
    }, 120);
  }

  function resetGame() {
    done = 0;
    locked = false;
    hideFinal();
    setCounter();
    flameEl.classList.remove("flameOut");
    applySolidColor();
    swapCandleFast();
  }

  flameBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (locked) return;
    if (!finalEl.classList.contains("isHidden")) return;

    locked = true;

    flameEl.classList.add("flameOut");
    spawnSmoke();
    Audio.pop();
    vibrate(10);

    setTimeout(() => {
      done++;
      setCounter();

      if (done >= TOTAL) {
        Audio.win();
        showFinal();
        locked = false;
        return;
      }

      flameEl.classList.remove("flameOut");
      swapCandleFast();
      locked = false;
    }, 170);
  });

  if (finalAgainBtn) finalAgainBtn.addEventListener("click", resetGame);

  // init
  hideFinal();
  setCounter();
  refillBag();
  applySolidColor();
  swapCandleFast();
})();
