/* ═══════════════════════════════════════════
   NOXUS STUDIO — APPLICATION LOGIC
   ═══════════════════════════════════════════ */

// ── PROJECT DATA ────────────────────────────
const projectData = [
  {
    title: "The Lumina",
    subtitle: "Residential Villa",
    desc: "A minimalist sanctuary blending raw concrete with warm oak, maximizing natural light through expansive floor-to-ceiling glass.",
    frameCount: 192,
    number: "01",
    getFrameUrl: (i) => `./frame_${i.toString().padStart(3, "0")}.png`,
  },
  {
    title: "Horizon",
    subtitle: "Commercial Workspace",
    desc: "A state-of-the-art corporate environment designed for collaboration, featuring biophilic design and open-plan layouts.",
    frameCount: 240,
    number: "02",
    getFrameUrl: (i) =>
      `https://placehold.co/1920x1080/111111/FFFFFF/webp?text=Horizon+Frame+${(i + 1).toString().padStart(4, "0")}`,
  },
  {
    title: "Aethos",
    subtitle: "Boutique Hotel",
    desc: "A luxury hospitality experience nestled in nature, utilizing locally sourced stone and sustainable architectural practices.",
    frameCount: 240,
    number: "03",
    getFrameUrl: (i) =>
      `https://placehold.co/1920x1080/111111/FFFFFF/webp?text=Aethos+Frame+${(i + 1).toString().padStart(4, "0")}`,
  },
];

// ── DOM REFERENCES ──────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
  canvas:       $("#parallax-canvas"),
  canvasWrap:   $("#canvas-wrap"),
  heroContent:  $("#hero-content"),
  heroNav:      $("#hero-nav"),
  heroSocial:   $("#hero-social"),
  scrollHint:   $("#scroll-hint"),
  heroTitle:    $("#hero-title"),
  heroSubtitle: $("#hero-subtitle"),
  heroDesc:     $("#hero-desc"),
  heroEyebrow:  $("#hero-eyebrow"),
  heroIndex:    $("#hero-index"),
  miniSpinner:  $("#mini-spinner"),
  spacer:       $("#scroll-spacer"),
  navbar:       $("#navbar"),
  loading:      $("#loading"),
  loaderFill:   $("#loader-bar-fill"),
  loaderPct:    $("#loader-percent"),
  hamburger:    $("#nav-hamburger"),
  navMenu:      $("#nav-menu"),
};

const ctx = dom.canvas.getContext("2d");

// ── STATE ───────────────────────────────────
let currentVariant = 0;
let currentFrameIdx = -1;
let frames = [];
let transitioning = false;

// ── CANVAS SETUP ────────────────────────────
function resizeCanvas() {
  dom.canvas.width = window.innerWidth;
  dom.canvas.height = window.innerHeight;
  if (frames[currentFrameIdx]) {
    requestAnimationFrame(() => drawFrame(frames[currentFrameIdx]));
  }
}

function drawFrame(img) {
  if (!img || !img.complete || img.naturalWidth === 0) return;
  const cW = dom.canvas.width;
  const cH = dom.canvas.height;
  const iR = img.width / img.height;
  const cR = cW / cH;
  let dW, dH, oX, oY;

  if (iR > cR) {
    dH = cH; dW = img.width * (cH / img.height);
    oX = (cW - dW) / 2; oY = 0;
  } else {
    dW = cW; dH = img.height * (cW / img.width);
    oX = 0; oY = (cH - dH) / 2;
  }

  ctx.clearRect(0, 0, cW, cH);
  ctx.drawImage(img, oX, oY, dW, dH);
}

