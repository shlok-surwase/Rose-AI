/* ============================================================
   RoseAI v3 — script.js
   API key is safely stored in Netlify — NOT in this file
   ============================================================ */

/* ──────────────────────────────────────────────────────────
   SETTINGS
   ────────────────────────────────────────────────────────── */
const MODEL_URL         = "https://teachablemachine.withgoogle.com/models/gGSxJ1HdOj/";
const CONFIDENCE_CUTOFF = 0.15;
const MAX_RESULTS       = 3;

/* ──────────────────────────────────────────────────────────
   EXACT CLASS NAMES FROM TEACHABLE MACHINE
   ────────────────────────────────────────────────────────── */
const CLASS_DISPLAY_NAMES = {
  "Black Spot":        "Black Spot",
  "Downy Mildew":      "Downy Mildew",
  "Healthy_Leaf_Rose": "Healthy Leaf",
  "Rose_Rust":         "Rose Rust",
  "Rose_Sawfly":       "Rose Sawfly"
};

/* ──────────────────────────────────────────────────────────
   FALLBACK INFO (shown if Netlify function fails)
   ────────────────────────────────────────────────────────── */
const FALLBACK = {
  "Black Spot": {
    cause: "Black Spot is caused by a fungus that loves warm, wet weather. You will notice black or dark brown circles appearing on the leaves.",
    treat: "Pick off all spotted leaves and throw them in the bin. Spray the whole plant with a rose fungicide from any garden shop every 7-10 days. Try watering the soil instead of the leaves."
  },
  "Downy Mildew": {
    cause: "Downy Mildew is caused by a water mold that thrives in cool, damp conditions. It shows up as yellow patches on the top of leaves and a fuzzy grey coating underneath.",
    treat: "Remove affected leaves straight away and throw them away. Buy a copper-based fungicide spray from a garden centre and spray the whole plant. Try to improve airflow around your rose by trimming crowded branches."
  },
  "Healthy Leaf": {
    cause: "No disease detected. Your rose leaf looks perfectly healthy.",
    treat: "Keep doing what you are doing! Water at the base of the plant in the morning and check leaves weekly."
  },
  "Rose Rust": {
    cause: "Rose Rust is a fungal disease that creates orange or rusty-coloured powdery spots, usually on the underside of leaves. It spreads quickly in warm, humid weather.",
    treat: "Remove and bin all infected leaves immediately. Spray the whole plant with a sulfur-based fungicide from any garden shop once a week until clear. Avoid getting the leaves wet when watering."
  },
  "Rose Sawfly": {
    cause: "Sawfly damage is caused by tiny caterpillar-like larvae that eat through the leaf, leaving it looking see-through or full of holes.",
    treat: "Check under every leaf and manually pick off any larvae you can find. Spray the plant with neem oil or an insecticide spray from a garden shop. Check again every week as new eggs can hatch."
  }
};

/* ──────────────────────────────────────────────────────────
   DOM REFERENCES
   ────────────────────────────────────────────────────────── */
const fileIn             = document.getElementById("fileIn");
const dz                 = document.getElementById("dz");
const dzIdle             = document.getElementById("dzIdle");
const dzPrev             = document.getElementById("dzPrev");
const prevImg            = document.getElementById("prevImg");
const dzX                = document.getElementById("dzX");
const analyzeBtn         = document.getElementById("analyzeBtn");
const diagStatus         = document.getElementById("diagStatus");
const summaryBox         = document.getElementById("summaryBox");
const summaryBody        = document.getElementById("summaryBody");
const resultsPlaceholder = document.getElementById("resultsPlaceholder");
const resultsCards       = document.getElementById("resultsCards");
const loadingOverlay     = document.getElementById("loadingOverlay");
const loaderT            = document.getElementById("loaderT");
const loaderS            = document.getElementById("loaderS");

/* ──────────────────────────────────────────────────────────
   STATE
   ────────────────────────────────────────────────────────── */
let model    = null;
let hasImage = false;

/* ──────────────────────────────────────────────────────────
   NAVIGATION
   ────────────────────────────────────────────────────────── */
function goToPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const target = document.getElementById("page-" + pageId);
  if (target) {
    target.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  document.querySelectorAll(".nav-link").forEach(l => {
    l.classList.toggle("active", l.dataset.page === pageId);
  });
}

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    goToPage(link.dataset.page);
  });
});

document.querySelectorAll("[data-page]").forEach(el => {
  if (!el.classList.contains("nav-link")) {
    el.addEventListener("click", () => goToPage(el.dataset.page));
  }
});

/* ──────────────────────────────────────────────────────────
   LOAD MODEL
   ────────────────────────────────────────────────────────── */
async function loadModel() {
  try {
    setStatus("Loading AI model...");
    model = await tmImage.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
    setStatus("Model ready. Upload a leaf image.");
    console.log("Model loaded. Classes:", model.getClassLabels());
  } catch (err) {
    setStatus("Model failed to load. Check internet.");
    console.error("Model load error:", err);
  }
}

