/* ==========================================================================
   JEVIS project page — behaviour
   1. Media slots   — probe data-src; swap the marker for the real file
   2. Math          — KaTeX render, graceful fallback
   3. Radar chart   — interactive, driven by window.JEVIS_RESULTS
   4. Results table — the numbers behind the radar
   5. AUSE bars
   6. Nav scroll-spy, copy button, back-to-top
   ========================================================================== */
(function () {
  "use strict";

  var D = window.JEVIS_RESULTS || null;

  /* ---------- shared palette (mirrors tools/make_charts.py) ---------- */
  var STYLE = {
    "JEVIS":       { color: "#2a78d6", width: 3,   dash: [],      fill: "rgba(42,120,214,.18)", order: 0 },
    "GAVIS":       { color: "#eb6834", width: 2,   dash: [],      fill: null, order: 1 },
    "MAGICIAN":    { color: "#1baf7a", width: 2,   dash: [],      fill: null, order: 2 },
    "COVER":       { color: "#4a3aa7", width: 2,   dash: [],      fill: null, order: 3 },
    "VIMC":        { color: "#898781", width: 1.5, dash: [],      fill: null, order: 4 },
    "BB+FisherRF": { color: "#898781", width: 1.5, dash: [6, 4],  fill: null, order: 5 },
    "FisherRF":    { color: "#898781", width: 1.5, dash: [2, 3],  fill: null, order: 6 }
  };
  var R_MIN = 0.22, R_MAX = 1.0;

  /* ======================================================================
     1. MEDIA SLOTS
     Each .slot carries data-src. We probe that URL; if it resolves, the real
     media replaces the dashed marker. Until the author drops the file in,
     the marker stays and explains what belongs there.
     ====================================================================== */
  function loadSlots() {
    var slots = document.querySelectorAll(".slot[data-src]");
    Array.prototype.forEach.call(slots, function (slot) {
      var src = slot.getAttribute("data-src");
      var box = slot.querySelector(".slot-box");
      if (!src || !box) return;

      var isVideo = /\.(mp4|webm|mov)$/i.test(src);

      if (isVideo) {
        var v = document.createElement("video");
        v.src = src; v.autoplay = true; v.loop = true; v.muted = true;
        v.playsInline = true; v.setAttribute("playsinline", "");
        v.preload = "metadata";
        v.addEventListener("loadeddata", function () { box.insertBefore(v, box.firstChild); slot.classList.add("is-loaded"); });
        v.addEventListener("error", function () { slot.classList.add("is-missing"); });
        return;
      }

      var probe = new Image();
      probe.onload = function () {
        var img = document.createElement("img");
        img.src = src;
        img.alt = (slot.querySelector(".slot-ph strong") || {}).textContent || "";
        img.loading = "lazy";
        img.decoding = "async";
        box.insertBefore(img, box.firstChild);
        slot.classList.add("is-loaded");
        /* adapt: let the real aspect ratio win instead of the placeholder's guess */
        if (slot.getAttribute("data-adapt") === "true" && probe.naturalWidth && probe.naturalHeight) {
          slot.style.setProperty("--ar", probe.naturalWidth + " / " + probe.naturalHeight);
        }
      };
      probe.onerror = function () { slot.classList.add("is-missing"); };
      probe.src = src;
    });
  }

  /* ======================================================================
     2. MATH
     ====================================================================== */
  function renderMath() {
    var blocks = document.querySelectorAll(".math[data-tex], .math-inline[data-tex]");
    var hasKatex = typeof window.katex !== "undefined";
    Array.prototype.forEach.call(blocks, function (el) {
      var tex = el.getAttribute("data-tex");
      var display = el.classList.contains("math");
      if (!hasKatex) {
        if (display) {
          el.classList.add("fallback");
          el.textContent = el.getAttribute("data-fallback") || tex;
        }
        return; /* inline elements already contain readable unicode fallback text */
      }
      try {
        window.katex.render(tex, el, {
          displayMode: display,
          throwOnError: false,
          trust: false,
          macros: { "\\bm": "\\boldsymbol{#1}" }
        });
      } catch (e) {
        if (display) { el.classList.add("fallback"); el.textContent = el.getAttribute("data-fallback") || tex; }
      }
    });
  }

  /* ======================================================================
     3. RADAR CHART
     ====================================================================== */
  var state = { setting: "single", dataset: "avg", hidden: {} };
  var radar = null;

  function datasetKeys() {
    return ["avg"].concat(D.datasets.map(function (d) { return d.key; }));
  }
  function datasetLabel(k) {
    if (k === "avg") return "Average";
    var m = D.datasets.filter(function (d) { return d.key === k; })[0];
    return m ? m.label : k;
  }

  /* raw means for one setting/dataset (or averaged over datasets) */
  function blockValues(setting, dsKey) {
    var out = {};
    D.methods.forEach(function (m) {
      out[m] = {};
      D.metrics.forEach(function (met) {
        if (dsKey === "avg") {
          var sum = 0;
          D.datasets.forEach(function (ds) { sum += D.settings[setting][ds.key][m][met.key][0]; });
          out[m][met.key] = sum / D.datasets.length;
        } else {
          out[m][met.key] = D.settings[setting][dsKey][m][met.key][0];
        }
      });
    });
    return out;
  }

  /* min–max normalise each axis across methods, invert "lower is better" */
  function normalise(values) {
    var out = {};
    D.methods.forEach(function (m) { out[m] = []; });
    D.metrics.forEach(function (met) {
      var col = D.methods.map(function (m) { return values[m][met.key]; });
      var lo = Math.min.apply(null, col), hi = Math.max.apply(null, col);
      var span = hi > lo ? hi - lo : 1;
      D.methods.forEach(function (m, i) {
        var s = (col[i] - lo) / span;
        if (!met.higher_is_better) s = 1 - s;
        out[m].push(R_MIN + (R_MAX - R_MIN) * s);
      });
    });
    return out;
  }

  function buildRadar() {
    var canvas = document.getElementById("radarChart");
    if (!canvas || !window.Chart || !D) return;

    var values = blockValues(state.setting, state.dataset);
    var norm = normalise(values);
    var ordered = D.methods.slice().sort(function (a, b) { return STYLE[b].order - STYLE[a].order; });

    var datasets = ordered.map(function (m) {
      var st = STYLE[m];
      return {
        label: m,
        data: norm[m],
        _raw: D.metrics.map(function (met) { return values[m][met.key]; }),
        borderColor: st.color,
        backgroundColor: st.fill || "transparent",
        borderWidth: st.width,
        borderDash: st.dash,
        fill: !!st.fill,
        pointRadius: m === D.ours ? 4 : 0,
        pointHoverRadius: 6,
        pointBackgroundColor: st.color,
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        hidden: !!state.hidden[m],
        order: st.order
      };
    });

    var cfg = {
      type: "radar",
      data: { labels: D.metrics.map(function (m) { return m.label; }), datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        layout: { padding: 6 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#0f1115",
            titleFont: { family: "Inter, system-ui, sans-serif", size: 12, weight: "600" },
            bodyFont: { family: "Inter, system-ui, sans-serif", size: 12 },
            padding: 10,
            displayColors: true,
            callbacks: {
              title: function (items) { return items.length ? items[0].label : ""; },
              label: function (ctx) {
                var raw = ctx.dataset._raw[ctx.dataIndex];
                var met = D.metrics[ctx.dataIndex];
                var v = met.key === "PSNR" ? raw.toFixed(2) : raw.toFixed(3);
                var name = ctx.dataset.label + (ctx.dataset.label === D.ours ? " (ours)" : "");
                return name + ": " + v;
              }
            }
          }
        },
        scales: {
          r: {
            min: 0, max: 1.04,
            ticks: { display: false, stepSize: 0.25 },
            grid: { color: "#e4e5e0" },
            angleLines: { color: "#e4e5e0" },
            pointLabels: {
              color: "#0f1115",
              font: { family: "Inter, system-ui, sans-serif", size: 13, weight: "600" },
              padding: 10
            }
          }
        }
      }
    };

    if (radar) { radar.destroy(); }
    radar = new Chart(canvas.getContext("2d"), cfg);
  }

  function buildRadarLegend() {
    var host = document.getElementById("radarLegend");
    if (!host || !D) return;
    host.innerHTML = "";
    var reading = ["JEVIS", "GAVIS", "MAGICIAN", "COVER", "VIMC", "BB+FisherRF", "FisherRF"]
      .filter(function (m) { return D.methods.indexOf(m) !== -1; });

    reading.forEach(function (m) {
      var st = STYLE[m];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-pressed", state.hidden[m] ? "false" : "true");
      btn.dataset.method = m;

      var sample = document.createElement("span");
      sample.className = "sample" + (st.dash.length === 2 && st.dash[0] === 6 ? " dashed" : (st.dash.length ? " dotted" : ""));
      sample.style.color = st.color;
      sample.style.borderTopWidth = st.width + "px";

      var name = document.createElement("span");
      if (m === D.ours) { name.className = "ours"; name.textContent = m + " (ours)"; }
      else { name.textContent = m; }

      btn.appendChild(sample);
      btn.appendChild(name);
      btn.addEventListener("click", function () {
        state.hidden[m] = !state.hidden[m];
        btn.setAttribute("aria-pressed", state.hidden[m] ? "false" : "true");
        if (radar) {
          radar.data.datasets.forEach(function (ds) { if (ds.label === m) ds.hidden = !!state.hidden[m]; });
          radar.update();
        }
      });
      host.appendChild(btn);
    });
  }

  function buildControls() {
    var pills = document.getElementById("datasetPills");
    if (pills && D) {
      pills.innerHTML = "";
      datasetKeys().forEach(function (k) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = datasetLabel(k);
        b.dataset.dataset = k;
        b.setAttribute("aria-pressed", k === state.dataset ? "true" : "false");
        b.addEventListener("click", function () {
          state.dataset = k;
          Array.prototype.forEach.call(pills.children, function (c) {
            c.setAttribute("aria-pressed", c === b ? "true" : "false");
          });
          buildRadar(); buildTable();
        });
        pills.appendChild(b);
      });
    }

    var seg = document.getElementById("settingToggle");
    if (seg) {
      Array.prototype.forEach.call(seg.querySelectorAll("button"), function (b) {
        b.addEventListener("click", function () {
          state.setting = b.dataset.setting;
          Array.prototype.forEach.call(seg.querySelectorAll("button"), function (o) {
            o.setAttribute("aria-pressed", o === b ? "true" : "false");
          });
          buildRadar(); buildTable();
        });
      });
    }
  }

  /* ======================================================================
     4. RESULTS TABLE (the numbers behind the radar)
     ====================================================================== */
  function fmt(v, key) { return key === "PSNR" ? v.toFixed(2) : v.toFixed(3); }

  function buildTable() {
    var host = document.getElementById("resultsTable");
    if (!host || !D) return;
    var table = host.querySelector("table");
    var thead = table.querySelector("thead");
    var tbody = table.querySelector("tbody");

    var showAvg = state.dataset === "avg";
    thead.innerHTML = "";
    var hr = document.createElement("tr");
    hr.appendChild(th("Method"));
    D.metrics.forEach(function (m) { hr.appendChild(th(m.label)); });
    thead.appendChild(hr);

    var values = blockValues(state.setting, state.dataset);

    /* rank per metric to mark best / second */
    var rank = {};
    D.metrics.forEach(function (met) {
      var sorted = D.methods.slice().sort(function (a, b) {
        return met.higher_is_better ? values[b][met.key] - values[a][met.key] : values[a][met.key] - values[b][met.key];
      });
      rank[met.key] = sorted;
    });

    tbody.innerHTML = "";
    D.methods.forEach(function (m) {
      var tr = document.createElement("tr");
      if (m === D.ours) tr.className = "ours";
      var name = document.createElement("td");
      name.textContent = m === D.ours ? m + " (ours)" : m;
      if (m === D.ours) name.style.fontWeight = "700";
      tr.appendChild(name);

      D.metrics.forEach(function (met) {
        var td = document.createElement("td");
        td.textContent = fmt(values[m][met.key], met.key);
        if (rank[met.key][0] === m) td.className = "best";
        else if (rank[met.key][1] === m) td.className = "second";
        /* standard error only exists per-dataset, not for the average */
        if (!showAvg) {
          var sd = D.settings[state.setting][state.dataset][m][met.key][1];
          var s = document.createElement("span");
          s.className = "sd";
          s.textContent = "±" + (met.key === "PSNR" ? sd.toFixed(2) : sd.toFixed(3));
          td.appendChild(s);
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  function th(text) { var e = document.createElement("th"); e.scope = "col"; e.textContent = text; return e; }

  function wireTableToggle(btnId, panelId) {
    var btn = document.getElementById(btnId), panel = document.getElementById(panelId);
    if (!btn || !panel) return;
    btn.addEventListener("click", function () {
      var open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? "Hide the numbers" : "Show the numbers";
    });
  }

  /* ======================================================================
     5. AUSE BARS
     ====================================================================== */
  function buildAuse() {
    if (!D || !window.Chart || !D.ause) return;
    var vals = D.ause.values;
    /* one fixed row order for both panels so rows line up */
    var order = D.methods.slice().sort(function (a, b) { return vals[a]["AUSE-D"] - vals[b]["AUSE-D"]; });

    D.ause.metrics.forEach(function (met, i) {
      var canvas = document.getElementById(i === 0 ? "auseD" : "auseV");
      if (!canvas) return;
      new Chart(canvas.getContext("2d"), {
        type: "bar",
        data: {
          labels: order.map(function (m) { return m === D.ours ? m + " (ours)" : m; }),
          datasets: [{
            data: order.map(function (m) { return vals[m][met.key]; }),
            backgroundColor: order.map(function (m) {
              return ["JEVIS", "GAVIS", "MAGICIAN", "COVER"].indexOf(m) !== -1 ? STYLE[m].color : "#c9cbc4";
            }),
            borderRadius: 4,
            borderSkipped: false,
            barPercentage: 0.72
          }]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#0f1115", padding: 10, displayColors: false,
              callbacks: { label: function (ctx) { return met.label.replace(" ↓", "") + ": " + ctx.parsed.x.toFixed(3); } }
            }
          },
          scales: {
            x: {
              beginAtZero: true, suggestedMax: 0.6,
              grid: { color: "#e4e5e0", drawBorder: false },
              ticks: { color: "#8a8f99", font: { family: "Inter, system-ui, sans-serif", size: 11 } }
            },
            y: {
              grid: { display: false, drawBorder: false },
              ticks: {
                color: "#0f1115",
                font: function (ctx) {
                  var lab = ctx.tick && ctx.tick.label ? String(ctx.tick.label) : "";
                  return { family: "Inter, system-ui, sans-serif", size: 12, weight: lab.indexOf("ours") !== -1 ? "700" : "400" };
                }
              }
            }
          }
        }
      });
    });
  }

  function buildAuseTable() {
    var host = document.getElementById("auseTable");
    if (!host || !D || !D.ause) return;
    var table = host.querySelector("table");
    var thead = table.querySelector("thead"), tbody = table.querySelector("tbody");
    thead.innerHTML = ""; tbody.innerHTML = "";
    var hr = document.createElement("tr");
    hr.appendChild(th("Method"));
    D.ause.metrics.forEach(function (m) { hr.appendChild(th(m.label)); });
    thead.appendChild(hr);

    var vals = D.ause.values;
    var rank = {};
    D.ause.metrics.forEach(function (met) {
      rank[met.key] = D.methods.slice().sort(function (a, b) { return vals[a][met.key] - vals[b][met.key]; });
    });

    D.methods.forEach(function (m) {
      var tr = document.createElement("tr");
      if (m === D.ours) tr.className = "ours";
      var name = document.createElement("td");
      name.textContent = m === D.ours ? m + " (ours)" : m;
      if (m === D.ours) name.style.fontWeight = "700";
      tr.appendChild(name);
      D.ause.metrics.forEach(function (met) {
        var td = document.createElement("td");
        td.textContent = vals[m][met.key].toFixed(3);
        if (rank[met.key][0] === m) td.className = "best";
        else if (rank[met.key][1] === m) td.className = "second";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  /* ======================================================================
     6. NAV, COPY, BACK-TO-TOP
     ====================================================================== */
  function wireNav() {
    var sections = Array.prototype.slice.call(document.querySelectorAll("main section[id], main header[id]"));
    var links = Array.prototype.slice.call(document.querySelectorAll(".side-nav a, .top-nav a:not(.brand)"));
    if (!sections.length || !links.length || !("IntersectionObserver" in window)) return;

    var visible = {};
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0; });
      var best = null, bestRatio = 0;
      Object.keys(visible).forEach(function (id) { if (visible[id] > bestRatio) { bestRatio = visible[id]; best = id; } });
      links.forEach(function (a) {
        a.classList.toggle("is-active", best !== null && a.getAttribute("href") === "#" + best);
      });
    }, { rootMargin: "-15% 0px -55% 0px", threshold: [0, 0.15, 0.4, 0.8] });

    sections.forEach(function (s) { obs.observe(s); });
  }

  function wireCopy() {
    var btn = document.getElementById("copyBib"), pre = document.getElementById("bibText");
    if (!btn || !pre) return;
    btn.addEventListener("click", function () {
      var text = pre.textContent;
      var done = function () {
        var span = btn.querySelector("span");
        var old = span.textContent;
        span.textContent = "Copied";
        setTimeout(function () { span.textContent = old; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {});
      } else {
        var ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) {}
        document.body.removeChild(ta);
      }
    });
  }

  function wireToTop() {
    var btn = document.getElementById("toTop");
    if (!btn) return;
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    var onScroll = function () { btn.classList.toggle("show", window.scrollY > 700); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ======================================================================
     BOOT
     ====================================================================== */
  function init() {
    loadSlots();
    renderMath();
    if (D && window.Chart) {
      buildControls();
      buildRadarLegend();
      buildRadar();
      buildTable();
      buildAuse();
      buildAuseTable();
    }
    wireTableToggle("tableToggle", "resultsTable");
    wireTableToggle("auseTableToggle", "auseTable");
    wireNav();
    wireCopy();
    wireToTop();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
