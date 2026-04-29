/* ============================================================
   RoseAI Final — script.js
   GSAP + ScrollTrigger + Teachable Machine
   ============================================================ */

/* ──────────────────────────────────────────────────────────
   MODEL URL — paste your new Teachable Machine URL here
   ────────────────────────────────────────────────────────── */
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/8CNSZFfiq/";

/* ──────────────────────────────────────────────────────────
   SETTINGS
   ────────────────────────────────────────────────────────── */
const CONFIDENCE_CUTOFF = 0.05;
const MAX_RESULTS       = 3;

/* ──────────────────────────────────────────────────────────
   EXACT CLASS NAMES → DISPLAY NAMES
   ────────────────────────────────────────────────────────── */
const CLASS_MAP = {
  "Black_Spots":  "Black Spot",
  "Downy_Mildew": "Downy Mildew",
  "Healthy_Leafs":"Healthy Leaf",
  "Rose_Rust":    "Rose Rust",
  "Rose_sawfly":  "Rose Sawfly"
};

/* ──────────────────────────────────────────────────────────
   DISEASE INFO — cause + treatment (friendly language)
   ────────────────────────────────────────────────────────── */
const DISEASE_INFO = {
  "Black Spot": {
    cause: "Black Spot is caused by a fungus that loves warm and wet weather. You will notice dark circular spots spreading across the leaf surface. It spreads fast when water stays on the leaves for too long.",
    treat: "Pick off every spotted leaf and throw them in the bin — never compost them. Buy a rose fungicide spray from any garden shop and spray the whole plant every 7 to 10 days. Always water the soil at the base of the plant, never the leaves."
  },
  "Downy Mildew": {
    cause: "Downy Mildew is caused by a water mold that thrives in cool and damp conditions. You will see yellow patches on top of the leaves and a fuzzy grey or purple coating on the underside.",
    treat: "Remove all affected leaves immediately and throw them away. Spray the plant with a copper-based fungicide from any garden centre. Try to improve airflow around your plant by trimming nearby branches and avoid watering the leaves."
  },
  "Healthy Leaf": {
    cause: "No disease detected! Your rose leaf looks perfectly healthy with no signs of infection, damage, or pest activity.",
    treat: "Keep doing what you are doing! Water at the base of the plant every morning, ensure your rose gets at least 6 hours of sunlight daily, and check the underside of leaves once a week for any early signs of disease or insects."
  },
  "Rose Rust": {
    cause: "Rose Rust is a fungal disease that produces bright orange or rusty-coloured powdery spots, mainly on the underside of leaves. It spreads very quickly in warm and humid conditions.",
    treat: "Remove and bin all infected leaves straight away. Spray the entire plant with a sulfur-based fungicide from any garden shop, once every week until the spots disappear. Avoid wetting the leaves when watering your plant."
  },
  "Rose Sawfly": {
    cause: "Rose Sawfly damage is caused by tiny caterpillar-like larvae that eat through the leaf tissue, leaving it looking see-through, skeletonized, or full of small holes. They usually hide on the underside of leaves.",
    treat: "Check underneath every leaf carefully and manually pick off any larvae you find. Spray the plant with neem oil or a general insecticide spray from a garden shop, focusing on the underside of leaves. Repeat every week as new eggs can hatch."
  }
};

/* ──────────────────────────────────────────────────────────
   REGISTER GSAP PLUGINS
   ────────────────────────────────────────────────────────── */
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/* ──────────────────────────────────────────────────────────
   STATE
   ────────────────────────────────────────────────────────── */
let model    = null;
let hasImage = false;

/* ──────────────────────────────────────────────────────────
   DOM REFERENCES
   ────────────────────────────────────────────────────────── */
const fileIn             = document.getElementById("fileIn");
const dz                 = document.getElementById("dz");
const dzIdle             = document.getElementById("dzIdle");
const dzPrev             = document.getElementById("dzPrev");
const prevImg            = document.getElementById("prevImg");
const dzRemove           = document.getElementById("dzRemove");
const analyzeBtn         = document.getElementById("analyzeBtn");
const diagStatus         = document.getElementById("diagStatus");
const summaryBox         = document.getElementById("summaryBox");
const summaryBody        = document.getElementById("summaryBody");
const resultsPlaceholder = document.getElementById("resultsPlaceholder");
const resultsCards       = document.getElementById("resultsCards");
const loadingOverlay     = document.getElementById("loadingOverlay");
const loaderTitle        = document.getElementById("loaderTitle");

