// Мини-сценки «Космические явления»: фазы Луны, солнечное и лунное затмения.
// Это отдельный простой макет Солнце–Земля–Луна (НЕ в масштабе), где мы
// специально выстраиваем тела так, чтобы наглядно показать, ПОЧЕМУ так бывает.

import * as THREE from 'three';
import { makeTexture, makeGlowTexture } from './textures.js';

const SUN_X = -52; // Солнце всегда слева

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
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(3, 64, 64),
    new THREE.MeshStandardMaterial({
      map: makeTexture('earth'), roughness: 1, metalness: 0,
    })
  );
  group.add(earth);

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

  // Тёмное пятно (тень Луны на Земле при солнечном затмении).
  const umbra = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.7 })
  );
  group.add(umbra);

  // Маленькие подписи-спрайты («Земля», «Луна», «Солнце»).
  function makeTag(text) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.font = 'bold 34px "Comic Sans MS", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,0.8)';
    g.strokeText(text, 128, 34); g.fillStyle = '#fff'; g.fillText(text, 128, 34);
    const tex = new THREE.CanvasTexture(c);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    spr.scale.set(10, 2.5, 1);
    group.add(spr);
    return spr;
  }
  const tagSun = makeTag('Солнце');
  const tagEarth = makeTag('Земля');
  const tagMoon = makeTag('Луна');

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
  const tmpQ = new THREE.Quaternion();
  const UP = new THREE.Vector3(0, 1, 0);

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
      setView(6, 16, 26, 8, 0, 0);
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
    layouts[id]();
    controls.enabled = false; // камеру ведём вручную
  }

  function stop() {
    state.id = null;
    group.visible = false;
    lights.sunLight.visible = true;
    lights.ambient.intensity = 0.72;
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
      // Луна скользит к линии Солнце–Земля; в момент совпадения — затмение
      const z = Math.cos(state.t * 0.6) * 6; // ходит туда-сюда через ось
      moon.position.set(6, 0, z);
      moon.rotation.y += dt * 0.3;
      const aligned = Math.abs(z) < 0.7;
      // тень-конус от Луны к Земле
      shadowCone.visible = true;
      orient(shadowCone, moon.position, new THREE.Vector3(11, 0, 0), 0.6, 0.1);
      shadowMat.opacity = aligned ? 0.45 : 0.18;
      // пятно тени на Земле (на стороне, обращённой к Солнцу: -X)
      umbra.visible = aligned;
      if (aligned) {
        umbra.position.set(14 - 3.02, 0, 0);
        umbra.rotation.set(0, -Math.PI / 2, 0);
        umbra.material.opacity = 0.75 * (1 - Math.abs(z) / 0.7);
      }
      label = aligned ? 'Тень Луны падает на Землю — затмение! 🌑'
                      : 'Луна подлетает к Солнцу…';
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
