// Visualizador 3D do material gerado: esfera e cubo, luz ajustavel, rotacao automatica e manual.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const root = document.getElementById('pbr-viewer');
if (root) {
  const lang = (document.documentElement.lang || 'en').slice(0, 2);
  const T = {
    en: { drag: 'Drag to rotate', mat: 'Generated material', az: 'Light direction', el: 'Light height', auto: 'Auto-rotate', names: ['Rock', 'Stone wall', 'Wood'], fail: 'Your browser could not start WebGL.' },
    pt: { drag: 'Arraste para girar', mat: 'Material gerado', az: 'Direção da luz', el: 'Altura da luz', auto: 'Girar sozinho', names: ['Pedra', 'Muro de pedra', 'Madeira'], fail: 'Seu navegador não conseguiu iniciar o WebGL.' },
    ja: { drag: 'ドラッグで回転', mat: '生成マテリアル', az: '光の向き', el: '光の高さ', auto: '自動回転', names: ['岩', '石壁', '木材'], fail: 'WebGLを開始できませんでした。' },
  }[lang] || null;
  const L = T || { drag: 'Drag to rotate', mat: 'Generated material', az: 'Light direction', el: 'Light height', auto: 'Auto-rotate', names: ['Rock', 'Stone wall', 'Wood'], fail: 'Your browser could not start WebGL.' };
  const SETS = ['rock', 'stone', 'wood'];
  const base = root.dataset.base || './pbr/';

  root.innerHTML = `
    <div class="relative rounded-xl overflow-hidden border border-white/10 bg-black" style="aspect-ratio:16/9">
      <canvas id="pbr-canvas" class="w-full h-full block" style="touch-action:none;cursor:grab"></canvas>
      <span class="absolute top-2 left-3 font-mono text-[11px] text-white/60 pointer-events-none">${L.drag}</span>
    </div>
    <div class="flex flex-wrap gap-2 mt-3" id="pbr-tabs"></div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mt-3 font-mono text-xs text-textMuted">
      <label class="flex flex-col gap-1"><span>${L.mat}: <b id="pbr-mixv" class="text-accent">100%</b></span><input id="pbr-mix" type="range" min="0" max="100" value="100" class="accent-accent"></label>
      <label class="flex flex-col gap-1"><span>${L.az}</span><input id="pbr-az" type="range" min="0" max="360" value="325" class="accent-accent"></label>
      <label class="flex flex-col gap-1"><span>${L.el}</span><input id="pbr-el" type="range" min="5" max="85" value="45" class="accent-accent"></label>
      <label class="flex items-center gap-2 self-end"><input id="pbr-auto" type="checkbox" checked class="accent-accent"><span>${L.auto}</span></label>
    </div>`;

  const canvas = root.querySelector('#pbr-canvas');
  const tabs = root.querySelector('#pbr-tabs');
  let started = false;

  const start = () => {
    if (started) return; started = true;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
    catch (e) { root.insertAdjacentHTML('beforeend', `<p class="font-mono text-xs text-textMuted mt-2">${L.fail}</p>`); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c12);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 50);
    camera.position.set(0, 0.7, 6.6);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true; controls.enablePan = false;
    controls.minDistance = 3.5; controls.maxDistance = 10;
    controls.autoRotate = false;
    controls.addEventListener('start', () => { canvas.style.cursor = 'grabbing'; });
    controls.addEventListener('end', () => { canvas.style.cursor = 'grab'; });

    const light = new THREE.DirectionalLight(0xffffff, 3.2);
    scene.add(light);

    const uMix = { value: 1 };
    const mats = [];
    const makeMat = () => {
      const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 1, envMapIntensity: 0.3 });
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uMix = uMix;
        sh.fragmentShader = 'uniform float uMix;\n' + sh.fragmentShader
          .replace('roughnessFactor *= texelRoughness.g;', 'roughnessFactor = mix(0.6, roughnessFactor * texelRoughness.g, uMix);')
          .replace('metalnessFactor *= texelMetalness.b;', 'metalnessFactor = metalnessFactor * texelMetalness.b * uMix;');
      };
      mats.push(m); return m;
    };
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.15, 128, 64), makeMat());
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), makeMat());
    sphere.position.x = -1.5; cube.position.x = 1.5;
    sphere.rotation.x = 0.25; cube.rotation.x = 0.3;
    scene.add(sphere, cube);

    const loader = new THREE.TextureLoader();
    const cache = {};
    const load = (name) => cache[name] ||= (() => {
      const get = (suffix, srgb) => {
        const t = loader.load(`${base}${name}_${suffix}.webp`);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(2, 2); t.anisotropy = 8;
        if (srgb) t.colorSpace = THREE.SRGBColorSpace;
        return t;
      };
      return { c: get('c', true), n: get('n', false), o: get('o', false) };
    })();
    const setTexture = (name) => {
      const t = load(name);
      for (const m of mats) {
        m.map = t.c; m.normalMap = t.n; m.aoMap = t.o; m.roughnessMap = t.o; m.metalnessMap = t.o;
        m.needsUpdate = true;
      }
      applyMix();
    };
    const applyMix = () => {
      const k = uMix.value;
      for (const m of mats) { m.normalScale.set(k, k); m.aoMapIntensity = k; }
    };

    SETS.forEach((name, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = L.names[i];
      b.className = 'px-3 py-1.5 rounded-full border font-mono text-xs transition-colors';
      b.onclick = () => { [...tabs.children].forEach((x) => x.classList.remove('border-accent', 'text-accent')); b.classList.add('border-accent', 'text-accent'); setTexture(name); };
      b.classList.add(i === 1 ? 'border-accent' : 'border-white/10', i === 1 ? 'text-accent' : 'text-textMuted');
      tabs.appendChild(b);
    });
    setTexture('stone');

    const $ = (id) => root.querySelector(id);
    // A luz acompanha a camera: o angulo do slider e' relativo a quem olha, entao nada fica escuro ao orbitar.
    const setLight = () => {
      const az = $('#pbr-az').value * Math.PI / 180 + Math.atan2(camera.position.x, camera.position.z);
      const el = $('#pbr-el').value * Math.PI / 180;
      light.position.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(6);
    };
    let spin = true;
    $('#pbr-mix').oninput = (e) => { uMix.value = e.target.value / 100; $('#pbr-mixv').textContent = e.target.value + '%'; applyMix(); };
    $('#pbr-auto').onchange = (e) => { spin = e.target.checked; };

    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== Math.floor(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    };
    let visible = true;
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(canvas);
    let last = performance.now();
    renderer.setAnimationLoop((now) => {
      if (!visible) { last = now; return; }
      const dt = Math.min((now - last) / 1000, 0.1); last = now;
      if (spin) { sphere.rotation.y += dt * 0.5; cube.rotation.y += dt * 0.5; }
      resize(); controls.update(); setLight(); renderer.render(scene, camera);
    });
  };

  new IntersectionObserver((e, o) => { if (e[0].isIntersecting) { o.disconnect(); start(); } }, { rootMargin: '200px' }).observe(root);
}
