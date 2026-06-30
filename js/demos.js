// Мини-сценки «Космические явления»: фазы Луны, солнечное и лунное затмения.
// Это отдельный простой макет Солнце–Земля–Луна (НЕ в масштабе), где мы
// специально выстраиваем тела так, чтобы наглядно показать, ПОЧЕМУ так бывает.

import * as THREE from 'three';
import { makeTexture, makeGlowTexture, makeEarthMaps } from './textures.js';

const SUN_X = -52; // Солнце всегда слева
const SEASON_TILT = 0.41; // наклон оси Земли (~23.5°), как в жизни

export function createDemos({ scene, camera, controls, lights, speak }) {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);

  // --- Солнце (только для вида, светит через directional light) ---
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(7, 40, 40),
    new THREE.MeshBasicMaterial({ map: makeTexture('sun') })
  );
  sun.position.set(SUN_X, 0, 0);
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture('#ffd24d'), transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  sunGlow.scale.set(40, 40, 1);
  sun.add(sunGlow);
  group.add(sun);

  // Направленный свет «от Солнца» (идёт в сторону +X).
  const sunLight = new THREE.DirectionalLight(0xfff4e0, 2.4);
  sunLight.position.set(SUN_X, 0, 0);
  group.add(sunLight);
  group.add(sunLight.target);

  // --- Земля ---
  const earthMaps = makeEarthMaps();
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(3, 64, 64),
    new THREE.MeshStandardMaterial({
      map: earthMaps.map, roughnessMap: earthMaps.roughnessMap, metalness: 0,
    })
  );
  group.add(earth);

  const earthClouds = new THREE.Mesh(
    new THREE.SphereGeometry(3.05, 48, 48),
    new THREE.MeshStandardMaterial({
      map: makeTexture('clouds'), transparent: true, depthWrite: false, roughness: 1,
    })
  );
  earth.add(earthClouds);

  const earthAtmosphere = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture('#7ec8ff'), transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5,
  }));
  earthAtmosphere.scale.setScalar(9.5);
  earth.add(earthAtmosphere);

  // --- Луна (подробная, с рельефом) ---
  const moonTex = makeTexture('moon');
  const moonMat = new THREE.MeshStandardMaterial({
    map: moonTex, bumpMap: moonTex, bumpScale: 0.06, roughness: 1, metalness: 0,
  });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(2, 64, 64), moonMat);
  group.add(moon);

  // --- Тень-конус (для затмений) ---
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x05060a, transparent: true, opacity: 0.4, depthWrite: false,
  });
  const shadowCone = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 32, 1, true), shadowMat);
  group.add(shadowCone);

  // Тёмное пятно (тень Луны на Земле при солнечном затмении) — мягкий
  // радиальный градиент вместо чёткого круга, чтобы было похоже на тень,
  // а не на наклейку.
  const umbra = new THREE.Mesh(
    new THREE.CircleGeometry(2.2, 40),
    new THREE.MeshBasicMaterial({
      map: makeGlowTexture('#000000'), color: 0x000000, transparent: true,
      opacity: 0.85, depthWrite: false,
    })
  );
  group.add(umbra);

  // Маленькие подписи-спрайты («Земля», «Луна», «Солнце»).
  function makeTag(text, sx, sy) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.font = 'bold 34px "Comic Sans MS", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,0.8)';
    g.strokeText(text, 128, 34); g.fillStyle = '#fff'; g.fillText(text, 128, 34);
    const tex = new THREE.CanvasTexture(c);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    spr.scale.set(sx || 10, sy || 2.5, 1);
    group.add(spr);
    return spr;
  }
  const tagSun = makeTag('Солнце');
  const tagEarth = makeTag('Земля');
  const tagMoon = makeTag('Луна');
  // День/Ночь показываются при близкой камере — спрайт нужен мельче,
  // чем у остальных подписей (те видны издалека).
  const tagDay = makeTag('День ☀️', 4.5, 1.1);
  const tagNight = makeTag('Ночь 🌙', 4.5, 1.1);

  // Маленькая яркая звезда-метка, приклеенная к поверхности Земли — по ней
  // хорошо видно, как день сменяется ночью при вращении планеты. Рисуем
  // её сами (не эмодзи), чтобы выглядела одинаково на любом устройстве.
  function makeStarMarker(size) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.translate(64, 64);
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      const a1 = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const a2 = a1 + Math.PI / 5;
      g.lineTo(Math.cos(a1) * 50, Math.sin(a1) * 50);
      g.lineTo(Math.cos(a2) * 22, Math.sin(a2) * 22);
    }
    g.closePath();
    g.fillStyle = '#ffce45'; g.fill();
    g.lineWidth = 7; g.strokeStyle = '#a86a00'; g.stroke();
    const tex = new THREE.CanvasTexture(c);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    spr.scale.set(size, size, 1);
    return spr;
  }
  const dayNightMarker = makeStarMarker(1.3);
  dayNightMarker.position.set(3.2, 0, 0);
  earth.add(dayNightMarker);
  dayNightMarker.visible = false;

  // Тонкая ось вращения Земли — видна только в сценке «Времена года»,
  // чтобы было заметно, что Земля стоит немного «набок».
  const axisLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -4.4, 0), new THREE.Vector3(0, 4.4, 0)]),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })
  );
  earth.add(axisLine);
  axisLine.visible = false;

  // Орбита Земли вокруг Солнца — видна только в сценке «Времена года».
  const SEASON_R = 16;
  const seasonOrbitPts = [];
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    seasonOrbitPts.push(new THREE.Vector3(SUN_X + Math.cos(a) * SEASON_R, 0, Math.sin(a) * SEASON_R));
  }
  const seasonOrbit = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(seasonOrbitPts),
    new THREE.LineBasicMaterial({ color: 0x7fa0ff, transparent: true, opacity: 0.3 })
  );
  group.add(seasonOrbit);
  seasonOrbit.visible = false;

  // Камера в сценках управляется вручную (без OrbitControls), чтобы точно
  // показать нужный ракурс. В начале — плавный «подлёт».
  const camFrom = new THREE.Vector3(), camTo = new THREE.Vector3();
  const lookFrom = new THREE.Vector3(), lookTo = new THREE.Vector3();
  const look = new THREE.Vector3();
  let intro = 0;

  function setView(cx, cy, cz, tx, ty, tz) {
    camFrom.copy(camera.position);
    lookFrom.copy(controls.target);
    camTo.set(cx, cy, cz);
    lookTo.set(tx, ty, tz);
    intro = 0;
  }

  const state = { id: null, t: 0 };
  const _v = new THREE.Vector3();
  const _oc = new THREE.Vector3();
  const _dir = new THREE.Vector3();
  const _hit = new THREE.Vector3();
  const _normal = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const UP = new THREE.Vector3(0, 1, 0);
  const sunPos = new THREE.Vector3(SUN_X, 0, 0);

  function orient(cone, from, to, baseR, tipR) {
    // ставим конус так, чтобы основание было у from, остриё у to
    const dir = _v.subVectors(to, from);
    const len = dir.length();
    cone.geometry.dispose();
    cone.geometry = new THREE.ConeGeometry(baseR, len, 32, 1, true);
    cone.position.copy(from).add(_v.clone().multiplyScalar(0.5));
    tmpQ.setFromUnitVectors(UP, dir.clone().normalize());
    cone.quaternion.copy(tmpQ);
  }

  function hideExtras() {
    shadowCone.visible = false;
    umbra.visible = false;
  }

  // Сброс общих частей сцены перед каждой новой сценкой — иначе
  // настройки одной сценки («наклон» Земли, скрытая Луна и т.п.)
  // могли бы остаться видны в следующей.
  function resetShared() {
    earth.rotation.set(0, 0, 0);
    moon.visible = true;
    tagDay.visible = false;
    tagNight.visible = false;
    dayNightMarker.visible = false;
    axisLine.visible = false;
    seasonOrbit.visible = false;
  }

  const layouts = {
    phases() {
      earth.visible = false;          // мы смотрим С Земли
      moon.scale.setScalar(1.6);
      tagEarth.visible = false;
      tagSun.visible = false;
      tagMoon.visible = false;
      sunLight.target.position.set(0, 0, 0);
      // камера стоит в точке наблюдателя (на Земле) в центре
      setView(0, 1.8, 0.01, 11, 0, 0);
    },
    solar() {
      earth.visible = true;
      earth.position.set(14, 0, 0);
      moon.scale.setScalar(0.42);
      tagSun.position.set(SUN_X, 10, 0);
      tagEarth.position.set(14, 6, 0);
      tagMoon.visible = true;
      sunLight.target.position.copy(earth.position);
      // Невысокая, почти лицевая камера — так тёмное пятно тени хорошо
      // видно на диске Земли, а не сжимается в полоску от острого ракурса.
      setView(-4, 5, 24, 12, 0, 0);
      controls.minDistance = 8; controls.maxDistance = 90;
    },
    lunar() {
      earth.visible = true;
      earth.position.set(0, 0, 0);
      moon.scale.setScalar(0.7);
      tagSun.position.set(SUN_X, 10, 0);
      tagEarth.position.set(0, 6, 0);
      tagMoon.visible = true;
      sunLight.target.position.set(0, 0, 0);
      setView(2, 12, 30, 12, 0, 0);
      controls.minDistance = 8; controls.maxDistance = 90;
    },
    daynight() {
      earth.visible = true;
      earth.position.set(0, 0, 0);
      moon.visible = false;
      tagEarth.visible = false;
      tagMoon.visible = false;
      tagSun.position.set(SUN_X + 9, 7, 0);
      tagDay.visible = true;
      tagNight.visible = true;
      tagDay.position.set(-6, 4.6, 2);
      tagNight.position.set(6, 4.6, 2);
      dayNightMarker.visible = true;
      sunLight.target.position.set(0, 0, 0);
      setView(3, 4, 13, 0, 0, 0);
      controls.minDistance = 6; controls.maxDistance = 60;
    },
    seasons() {
      earth.visible = true;
      moon.visible = false;
      tagEarth.visible = false;
      tagMoon.visible = false;
      tagSun.position.set(SUN_X, 9, 0);
      axisLine.visible = true;
      seasonOrbit.visible = true;
      // свет всегда направлен на Землю — а она движется по орбите,
      // поэтому цель света обновляется каждый кадр в update()
      setView(SUN_X + 18, 16, 36, SUN_X, 0, 0);
      controls.minDistance = 10; controls.maxDistance = 120;
    },
  };

  // Названия фаз Луны по углу на орбите.
  const PHASE_NAMES = [
    'Полнолуние 🌕', 'Убывающая Луна 🌖', 'Последняя четверть 🌗',
    'Старый месяц 🌘', 'Новолуние 🌑', 'Молодой месяц 🌒',
    'Первая четверть 🌓', 'Растущая Луна 🌔',
  ];

  function start(id) {
    state.id = id;
    state.t = 0;
    hideExtras();
    tagSun.visible = true;
    moonMat.color.set(0xffffff);
    group.visible = true;
    // приглушаем «солнечный» свет основной системы — здесь свой
    lights.sunLight.visible = false;
    lights.ambient.intensity = 0.18;
    resetShared();
    layouts[id]();
    controls.enabled = false; // камеру ведём вручную
  }

  function stop() {
    state.id = null;
    group.visible = false;
    lights.sunLight.visible = true;
    lights.ambient.intensity = 0.58;
    controls.enabled = true;
    controls.minDistance = 9;
    controls.maxDistance = 320;
  }

  // Возвращает текст подписи (например, название фазы) или ''.
  function update(dt) {
    if (!state.id) return '';
    state.t += dt;

    let label = '';

    if (state.id === 'phases') {
      const a = state.t * 0.5; // оборот Луны
      const R = 11;
      moon.position.set(Math.cos(a) * R, 0, Math.sin(a) * R);
      moon.rotation.y = a; // повёрнута к Земле одной стороной
      // a=0 → Луна на +X (Солнце слева, за нами) → полнолуние
      const sector = (Math.round(a / (Math.PI / 4)) % 8 + 8) % 8;
      label = PHASE_NAMES[sector];
      // Наблюдатель стоит на Земле (в центре) и поворачивается к Луне,
      // поэтому после подлёта смотрим прямо на неё — видны фазы.
      if (intro >= 1) lookTo.copy(moon.position);
    }

    else if (state.id === 'solar') {
      // Луна медленно качается поперёк линии Солнце–Земля; когда она
      // оказывается точно на этой линии — её тень дотягивается до Земли.
      const z = Math.cos(state.t * 0.32) * 7.5;
      moon.position.set(6, 0, z);
      moon.rotation.y += dt * 0.3;

      // Настоящий луч от Солнца через Луну, продолженный дальше —
      // считаем, пересекает ли он шар Земли, и если да — где именно.
      _dir.subVectors(moon.position, sunPos).normalize();
      shadowCone.visible = true;
      _hit.copy(moon.position).addScaledVector(_dir, 18);
      orient(shadowCone, moon.position, _hit, 0.6, 0);

      const earthR = 3;
      _oc.subVectors(moon.position, earth.position);
      const b = _oc.dot(_dir);
      const distSq = _oc.lengthSq() - b * b; // квадрат расстояния от центра Земли до луча
      const dist = Math.sqrt(Math.max(0, distSq));
      const hits = dist < earthR;
      shadowMat.opacity = hits ? 0.5 : 0.16;

      umbra.visible = hits;
      if (hits) {
        const t = -b - Math.sqrt(Math.max(0, earthR * earthR - distSq));
        _hit.copy(moon.position).addScaledVector(_dir, t);
        _normal.subVectors(_hit, earth.position).normalize();
        umbra.position.copy(_hit).addScaledVector(_normal, 0.06);
        umbra.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _normal);
        const fade = 1 - dist / earthR; // 1 = в самом центре, 0 = у края
        umbra.material.opacity = 0.3 + fade * 0.6;
        umbra.scale.setScalar(0.6 + fade * 0.5);
      }
      label = hits ? 'Тень Луны падает на Землю — затмение! 🌑'
                   : 'Луна подлетает к линии Солнца…';
    }

    else if (state.id === 'lunar') {
      // Тень Земли тянется вправо (+X), Луна входит в неё
      shadowCone.visible = true;
      orient(shadowCone, new THREE.Vector3(0, 0, 0), new THREE.Vector3(26, 0, 0), 3, 0);
      shadowMat.opacity = 0.32;
      const z = Math.cos(state.t * 0.6) * 6;
      moon.position.set(14, 0, z);
      moon.rotation.y += dt * 0.3;
      const inShadow = Math.abs(z) < 2.2;
      // в тени Луна краснеет и темнеет
      const red = inShadow ? 1 - Math.abs(z) / 2.2 : 0;
      moonMat.color.setRGB(1 - red * 0.1, 1 - red * 0.65, 1 - red * 0.75);
      label = inShadow ? 'Луна в тени Земли — она краснеет! 🔴'
                       : 'Луна подлетает к тени Земли…';
    }

    else if (state.id === 'daynight') {
      // Земля крутится на месте — видно, как солнечная сторона (день)
      // сменяется тёмной (ночь).
      earth.rotation.y += dt * 0.35;
      _dir.set(1, 0, 0).applyQuaternion(earth.quaternion); // куда сейчас смотрит «домик»
      _normal.subVectors(sunPos, earth.position).normalize(); // направление на Солнце
      const isDay = _dir.dot(_normal) > 0.08;
      label = isDay ? 'Тут сейчас день ☀️' : 'Тут сейчас ночь 🌙';
    }

    else if (state.id === 'seasons') {
      // Земля медленно облетает Солнце; ось наклона остаётся неизменной
      // в пространстве — поэтому то один, то другой полюс ближе к свету.
      const orbitA = state.t * 0.12;
      earth.position.set(SUN_X + Math.cos(orbitA) * SEASON_R, 0, Math.sin(orbitA) * SEASON_R);
      earth.rotation.z = SEASON_TILT;
      earth.rotation.y += dt * 0.5;
      sunLight.target.position.copy(earth.position);

      // Направление «на север» (ось наклона) неизменно в пространстве —
      // считаем его один раз через тот же наклон.
      _dir.set(-Math.sin(SEASON_TILT), Math.cos(SEASON_TILT), 0);
      _normal.subVectors(sunPos, earth.position).normalize();
      const tilt = _dir.dot(_normal);
      if (tilt > 0.18) label = 'Лето на севере ☀️ — зима на юге ❄️';
      else if (tilt < -0.18) label = 'Зима на севере ❄️ — лето на юге ☀️';
      else label = 'Весна или осень 🌸 — везде похожая погода';
    }

    // подписи всегда чуть выше тел
    tagMoon.position.copy(moon.position).add(_v.set(0, moon.scale.x * 2 + 1.5, 0));

    // Камера: плавный подлёт, затем удержание заданного ракурса.
    if (intro < 1) {
      intro = Math.min(1, intro + dt / 1.0);
      const e = intro < 0.5 ? 2 * intro * intro : 1 - Math.pow(-2 * intro + 2, 2) / 2;
      camera.position.lerpVectors(camFrom, camTo, e);
      look.lerpVectors(lookFrom, lookTo, e);
    } else {
      camera.position.copy(camTo);
      look.lerp(lookTo, 0.1); // мягко доводим взгляд (для слежения за Луной)
    }
    camera.lookAt(look);
    return label;
  }

  return { group, start, stop, update, get id() { return state.id; } };
}
