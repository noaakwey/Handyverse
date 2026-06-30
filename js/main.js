import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SUN, PLANETS, ASTEROIDS, COMET, PHENOMENA, WELCOME } from './data.js';
import { makeTexture, makeRingTexture, makeGlowTexture, makeTailTexture, makeEarthMaps } from './textures.js';
import { createDemos } from './demos.js';

// ============================================================
//  Базовая сцена
// ============================================================
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  55, window.innerWidth / window.innerHeight, 0.1, 6000
);
const HOME_VIEW = new THREE.Vector3(0, 64, 130);
camera.position.copy(HOME_VIEW);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 9;
controls.maxDistance = 320;
controls.target.set(0, 0, 0);

// Свет: Солнце светит во все стороны + мягкий общий свет, чтобы планеты
// не были полностью чёрными с теневой стороны.
const sunLight = new THREE.PointLight(0xffffff, 4.4, 0, 0.55);
scene.add(sunLight);
// Чуть приглушенный общий свет — так у вращающихся планет виден день и
// ночь, но тёмная сторона всё равно не становится совсем чёрной и страшной.
const ambient = new THREE.AmbientLight(0x6677aa, 0.58);
scene.add(ambient);

// Всё «солнечное» складываем в одну группу — её удобно прятать на время
// показа космических явлений (затмений и т.п.).
const systemGroup = new THREE.Group();
scene.add(systemGroup);

// ============================================================
//  Звёздное небо (остаётся всегда)
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
    const r = 900 + Math.random() * 2200;
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
    size: 2.6, sizeAttenuation: true, vertexColors: true,
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
systemGroup.add(sunMesh);
clickable.push(sunMesh);

const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: makeGlowTexture('#ffd24d'), transparent: true,
  depthWrite: false, blending: THREE.AdditiveBlending,
}));
sunGlow.scale.set(SUN.radius * 5.2, SUN.radius * 5.2, 1);
sunMesh.add(sunGlow);

// ============================================================
//  Планеты
// ============================================================
const bodies = []; // данные для анимации

function makeOrbitLine(distance, color = 0x6f7bbf, opacity = 0.28) {
  const seg = 180;
  const pts = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * distance, 0, Math.sin(a) * distance));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  return new THREE.LineLoop(geo, mat);
}

for (const p of PLANETS) {
  systemGroup.add(makeOrbitLine(p.distance));

  const orbit = new THREE.Group();
  systemGroup.add(orbit);

  let mat;
  if (p.id === 'earth') {
    // Земля: отдельная пара карт (цвет + шероховатость) — океан гладкий
    // и блестящий, суша матовая, как на настоящей планете.
    const { map, roughnessMap } = makeEarthMaps();
    mat = new THREE.MeshStandardMaterial({
      map, roughnessMap, metalness: 0,
    });
  } else {
    const texType = p.texture === 'ice' ? 'ice' : p.texture;
    const tex = makeTexture(texType, p.color);
    mat = new THREE.MeshStandardMaterial({
      map: tex, bumpMap: tex, bumpScale: 0.015, roughness: 1, metalness: 0,
    });
  }
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.radius, 48, 48), mat);
  mesh.position.x = p.distance;
  mesh.userData = { body: p };
  if (p.tilt) mesh.rotation.z = p.tilt;
  orbit.add(mesh);
  clickable.push(mesh);

  // Кольца (Сатурн)
  if (p.rings) {
    const ringGeo = new THREE.RingGeometry(p.rings.inner, p.rings.outer, 96);
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

  // Облака и голубая дымка атмосферы (Земля) — отдельные слои поверх планеты.
  let clouds = null;
  if (p.id === 'earth') {
    clouds = new THREE.Mesh(
      new THREE.SphereGeometry(p.radius * 1.018, 48, 48),
      new THREE.MeshStandardMaterial({
        map: makeTexture('clouds'), transparent: true, depthWrite: false, roughness: 1,
      })
    );
    mesh.add(clouds);

    const atmosphere = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture('#7ec8ff'), transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55,
    }));
    atmosphere.scale.setScalar(p.radius * 3.1);
    mesh.add(atmosphere);
  }

  // Луна (Земля) — подробная, с рельефом
  let moonPivot = null, moonData = null;
  if (p.moon) {
    moonPivot = new THREE.Group();
    mesh.add(moonPivot);
    const moonTex = makeTexture('moon');
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(p.moon.radius, 48, 48),
      new THREE.MeshStandardMaterial({
        map: moonTex, bumpMap: moonTex, bumpScale: 0.04, roughness: 1,
      })
    );
    moonMesh.position.x = p.moon.distance;
    moonPivot.add(moonMesh);
    moonData = p.moon;
  }

  bodies.push({ data: p, orbit, mesh, moonPivot, moonData, clouds, angle: Math.random() * Math.PI * 2 });
}