function setFrame(fraction) {
  const count = projectData[currentVariant].frameCount;
  const idx = Math.min(count - 1, Math.max(0, Math.floor(fraction * (count - 1))));
  if (idx !== currentFrameIdx && frames[idx]?.complete) {
    currentFrameIdx = idx;
    requestAnimationFrame(() => drawFrame(frames[idx]));
  }
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ── SCROLL HANDLING ─────────────────────────
let ticking = false;

window.addEventListener("scroll", () => {
  if (!ticking) {
    requestAnimationFrame(onScroll);
    ticking = true;
  }
});

function onScroll() {
  ticking = false;
  if (transitioning) return;

  const scrollY = window.scrollY;
  const maxScroll = dom.spacer.offsetHeight - window.innerHeight;

  // Navbar
  dom.navbar.classList.toggle("scrolled", scrollY > 60);

  // Hero fade — visible throughout parallax, disappears near end
  const fadeZone = 400;
  let heroOp = 1;
  if (maxScroll > 0 && scrollY > maxScroll - fadeZone) {
    heroOp = Math.max(0, 1 - (scrollY - (maxScroll - fadeZone)) / fadeZone);
  }
  document.documentElement.style.setProperty("--hero-opacity", heroOp);

  // Frame update
  if (maxScroll > 0) {
    setFrame(Math.max(0, Math.min(1, scrollY / maxScroll)));
  }
}

// ── IMAGE PRELOADER ─────────────────────────
async function preload(variantIdx, initial = false) {
  const data = projectData[variantIdx];
  frames = new Array(data.frameCount);
  let loaded = 0;
  const concurrency = 20;
  let nextIdx = 0;

  if (initial) {
    dom.loading.classList.remove("hidden");
  }

  return new Promise((resolve) => {
    function pump() {
      while (nextIdx < data.frameCount && nextIdx - loaded < concurrency) {
        const i = nextIdx++;
        const img = new Image();
        img.src = data.getFrameUrl(i);

        const done = () => {
          frames[i] = img;
          loaded++;
          if (initial) {
            const pct = Math.floor((loaded / data.frameCount) * 100);
            dom.loaderFill.style.width = pct + "%";
            dom.loaderPct.textContent = `Rendering ${pct}%`;
          }
          if (loaded === data.frameCount) {
            if (initial) {
              setTimeout(() => {
                dom.loading.classList.add("hidden");
                resolve();
              }, 600);
            } else {
              resolve();
            }
          } else if (nextIdx < data.frameCount) {
            pump();
          }
        };
        img.onload = done;
        img.onerror = () => { console.warn("Frame failed:", i); done(); };
      }
    }
    pump();
  });
}

// ── HERO TEXT UPDATE ────────────────────────
function setHeroText(data) {
  dom.heroTitle.textContent = data.title;
  dom.heroSubtitle.textContent = data.subtitle;
  dom.heroDesc.textContent = data.desc;
  dom.heroIndex.textContent = data.number;
}

// ── VARIANT SWITCHING ───────────────────────
async function switchVariant(dir) {
  if (transitioning) return;
  transitioning = true;

  let next = currentVariant + dir;
  if (next < 0) next = projectData.length - 1;
  if (next >= projectData.length) next = 0;

  // Show spinner
  dom.miniSpinner.style.opacity = "1";

  // Fade out hero elements
  dom.heroContent.style.opacity = "0";
  dom.heroNav.style.opacity = "0";
  dom.canvasWrap.style.opacity = "0";

  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" });
  await sleep(500);

  // Load new frames
  await preload(next, false);

  // Update state
  currentVariant = next;
  setHeroText(projectData[next]);
  currentFrameIdx = -1;
  setFrame(0);

  // Fade in
  dom.miniSpinner.style.opacity = "0";
  dom.canvasWrap.style.opacity = "1";
  dom.heroContent.style.opacity = "";
  dom.heroNav.style.opacity = "";

  await sleep(800);
  transitioning = false;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

$("#prev-btn").addEventListener("click", () => switchVariant(-1));
$("#next-btn").addEventListener("click", () => switchVariant(1));

// ── ACCORDION ───────────────────────────────
$$(".acc-trigger").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const item = trigger.closest(".acc-item");
    const isOpen = item.classList.contains("open");

    // Close all
    $$(".acc-item").forEach((el) => {
      el.classList.remove("open");
      el.querySelector(".acc-trigger").setAttribute("aria-expanded", "false");
    });

    // Open clicked if it was closed
    if (!isOpen) {
      item.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
    }
  });
});

// ── HAMBURGER MENU ──────────────────────────
dom.hamburger.addEventListener("click", () => {
  dom.hamburger.classList.toggle("open");
  dom.navMenu.classList.toggle("open");
});

// Close menu on link click
$$(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    dom.hamburger.classList.remove("open");
    dom.navMenu.classList.remove("open");
  });
});

// ── SCROLL REVEAL ───────────────────────────
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
);

$$(".reveal").forEach((el) => revealObserver.observe(el));

// ── ACTIVE NAV LINK ─────────────────────────
const sections = $$("section[id]");
const navLinks = $$(".nav-link[data-section]");

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navLinks.forEach((l) => l.classList.remove("active"));
        const active = $(`[data-section="${entry.target.id}"]`);
        if (active) active.classList.add("active");
      }
    });
  },
  { threshold: 0.3 }
);

sections.forEach((sec) => sectionObserver.observe(sec));

// ── INIT ────────────────────────────────────
window.addEventListener("load", async () => {
  await preload(0, true);
  setHeroText(projectData[0]);
  setFrame(0);
});
