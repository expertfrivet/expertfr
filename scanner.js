/* ExpertFR mobile — outil « document » (comme le mode Document d'un appareil photo).
 *
 * scannerDocument(fichier, titre) → Promise<Blob JPEG | null>
 * 1. l'appli cherche seule les 4 coins de la feuille (OpenCV, chargé à la
 *    première utilisation puis gardé dans le téléphone) ;
 * 2. on peut faire glisser chaque coin ;
 * 3. la photo est redressée (vue de face) et le contour coupé ;
 * 4. aperçu : « Valider », « Ajuster les coins » ou « Reprendre ».
 * Le redressement lui-même est fait ici, sans OpenCV : il marche donc
 * même si l'outil de détection n'a pas pu être chargé (coins à placer à la main).
 * Utilise toast() (app.js).
 */
"use strict";

// ── Chargement d'OpenCV (détection des coins seulement) ───────────────────
let _cvPret = null;
function chargerOpenCV() {
  if (_cvPret) return _cvPret;
  _cvPret = new Promise((resolve, reject) => {
    if (window.cv && window.cv.Mat) return resolve(window.cv);
    const s = document.createElement("script");
    s.src = "opencv.js"; s.async = true;
    s.onload = async () => {
      try {
        let c = window.cv;
        // Le module d'OpenCV est « thenable » : on ne l'attend pas avec await (boucle sans fin)
        if (c && !c.Mat && typeof c.then === "function") c = await new Promise(r => c.then(m => { delete m.then; r(m); }));
        else if (c && !c.Mat) await new Promise(r => { c.onRuntimeInitialized = r; });
        window.cv = c;
        resolve(c);
      } catch (e) { reject(e); }
    };
    s.onerror = () => reject(new Error("outil de détection indisponible"));
    document.head.appendChild(s);
  });
  _cvPret.catch(() => { _cvPret = null; });   // on réessaiera la prochaine fois
  return _cvPret;
}

// ── Géométrie ─────────────────────────────────────────────────────────────
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Ordre : haut-gauche, haut-droite, bas-droite, bas-gauche
function ordonner(pts) {
  const s = [...pts].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  const hg = s[0], bd = s[3];
  const reste = [s[1], s[2]].sort((a, b) => (a.y - a.x) - (b.y - b.x));
  return [hg, reste[0], bd, reste[1]];
}

// Homographie qui envoie dst[i] → src[i] (résolution d'un système 8×8)
function homographie(dst, src) {
  const A = [], B = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = dst[i], { x: u, y: v } = src[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); B.push(v);
  }
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [B[c], B[p]] = [B[p], B[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
      B[r] -= f * B[c];
    }
  }
  return B.map((b, i) => b / A[i][i]).concat(1);
}

// Redresse le quadrilatère « coins » de l'image source en un rectangle
function redresser(srcCanvas, coins) {
  const [hg, hd, bd, bg] = coins;
  const W = Math.round(Math.max(dist(hg, hd), dist(bg, bd)));
  const H = Math.round(Math.max(dist(hg, bg), dist(hd, bd)));
  const k = Math.min(1, 2400 / Math.max(W, H));
  const w = Math.max(10, Math.round(W * k)), h = Math.max(10, Math.round(H * k));
  const m = homographie([{ x: 0, y: 0 }, { x: w - 1, y: 0 }, { x: w - 1, y: h - 1 }, { x: 0, y: h - 1 }], coins);
  const sw = srcCanvas.width, sh = srcCanvas.height;
  const sd = srcCanvas.getContext("2d").getImageData(0, 0, sw, sh).data;
  const out = document.createElement("canvas");
  out.width = w; out.height = h;
  const ctx = out.getContext("2d");
  const im = ctx.createImageData(w, h), od = im.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const z = m[6] * x + m[7] * y + 1;
      const u = (m[0] * x + m[1] * y + m[2]) / z, v = (m[3] * x + m[4] * y + m[5]) / z;
      const x0 = Math.floor(u), y0 = Math.floor(v);
      const o = (y * w + x) * 4;
      if (x0 < 0 || y0 < 0 || x0 >= sw - 1 || y0 >= sh - 1) { od[o] = od[o + 1] = od[o + 2] = 255; od[o + 3] = 255; continue; }
      const fx = u - x0, fy = v - y0, i = (y0 * sw + x0) * 4, j = i + sw * 4;
      for (let c = 0; c < 3; c++) {
        od[o + c] = (sd[i + c] * (1 - fx) + sd[i + 4 + c] * fx) * (1 - fy) + (sd[j + c] * (1 - fx) + sd[j + 4 + c] * fx) * fy;
      }
      od[o + 3] = 255;
    }
  }
  ctx.putImageData(im, 0, 0);
  return out;
}