// ============================================================
//  Пояс астероидов (между Марсом и Юпитером)
// ============================================================
const beltGroup = new THREE.Group();
systemGroup.add(beltGroup);

const rockMat = new THREE.MeshStandardMaterial({ map: makeTexture('rocky'), roughness: 1 });
const beltInst = new THREE.InstancedMesh(
  new THREE.IcosahedronGeometry(0.22, 0), rockMat, ASTEROIDS.count
);
const _d = new THREE.Object3D();
for (let i = 0; i < ASTEROIDS.count; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = ASTEROIDS.inner + Math.random() * (ASTEROIDS.outer - ASTEROIDS.inner);
  _d.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 2.2, Math.sin(a) * r);
  const s = 0.4 + Math.random() * Math.random() * 2.2;
  _d.scale.set(s, s * (0.7 + Math.random() * 0.5), s);
  _d.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
  _d.updateMatrix();
  beltInst.setMatrixAt(i, _d.matrix);
}
beltInst.userData = { body: ASTEROIDS, focusTarget: null };
beltGroup.add(beltInst);
clickable.push(beltInst);

// Невидимая точка-«якорь» для подписи и наведения камеры на пояс.
const beltAnchor = new THREE.Object3D();
beltAnchor.position.set((ASTEROIDS.inner + ASTEROIDS.outer) / 2, 0, 0);
beltGroup.add(beltAnchor);
beltInst.userData.focusTarget = beltAnchor;

// ============================================================
//  Комета — вытянутая орбита и хвост «от Солнца»
// ============================================================
const cometOrbitGroup = new THREE.Group();
cometOrbitGroup.rotation.x = COMET.tilt;
systemGroup.add(cometOrbitGroup);

// Орбита-эллипс (Солнце в фокусе).
(function drawCometOrbit() {
  const seg = 240, pts = [];
  const a = COMET.semiMajor, e = COMET.eccentricity;
  for (let i = 0; i <= seg; i++) {
    const th = (i / seg) * Math.PI * 2;
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(th));
    pts.push(new THREE.Vector3(Math.cos(th) * r, 0, Math.sin(th) * r));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({
    color: 0x7fd6ff, transparent: true, opacity: 0.3,
  }));
  cometOrbitGroup.add(line);
})();

const cometNucleus = new THREE.Mesh(
  new THREE.SphereGeometry(0.55, 24, 24),
  new THREE.MeshStandardMaterial({ map: makeTexture('comet'), roughness: 1 })
);
cometNucleus.userData = { body: COMET };
cometOrbitGroup.add(cometNucleus);
clickable.push(cometNucleus);

// Кома — свечение вокруг ядра.
const cometComa = new THREE.Sprite(new THREE.SpriteMaterial({
  map: makeGlowTexture('#bfe9ff'), transparent: true,
  depthWrite: false, blending: THREE.AdditiveBlending,
}));
cometComa.scale.set(4, 4, 1);
cometNucleus.add(cometComa);

// Хвост — цепочка светящихся спрайтов; всегда направлен ОТ Солнца.
const tailGroup = new THREE.Group();
systemGroup.add(tailGroup);
const tailSprites = [];
const tailTex = makeGlowTexture('#a9e4ff');
for (let i = 0; i < 10; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tailTex, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, opacity: 0.5,
  }));
  tailGroup.add(s);
  tailSprites.push(s);
}
let cometTheta = Math.random() * Math.PI * 2;