loadModel();

/* ──────────────────────────────────────────────────────────
   FILE UPLOAD AND DRAG DROP
   ────────────────────────────────────────────────────────── */
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
    analyzeBtn.disabled = false;
    hasImage = true;
    setStatus("Image ready. Press Analyze.");
    hideResults();
  };
  reader.readAsDataURL(file);
}

/* ──────────────────────────────────────────────────────────
   REMOVE IMAGE
   ────────────────────────────────────────────────────────── */
dzX.addEventListener("click", e => { e.stopPropagation(); resetAll(); });

function resetAll() {
  prevImg.src = "";
  fileIn.value = "";
  dzPrev.style.display = "none";
  dzIdle.style.display = "flex";
  analyzeBtn.disabled = true;
  hasImage = false;
  hideResults();
  summaryBox.style.display = "none";
  setStatus("Upload a leaf image to begin.");
}

/* ──────────────────────────────────────────────────────────
   ANALYZE BUTTON
   ────────────────────────────────────────────────────────── */
analyzeBtn.addEventListener("click", async () => {
  if (!hasImage) { showToast("Please upload a leaf image first."); return; }
  if (!model)    { showToast("Model still loading. Please wait."); return; }
  await runPipeline();
});

/* ──────────────────────────────────────────────────────────
   FULL AI PIPELINE
   ────────────────────────────────────────────────────────── */
async function runPipeline() {
  showLoader("Scanning leaf image...", "Running AI image model");

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

  const filtered = predictions
    .filter(p => p.probability >= CONFIDENCE_CUTOFF)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, MAX_RESULTS);

  hideLoader();

  if (filtered.length === 0) {
    showNoResult();
    return;
  }

  if (filtered[0].className === "Healthy_Leaf_Rose" && filtered[0].probability >= 0.70) {
    showHealthyCard();
    updateSummary(filtered, true);
    return;
  }

  showResultShells(filtered);
  updateSummary(filtered, false);

  await Promise.all(filtered.map((item, i) =>
    fetchExplanation(getDisplayName(item.className), i)
  ));
}

/* ──────────────────────────────────────────────────────────
   GET DISPLAY NAME
   ────────────────────────────────────────────────────────── */
function getDisplayName(className) {
  return CLASS_DISPLAY_NAMES[className] || className;
}

/* ──────────────────────────────────────────────────────────
   SHOW RESULT CARD SHELLS
   ────────────────────────────────────────────────────────── */