// Recherche automatique des 4 coins (sur une copie réduite), ou null
function detecterCoins(cv, canvas) {
  const k = Math.min(1, 800 / Math.max(canvas.width, canvas.height));
  const petit = document.createElement("canvas");
  petit.width = Math.round(canvas.width * k); petit.height = Math.round(canvas.height * k);
  petit.getContext("2d").drawImage(canvas, 0, 0, petit.width, petit.height);
  const aire = petit.width * petit.height;
  const src = cv.imread(petit), gris = new cv.Mat(), bords = new cv.Mat(), contours = new cv.MatVector(), h = new cv.Mat();
  let meilleur = null, aireMax = 0;
  try {
    cv.cvtColor(src, gris, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gris, gris, new cv.Size(5, 5), 0);
    for (const [bas, haut] of [[50, 150], [20, 80], [75, 200]]) {
      cv.Canny(gris, bords, bas, haut);
      const noyau = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
      cv.dilate(bords, bords, noyau); noyau.delete();
      cv.findContours(bords, contours, h, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
      for (let i = 0; i < contours.size(); i++) {
        const c = contours.get(i), a = cv.contourArea(c);
        if (a > aire * 0.12 && a > aireMax) {
          const approx = new cv.Mat();
          cv.approxPolyDP(c, approx, 0.02 * cv.arcLength(c, true), true);
          if (approx.rows === 4 && cv.isContourConvex(approx)) {
            aireMax = a;
            meilleur = [0, 1, 2, 3].map(n => ({ x: approx.data32S[n * 2] / k, y: approx.data32S[n * 2 + 1] / k }));
          }
          approx.delete();
        }
        c.delete();
      }
      if (meilleur) break;
    }
  } finally {
    [src, gris, bords, contours, h].forEach(x => x.delete());
  }
  return meilleur ? ordonner(meilleur) : null;
}

// ── Écran plein page ──────────────────────────────────────────────────────
async function imageVersCanvas(fichier) {
  let img;
  try { img = await createImageBitmap(fichier, { imageOrientation: "from-image" }); }
  catch (e) { img = await createImageBitmap(fichier); }
  const k = Math.min(1, 2600 / Math.max(img.width, img.height));
  const cv = document.createElement("canvas");
  cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
  cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
  img.close && img.close();
  return cv;
}

function scannerDocument(fichier, titre) {
  return new Promise(async resolve => {
    let source;
    try { source = await imageVersCanvas(fichier); }
    catch (e) { toast("Photo illisible"); return resolve(null); }
    const W = source.width, H = source.height;
    const marge = 0.08;
    let coins = [{ x: W * marge, y: H * marge }, { x: W * (1 - marge), y: H * marge },
                 { x: W * (1 - marge), y: H * (1 - marge) }, { x: W * marge, y: H * (1 - marge) }];
    let trouve = false, resultat = null;

    const $s = document.createElement("div");
    $s.id = "scan";
    document.body.appendChild($s);
    const fermer = v => { $s.remove(); document.body.style.overflow = ""; resolve(v); };
    document.body.style.overflow = "hidden";

    function ecranCoins(msg) {
      $s.innerHTML = `<div class="scan-haut"><b>${titre || "📄 Document"}</b><span>${msg}</span></div>
        <div class="scan-zone"><canvas id="scan-cv"></canvas></div>
        <div class="scan-bas"><button class="btn light" id="scan-annuler">✕ Annuler</button>
          <button class="btn" id="scan-ok">Redresser ›</button></div>`;
      const cvs = document.getElementById("scan-cv"), zone = $s.querySelector(".scan-zone");
      const k = Math.min(zone.clientWidth / W, zone.clientHeight / H);
      cvs.width = Math.round(W * k); cvs.height = Math.round(H * k);
      const ctx = cvs.getContext("2d");
      const dessiner = () => {
        ctx.drawImage(source, 0, 0, cvs.width, cvs.height);
        ctx.fillStyle = "rgba(0,0,0,.35)";
        ctx.beginPath(); ctx.rect(0, 0, cvs.width, cvs.height);
        ctx.moveTo(coins[0].x * k, coins[0].y * k); [3, 2, 1].forEach(i => ctx.lineTo(coins[i].x * k, coins[i].y * k)); ctx.closePath();
        ctx.fill("evenodd");
        ctx.strokeStyle = "#F59E0B"; ctx.lineWidth = 3;
        ctx.beginPath(); coins.forEach((p, i) => i ? ctx.lineTo(p.x * k, p.y * k) : ctx.moveTo(p.x * k, p.y * k)); ctx.closePath(); ctx.stroke();
        coins.forEach(p => { ctx.beginPath(); ctx.arc(p.x * k, p.y * k, 13, 0, 7); ctx.fillStyle = "#F59E0B"; ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = "#fff"; ctx.stroke(); });
      };
      dessiner();
      let tenu = -1;
      const pos = e => { const r = cvs.getBoundingClientRect(); return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }; };
      cvs.onpointerdown = e => {
        const p = pos(e);
        let best = -1, d = 60 / k;
        coins.forEach((c, i) => { const x = dist(c, p); if (x < d) { d = x; best = i; } });
        tenu = best;
        if (tenu >= 0) cvs.setPointerCapture(e.pointerId);
      };
      cvs.onpointermove = e => {
        if (tenu < 0) return;
        const p = pos(e);
        coins[tenu] = { x: Math.max(0, Math.min(W - 1, p.x)), y: Math.max(0, Math.min(H - 1, p.y)) };
        dessiner();
      };
      cvs.onpointerup = cvs.onpointercancel = () => { tenu = -1; };
      document.getElementById("scan-annuler").onclick = () => fermer(null);
      document.getElementById("scan-ok").onclick = () => {
        const b = document.getElementById("scan-ok");
        b.disabled = true; b.textContent = "⏳ Redressement…";
        setTimeout(() => { resultat = redresser(source, ordonner(coins)); ecranApercu(); }, 30);
      };
    }

    function ecranApercu() {
      $s.innerHTML = `<div class="scan-haut"><b>${titre || "📄 Document"}</b><span>Vérifiez le résultat</span></div>
        <div class="scan-zone"><img id="scan-img" alt="Document redressé"></div>
        <div class="scan-bas"><button class="btn light" id="scan-coins">↺ Ajuster les coins</button>
          <button class="btn" id="scan-valider" style="background:var(--client);border-color:var(--client)">✓ Garder</button></div>`;
      document.getElementById("scan-img").src = resultat.toDataURL("image/jpeg", 0.8);
      document.getElementById("scan-coins").onclick = () => ecranCoins("Faites glisser les coins orange");
      document.getElementById("scan-valider").onclick = () => resultat.toBlob(b => fermer(b), "image/jpeg", 0.9);
    }

    $s.innerHTML = `<div class="scan-haut"><b>${titre || "📄 Document"}</b><span>⏳ Recherche des bords du document…</span></div><div class="scan-zone"></div>`;
    try {
      const cv = await Promise.race([chargerOpenCV(), new Promise((_, r) => setTimeout(() => r(new Error("trop long")), 25000))]);
      const c = detecterCoins(cv, source);
      if (c) { coins = c; trouve = true; }
    } catch (e) { /* détection indisponible : coins à placer à la main */ }
    ecranCoins(trouve ? "Bords trouvés · faites glisser un coin si besoin" : "Placez les 4 coins orange sur les bords du document");
  });
}

// Bouton « 📄 Document » : prend la photo puis ouvre l'outil
function choisirDocument(capture) {
  return new Promise(resolve => {
    const i = document.createElement("input");
    i.type = "file"; i.accept = "image/*";
    if (capture) i.capture = "environment";
    i.onchange = () => resolve(i.files[0] || null);
    i.click();
  });
}
