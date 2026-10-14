// Pelota 3D de la landing: un icosaedro truncado (la forma real de un balón de fútbol)
// con paneles de vidrio oscuro y bordes verde neón, usando Three.js.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Colores de la paleta actual (ver :root en styles.css)
const NEON = '#39ff14';
const NEON_RGB = '57, 255, 20';

/* ---------- Geometría: 12 pentágonos + 20 hexágonos ---------- */
function buildTruncatedIcosahedron(radius) {
  const t = (1 + Math.sqrt(5)) / 2;

  const rawVerts = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
  ].map((v) => new THREE.Vector3(v[0], v[1], v[2]).normalize());

  const faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
  ];

  // Punto a 1/3 de la arista, proyectado sobre la esfera
  const cache = new Map();
  function truncPoint(near, far) {
    const key = `${near}>${far}`;
    if (!cache.has(key)) {
      cache.set(key, rawVerts[near].clone().lerp(rawVerts[far], 1 / 3).normalize().multiplyScalar(radius));
    }
    return cache.get(key);
  }

  // Cada cara del icosaedro se convierte en un hexágono
  const hexagons = faces.map(([a, b, c]) => [
    truncPoint(a, b), truncPoint(b, a),
    truncPoint(b, c), truncPoint(c, b),
    truncPoint(c, a), truncPoint(a, c)
  ]);

  // Cada vértice del icosaedro se convierte en un pentágono
  const vecinos = new Map();
  faces.forEach((f) => {
    f.forEach((v) => {
      if (!vecinos.has(v)) vecinos.set(v, new Set());
      f.forEach((o) => { if (o !== v) vecinos.get(v).add(o); });
    });
  });

  const pentagons = [];
  for (let v = 0; v < 12; v++) {
    const pos = rawVerts[v];
    const ref = Math.abs(pos.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const ejeX = new THREE.Vector3().crossVectors(ref, pos).normalize();
    const ejeY = new THREE.Vector3().crossVectors(pos, ejeX).normalize();

    const ordenados = Array.from(vecinos.get(v))
      .map((n) => {
        const rel = rawVerts[n].clone().sub(pos.clone().multiplyScalar(rawVerts[n].dot(pos)));
        return { n, angulo: Math.atan2(rel.dot(ejeY), rel.dot(ejeX)) };
      })
      .sort((p, q) => p.angulo - q.angulo)
      .map((o) => o.n);

    pentagons.push(ordenados.map((n) => truncPoint(v, n)));
  }

  return { pentagons, hexagons };
}

