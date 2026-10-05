/*
 * Animated side-view of the solver's tracked reference trajectory.
 * The player only renders calculated samples; it does not invent a second
 * motion model.
 */

const COLORS = {
  ink: "#e6edf3",
  muted: "#8b98a5",
  teal: "#5eead4",
  blue: "#60a5fa",
  orange: "#fbbf24",
  red: "#f87171",
  green: "#34d399",
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function failureFor(run) {
  if (run.outcome === "skipped") {
    return {
      label: "Atmospheric skip",
      detail: "The vehicle lofted instead of being captured.",
      time: run.samples.at(-1)?.t ?? 0,
    };
  }
  if (run.outcome !== "landed") {
    return {
      label: "Propagation ended",
      detail: `The solver ended with outcome “${run.outcome}”.`,
      time: run.samples.at(-1)?.t ?? 0,
    };
  }
  if (run.g > 12) {
    const sample = run.samples.reduce((nearest, item) =>
      Math.abs(item.h / 1000 - run.altMaxG) <
      Math.abs(nearest.h / 1000 - run.altMaxG)
        ? item
        : nearest,
    );
    return {
      label: "Ballistic G-limit exceeded",
      detail: `${run.g.toFixed(1)} G exceeds the 12 G teaching screen.`,
      time: sample.t,
    };
  }
  if (run.shock > 12) {
    const deploy = run.events.find((event) => event.id === "chute-deploy");
    return {
      label: "Parachute opening overload",
      detail: `${run.shock.toFixed(1)} G opening shock exceeds the 12 G screen.`,
      time: deploy?.t ?? run.samples.at(-1)?.t ?? 0,
    };
  }
  return null;
}

function formatTime(seconds) {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function phaseLabel(phase) {
  return {
    space: "Orbital coast",
    "atmospheric-entry": "Atmospheric entry",
    parachute: "Parachute descent",
    surface: "Surface",
  }[phase] ?? phase;
}

export function createFlightPlayer(canvas) {
  const playButton = document.getElementById("flight-play");
  const restartButton = document.getElementById("flight-restart");
  const scrubber = document.getElementById("flight-scrubber");
  const speedSelect = document.getElementById("flight-speed");
  const status = document.getElementById("flight-status");
  const phase = document.getElementById("flight-phase");
  const clock = document.getElementById("flight-clock");
  const altitude = document.getElementById("flight-altitude");
  const velocity = document.getElementById("flight-velocity");
  const load = document.getElementById("flight-load");
  const heat = document.getElementById("flight-heat");
  const eventText = document.getElementById("flight-event");

  let run = null;
  let currentTime = 0;
  let playing = false;
  let previousFrame = 0;
  let frameId = 0;

  function duration() {
    return run?.samples?.at(-1)?.t ?? 0;
  }

  function playbackEnd() {
    return failureFor(run)?.time ?? duration();
  }

  function sampleAt(time) {
    const samples = run?.samples ?? [];
    if (!samples.length) return null;
    let lo = 0;
    let hi = samples.length - 1;
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2);
      if (samples[mid].t <= time) lo = mid;
      else hi = mid - 1;
    }
    const a = samples[lo];
    const b = samples[Math.min(lo + 1, samples.length - 1)];
    if (a === b || b.t === a.t) return a;
    const mix = clamp((time - a.t) / (b.t - a.t), 0, 1);
    const lerp = (key) => a[key] + (b[key] - a[key]) * mix;
    return {
      ...a,
      t: time,
      h: lerp("h"),
      v: lerp("v"),
      rangeM: lerp("rangeM"),
      qDyn: lerp("qDyn"),
      gLoad: lerp("gLoad"),
      heatFluxWcm2: lerp("heatFluxWcm2"),
      chuteDeployed: mix < 0.5 ? a.chuteDeployed : b.chuteDeployed,
      phase: mix < 0.5 ? a.phase : b.phase,
    };
  }

  function position(sample, width, height) {
    const maxRange = Math.max(run.rangeKm * 1000, 1);
    const maxAltitude = Math.max(
      ...run.samples.map((item) => item.h),
      160000,
    );
    return {
      x: width * (0.08 + 0.84 * clamp(sample.rangeM / maxRange, 0, 1)),
      y: height * (0.78 - 0.61 * clamp(sample.h / maxAltitude, 0, 1)),
    };
  }

  function draw() {
    if (!run?.samples?.length) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 440;
    if (canvas.width !== Math.round(width * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#02050b");
    sky.addColorStop(0.58, "#08182a");
    sky.addColorStop(1, "#123b59");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Atmosphere and curved horizon.
    const atmosphere = ctx.createLinearGradient(0, height * 0.58, 0, height * 0.82);
    atmosphere.addColorStop(0, "rgba(96,165,250,0)");
    atmosphere.addColorStop(1, "rgba(96,165,250,.28)");
    ctx.fillStyle = atmosphere;
    ctx.fillRect(0, height * 0.48, width, height * 0.34);
    ctx.beginPath();
    ctx.ellipse(width / 2, height * 1.62, width * 1.12, height * 0.86, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#0b3348";
    ctx.fill();
    ctx.strokeStyle = "rgba(94,234,212,.65)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "12px system-ui, sans-serif";
    ctx.fillStyle = COLORS.muted;
    ctx.fillText("SPACE", 16, 26);
    ctx.fillText("ATMOSPHERE", 16, height * 0.63);
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.beginPath();
    ctx.moveTo(0, height * 0.49);
    ctx.lineTo(width, height * 0.49);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText("100 km entry interface", 16, height * 0.49 - 8);

    // Full calculated path, then the portion already flown.
    const path = (endTime, color, widthPx) => {
      ctx.beginPath();
      let started = false;
      for (const item of run.samples) {
        if (item.t > endTime) break;
        const p = position(item, width, height);
        if (!started) {
          ctx.moveTo(p.x, p.y);
          started = true;
        } else {
          ctx.lineTo(p.x, p.y);
        }
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = widthPx;
      ctx.stroke();
    };
    path(Infinity, "rgba(255,255,255,.18)", 2);
    path(currentTime, COLORS.teal, 3);

    const sample = sampleAt(currentTime);
    if (!sample) return;
    const p = position(sample, width, height);
    const heating = clamp(sample.heatFluxWcm2 / Math.max(run.q, 1), 0, 1);
    if (heating > 0.08) {
      const glow = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 30 + heating * 24);
      glow.addColorStop(0, `rgba(255,255,255,${0.7 * heating})`);
      glow.addColorStop(0.25, `rgba(251,191,36,${0.7 * heating})`);
      glow.addColorStop(1, "rgba(248,113,113,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(p.x - 60, p.y - 60, 120, 120);
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    if (sample.chuteDeployed) {
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(-13, -22);
      ctx.moveTo(0, 2);
      ctx.lineTo(13, -22);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -22, 15, Math.PI, 0);
      ctx.fillStyle = "rgba(96,165,250,.82)";
      ctx.fill();
    }
    ctx.rotate((sample.gammaDeg * Math.PI) / 180);
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(-9, -7);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-9, 7);
    ctx.closePath();
    ctx.fillStyle = COLORS.ink;
    ctx.fill();
    ctx.restore();

    const failure = failureFor(run);
    if (failure && currentTime >= failure.time) {
      const failedSample = sampleAt(failure.time);
      const failedAt = position(failedSample, width, height);
      ctx.strokeStyle = COLORS.red;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(failedAt.x, failedAt.y, 20 + Math.sin(currentTime * 0.2) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(10,14,20,.92)";
      ctx.fillRect(clamp(failedAt.x - 105, 8, width - 218), clamp(failedAt.y + 27, 8, height - 54), 210, 44);
      ctx.fillStyle = COLORS.red;
      ctx.font = "700 12px system-ui, sans-serif";
      ctx.fillText(failure.label, clamp(failedAt.x - 96, 17, width - 209), clamp(failedAt.y + 45, 26, height - 36));
      ctx.fillStyle = COLORS.ink;
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText("Calculated failure point", clamp(failedAt.x - 96, 17, width - 209), clamp(failedAt.y + 61, 42, height - 20));
    }

    updateReadout(sample, failure);
  }

  function updateReadout(sample, failure) {
    const total = duration();
    scrubber.value = total ? String(Math.round((currentTime / total) * 1000)) : "0";
    phase.textContent = phaseLabel(sample.phase);
    clock.textContent = `${formatTime(currentTime)} / ${formatTime(total)}`;
    altitude.textContent = `${Math.max(0, sample.h / 1000).toFixed(1)} km`;
    velocity.textContent = `${Math.max(0, sample.v / 1000).toFixed(2)} km/s`;
    load.textContent = `${Math.max(0, sample.gLoad).toFixed(1)} G`;
    heat.textContent = `${Math.max(0, sample.heatFluxWcm2).toFixed(1)} W/cm²`;

    const latestEvent = [...run.events].reverse().find((event) => event.t <= currentTime);
    if (failure && currentTime >= failure.time) {
      eventText.textContent = `${failure.label}: ${failure.detail}`;
      eventText.className = "flight-event is-failure";
    } else {
      eventText.textContent = latestEvent?.label ?? "Propagation underway";
      eventText.className = "flight-event";
    }
  }

  function tick(now) {
    if (!playing) return;
    if (!previousFrame) previousFrame = now;
    const elapsed = (now - previousFrame) / 1000;
    previousFrame = now;
    const speed = Number(speedSelect.value) || 30;
    currentTime = Math.min(playbackEnd(), currentTime + elapsed * speed);
    draw();
    if (currentTime >= playbackEnd()) {
      playing = false;
      playButton.textContent = "Replay";
      return;
    }
    frameId = requestAnimationFrame(tick);
  }

  function setPlaying(next) {
    playing = next;
    cancelAnimationFrame(frameId);
    previousFrame = 0;
    if (playing) {
      if (currentTime >= playbackEnd()) currentTime = 0;
      playButton.textContent = "Pause";
      frameId = requestAnimationFrame(tick);
    } else {
      playButton.textContent = "Play";
      draw();
    }
  }

  playButton.addEventListener("click", () => setPlaying(!playing));
  restartButton.addEventListener("click", () => {
    currentTime = 0;
    setPlaying(true);
  });
  scrubber.addEventListener("input", () => {
    currentTime = (Number(scrubber.value) / 1000) * duration();
    setPlaying(false);
  });
  window.addEventListener("resize", draw);

  return {
    load(nextRun) {
      cancelAnimationFrame(frameId);
      run = nextRun;
      currentTime = 0;
      playing = false;
      previousFrame = 0;
      const failure = failureFor(run);
      status.textContent = failure ? failure.label : "Within teaching limits";
      status.className = `flight-outcome ${failure ? "is-failure" : "is-pass"}`;
      playButton.textContent = "Play";
      draw();
      setPlaying(true);
    },
  };
}