/* ══════════════════════════════════════════════════════════
   GSAP ANIMATIONS
   ══════════════════════════════════════════════════════════ */

/* ── Custom Cursor ── */
const cursor         = document.getElementById("cursor");
const cursorFollower = document.getElementById("cursorFollower");
let mouseX = 0, mouseY = 0;
let followerX = 0, followerY = 0;

document.addEventListener("mousemove", e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  gsap.to(cursor, { x: mouseX, y: mouseY, duration: 0.1 });
});

/* Smooth follower */
function animateFollower() {
  followerX += (mouseX - followerX) * 0.08;
  followerY += (mouseY - followerY) * 0.08;
  gsap.set(cursorFollower, { x: followerX, y: followerY });
  requestAnimationFrame(animateFollower);
}
animateFollower();

/* Cursor scale on hover */
document.querySelectorAll("a, button, .d-card, .team-card, .nav-link").forEach(el => {
  el.addEventListener("mouseenter", () => {
    gsap.to(cursor, { scale: 2.5, duration: 0.3 });
    gsap.to(cursorFollower, { scale: 1.5, borderColor: "rgba(74,222,128,0.6)", duration: 0.3 });
  });
  el.addEventListener("mouseleave", () => {
    gsap.to(cursor, { scale: 1, duration: 0.3 });
    gsap.to(cursorFollower, { scale: 1, borderColor: "rgba(74,222,128,0.4)", duration: 0.3 });
  });
});

/* ── Floating Leaves Background ── */
function createLeaves() {
  const layer  = document.getElementById("leavesLayer");
  const emojis = ["🌿","🍃","🌱","☘️","🍀"];
  const count  = 18;

  for (let i = 0; i < count; i++) {
    const leaf = document.createElement("div");
    leaf.className = "leaf";
    leaf.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    leaf.style.left   = Math.random() * 100 + "vw";
    leaf.style.top    = Math.random() * 100 + "vh";
    leaf.style.fontSize = (0.8 + Math.random() * 1.4) + "rem";
    layer.appendChild(leaf);

    /* Infinite floating animation */
    gsap.to(leaf, {
      y: -40 - Math.random() * 60,
      x: (Math.random() - 0.5) * 60,
      rotation: (Math.random() - 0.5) * 40,
      duration: 6 + Math.random() * 8,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      delay: Math.random() * 5
    });
  }
}
createLeaves();

/* ── Navbar scroll effect ── */
ScrollTrigger.create({
  start: "top -80",
  onUpdate: self => {
    const nav = document.getElementById("navbar");
    if (self.progress > 0) {
      nav.style.background = "rgba(4,8,10,0.95)";
    } else {
      nav.style.background = "rgba(4,8,10,0.75)";
    }
  }
});

/* ── Smooth scroll nav links ── */
document.querySelectorAll(".nav-link[data-section], .nav-link-scroll").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    const href = link.getAttribute("href") || "#" + link.dataset.section;
    const target = document.querySelector(href);
    if (target) {
      gsap.to(window, {
        duration: 1.2,
        scrollTo: { y: target, offsetY: 64 },
        ease: "expo.inOut"
      });
    }
  });
});

/* ── Active nav highlight on scroll ── */
const sections = document.querySelectorAll(".section");
sections.forEach(section => {
  ScrollTrigger.create({
    trigger: section,
    start: "top 60%",
    end: "bottom 40%",
    onEnter: () => setActiveNav(section.id),
    onEnterBack: () => setActiveNav(section.id)
  });
});

function setActiveNav(id) {
  document.querySelectorAll(".nav-link[data-section]").forEach(l => {
    l.classList.toggle("active", l.dataset.section === id);
  });
}

/* ══════════════════════════════════════════════════════════
   HERO ANIMATIONS — on page load
   ══════════════════════════════════════════════════════════ */