function updateComet(dt) {
  const a = COMET.semiMajor, e = COMET.eccentricity;
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(cometTheta));
  // Скорость по орбите больше у Солнца (закон сохранения момента ~ 1/r²).
  const rc = Math.max(r, 22);
  cometTheta += dt * speed * 90 / (rc * rc);
  cometNucleus.position.set(Math.cos(cometTheta) * r, 0, Math.sin(cometTheta) * r);
  cometNucleus.rotation.y += dt * 0.6;

  // Хвост: от Солнца (в мире Солнце в центре systemGroup).
  const world = new THREE.Vector3();
  cometNucleus.getWorldPosition(world);
  const dist = world.length();
  const antiSun = world.clone().normalize();           // от Солнца к комете → дальше
  tailGroup.position.copy(world);
  tailGroup.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), antiSun);
  // Чем ближе к Солнцу, тем длиннее и ярче хвост.
  const near = THREE.MathUtils.clamp((110 - dist) / 80, 0.15, 1);
  for (let i = 0; i < tailSprites.length; i++) {
    const sp = tailSprites[i];
    sp.position.x = i * (1.4 + near * 1.8);
    const sc = (3.2 - i * 0.22) * (0.5 + near);
    sp.scale.set(sc, sc, 1);
    sp.material.opacity = (0.55 - i * 0.045) * near;
  }
  cometComa.scale.setScalar(2.5 + near * 3);
}

// ============================================================
//  Подписи (HTML поверх 3D)
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
makeLabel(ASTEROIDS, beltAnchor);
makeLabel(COMET, cometNucleus);

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
    el.style.opacity = String(Math.max(0.15, Math.min(1, 300 / dist)));
  }
}

// ============================================================
//  Озвучка (Web Speech API), русский голос
// ============================================================
const speech = {
  on: true,
  voice: null,
  gen: 0,
  // Выбираем самый «живой» русский голос из доступных в браузере/ОС.
  // Сначала пробуем качественные сетевые/нейронные голоса (Google, Microsoft
  // Online, "Neural"/"Enhanced"/"Premium"), затем известные приятные имена,
  // и только потом — любой русский голос, какой найдётся.
  pick() {
    const voices = speechSynthesis.getVoices().filter(v => /^ru/i.test(v.lang));
    const byPattern = (re) => voices.find(v => re.test(v.name));
    this.voice =
      byPattern(/google/i) ||
      byPattern(/neural|enhanced|premium|online|natural/i) ||
      byPattern(/milena|alyona|алёна|irina|ирина|katya|катя/i) ||
      voices[0] || null;
  },
  say(text) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    this.gen++;
    const myGen = this.gen;
    if (!this.on) return;
    // Разбиваем на предложения и произносим по очереди с короткой паузой —
    // звучит плавнее и естественнее, чем одна длинная фраза разом.
    const sentences = text.split(/(?<=[.!?…])\s+/).filter(Boolean);
    let i = 0;
    const speakNext = () => {
      if (myGen !== this.gen || i >= sentences.length) return;
      const u = new SpeechSynthesisUtterance(sentences[i]);
      u.lang = 'ru-RU';
      if (this.voice) u.voice = this.voice;
      u.rate = 0.98;
      u.pitch = 1.04;
      u.volume = 1;
      u.onend = () => { if (myGen !== this.gen) return; i++; setTimeout(speakNext, 160); };
      speechSynthesis.speak(u);
    };
    speakNext();
  },
  stop() { this.gen++; if ('speechSynthesis' in window) speechSynthesis.cancel(); },
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
let currentTarget = null;

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
  currentTarget = null;
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
  const r = body.focusR || body.radius || SUN.radius;
  const dir = new THREE.Vector3().subVectors(camera.position, targetPos).normalize();
  if (dir.lengthSq() < 0.001) dir.set(0, 0.4, 1).normalize();
  const dist = Math.max(r * 4.5, 9);
  const camGoal = new THREE.Vector3()
    .copy(targetPos)
    .add(dir.multiplyScalar(dist))
    .add(new THREE.Vector3(0, r * 1.2, 0));
  flight = {
    fromCam: camera.position.clone(), toCam: camGoal,
    fromTarget: controls.target.clone(), toTarget: targetPos.clone(),
    follow: target, t: 0,
  };
}
function goHome() {
  flight = {
    fromCam: camera.position.clone(), toCam: HOME_VIEW.clone(),
    fromTarget: controls.target.clone(), toTarget: new THREE.Vector3(0, 0, 0),
    follow: null, t: 0,
  };
}
const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// ============================================================
//  Выбор тела (клик / кнопка)
// ============================================================
function selectBody(target, body, { fly = true } = {}) {
  currentTarget = target;
  if (fly) focusOn(target, body);
  showCard(body);
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downXY = null;

canvas.addEventListener('pointerdown', e => { downXY = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', e => {
  if (!downXY || inDemo) { downXY = null; return; }
  const moved = Math.hypot(e.clientX - downXY.x, e.clientY - downXY.y);
  downXY = null;
  if (moved > 8) return;
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickable, false);
  if (hits.length) {
    endTour();
    const obj = hits[0].object;
    const body = obj.userData.body;
    const target = obj.userData.focusTarget || obj;
    selectBody(target, body);
  }
});