function showResultShells(results) {
  resultsPlaceholder.style.display = "none";
  resultsCards.style.display       = "flex";
  resultsCards.innerHTML           = "";

  const rankLabels  = ["👑 Top Match", "2nd Match", "3rd Match"];
  const rankClasses = ["rank-badge-1", "rank-badge-2", "rank-badge-3"];

  results.forEach((item, i) => {
    const pct         = Math.round(item.probability * 100);
    const displayName = getDisplayName(item.className);
    const fillCls     = pct >= 60 ? "fill-high" : pct >= 30 ? "fill-med" : "fill-low";
    const pctCls      = pct >= 60 ? "pct-high"  : pct >= 30 ? "pct-med"  : "pct-low";

    const card = document.createElement("div");
    card.className = `res-card${i === 0 ? " rank-1" : ""}`;
    card.id        = `rcard-${i}`;
    card.style.animationDelay = `${i * 0.1}s`;

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
          <div class="info-b-head">
            <span>🔍</span><h4>What's Causing This</h4>
          </div>
          <div class="mini-load" id="c-load-${i}">
            <div class="mini-spin"></div><span>Getting explanation...</span>
          </div>
          <p id="c-text-${i}" style="display:none"></p>
        </div>
        <div class="info-b treat">
          <div class="info-b-head">
            <span>💊</span><h4>What You Should Do</h4>
          </div>
          <div class="mini-load" id="t-load-${i}">
            <div class="mini-spin"></div><span>Writing treatment plan...</span>
          </div>
          <p id="t-text-${i}" style="display:none"></p>
        </div>
      </div>
    `;

    resultsCards.appendChild(card);

    setTimeout(() => {
      const fill = document.getElementById(`fill-${i}`);
      if (fill) fill.style.width = pct + "%";
    }, 200 + i * 100);
  });

  const again = document.createElement("button");
  again.className = "btn-again";
  again.textContent = "Analyze Another Leaf";
  again.addEventListener("click", () => {
    resetAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  resultsCards.appendChild(again);
}

/* ──────────────────────────────────────────────────────────
   HEALTHY CARD
   ────────────────────────────────────────────────────────── */
function showHealthyCard() {
  resultsPlaceholder.style.display = "none";
  resultsCards.style.display       = "flex";
  resultsCards.innerHTML = `
    <div class="healthy-card">
      <span class="healthy-emoji">🌹</span>
      <h3>Your Rose Looks Healthy!</h3>
      <p>No signs of disease detected. Your leaf appears vibrant and healthy.<br/><br/>
      <strong>Keep it up:</strong> Water at the base in the morning, ensure 6+ hours of sunlight daily,
      and check the underside of leaves weekly for early signs of pests or spots.</p>
    </div>
    <button class="btn-again" id="btnAgain">Analyze Another Leaf</button>
  `;
  document.getElementById("btnAgain").addEventListener("click", () => {
    resetAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* ──────────────────────────────────────────────────────────
   NO RESULT
   ────────────────────────────────────────────────────────── */
function showNoResult() {
  resultsPlaceholder.style.display = "none";
  resultsCards.style.display       = "flex";
  resultsCards.innerHTML = `
    <div class="healthy-card" style="border-color:rgba(239,68,68,0.2)">
      <span class="healthy-emoji">🤔</span>
      <h3>No Clear Result</h3>
      <p>The AI could not confidently identify any condition above the 15% threshold.
      Please try a clearer, well-lit photo of a single rose leaf.</p>
    </div>
  `;
}

/* ──────────────────────────────────────────────────────────
   SUMMARY BOX
   ────────────────────────────────────────────────────────── */
function updateSummary(filtered, isHealthy) {
  summaryBox.style.display = "block";
  if (isHealthy) {
    summaryBody.innerHTML = `<span style="color:var(--green-light)">Plant appears healthy</span>`;
  } else {
    const lines = filtered.map((item, i) => {
      const pct  = Math.round(item.probability * 100);
      const name = getDisplayName(item.className);
      return `<div>${i + 1}. ${name} - <strong>${pct}%</strong></div>`;
    }).join("");
    summaryBody.innerHTML = `
      <div style="color:var(--red);margin-bottom:0.5rem">
        ${filtered.length} condition${filtered.length > 1 ? "s" : ""} detected
      </div>
      ${lines}
    `;
  }
}

/* ──────────────────────────────────────────────────────────
   FETCH EXPLANATION via Netlify Function
   API key is safely hidden in Netlify — not in this file
   ────────────────────────────────────────────────────────── */
async function fetchExplanation(displayName, cardIndex) {
  try {
    const res = await fetch("/.netlify/functions/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diseaseName: displayName })
    });

    if (!res.ok) throw new Error(`Function error: ${res.status}`);

    const data = await res.json();

    fillCard(cardIndex,
      data.cause     || FALLBACK[displayName]?.cause || "No explanation available.",
      data.treatment || FALLBACK[displayName]?.treat || "Please consult a local garden centre."
    );

  } catch (err) {
    console.error(`Error for ${displayName}:`, err);
    const fb = FALLBACK[displayName] || {
      cause: "Could not load explanation.",
      treat: "Please consult a local garden centre."
    };
    fillCard(cardIndex, fb.cause, fb.treat);
  }
}

/* ──────────────────────────────────────────────────────────
   FILL CARD TEXT
   ────────────────────────────────────────────────────────── */
function fillCard(index, causeText, treatText) {
  const cLoad = document.getElementById(`c-load-${index}`);
  const cText = document.getElementById(`c-text-${index}`);
  const tLoad = document.getElementById(`t-load-${index}`);
  const tText = document.getElementById(`t-text-${index}`);

  if (cLoad) cLoad.style.display = "none";
  if (tLoad) tLoad.style.display = "none";
  if (cText) { cText.textContent = causeText; cText.style.display = "block"; }
  if (tText) { tText.textContent = treatText; tText.style.display = "block"; }
}

/* ──────────────────────────────────────────────────────────
   HELPERS
   ────────────────────────────────────────────────────────── */
function hideResults() {
  resultsPlaceholder.style.display = "flex";
  resultsCards.style.display       = "none";
  resultsCards.innerHTML           = "";
}

function showLoader(title, sub) {
  loaderT.textContent = title;
  loaderS.textContent = sub;
  loadingOverlay.style.display = "flex";
}

function hideLoader() {
  loadingOverlay.style.display = "none";
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
    transform: "translateX(-50%) translateY(16px)",
    background: "rgba(10,20,16,0.95)", color: "#f0ede6",
    padding: "0.75rem 1.6rem", borderRadius: "100px",
    fontSize: "0.88rem", fontFamily: "'Plus Jakarta Sans',sans-serif",
    fontWeight: "500", zIndex: "9999", opacity: "0",
    transition: "all 0.35s ease", whiteSpace: "nowrap",
    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
    border: "1px solid rgba(74,222,128,0.15)"
  });
  document.body.appendChild(t);
  requestAnimationFrame(() => {
    t.style.opacity = "1";
    t.style.transform = "translateX(-50%) translateY(0)";
  });
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateX(-50%) translateY(16px)";
    setTimeout(() => t.remove(), 350);
  }, 3500);
}