window.addEventListener("load", () => {
  const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

  /* Tag fade up */
  tl.to("#heroTag", { opacity: 1, y: 0, duration: 0.8 }, 0.3)

  /* Title lines stagger */
  .from(".hero-title .line", {
    y: 80, opacity: 0, duration: 1,
    stagger: 0.15, ease: "expo.out"
  }, 0.5)

  /* Subtitle */
  .to("#heroSub", { opacity: 1, y: 0, duration: 0.8 }, 1.1)

  /* Buttons */
  .to("#heroBtns", { opacity: 1, y: 0, duration: 0.7 }, 1.3)

  /* Stats */
  .to("#heroStats", { opacity: 1, y: 0, duration: 0.7 }, 1.5)

  /* Rose stage scales in */
  .to("#heroRight", {
    opacity: 1, scale: 1, duration: 1.2, ease: "expo.out"
  }, 0.6)

  /* Glow rings pulse in */
  .from(".glow-ring", {
    scale: 0.5, opacity: 0, duration: 1,
    stagger: 0.15, ease: "expo.out"
  }, 0.8)

  /* Disease badges appear one by one */
  .to(["#fb1","#fb2","#fb3","#fb4"], {
    opacity: 1, y: 0, duration: 0.6,
    stagger: 0.25, ease: "back.out(1.7)"
  }, 1.4)

  /* Scroll indicator */
  .to("#scrollInd", { opacity: 1, duration: 0.8 }, 2);

  /* Tag pulse animation */
  gsap.to(".tag-pulse", {
    scale: 0.6, opacity: 0.4, duration: 1,
    repeat: -1, yoyo: true, ease: "sine.inOut"
  });

  /* Glow rings continuous pulse */
  gsap.to(".glow-ring", {
    scale: 1.04, opacity: 0.7, duration: 2.5,
    repeat: -1, yoyo: true, ease: "sine.inOut",
    stagger: 0.4
  });

  /* Badge float animations */
  gsap.to(["#fb1","#fb2","#fb3","#fb4"], {
    y: -10, duration: 3,
    repeat: -1, yoyo: true, ease: "sine.inOut",
    stagger: 0.6
  });
});

/* ── Hero set initial states ── */
gsap.set("#heroTag", { opacity: 0, y: 20 });
gsap.set("#heroSub", { opacity: 0, y: 20 });
gsap.set("#heroBtns", { opacity: 0, y: 20 });
gsap.set("#heroStats", { opacity: 0, y: 20 });
gsap.set("#heroRight", { opacity: 0, scale: 0.85 });
gsap.set(["#fb1","#fb2","#fb3","#fb4"], { opacity: 0, y: 20 });
gsap.set("#scrollInd", { opacity: 0 });

/* ── Hero parallax on mouse move ── */
document.addEventListener("mousemove", e => {
  const xPos = (e.clientX / window.innerWidth - 0.5) * 20;
  const yPos = (e.clientY / window.innerHeight - 0.5) * 20;
  gsap.to("#roseStage", {
    rotationY: xPos * 0.3,
    rotationX: -yPos * 0.3,
    duration: 1.2,
    ease: "power2.out",
    transformPerspective: 1000
  });
  gsap.to(".hero-bg-orb", {
    x: xPos * 0.8,
    y: yPos * 0.8,
    duration: 2,
    ease: "power2.out"
  });
});

/* ── Hero scroll fade out ── */
gsap.to(".hero-section .hero-layout", {
  scrollTrigger: {
    trigger: ".hero-section",
    start: "top top",
    end: "bottom top",
    scrub: 1
  },
  opacity: 0,
  y: -60
});

/* ══════════════════════════════════════════════════════════
   DIAGNOSE SECTION ANIMATIONS
   ══════════════════════════════════════════════════════════ */
gsap.to("#uploadPanel", {
  scrollTrigger: {
    trigger: "#diagnose",
    start: "top 70%",
    toggleActions: "play none none none"
  },
  opacity: 1, x: 0, duration: 1, ease: "expo.out"
});

gsap.to(".results-panel", {
  scrollTrigger: {
    trigger: "#diagnose",
    start: "top 70%",
    toggleActions: "play none none none"
  },
  opacity: 1, x: 0, duration: 1, ease: "expo.out", delay: 0.2
});