// ============================================================
//  Нижнее меню планет (+ комета и пояс астероидов)
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
addChip(ASTEROIDS, beltAnchor);
addChip(COMET, cometNucleus);

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
//  Режим «Путешествие»
// ============================================================
let tour = null;
const tourList = [sunMesh, ...bodies.map(b => b.mesh), beltAnchor, cometNucleus];
const tourBodies = [SUN, ...bodies.map(b => b.data), ASTEROIDS, COMET];

btnTour.onclick = () => { if (paradeMode) return; tour ? endTour() : startTour(); };

function startTour() {
  tour = { i: -1, timer: 0 };
  btnTour.classList.add('off');
  btnTour.querySelector('.lbl').textContent = 'Стоп';
  nextTourStop();
}
function nextTourStop() {
  if (!tour) return;
  tour.i++;
  if (tour.i >= tourList.length) { endTour(); goHome(); return; }
  selectBody(tourList[tour.i], tourBodies[tour.i]);
  tour.timer = 6.5;
}
function endTour() {
  if (!tour) return;
  tour = null;
  btnTour.classList.remove('off');
  btnTour.querySelector('.lbl').textContent = 'Путешествие';
}

// ============================================================
//  Космические явления (затмения, фазы Луны)
// ============================================================
const demos = createDemos({ scene, camera, controls, lights: { sunLight, ambient }, speak: t => speech.say(t) });

const eventsMenu = document.getElementById('events-menu');
const demoBar = document.getElementById('demo-bar');
const demoTitle = document.getElementById('demo-title');
const demoPhase = document.getElementById('demo-phase');
const btnEvents = document.getElementById('btn-events');
const topbar = document.getElementById('topbar');
let inDemo = false;
let currentPhenomenon = null;

// наполняем меню
for (const ph of PHENOMENA) {
  const b = document.createElement('button');
  b.className = 'event-btn';
  b.innerHTML = `<span class="big">${ph.emoji}</span><span>${ph.name}</span>`;
  b.onclick = () => { closeEvents(); enterDemo(ph); };
  eventsMenu.appendChild(b);
}

function openEvents() { eventsMenu.classList.remove('hidden'); }
function closeEvents() { eventsMenu.classList.add('hidden'); }
btnEvents.onclick = () => eventsMenu.classList.contains('hidden') ? openEvents() : closeEvents();

function enterDemo(ph) {
  currentPhenomenon = ph;
  endTour();
  hideCard();
  if (ph.id === 'parade') { enterParade(ph); return; }
  inDemo = true;
  systemGroup.visible = false;
  labelsRoot.classList.add('hidden');
  topbar.classList.add('hidden');
  planetBar.classList.add('hidden');
  demoTitle.textContent = ph.name;
  demoPhase.textContent = '';
  demoBar.classList.remove('hidden');
  speech.say(ph.intro);
  demos.start(ph.id);
}

function exitDemo() {
  inDemo = false;
  demos.stop();
  systemGroup.visible = true;
  labelsRoot.classList.remove('hidden');
  topbar.classList.remove('hidden');
  planetBar.classList.remove('hidden');
  demoBar.classList.add('hidden');
  goHome();
}

