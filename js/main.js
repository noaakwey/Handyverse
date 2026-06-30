import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SUN, PLANETS, WELCOME } from './data.js';
import { makeTexture, makeRingTexture } from './textures.js';

// ============================================================
//  Базовая сцена
// ============================================================
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  55, window.innerWidth / window.innerHeight, 0.1, 4000
);
const HOME_VIEW = new THREE.Vector3(0, 60, 120);
camera.position.copy(HOME_VIEW);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 9;
controls.maxDistance = 320;
controls.target.set(0, 0, 0);

// Свет: Солнце светит во все стороны + мягкий общий свет, чтобы планеты
// не были полностью чёрными с теневой стороны.
const sunLight = new THREE.PointLight(0xffffff, 3.2, 0, 0.6);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x6677aa, 0.72));

// ============================================================
//  Звёздное небо
// ============================================================
function makeStars() {
  const count = 2600;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const tints = [
    [1, 1, 1], [0.8, 0.85, 1], [1, 0.92, 0.78], [0.85, 0.95, 1],
  ];
  for (let i = 0; i < count; i++) {
    const r = 600 + Math.random() * 1400;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.cos(ph);
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    const t = tints[(Math.random() * tints.length) | 0];
    const b = 0.5 + Math.random() * 0.5;
    col[i * 3] = t[0] * b; col[i * 3 + 1] = t[1] * b; col[i * 3 + 2] = t[2] * b;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 2.4, sizeAttenuation: true, vertexColors: true,
    transparent: true, depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}
scene.add(makeStars());

// ============================================================
//  Солнце
// ============================================================
const clickable = []; // объекты, по которым можно кликнуть

const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(SUN.radius, 48, 48),
  new THREE.MeshBasicMaterial({ map: makeTexture('sun') })
);
sunMesh.userData = { body: SUN };
scene.add(sunMesh);
clickable.push(sunMesh);

// Свечение Солнца (полупрозрачный спрайт-ореол).
function makeGlow(color, size) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, color + 'ff');
  grad.addColorStop(0.25, color + 'aa');
  grad.addColorStop(1, color + '00');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  spr.scale.set(size, size, 1);
  return spr;
}
sunMesh.add(makeGlow('#ffd24d', SUN.radius * 5.2));

// ============================================================
//  Планеты
// ============================================================
const bodies = []; // данные для анимации

function makeOrbitLine(distance) {
  const seg = 160;
  const pts = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * distance, 0, Math.sin(a) * distance));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({
    color: 0x6f7bbf, transparent: true, opacity: 0.28,
  });
  return new THREE.LineLoop(geo, mat);
}

for (const p of PLANETS) {
  scene.add(makeOrbitLine(p.distance));

  // Группа-«орбита» вращается вокруг Солнца; внутри неё планета.
  const orbit = new THREE.Group();
  scene.add(orbit);

  const texType = p.texture === 'ice' ? 'ice' : p.texture;
  const mat = new THREE.MeshStandardMaterial({
    map: makeTexture(texType, p.color),
    roughness: 1, metalness: 0,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.radius, 40, 40), mat);
  mesh.position.x = p.distance;
  mesh.userData = { body: p };
  if (p.tilt) mesh.rotation.z = p.tilt; // Уран «лежит на боку»
  orbit.add(mesh);
  clickable.push(mesh);

  // Кольца (Сатурн)
  if (p.rings) {
    const ringGeo = new THREE.RingGeometry(p.rings.inner, p.rings.outer, 80);
    // развернуть UV, чтобы текстура шла по радиусу
    const pos = ringGeo.attributes.position;
    const uv = ringGeo.attributes.uv;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const r = v.length();
      const t = (r - p.rings.inner) / (p.rings.outer - p.rings.inner);
      uv.setXY(i, t, 0.5);
    }
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      map: makeRingTexture(), side: THREE.DoubleSide,
      transparent: true, opacity: 0.9,
    }));
    ring.rotation.x = Math.PI / 2.1;
    mesh.add(ring);
  }

  // Луна (Земля)
  let moonPivot = null, moonData = null;
  if (p.moon) {
    moonPivot = new THREE.Group();
    mesh.add(moonPivot);
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(p.moon.radius, 24, 24),
      new THREE.MeshStandardMaterial({ map: makeTexture('moon'), roughness: 1 })
    );
    moonMesh.position.x = p.moon.distance;
    moonPivot.add(moonMesh);
    moonData = p.moon;
  }

  bodies.push({ data: p, orbit, mesh, moonPivot, moonData, angle: Math.random() * Math.PI * 2 });
}

// ============================================================
//  Подписи планет (HTML поверх 3D)
// ============================================================
const labelsRoot = document.getElementById('labels');
const labelEls = new Map();
function makeLabel(body, target) {
  const el = document.createElement('div');
  el.className = 'planet-label';
  el.textContent = body.name;
  labelsRoot.appendChild(el);
  labelEls.set(el, target);
}
makeLabel(SUN, sunMesh);
for (const b of bodies) makeLabel(b.data, b.mesh);