gsap.from(".photo-tip", {
  scrollTrigger: {
    trigger: "#diagnose",
    start: "top 75%"
  },
  opacity: 0, y: 20, duration: 0.8, ease: "power2.out"
});

/* ══════════════════════════════════════════════════════════
   DISEASE CARDS STAGGER ANIMATION
   ══════════════════════════════════════════════════════════ */
gsap.to(".d-card", {
  scrollTrigger: {
    trigger: "#diseases",
    start: "top 70%",
    toggleActions: "play none none none"
  },
  opacity: 1, y: 0, duration: 0.8,
  stagger: 0.12, ease: "expo.out"
});

/* Disease card hover — GSAP powered */
document.querySelectorAll(".d-card").forEach(card => {
  card.addEventListener("mouseenter", () => {
    gsap.to(card, { y: -8, scale: 1.02, duration: 0.4, ease: "power2.out" });
    gsap.to(card.querySelector(".d-card-icon"), {
      scale: 1.2, rotation: 8, duration: 0.4, ease: "back.out(1.7)"
    });
  });
  card.addEventListener("mouseleave", () => {
    gsap.to(card, { y: 0, scale: 1, duration: 0.5, ease: "expo.out" });
    gsap.to(card.querySelector(".d-card-icon"), {
      scale: 1, rotation: 0, duration: 0.4, ease: "power2.out"
    });
  });
});

/* ══════════════════════════════════════════════════════════
   ABOUT SECTION ANIMATIONS
   ══════════════════════════════════════════════════════════ */

/* About text col */
gsap.from(".about-text-col .eyebrow, .about-big-title, .about-desc", {
  scrollTrigger: {
    trigger: "#about",
    start: "top 70%"
  },
  opacity: 0, y: 40, duration: 1,
  stagger: 0.15, ease: "expo.out"
});

/* Feature cards */
gsap.to(".ab-feat", {
  scrollTrigger: {
    trigger: ".about-features",
    start: "top 80%"
  },
  opacity: 1, x: 0, duration: 0.8,
  stagger: 0.15, ease: "expo.out"
});

/* Process steps */
gsap.to(".p-step", {
  scrollTrigger: {
    trigger: ".process-block",
    start: "top 75%"
  },
  opacity: 1, y: 0, duration: 0.7,
  stagger: 0.18, ease: "expo.out"
});

/* Animated dotted line */
gsap.to(".p-dot-line", {
  scrollTrigger: {
    trigger: ".process-block",
    start: "top 75%"
  },
  opacity: 1, duration: 1.5,
  stagger: 0.3, ease: "power2.out",
  delay: 0.5
});

/* Team cards */
gsap.to(".team-card", {
  scrollTrigger: {
    trigger: ".team-block",
    start: "top 80%"
  },
  opacity: 1, x: 0, duration: 0.6,
  stagger: 0.1, ease: "expo.out"
});

/* Mission box */
gsap.to(".mission-box", {
  scrollTrigger: {
    trigger: ".team-block",
    start: "top 80%"
  },
  opacity: 1, x: 0, duration: 0.8, ease: "expo.out", delay: 0.3
});

/* Team card hover */
document.querySelectorAll(".team-card").forEach(card => {
  card.addEventListener("mouseenter", () => {
    gsap.to(card, { x: 6, duration: 0.3, ease: "power2.out" });
  });
  card.addEventListener("mouseleave", () => {
    gsap.to(card, { x: 0, duration: 0.4, ease: "expo.out" });
  });
});

/* ══════════════════════════════════════════════════════════
   CONTACT SECTION ANIMATIONS
   ══════════════════════════════════════════════════════════ */
gsap.to(".contact-form-wrap", {
  scrollTrigger: {
    trigger: "#contact",
    start: "top 75%"
  },
  opacity: 1, y: 0, duration: 1, ease: "expo.out"
});

gsap.to(".form-group", {
  scrollTrigger: {
    trigger: "#contact",
    start: "top 75%"
  },
  opacity: 1, y: 0, duration: 0.6,
  stagger: 0.12, ease: "expo.out", delay: 0.2
});