function buildPanelGeometry(points) {
  const n = points.length;
  const positions = new Float32Array(n * 3);
  const uvs = new Float32Array(n * 2);
  points.forEach((p, i) => {
    positions.set([p.x, p.y, p.z], i * 3);
    const angle = -Math.PI / 2 + i * ((Math.PI * 2) / n);
    uvs.set([0.5 + 0.5 * Math.cos(angle), 0.5 + 0.5 * Math.sin(angle)], i * 2);
  });
  const indices = [];
  for (let i = 1; i < n - 1; i++) indices.push(0, i, i + 1);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

/* ---------- Textura de cada panel: vidrio oscuro + rejilla + borde neón ---------- */
function makePanelTexture(sides) {
  const size = 320;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  const r = size * 0.4;

  function trazarPoligono() {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = -Math.PI / 2 + i * ((Math.PI * 2) / sides);
      const x = c + r * Math.cos(angle);
      const y = c + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  trazarPoligono();
  ctx.fillStyle = 'rgba(18, 18, 18, 0.35)';
  ctx.fill();

  // Rejilla fina dentro del panel
  ctx.save();
  trazarPoligono();
  ctx.clip();
  ctx.strokeStyle = `rgba(${NEON_RGB}, 0.28)`;
  ctx.lineWidth = 1.4;
  const pasos = 7;
  for (let i = 1; i < pasos; i++) {
    const p = (i / pasos) * size;
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
  }
  ctx.restore();

  // Borde con brillo neón
  ctx.save();
  ctx.shadowColor = NEON;
  ctx.shadowBlur = 22;
  trazarPoligono();
  ctx.strokeStyle = NEON;
  ctx.lineWidth = 4.5;
  ctx.stroke();
  ctx.restore();

  // Línea interior clara para dar nitidez
  trazarPoligono();
  ctx.strokeStyle = 'rgba(225, 255, 215, 0.9)';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  return canvas;
}

function makeGlowSprite(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(230, 255, 220, 1)');
  g.addColorStop(0.35, `rgba(${NEON_RGB}, 0.9)`);
  g.addColorStop(0.68, `rgba(${NEON_RGB}, 0.05)`);
  g.addColorStop(1, `rgba(${NEON_RGB}, 0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/* ---------- Escena ---------- */
function initBall(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0, 10.5); // lo bastante lejos para que la pelota y sus partículas quepan completas

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const group = new THREE.Group();
  scene.add(group);

  const radius = 1.7;

  // Núcleo sólido: da la silueta redonda y el sombreado
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.93, 64, 48),
    new THREE.MeshPhongMaterial({
      color: 0x141a12,
      emissive: 0x0f2a0d,
      emissiveIntensity: 0.55,
      specular: 0xb6ff9e,
      shininess: 38
    })
  );
  group.add(core);

  // Luces
  scene.add(new THREE.HemisphereLight(0x9cff85, 0x0a0f08, 0.9));
  const keyLight = new THREE.DirectionalLight(0xe6ffdc, 1.1);
  keyLight.position.set(3, 4, 5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x39ff14, 0.6);
  rimLight.position.set(-4, -2, -3);
  scene.add(rimLight);

  // Paneles traslúcidos con borde neón
  const { pentagons, hexagons } = buildTruncatedIcosahedron(radius * 1.001);
  const panelMat = (sides) => new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(makePanelTexture(sides)),
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const pentMat = panelMat(5);
  const hexMat = panelMat(6);
  pentagons.forEach((pts) => group.add(new THREE.Mesh(buildPanelGeometry(pts), pentMat)));
  hexagons.forEach((pts) => group.add(new THREE.Mesh(buildPanelGeometry(pts), hexMat)));

  // Partículas flotando alrededor
  const COUNT = 120;
  const particlePositions = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const r = radius * (1.05 + Math.random() * 0.45);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    particlePositions.set([
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    ], i * 3);
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMat = new THREE.PointsMaterial({
    size: 0.085,
    map: new THREE.CanvasTexture(makeGlowSprite()),
    color: 0x9cff85,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });
  const particleGroup = new THREE.Group();
  particleGroup.add(new THREE.Points(particleGeo, particleMat));
  group.add(particleGroup);

  // Ajustar el tamaño del canvas al contenedor (responsive)
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  // Girar la pelota en cualquier dirección arrastrando con el mouse o el dedo.
  // Se gira sobre los ejes de la pantalla (no los de la pelota), así arrastrar
  // hacia arriba siempre la gira hacia arriba, sin importar cómo quedó antes.
  const EJE_X = new THREE.Vector3(1, 0, 0);
  const EJE_Y = new THREE.Vector3(0, 1, 0);
  let arrastrando = false;
  let ultimoX = 0;
  let ultimoY = 0;
  let impulsoX = 0; // giro horizontal (arrastre izquierda/derecha)
  let impulsoY = 0; // giro vertical (arrastre arriba/abajo)

  function girar(dx, dy) {
    group.rotateOnWorldAxis(EJE_Y, dx);
    group.rotateOnWorldAxis(EJE_X, dy);
  }

  container.addEventListener('pointerdown', (e) => {
    arrastrando = true;
    ultimoX = e.clientX;
    ultimoY = e.clientY;
    impulsoX = 0;
    impulsoY = 0;
    container.setPointerCapture(e.pointerId);
  });
  container.addEventListener('pointermove', (e) => {
    if (!arrastrando) return;
    impulsoX = (e.clientX - ultimoX) * 0.006;
    impulsoY = (e.clientY - ultimoY) * 0.006;
    girar(impulsoX, impulsoY);
    ultimoX = e.clientX;
    ultimoY = e.clientY;
  });
  const soltar = () => { arrastrando = false; };
  container.addEventListener('pointerup', soltar);
  container.addEventListener('pointercancel', soltar);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let t = 0;
  function animate() {
    requestAnimationFrame(animate);
    if (!reduceMotion) {
      t += 1;
      if (!arrastrando) {
        // Al soltar, la pelota sigue girando y se va frenando poco a poco,
        // hasta volver al giro lento automático
        impulsoX *= 0.95;
        impulsoY *= 0.95;
        girar(0.0032 + impulsoX, impulsoY);
      }
      group.position.y = Math.sin(t * 0.001) * 0.06;
      group.scale.setScalar(1 + Math.sin(t * 0.0015) * 0.035);
      particleGroup.rotation.y -= 0.0011;
      particleGroup.rotation.x += 0.0006;
      particleMat.opacity = 0.55 + Math.sin(t * 0.002) * 0.25;
    }
    renderer.render(scene, camera);
  }
  animate();
}

const stage = document.getElementById('ball-canvas');
if (stage) initBall(stage);
