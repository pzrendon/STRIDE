/*
 * Minimal dependency-free line-chart renderer (HTML canvas).
 * Kept intentionally small and self-contained so the site ships zero
 * third-party JavaScript.
 */

const SERIES_COLORS = ["#5eead4", "#60a5fa", "#f0abfc", "#fca5a5", "#fcd34d"];

function niceBounds(min, max) {
  if (min === max) {
    return [min - 1, max + 1];
  }
  const pad = (max - min) * 0.08;
  return [min - pad, max + pad];
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{series: {label:string, x:number[], y:number[]}[], xLabel:string, yLabel:string, title:string}} opts
 */
export function drawLineChart(canvas, opts) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 480;
  const cssH = canvas.clientHeight || 320;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const style = getComputedStyle(document.documentElement);
  const ink = style.getPropertyValue("--ink").trim() || "#e6edf3";
  const muted = style.getPropertyValue("--muted").trim() || "#8b98a5";
  const grid = "rgba(255,255,255,0.08)";

  const m = { top: 34, right: 16, bottom: 46, left: 56 };
  const plotW = cssW - m.left - m.right;
  const plotH = cssH - m.top - m.bottom;

  const series = opts.series.filter((s) => s.x.length && s.y.length);
  if (!series.length) {
    ctx.fillStyle = muted;
    ctx.font = "14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No data", cssW / 2, cssH / 2);
    return;
  }

  let xMin = Infinity,
    xMax = -Infinity,
    yMin = Infinity,
    yMax = -Infinity;
  for (const s of series) {
    for (const v of s.x) {
      if (v < xMin) xMin = v;
      if (v > xMax) xMax = v;
    }
    for (const v of s.y) {
      if (v < yMin) yMin = v;
      if (v > yMax) yMax = v;
    }
  }
  [xMin, xMax] = niceBounds(xMin, xMax);
  [yMin, yMax] = niceBounds(yMin, yMax);

  const sx = (v) => m.left + ((v - xMin) / (xMax - xMin)) * plotW;
  const sy = (v) => m.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  // Title
  ctx.fillStyle = ink;
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(opts.title, m.left, 20);

  // Gridlines + ticks
  ctx.strokeStyle = grid;
  ctx.fillStyle = muted;
  ctx.font = "11px system-ui, sans-serif";
  ctx.lineWidth = 1;
  const ticks = 5;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= ticks; i++) {
    const yv = yMin + ((yMax - yMin) * i) / ticks;
    const py = sy(yv);
    ctx.beginPath();
    ctx.moveTo(m.left, py);
    ctx.lineTo(m.left + plotW, py);
    ctx.stroke();
    ctx.fillText(yv.toFixed(0), m.left - 8, py);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let i = 0; i <= ticks; i++) {
    const xv = xMin + ((xMax - xMin) * i) / ticks;
    const px = sx(xv);
    ctx.beginPath();
    ctx.moveTo(px, m.top);
    ctx.lineTo(px, m.top + plotH);
    ctx.stroke();
    ctx.fillText(xv.toFixed(1), px, m.top + plotH + 8);
  }

  // Axis labels
  ctx.fillStyle = muted;
  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(opts.xLabel, m.left + plotW / 2, cssH - 6);
  ctx.save();
  ctx.translate(14, m.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(opts.yLabel, 0, 0);
  ctx.restore();

  // Series
  series.forEach((s, i) => {
    const color = SERIES_COLORS[i % SERIES_COLORS.length];
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const n = Math.min(s.x.length, s.y.length);
    let started = false;
    for (let k = 0; k < n; k++) {
      const px = sx(s.x[k]);
      const py = sy(s.y[k]);
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  });

  // Legend
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "12px system-ui, sans-serif";
  let lx = m.left + 6;
  const ly = m.top + 12;
  series.forEach((s, i) => {
    const color = SERIES_COLORS[i % SERIES_COLORS.length];
    ctx.fillStyle = color;
    ctx.fillRect(lx, ly - 5, 12, 10);
    ctx.fillStyle = ink;
    ctx.fillText(s.label, lx + 18, ly);
    lx += 18 + ctx.measureText(s.label).width + 20;
  });
}