gsap.to(".contact-info-card", {
  scrollTrigger: {
    trigger: "#contact",
    start: "top 75%"
  },
  opacity: 1, x: 0, duration: 0.8,
  stagger: 0.2, ease: "expo.out", delay: 0.3
});

/* Form input focus glow */
document.querySelectorAll(".form-input").forEach(input => {
  input.addEventListener("focus", () => {
    gsap.to(input, { scale: 1.01, duration: 0.3, ease: "power2.out" });
  });
  input.addEventListener("blur", () => {
    gsap.to(input, { scale: 1, duration: 0.3, ease: "power2.out" });
  });
});

/* Submit button bounce */
const submitBtn = document.getElementById("submitBtn");
if (submitBtn) {
  submitBtn.addEventListener("mouseenter", () => {
    gsap.to(submitBtn, { scale: 1.04, duration: 0.3, ease: "back.out(2)" });
  });
  submitBtn.addEventListener("mouseleave", () => {
    gsap.to(submitBtn, { scale: 1, duration: 0.3, ease: "power2.out" });
  });
  submitBtn.addEventListener("click", e => {
    e.preventDefault();
    gsap.timeline()
      .to(submitBtn, { scale: 0.95, duration: 0.1 })
      .to(submitBtn, { scale: 1.05, duration: 0.15 })
      .to(submitBtn, { scale: 1, duration: 0.2, ease: "elastic.out(1,0.5)" });

    /* Show success message */
    setTimeout(() => {
      const successMsg = document.getElementById("successMsg");
      const contactForm = document.getElementById("contactForm");
      if (successMsg && contactForm) {
        successMsg.style.display = "block";
        gsap.from(successMsg, { scale: 0.8, opacity: 0, duration: 0.5, ease: "back.out(1.7)" });
        gsap.from(".success-check", { scale: 0, rotation: -180, duration: 0.6, ease: "back.out(2)", delay: 0.2 });
      }
    }, 400);
  });
}

/* ══════════════════════════════════════════════════════════
   LOAD TEACHABLE MACHINE MODEL
   ══════════════════════════════════════════════════════════ */
async function loadModel() {
  try {
    setStatus("Loading AI model…");
    model = await tmImage.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
    setStatus("✅ Model ready. Upload a leaf image.");
    console.log("Model loaded. Classes:", model.getClassLabels());
  } catch (err) {
    setStatus("⚠ Model failed to load. Check internet.");
    console.error("Model load error:", err);
  }
}
loadModel();

/* ══════════════════════════════════════════════════════════
   FILE UPLOAD + DRAG AND DROP
   ══════════════════════════════════════════════════════════ */
fileIn.addEventListener("change", e => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

dz.addEventListener("dragover", e => { e.preventDefault(); dz.classList.add("drag-over"); });
dz.addEventListener("dragleave", () => dz.classList.remove("drag-over"));
dz.addEventListener("drop", e => {
  e.preventDefault();
  dz.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) handleFile(file);
  else showToast("Please drop a valid image file.");
});

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    prevImg.src = e.target.result;
    dzIdle.style.display = "none";
    dzPrev.style.display = "block";
    analyzeBtn.disabled  = false;
    hasImage = true;
    setStatus("Image ready — press Analyze.");
    hideResults();

    /* GSAP animate preview in */
    gsap.from(prevImg, { scale: 0.85, opacity: 0, duration: 0.5, ease: "back.out(1.7)" });
    gsap.to(analyzeBtn, { scale: 1.02, duration: 0.3, ease: "back.out(2)", yoyo: true, repeat: 1 });
  };
  reader.readAsDataURL(file);
}

dzRemove.addEventListener("click", e => { e.stopPropagation(); resetAll(); });

function resetAll() {
  prevImg.src = "";
  fileIn.value = "";
  dzPrev.style.display = "none";
  dzIdle.style.display = "flex";
  analyzeBtn.disabled  = true;
  hasImage = false;
  hideResults();
  summaryBox.style.display = "none";
  setStatus("Upload a leaf image to begin.");
}

/* ══════════════════════════════════════════════════════════
   ANALYZE BUTTON
   ══════════════════════════════════════════════════════════ */