const _v = new THREE.Vector3();
function updateLabels() {
  for (const [el, target] of labelEls) {
    target.getWorldPosition(_v);
    const dist = _v.distanceTo(camera.position);
    _v.project(camera);
    const visible = _v.z < 1 && _v.x > -1.05 && _v.x < 1.05 && _v.y > -1.05 && _v.y < 1.05;
    if (!visible) { el.style.opacity = '0'; continue; }
    const x = (_v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-_v.y * 0.5 + 0.5) * window.innerHeight;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    // далёкие подписи делаем бледнее
    el.style.opacity = String(Math.max(0.15, Math.min(1, 260 / dist)));
  }
}

// ============================================================
//  Озвучка (Web Speech API), русский голос
// ============================================================
const speech = {
  on: true,
  voice: null,
  pick() {
    const voices = speechSynthesis.getVoices();
    this.voice =
      voices.find(v => /ru[-_]RU/i.test(v.lang) && /female|женск|milena|alyona|google/i.test(v.name)) ||
      voices.find(v => /^ru/i.test(v.lang)) || null;
  },
  say(text) {
    if (!this.on || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ru-RU';
    if (this.voice) u.voice = this.voice;
    u.rate = 0.95;
    u.pitch = 1.15;
    speechSynthesis.speak(u);
  },
  stop() { if ('speechSynthesis' in window) speechSynthesis.cancel(); },
};
if ('speechSynthesis' in window) {
  speech.pick();
  speechSynthesis.onvoiceschanged = () => speech.pick();
}

// ============================================================
//  Карточка с фактом
// ============================================================
const card = document.getElementById('card');
const cardEmoji = document.getElementById('card-emoji');
const cardTitle = document.getElementById('card-title');
const cardFact = document.getElementById('card-fact');
const cardStats = document.getElementById('card-stats');
let currentBody = null;

function showCard(body) {
  currentBody = body;
  card.style.setProperty('--card-color', body.color);
  cardEmoji.textContent = body.emoji;
  cardTitle.textContent = body.name;
  cardFact.textContent = body.fact;
  cardStats.innerHTML = '';
  for (const s of body.stats || []) {
    const d = document.createElement('div');
    d.className = 'stat';
    d.innerHTML = `${s.label}<b>${s.value}</b>`;
    cardStats.appendChild(d);
  }
  card.classList.remove('hidden');
  speech.say(body.fact);
  setActiveChip(body.id);
}
function hideCard() {
  card.classList.add('hidden');
  currentBody = null;
  setActiveChip(null);
}

document.getElementById('card-close').onclick = () => { hideCard(); endTour(); };
document.getElementById('card-say').onclick = () => { if (currentBody) speech.say(currentBody.fact); };

// ============================================================
//  Полёт камеры к объекту
// ============================================================
let flight = null;
function focusOn(target, body) {
  const targetPos = new THREE.Vector3();
  target.getWorldPosition(targetPos);
  const r = body.radius || SUN.radius;
  // Точка обзора чуть в стороне и сверху от планеты.
  const dir = new THREE.Vector3().subVectors(camera.position, targetPos).normalize();
  if (dir.lengthSq() < 0.001) dir.set(0, 0.4, 1).normalize();
  const dist = Math.max(r * 4.5, 9);
  const camGoal = new THREE.Vector3()
    .copy(targetPos)
    .add(dir.multiplyScalar(dist))
    .add(new THREE.Vector3(0, r * 1.2, 0));
  flight = {
    fromCam: camera.position.clone(),
    toCam: camGoal,
    fromTarget: controls.target.clone(),
    toTarget: targetPos.clone(),
    follow: target,
    body,
    t: 0,
  };
}
function goHome() {
  flight = {
    fromCam: camera.position.clone(),
    toCam: HOME_VIEW.clone(),
    fromTarget: controls.target.clone(),
    toTarget: new THREE.Vector3(0, 0, 0),
    follow: null,
    body: null,
    t: 0,
  };
}
const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// ============================================================
//  Выбор тела (клик / кнопка)
// ============================================================
function selectBody(target, body, { fly = true } = {}) {
  if (fly) focusOn(target, body);
  showCard(body);
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downXY = null;

canvas.addEventListener('pointerdown', e => { downXY = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', e => {
  if (!downXY) return;
  const moved = Math.hypot(e.clientX - downXY.x, e.clientY - downXY.y);
  downXY = null;
  if (moved > 8) return; // это было вращение, а не клик
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickable, false);
  if (hits.length) {
    endTour();
    const obj = hits[0].object;
    selectBody(obj, obj.userData.body);
  }
});

// ============================================================
//  Нижнее меню планет
// ============================================================
const planetBar = document.getElementById('planet-bar');
const chips = new Map();
function addChip(body, target) {
  const btn = document.createElement('button');
  btn.className = 'planet-chip';
  btn.dataset.id = body.id;
  btn.innerHTML = `<span class="dot" style="--dot:${body.color};background:${body.color}"></span><span class="name">${body.name}</span>`;
  btn.onclick = () => { endTour(); selectBody(target, body); };
  planetBar.appendChild(btn);
  chips.set(body.id, btn);
}
addChip(SUN, sunMesh);
for (const b of bodies) addChip(b.data, b.mesh);

function setActiveChip(id) {
  for (const [cid, el] of chips) el.classList.toggle('active', cid === id);
}

// ============================================================
//  Кнопки управления
// ============================================================
let running = true;
let speed = 0.45;

const btnHome = document.getElementById('btn-home');
const btnPlay = document.getElementById('btn-play');
const btnTour = document.getElementById('btn-tour');
const btnSound = document.getElementById('btn-sound');
const speedSlider = document.getElementById('speed');

btnHome.onclick = () => { endTour(); hideCard(); goHome(); };

btnPlay.onclick = () => {
  running = !running;
  btnPlay.querySelector('.ico').textContent = running ? '⏸️' : '▶️';
  btnPlay.querySelector('.lbl').textContent = running ? 'Пауза' : 'Пуск';
  btnPlay.classList.toggle('off', !running);
};

btnSound.onclick = () => {
  speech.on = !speech.on;
  if (!speech.on) speech.stop();
  btnSound.querySelector('.ico').textContent = speech.on ? '🔊' : '🔇';
  btnSound.querySelector('.lbl').textContent = speech.on ? 'Звук' : 'Тихо';
  btnSound.classList.toggle('off', !speech.on);
};

speedSlider.oninput = () => { speed = (speedSlider.value / 100) * 1.0; };
speed = (speedSlider.value / 100) * 1.0;

// ============================================================
//  Режим «Путешествие» — по очереди показываем все тела
// ============================================================
let tour = null;
const tourList = [sunMesh, ...bodies.map(b => b.mesh)];
const tourBodies = [SUN, ...bodies.map(b => b.data)];

btnTour.onclick = () => { tour ? endTour() : startTour(); };

function startTour() {
  tour = { i: -1, timer: 0, delay: 0 };
  btnTour.classList.add('off');
  btnTour.querySelector('.lbl').textContent = 'Стоп';
  nextTourStop();
}
function nextTourStop() {
  if (!tour) return;
  tour.i++;
  if (tour.i >= tourList.length) { endTour(); goHome(); return;}
  selectBody(tourList[tour.i], tourBodies[tour.i]);
  tour.timer = 6.5; // секунд на каждую планету
}
function endTour() {
  if (!tour) return;
  tour = null;
  btnTour.classList.remove('off');
  btnTour.querySelector('.lbl').textContent = 'Путешествие';
}

// ============================================================
//  Анимация
// ============================================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  // Движение планет по орбитам и вращение вокруг оси.
  if (running) {
    for (const b of bodies) {
      b.angle += b.data.orbitSpeed * speed * dt * 0.5;
      b.orbit.rotation.y = b.angle;
      b.mesh.rotation.y += b.data.spinSpeed * dt * (0.4 + speed);
      if (b.moonPivot) b.moonPivot.rotation.y += b.moonData.speed * dt * (0.4 + speed);
    }
    sunMesh.rotation.y += dt * 0.05;
  }

  // Полёт камеры.
  if (flight) {
    flight.t = Math.min(1, flight.t + dt / 1.1);
    const e = easeInOut(flight.t);
    // если следим за движущейся планетой — обновляем цель
    if (flight.follow) flight.follow.getWorldPosition(flight.toTarget);
    camera.position.lerpVectors(flight.fromCam, flight.toCam, e);
    controls.target.lerpVectors(flight.fromTarget, flight.toTarget, e);
    if (flight.t >= 1) flight = null;
  } else if (currentBody && currentBody.id !== 'sun') {
    // Мягко держим камеру на выбранной движущейся планете.
    const b = bodies.find(x => x.data.id === currentBody.id);
    if (b) {
      const wp = new THREE.Vector3();
      b.mesh.getWorldPosition(wp);
      controls.target.lerp(wp, 0.08);
    }
  }

  // Режим путешествия.
  if (tour && flight === null) {
    tour.timer -= dt;
    if (tour.timer <= 0) nextTourStop();
  }

  controls.update();
  updateLabels();
  renderer.render(scene, camera);
}

// ============================================================
//  Ресайз
// ============================================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================
//  Запуск
// ============================================================
const loader = document.getElementById('loader');
function start() {
  loader.classList.add('hide');
  setTimeout(() => loader.remove(), 700);
  animate();
  // Приветствие — но только после первого касания экрана,
  // потому что браузеры блокируют звук без действия пользователя.
}
let greeted = false;
function greetOnce() {
  if (greeted) return;
  greeted = true;
  speech.say(WELCOME);
  window.removeEventListener('pointerdown', greetOnce);
  window.removeEventListener('keydown', greetOnce);
}
window.addEventListener('pointerdown', greetOnce);
window.addEventListener('keydown', greetOnce);

start();
