// Процедурные текстуры планет, нарисованные прямо в браузере на <canvas>.
// Так приложению не нужны картинки из интернета — оно работает где угодно
// и быстро. Текстуры стилизованные, но узнаваемые: полоски Юпитера,
// синие океаны Земли, рыжий Марс и так далее.

import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Простой «шум» из множества полупрозрачных точек — пятна и неоднородности.
function speckle(ctx, w, h, count, colors, minR, maxR, alpha) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = minR + Math.random() * (maxR - minR);
    ctx.beginPath();
    ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
    ctx.globalAlpha = alpha * (0.4 + Math.random() * 0.6);
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function fillBase(ctx, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
}

// Горизонтальные полосы (газовые гиганты).
function bands(ctx, w, h, palette, wobble) {
  let y = 0;
  while (y < h) {
    const bh = h * (0.03 + Math.random() * 0.07);
    ctx.fillStyle = palette[(Math.random() * palette.length) | 0];
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 16) {
      const yy = y + Math.sin(x / w * Math.PI * 4) * wobble * Math.random();
      ctx.lineTo(x, yy);
    }
    ctx.lineTo(w, y + bh);
    for (let x = w; x >= 0; x -= 16) {
      const yy = y + bh + Math.sin(x / w * Math.PI * 4) * wobble * Math.random();
      ctx.lineTo(x, yy);
    }
    ctx.closePath();
    ctx.fill();
    y += bh;
  }
}