analyzeBtn.addEventListener("click", async () => {
  if (!hasImage) { showToast("Please upload a leaf image first."); return; }
  if (!model)    { showToast("Model still loading. Please wait."); return; }
  await runPipeline();
});

/* ══════════════════════════════════════════════════════════
   AI PIPELINE
   ══════════════════════════════════════════════════════════ */
async function runPipeline() {
  showLoader("Scanning leaf image…");

  let predictions;
  try {
    predictions = await model.predict(prevImg);
    console.log("Predictions:", predictions);
  } catch (err) {
    hideLoader();
    showToast("Error scanning image. Please try again.");
    console.error(err);
    return;
  }

  /* Filter + sort + top 3 */
  const filtered = predictions
    .sort((a, b) => b.probability - a.probability)
    .slice(0, MAX_RESULTS);

  hideLoader();

  if (filtered.length === 0) { showNoResult(); return; }

  const topName = getDisplayName(filtered[0].className);

  /* Healthy — special card */
  if (filtered[0].className === "Healthy_Leafs" && filtered[0].probability >= 0.70) {
    showHealthyCard();
    updateSummary(filtered, true);
    return;
  }

  showResultShells(filtered);
  updateSummary(filtered, false);
}

/* ── Get display name ── */
function getDisplayName(className) {
  return CLASS_MAP[className] || className;
}

/* ── Build result card shells ── */
function showResultShells(results) {
  resultsPlaceholder.style.display = "none";
  resultsCards.style.display       = "flex";
  resultsCards.innerHTML           = "";

  const rankLabels  = ["👑 Top Match", "2nd Match", "3rd Match"];
  const rankClasses = ["rb-1", "rb-2", "rb-3"];

  results.forEach((item, i) => {
    const pct         = Math.round(item.probability * 100);
    const displayName = getDisplayName(item.className);
    const info        = DISEASE_INFO[displayName] || { cause: "No information available.", treat: "Please consult a local garden centre." };
    const fillCls     = pct >= 60 ? "fill-high" : pct >= 30 ? "fill-med" : "fill-low";
    const pctCls      = pct >= 60 ? "pct-high"  : pct >= 30 ? "pct-med"  : "pct-low";

    const card = document.createElement("div");
    card.className = `res-card${i === 0 ? " rank-1" : ""}`;
    card.innerHTML = `
      <div class="res-card-top">
        <div class="res-name">${displayName}</div>
        <div class="res-rank ${rankClasses[i]}">${rankLabels[i]}</div>
      </div>
      <div class="conf-row">
        <span class="conf-lbl">Match</span>
        <div class="conf-track">
          <div class="conf-fill ${fillCls}" id="fill-${i}"></div>
        </div>
        <span class="conf-pct ${pctCls}">${pct}%</span>
      </div>
      <div class="res-info">
        <div class="info-b cause">
          <div class="info-b-head"><span>🔍</span><h4>What's Causing This</h4></div>
          <p>${info.cause}</p>
        </div>
        <div class="info-b treat">
          <div class="info-b-head"><span>💊</span><h4>What You Should Do</h4></div>
          <p>${info.treat}</p>
        </div>
      </div>
    `;

    resultsCards.appendChild(card);

    /* GSAP animate card in */
    gsap.from(card, {
      opacity: 0, y: 30, duration: 0.6,
      ease: "expo.out", delay: i * 0.15
    });

    /* Animate confidence bar */
    setTimeout(() => {
      const fill = document.getElementById(`fill-${i}`);
      if (fill) fill.style.width = pct + "%";
    }, 300 + i * 150);
  });

  /* Analyze again button */
  const again = document.createElement("button");
  again.className   = "btn-again";
  again.textContent = "↺  Analyze Another Leaf";
  again.addEventListener("click", () => {
    resetAll();
    gsap.to(window, { scrollTo: "#diagnose", duration: 1, ease: "expo.inOut" });
  });
  resultsCards.appendChild(again);
  gsap.from(again, { opacity: 0, y: 20, duration: 0.5, delay: results.length * 0.15 + 0.2 });
}