// ------------------------------------------------------------
//  Парад планет — все планеты выстраиваются в линию от Солнца
//  (показываем прямо в основной системе, без отдельной сценки).
// ------------------------------------------------------------
let paradeMode = false;
let paradeAnnounced = false;

function enterParade(ph) {
  paradeMode = true;
  paradeAnnounced = false;
  topbar.classList.add('hidden');
  planetBar.classList.add('hidden');
  demoTitle.textContent = ph.name;
  demoPhase.textContent = 'Планеты собираются в одну сторону…';
  demoBar.classList.remove('hidden');
  speech.say(ph.intro);
  const farthest = PLANETS[PLANETS.length - 1].distance;
  flight = {
    fromCam: camera.position.clone(),
    toCam: new THREE.Vector3(farthest * 0.55, farthest * 0.45, farthest * 0.95),
    fromTarget: controls.target.clone(),
    toTarget: new THREE.Vector3(farthest * 0.4, 0, 0),
    follow: null, t: 0,
  };
}

function exitParade() {
  paradeMode = false;
  topbar.classList.remove('hidden');
  planetBar.classList.remove('hidden');
  demoBar.classList.add('hidden');
  goHome();
}

document.getElementById('demo-back').onclick = () => { paradeMode ? exitParade() : exitDemo(); };
document.getElementById('demo-say').onclick = () => { if (currentPhenomenon) speech.say(currentPhenomenon.intro); };

// ============================================================
//  Анимация
// ============================================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (inDemo) {
    const label = demos.update(dt); // камера управляется внутри сценки
    if (label) demoPhase.textContent = label;
    renderer.render(scene, camera);
    return;
  }

  if (paradeMode) {
    // Плавно подводим каждую планету к углу 0 (кратчайшим путём) — так
    // все они выстраиваются в одну линию от Солнца, как в настоящем
    // параде планет.
    let allAligned = true;
    for (const b of bodies) {
      let diff = Math.atan2(Math.sin(-b.angle), Math.cos(-b.angle));
      if (Math.abs(diff) > 0.02) allAligned = false;
      b.angle += diff * Math.min(1, dt * 1.6);
      b.orbit.rotation.y = b.angle;
      b.mesh.rotation.y += b.data.spinSpeed * dt * 0.5;
      if (b.moonPivot) b.moonPivot.rotation.y += b.moonData.speed * dt * 0.5;
      if (b.clouds) b.clouds.rotation.y += dt * 0.04;
    }
    sunMesh.rotation.y += dt * 0.05;
    if (allAligned && !paradeAnnounced) {
      paradeAnnounced = true;
      demoPhase.textContent = 'Вот это парад планет! 🎉 Все выстроились в ряд.';
      speech.say(PHENOMENA.find(p => p.id === 'parade').afterFact);
    }
  } else if (running) {
    for (const b of bodies) {
      b.angle += b.data.orbitSpeed * speed * dt * 0.5;
      b.orbit.rotation.y = b.angle;
      b.mesh.rotation.y += b.data.spinSpeed * dt * (0.4 + speed);
      if (b.moonPivot) b.moonPivot.rotation.y += b.moonData.speed * dt * (0.4 + speed);
      if (b.clouds) b.clouds.rotation.y += dt * 0.05 * (0.4 + speed);
    }
    sunMesh.rotation.y += dt * 0.05;
    beltGroup.rotation.y += dt * speed * 0.06;
    updateComet(dt);
  } else {
    updateComet(0); // держим хвост направленным от Солнца даже на паузе
  }

  if (flight) {
    flight.t = Math.min(1, flight.t + dt / 1.1);
    const e = easeInOut(flight.t);
    if (flight.follow) flight.follow.getWorldPosition(flight.toTarget);
    camera.position.lerpVectors(flight.fromCam, flight.toCam, e);
    controls.target.lerpVectors(flight.fromTarget, flight.toTarget, e);
    if (flight.t >= 1) flight = null;
  } else if (!paradeMode && currentTarget && currentBody && currentBody.id !== 'sun' && currentBody.id !== 'belt') {
    const wp = new THREE.Vector3();
    currentTarget.getWorldPosition(wp);
    controls.target.lerp(wp, 0.08);
  }

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