const builders = {
  // Каменистая серая поверхность с кратерами (Меркурий).
  rocky(ctx, w, h) {
    fillBase(ctx, w, h, '#8d847a');
    speckle(ctx, w, h, 1400, ['#b3a9a0', '#6f675f', '#a59c92'], 2, 10, 0.5);
    // кратеры
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = 4 + Math.random() * 18;
      ctx.beginPath(); ctx.fillStyle = '#5f5851'; ctx.globalAlpha = 0.5;
      ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.fillStyle = '#aaa094'; ctx.globalAlpha = 0.4;
      ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  // Густые жёлто-кремовые облака (Венера).
  venus(ctx, w, h) {
    fillBase(ctx, w, h, '#d9b25e');
    bands(ctx, w, h, ['#e7c878', '#cf9f4d', '#dec073', '#c79a47'], 14);
    speckle(ctx, w, h, 700, ['#f0d588', '#c08f3e'], 6, 26, 0.25);
  },

  // Океаны, материки и облака (Земля).
  earth(ctx, w, h) {
    // океан с лёгким градиентом
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1f5fbf');
    g.addColorStop(0.5, '#1769d6');
    g.addColorStop(1, '#114b9e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // материки
    const land = ['#2f9e44', '#3fb24f', '#bda46b', '#2b8a3e'];
    for (let i = 0; i < 26; i++) {
      const cx = Math.random() * w, cy = h * (0.12 + Math.random() * 0.76);
      ctx.fillStyle = land[(Math.random() * land.length) | 0];
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      const blobs = 6 + (Math.random() * 6 | 0);
      for (let b = 0; b < blobs; b++) {
        const a = (b / blobs) * Math.PI * 2;
        const rr = 14 + Math.random() * 46;
        const px = cx + Math.cos(a) * rr;
        const py = cy + Math.sin(a) * rr * 0.6;
        b === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    }
    // полярные шапки
    ctx.globalAlpha = 0.85; ctx.fillStyle = '#eef6ff';
    ctx.fillRect(0, 0, w, h * 0.05);
    ctx.fillRect(0, h * 0.95, w, h * 0.05);
    // облака
    ctx.globalAlpha = 1;
    speckle(ctx, w, h, 380, ['#ffffff', '#eaf2ff'], 8, 30, 0.32);
  },

  // Рыжая пыль и тёмные пятна (Марс).
  mars(ctx, w, h) {
    fillBase(ctx, w, h, '#c4633a');
    speckle(ctx, w, h, 1600, ['#d97b4a', '#a84a28', '#e08a52', '#8f3d22'], 3, 14, 0.45);
    // полярные шапки
    ctx.globalAlpha = 0.8; ctx.fillStyle = '#f3ece4';
    ctx.beginPath(); ctx.ellipse(w / 2, 0, w * 0.16, h * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(w / 2, h, w * 0.18, h * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  },

  // Полосатый гигант с Красным пятном (Юпитер).
  jupiter(ctx, w, h) {
    fillBase(ctx, w, h, '#caa06a');
    bands(ctx, w, h, ['#e3c293', '#b07b46', '#d9b27e', '#9c6c3f', '#ead6ad', '#c08a52'], 18);
    // Большое Красное пятно
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#c0492f';
    ctx.beginPath();
    ctx.ellipse(w * 0.7, h * 0.62, w * 0.07, h * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e07a5f'; ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.ellipse(w * 0.7, h * 0.62, w * 0.045, h * 0.032, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  },

  // Бледно-золотистые полосы (Сатурн, без колец — кольца отдельно).
  saturn(ctx, w, h) {
    fillBase(ctx, w, h, '#e0c890');
    bands(ctx, w, h, ['#ecd9a4', '#d4b876', '#e6cd8f', '#c9a967'], 10);
  },

  // Гладкая ледяная планета (Уран, Нептун) — цвет задаётся снаружи.
  ice(ctx, w, h, color) {
    fillBase(ctx, w, h, color || '#7fc8e8');
    bands(ctx, w, h, [shade(color, 14), shade(color, -10), color], 6);
    speckle(ctx, w, h, 200, [shade(color, 18)], 10, 40, 0.18);
  },

  // Подробная Луна: тёмные «моря», множество кратеров с подсвеченными
  // краями и тенью на дне, плюс яркие кратеры с «лучами» (как настоящий
  // кратер Тихо). Эта же текстура используется как карта рельефа (bumpMap).
  moon(ctx, w, h) {
    fillBase(ctx, w, h, '#9c9a96');
    // мелкая зернистость поверхности
    speckle(ctx, w, h, 4000, ['#b4b2ad', '#86847f', '#a8a6a1', '#76746f'], 1, 4, 0.35);

    // Тёмные «моря» (mare) — крупные неровные пятна.
    const maria = [
      [0.30, 0.34, 0.16, 0.11], [0.44, 0.30, 0.10, 0.08],
      [0.36, 0.50, 0.13, 0.10], [0.55, 0.46, 0.09, 0.07],
      [0.24, 0.46, 0.07, 0.06], [0.62, 0.32, 0.06, 0.05],
    ];
    for (const [mx, my, rw, rh] of maria) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#6f6d69';
      ctx.beginPath();
      const cx = mx * w, cy = my * h, ax = rw * w, ay = rh * h;
      const lobes = 12;
      for (let i = 0; i <= lobes; i++) {
        const a = (i / lobes) * Math.PI * 2;
        const wob = 0.78 + Math.random() * 0.4;
        const px = cx + Math.cos(a) * ax * wob;
        const py = cy + Math.sin(a) * ay * wob;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    const crater = (x, y, r) => {
      // тень на дальнем крае (свет условно слева-сверху)
      ctx.beginPath();
      ctx.fillStyle = 'rgba(60,58,55,0.55)';
      ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      // дно
      ctx.beginPath();
      ctx.fillStyle = 'rgba(120,118,113,0.5)';
      ctx.arc(x - r * 0.12, y - r * 0.12, r * 0.78, 0, Math.PI * 2); ctx.fill();
      // подсвеченный ближний край
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(225,223,216,0.55)';
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.arc(x - r * 0.18, y - r * 0.18, r * 0.92, Math.PI * 0.7, Math.PI * 1.9);
      ctx.stroke();
    };

    // много кратеров разного размера
    for (let i = 0; i < 320; i++) {
      crater(Math.random() * w, Math.random() * h, 3 + Math.random() * Math.random() * 26);
    }

    // несколько ярких кратеров с лучами
    for (let k = 0; k < 4; k++) {
      const x = Math.random() * w, y = h * (0.15 + Math.random() * 0.7), r = 10 + Math.random() * 10;
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = '#eceae3';
      ctx.lineWidth = 2;
      for (let j = 0; j < 14; j++) {
        const a = Math.random() * Math.PI * 2, len = r * (3 + Math.random() * 6);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.stroke();
      }
      ctx.restore();
      ctx.beginPath();
      ctx.fillStyle = '#e6e4dd'; ctx.globalAlpha = 0.8;
      ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      crater(x, y, r);
    }
    ctx.globalAlpha = 1;
  },

  // Ядро кометы — тёмный грязный лёд с ледяными пятнами.
  comet(ctx, w, h) {
    fillBase(ctx, w, h, '#5a5560');
    speckle(ctx, w, h, 1800, ['#7a7585', '#3f3b46', '#9aa6c0', '#6b6675'], 2, 9, 0.5);
    // ледяные «свежие» пятна
    speckle(ctx, w, h, 120, ['#cfe0ff', '#aebfe0'], 4, 14, 0.4);
  },

  // Бурлящая поверхность Солнца.
  sun(ctx, w, h) {
    fillBase(ctx, w, h, '#ffb733');
    speckle(ctx, w, h, 2200, ['#ffd95b', '#ff8c1a', '#ffe98a', '#ff6f00'], 4, 18, 0.5);
  },
};

// Осветлить/затемнить hex-цвет на величину amt (-255..255).
function shade(hex, amt) {
  if (!hex) return '#88ccee';
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

const cache = new Map();

// Для самых заметных тел рисуем текстуру крупнее — больше мелких деталей.
const HIRES = new Set(['moon', 'earth', 'jupiter']);

export function makeTexture(type, color) {
  const key = type + (color || '');
  if (cache.has(key)) return cache.get(key);
  const w = HIRES.has(type) ? 2048 : 1024;
  const h = w / 2;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  (builders[type] || builders.rocky)(ctx, w, h, color);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}

// Мягкая радиальная «капля» света — для свечения комы кометы и Солнца.
export function makeGlowTexture(color = '#bfe3ff') {
  const s = 256;
  const canvas = makeCanvas(s, s);
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, color + 'ff');
  grad.addColorStop(0.3, color + 'aa');
  grad.addColorStop(1, color + '00');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Градиент для хвоста кометы: ярко у ядра, плавно тает к концу.
export function makeTailTexture(color = '#aee0ff') {
  const w = 256, h = 64;
  const canvas = makeCanvas(w, h);
  const g = canvas.getContext('2d');
  // вдоль X — затухание; по Y — мягкие края
  const lin = g.createLinearGradient(0, 0, w, 0);
  lin.addColorStop(0, color + 'ee');
  lin.addColorStop(0.5, color + '66');
  lin.addColorStop(1, color + '00');
  g.fillStyle = lin;
  g.fillRect(0, 0, w, h);
  // мягкие верх/низ
  const rad = g.createLinearGradient(0, 0, 0, h);
  rad.addColorStop(0, '#00000000');
  rad.addColorStop(0.5, '#ffffff22');
  rad.addColorStop(1, '#00000000');
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = rad;
  g.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Текстура колец Сатурна: концентрические кольца разной прозрачности.
export function makeRingTexture() {
  const size = 512;
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const cx = size / 2, cy = size / 2;
  for (let r = size / 2; r > size * 0.28; r -= 1) {
    const t = (r - size * 0.28) / (size * 0.22);
    const band = 0.35 + 0.65 * Math.abs(Math.sin(r * 0.35));
    const a = (0.15 + band * 0.5) * (0.6 + 0.4 * t);
    ctx.beginPath();
    ctx.strokeStyle = `rgba(225, 205, 150, ${a})`;
    ctx.lineWidth = 1.5;
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