/* ── Healthy card ── */
function showHealthyCard() {
  resultsPlaceholder.style.display = "none";
  resultsCards.style.display       = "flex";
  resultsCards.innerHTML = `
    <div class="healthy-card">
      <span class="healthy-emoji">🌹</span>
      <h3>Your Rose Looks Healthy!</h3>
      <p>${DISEASE_INFO["Healthy Leaf"].cause}<br/><br/><strong>Care tip:</strong> ${DISEASE_INFO["Healthy Leaf"].treat}</p>
    </div>
    <button class="btn-again" id="btnAgain">↺  Analyze Another Leaf</button>
  `;
  gsap.from(".healthy-card", { scale: 0.9, opacity: 0, duration: 0.6, ease: "back.out(1.7)" });
  document.getElementById("btnAgain").addEventListener("click", () => {
    resetAll();
    gsap.to(window, { scrollTo: "#diagnose", duration: 1, ease: "expo.inOut" });
  });
}

/* ── No result ── */
function showNoResult() {
  resultsPlaceholder.style.display = "none";
  resultsCards.style.display       = "flex";
  resultsCards.innerHTML = `
    <div class="healthy-card" style="border-color:rgba(239,68,68,0.2)">
      <span class="healthy-emoji">🤔</span>
      <h3>No Clear Result</h3>
      <p>The AI could not confidently identify any condition above the 15% threshold. Please try a clearer, well-lit photo of a single rose leaf on a plain background.</p>
    </div>
  `;
  gsap.from(".healthy-card", { scale: 0.9, opacity: 0, duration: 0.5, ease: "back.out(1.7)" });
}

/* ── Summary box ── */
function updateSummary(filtered, isHealthy) {
  summaryBox.style.display = "block";
  if (isHealthy) {
    summaryBody.innerHTML = `<span style="color:var(--green-l)">✅ Plant appears healthy</span>`;
  } else {
    const lines = filtered.map((item, i) => {
      const pct  = Math.round(item.probability * 100);
      const name = getDisplayName(item.className);
      return `<div>${i + 1}. ${name} — <strong>${pct}%</strong></div>`;
    }).join("");
    summaryBody.innerHTML = `<div style="color:#ef4444;margin-bottom:0.4rem">⚠ ${filtered.length} condition${filtered.length > 1 ? "s" : ""} detected</div>${lines}`;
  }
  gsap.from(summaryBox, { opacity: 0, y: 10, duration: 0.4, ease: "power2.out" });
}

/* ══════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════ */
function hideResults() {
  resultsPlaceholder.style.display = "flex";
  resultsCards.style.display       = "none";
  resultsCards.innerHTML           = "";
}

function showLoader(title) {
  if (loaderTitle) loaderTitle.textContent = title;
  loadingOverlay.style.display = "flex";
  gsap.from(".loading-box", { scale: 0.85, opacity: 0, duration: 0.4, ease: "back.out(1.7)" });
}

function hideLoader() {
  gsap.to(".loading-box", {
    scale: 0.85, opacity: 0, duration: 0.3, ease: "power2.in",
    onComplete: () => { loadingOverlay.style.display = "none"; }
  });
}

function setStatus(msg) {
  if (diagStatus) diagStatus.textContent = msg;
}

function showToast(msg) {
  const old = document.getElementById("toast");
  if (old) old.remove();
  const t = document.createElement("div");
  t.id = "toast";
  t.textContent = msg;
  Object.assign(t.style, {
    position: "fixed", bottom: "2rem", left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(4,8,10,0.96)", color: "#ede8df",
    padding: "0.75rem 1.6rem", borderRadius: "100px",
    fontSize: "0.88rem", fontFamily: "'Syne',sans-serif",
    fontWeight: "500", zIndex: "9999",
    boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
    border: "1px solid rgba(74,222,128,0.15)",
    whiteSpace: "nowrap"
  });
  document.body.appendChild(t);
  gsap.from(t, { y: 20, opacity: 0, duration: 0.4, ease: "back.out(1.7)" });
  setTimeout(() => {
    gsap.to(t, { y: 20, opacity: 0, duration: 0.3, ease: "power2.in", onComplete: () => t.remove() });
  }, 3500);
}
