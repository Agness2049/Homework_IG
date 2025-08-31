import { createProgram, perspectiveMatrix, lookAtMatrix } from './utils.js';
import { vsSource, fsSource } from './shaders.js';
import { Cloth } from './physics.js';
import { TextureManager } from './textureManager.js';
import { ObjectManager, Sphere, Cube } from './collisionObjects.js';
import { ObjectRenderer } from './collisionRenderer.js';
import { AudioManager } from './audioManager.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl');
if (!gl) { alert('WebGL not supported'); }

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
gl.viewport(0, 0, canvas.width, canvas.height);

const program = createProgram(gl, vsSource, fsSource);
gl.useProgram(program);

// Inizializza il gestore delle texture
const textureManager = new TextureManager(gl);
textureManager.initializeAllTextures();

// Inizializza il gestore degli effetti audio
const audioManager = new AudioManager();

// Inizializza il gestore degli oggetti e il renderer
const objectManager = new ObjectManager();
objectManager.setAudioManager(audioManager);
const objectRenderer = new ObjectRenderer(gl, program);

// Locations
const aPosition = gl.getAttribLocation(program, 'aPosition');
const aNormal = gl.getAttribLocation(program, 'aNormal');
const uModel = gl.getUniformLocation(program, 'uModel');
const uView = gl.getUniformLocation(program, 'uView');
const uProjection = gl.getUniformLocation(program, 'uProjection');
const uLightPos = gl.getUniformLocation(program, 'uLightPos');
const uCameraPos = gl.getUniformLocation(program, 'uCameraPos');
const uLightColor = gl.getUniformLocation(program, 'uLightColor');
const uLightIntensity = gl.getUniformLocation(program, 'uLightIntensity');

const uTexture = gl.getUniformLocation(program, 'uTexture');
const uUseTexture = gl.getUniformLocation(program, 'uUseTexture');
const uTextureScale = gl.getUniformLocation(program, 'uTextureScale');
const uTextureOpacity = gl.getUniformLocation(program, 'uTextureOpacity');
const aTexCoord = gl.getAttribLocation(program, 'aTexCoord');

// Locations per gli oggetti
const uObjectColor = gl.getUniformLocation(program, 'uObjectColor');
const uIsObject = gl.getUniformLocation(program, 'uIsObject');

// Create cloth
const cloth = new Cloth(2.0, 2.0, 30, 20);
cloth.setObjectManager(objectManager); // Connetti il gestore degli oggetti

const cw = cloth.cols + 1;
const indices = [];
for (let y = 0; y < cloth.rows; y++) {
  for (let x = 0; x < cloth.cols; x++) {
    const i0 = y * cw + x;
    const i1 = y * cw + x + 1;
    const i2 = (y + 1) * cw + x;
    const i3 = (y + 1) * cw + x + 1;
    indices.push(i0, i1, i2, i2, i1, i3);
  }
}
const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

// Crea coordinate texture
const texCoords = [];
for (let y = 0; y <= cloth.rows; y++) {
  for (let x = 0; x <= cloth.cols; x++) {
    texCoords.push(x / cloth.cols, y / cloth.rows);
  }
}
const texCoordBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

const positionBuffer = gl.createBuffer();
const normalBuffer = gl.createBuffer();

function computeNormals(positions) {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3;
    const i1 = indices[i + 1] * 3;
    const i2 = indices[i + 2] * 3;
    const v0 = positions.slice(i0, i0 + 3);
    const v1 = positions.slice(i1, i1 + 3);
    const v2 = positions.slice(i2, i2 + 3);
    const e1 = v1.map((val, idx) => val - v0[idx]);
    const e2 = v2.map((val, idx) => val - v0[idx]);
    const nx = e1[1] * e2[2] - e1[2] * e2[1];
    const ny = e1[2] * e2[0] - e1[0] * e2[2];
    const nz = e1[0] * e2[1] - e1[1] * e2[0];
    normals[i0] += nx; normals[i0 + 1] += ny; normals[i0 + 2] += nz;
    normals[i1] += nx; normals[i1 + 1] += ny; normals[i1 + 2] += nz;
    normals[i2] += nx; normals[i2 + 1] += ny; normals[i2 + 2] += nz;
  }
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]);
    if (len > 0) {
      normals[i] /= len;
      normals[i + 1] /= len;
      normals[i + 2] /= len;
    }
  }
  return normals;
}

function updateBuffers() {
  const positions = new Float32Array(cloth.particles.length * 3);
  for (let i = 0; i < cloth.particles.length; i++) {
    positions.set(cloth.particles[i].pos, i * 3);
  }
  const normals = computeNormals(positions);

  // Aggiorna i buffer del tessuto
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, normals, gl.DYNAMIC_DRAW);

}

// Camera and interaction state
let azimuth = 0, elevation = 0.5, radius = 5;
let isDragging = false;
let isDeforming = false;
let mouseX = 0, mouseY = 0;
let lastMouseX = 0, lastMouseY = 0;

// Variabili per manipolazione oggetti
let isDraggingObject = false;
let selectedObject = null;
let selectedObjectIndex = -1;
let objectOffset = [0, 0, 0];

// Variabili di stato per la luce
let lightColor = [1.0, 1.0, 1.0];
let lightIntensity = 1.5;

// Variabili per le texture
let useTexture = false;
let textureScale = 1.0;
let textureOpacity = 0.8;

// Funzioni per la gestione UI esistenti
let lightColorPicker, lightIntensitySlider, lightIntensityValue;

function handleColorChange(e) {
  const hex = e.target.value;
  const r = parseInt(hex.substring(1, 3), 16) / 255;
  const g = parseInt(hex.substring(3, 5), 16) / 255;
  const b = parseInt(hex.substring(5, 7), 16) / 255;
  lightColor = [r, g, b];
}

function handleIntensityChange(e) {
  lightIntensity = parseFloat(e.target.value);
  lightIntensityValue.textContent = lightIntensity.toFixed(1);
}

// Funzione per trovare l'oggetto più vicino al click
function findClosestObject(ray) {
  let closestObject = null;
  let closestDistance = Infinity;
  let closestIndex = -1;
  
  objectManager.objects.forEach((obj, index) => {
    if (!obj.visible) return;
    
    // Test di intersezione raggio-oggetto semplificato
    const toObject = [
      obj.position[0] - ray.origin[0],
      obj.position[1] - ray.origin[1],
      obj.position[2] - ray.origin[2]
    ];
    
    const projLength = toObject[0] * ray.direction[0] +
                      toObject[1] * ray.direction[1] +
                      toObject[2] * ray.direction[2];
    
    if (projLength < 0) return;
    
    const closestOnRay = [
      ray.origin[0] + ray.direction[0] * projLength,
      ray.origin[1] + ray.direction[1] * projLength,
      ray.origin[2] + ray.direction[2] * projLength
    ];
    
    const distance = Math.hypot(
      obj.position[0] - closestOnRay[0],
      obj.position[1] - closestOnRay[1],
      obj.position[2] - closestOnRay[2]
    );
    
    // Usa il raggio/dimensione dell'oggetto per il test
    const objectSize = obj.type === 'sphere' ? obj.radius : obj.halfSize;
    
    if (distance < objectSize && distance < closestDistance) {
      closestDistance = distance;
      closestObject = obj;
      closestIndex = index;
    }
  });
  
  return { object: closestObject, index: closestIndex };
}

// Ray casting per interazione tessuto (esistente)
function screenToWorldRay(mouseX, mouseY) {
  const x = (mouseX / canvas.width) * 2 - 1;
  const y = -((mouseY / canvas.height) * 2 - 1);
  const eye = [
    radius * Math.sin(azimuth) * Math.cos(elevation),
    radius * Math.sin(elevation),
    radius * Math.cos(azimuth) * Math.cos(elevation)
  ];
  const aspect = canvas.width / canvas.height;
  const fov = Math.PI / 4;
  const tanHalfFov = Math.tan(fov / 2);
  const viewX = x * tanHalfFov * aspect;
  const viewY = y * tanHalfFov;
  const viewZ = -1;
  const forward = [0 - eye[0], 0 - eye[1], 0 - eye[2]];
  const len = Math.hypot(...forward);
  if (len > 0) {
    forward[0] /= len; forward[1] /= len; forward[2] /= len;
  }
  const right = [
    forward[1] * 0 - forward[2] * 1,
    forward[2] * 0 - forward[0] * 0,
    forward[0] * 1 - forward[1] * 0
  ];
  const rightLen = Math.hypot(...right);
  if (rightLen > 0) {
    right[0] /= rightLen; right[1] /= rightLen; right[2] /= rightLen;
  }
  const up = [
    right[1] * forward[2] - right[2] * forward[1],
    right[2] * forward[0] - right[0] * forward[2],
    right[0] * forward[1] - right[1] * forward[0]
  ];
  const rayDir = [
    forward[0] + right[0] * viewX + up[0] * viewY,
    forward[1] + right[1] * viewX + up[1] * viewY,
    forward[2] + right[2] * viewX + up[2] * viewY
  ];
  return { origin: eye, direction: rayDir };
}

function findClosestParticle(ray) {
  let closestParticle = null;
  let closestDistance = Infinity;
  for (let i = 0; i < cloth.particles.length; i++) {
    const particle = cloth.particles[i];
    const toParticle = [
      particle.pos[0] - ray.origin[0],
      particle.pos[1] - ray.origin[1],
      particle.pos[2] - ray.origin[2]
    ];
    const projLength = toParticle[0] * ray.direction[0] +
      toParticle[1] * ray.direction[1] +
      toParticle[2] * ray.direction[2];
    if (projLength < 0) continue;
    const closestOnRay = [
      ray.origin[0] + ray.direction[0] * projLength,
      ray.origin[1] + ray.direction[1] * projLength,
      ray.origin[2] + ray.direction[2] * projLength
    ];
    const distance = Math.hypot(
      particle.pos[0] - closestOnRay[0],
      particle.pos[1] - closestOnRay[1],
      particle.pos[2] - closestOnRay[2]
    );
    if (distance < closestDistance && distance < 0.2) {
      closestDistance = distance;
      closestParticle = i;
    }
  }
  return closestParticle;
}

function deformCloth(particleIndex, force) {
  if (particleIndex === null) return;
  const particle = cloth.particles[particleIndex];
  if (particle.pinned) return;
  
  // Riproduci l'effetto audio della deformazione
  audioManager.playDeformationSound(force, particle.pos);
  
  particle.pos[0] += force[0];
  particle.pos[1] += force[1];
  particle.pos[2] += force[2];
  const influence = 0.3;
  const maxDistance = 0.3;
  for (let i = 0; i < cloth.particles.length; i++) {
    if (i === particleIndex) continue;
    const other = cloth.particles[i];
    if (other.pinned) continue;
    const dx = other.pos[0] - particle.pos[0];
    const dy = other.pos[1] - particle.pos[1];
    const dz = other.pos[2] - particle.pos[2];
    const distance = Math.hypot(dx, dy, dz);
    if (distance < maxDistance) {
      const factor = influence * (1 - distance / maxDistance);
      other.pos[0] += force[0] * factor;
      other.pos[1] += force[1] * factor;
      other.pos[2] += force[2] * factor;
    }
  }
}

function spawnObjectOnCloth(type = 'sphere', size = 0.3, color = [0.8, 0.3, 0.3]) {
  // Genera una posizione casuale sopra il tessuto con più variazione
  const randomX = (Math.random() - 0.5) * 3.0; // Varia da -1.5 a +1.5
  const randomZ = (Math.random() - 0.5) * 2.5; // Varia da -1.25 a +1.25
  
  // Trova l'altezza del tessuto in quella posizione (approssimativa)
  let clothY = -0.5; // Altezza di default se non troviamo particelle vicine
  let minDistance = Infinity;
  
  // Cerca la particella del tessuto più vicina alla posizione X,Z
  for (const particle of cloth.particles) {
    const distance = Math.hypot(
      particle.pos[0] - randomX,
      particle.pos[2] - randomZ
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      clothY = particle.pos[1];
    }
  }

  // Posizione di spawn: ben sopra il tessuto con altezza variabile
  const spawnHeight = 2.0 + Math.random() * 1.5; // Tra 2 e 3.5 metri sopra
  const spawnPos = [randomX, clothY + spawnHeight, randomZ];

  if (type === 'sphere') {
    objectManager.addObject(new Sphere(spawnPos, size, color));
  } else if (type === 'cube') {
    objectManager.addObject(new Cube(spawnPos, size * 2, color));
  }
}

// Mouse event handlers

canvas.addEventListener('mousedown', (e) => {
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  
  if (e.button === 0) {
    const ray = screenToWorldRay(e.clientX, e.clientY);
    
    // Controlla prima se stiamo cliccando su un oggetto (con Ctrl)
    if (e.ctrlKey) {
      const result = findClosestObject(ray);
      if (result.object) {
        isDraggingObject = true;
        selectedObject = result.object;
        selectedObjectIndex = result.index;
        canvas.style.cursor = 'move';
        
        // Calcola l'offset dal centro dell'oggetto
        objectOffset = [
          result.object.position[0] - ray.origin[0],
          result.object.position[1] - ray.origin[1],
          result.object.position[2] - ray.origin[2]
        ];
        return;
      }
    }
    
    if (e.shiftKey) {
      // Deformazione tessuto
      isDeforming = true;
      const particleIndex = findClosestParticle(ray);
      if (particleIndex !== null) {
        canvas.style.cursor = 'grabbing';
      }
    } else {
      // Rotazione camera
      isDragging = true;
      canvas.style.cursor = 'grabbing';
      // Inizializza l'audio al primo click dell'utente
      if (!audioManager.isInitialized) {
        audioManager.initialize();
      }
    }
  }
});

canvas.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  
  if (isDraggingObject && selectedObject) {
    // Muovi l'oggetto selezionato
    const ray = screenToWorldRay(e.clientX, e.clientY);
    const projLength = 3; // Distanza fissa per la proiezione
    
    selectedObject.position[0] = ray.origin[0] + ray.direction[0] * projLength;
    selectedObject.position[1] = ray.origin[1] + ray.direction[1] * projLength;
    selectedObject.position[2] = ray.origin[2] + ray.direction[2] * projLength;
    
    // Aggiorna i buffer dell'oggetto
    objectRenderer.updateObjectBuffers(selectedObject, `${selectedObject.type}_${selectedObjectIndex}`);
    
  } else if (isDragging && !e.shiftKey) {
    azimuth += (e.clientX - lastMouseX) * 0.01;
    elevation += (e.clientY - lastMouseY) * 0.01;
    elevation = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, elevation));
  } else if (isDeforming && e.shiftKey) {
    const ray = screenToWorldRay(e.clientX, e.clientY);
    const particleIndex = findClosestParticle(ray);
    if (particleIndex !== null) {
      const deltaX = (e.clientX - lastMouseX) * 0.003;
      const deltaY = -(e.clientY - lastMouseY) * 0.003;
      const eye = [
        radius * Math.sin(azimuth) * Math.cos(elevation),
        radius * Math.sin(elevation),
        radius * Math.cos(azimuth) * Math.cos(elevation)
      ];
      const forward = [0 - eye[0], 0 - eye[1], 0 - eye[2]];
      const len = Math.hypot(...forward);
      if (len > 0) {
        forward[0] /= len; forward[1] /= len; forward[2] /= len;
      }
      const right = [forward[2], 0, -forward[0]];
      const rightLen = Math.hypot(...right);
      if (rightLen > 0) {
        right[0] /= rightLen; right[1] /= rightLen; right[2] /= rightLen;
      }
      const force = [
        right[0] * deltaX,
        deltaY,
        right[2] * deltaX
      ];
      deformCloth(particleIndex, force);
    }
  }
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
});

canvas.addEventListener('mouseup', () => {
  isDragging = false;
  isDeforming = false;
  isDraggingObject = false; 
  selectedObject = null;    
  selectedObjectIndex = -1; 
  canvas.style.cursor = 'default';
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  radius *= (1 + e.deltaY * 0.001);
  radius = Math.max(1, Math.min(20, radius));
});

canvas.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'r':
    case 'R':
      cloth.reset();
      break;
    case ' ':
      const windForce = [0, 0, 2];
      cloth.addWind(windForce);
      audioManager.playWindSound(windForce); // Effetto audio del vento
      break;
    // Tasti per aggiungere/rimuovere oggetti
    case '1':
      spawnObjectOnCloth('sphere', 0.25, [Math.random(), Math.random(), Math.random()]);
      break;
    case '2':
      spawnObjectOnCloth('cube', 0.25, [Math.random(), Math.random(), Math.random()]);
      break;

    case 'Delete':
    case 'Backspace':
      if (objectManager.count() > 0) {
        objectManager.objects.pop();
      }
      break;
  }
});

canvas.setAttribute('tabindex', '0');
canvas.focus();

// Render loop 
let lastTime = performance.now();
let isPaused = false;

function render(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  
  if (!isPaused) {
    cloth.applyForces(dt);
    cloth.satisfyConstraints(5);
    objectManager.updatePhysics(dt); 
    updateBuffers();
  }

  const eye = [
    radius * Math.sin(azimuth) * Math.cos(elevation),
    radius * Math.sin(elevation),
    radius * Math.cos(azimuth) * Math.cos(elevation)
  ];

  const model = [1, 0, 0, 0,
                 0, 1, 0, 0,
                 0, 0, 1, 0,
                 0, 0, 0, 1];

  const viewMatrix = lookAtMatrix(eye, [0, 0, 0], [0, 1, 0]);
  const projectionMatrix = perspectiveMatrix(Math.PI / 4, canvas.width / canvas.height, 0.1, 100);

  gl.uniformMatrix4fv(uModel, false, model);
  gl.uniformMatrix4fv(uView, false, viewMatrix);
  gl.uniformMatrix4fv(uProjection, false, projectionMatrix);

  gl.uniform3fv(uLightPos, [2, 2, 2]);
  gl.uniform3fv(uCameraPos, eye);
  gl.uniform3fv(uLightColor, lightColor);
  gl.uniform1f(uLightIntensity, lightIntensity);

  gl.clearColor(0.15, 0.15, 0.15, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

    // Object rendering
  objectRenderer.renderObjects(objectManager.objects, viewMatrix, projectionMatrix);

  // Texture rendering
  // Ripristina completamente lo stato per il tessuto
  gl.uniform1i(uIsObject, 0);
  gl.uniform1i(uUseTexture, useTexture);
  gl.uniform1f(uTextureScale, textureScale);
  gl.uniform1f(uTextureOpacity, textureOpacity);

  // Disabilita tutti gli attributi prima di riconfigurarli
  gl.disableVertexAttribArray(aPosition);
  gl.disableVertexAttribArray(aNormal);
  gl.disableVertexAttribArray(aTexCoord);

  if (useTexture && textureManager.currentTexture) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textureManager.currentTexture);
    gl.uniform1i(uTexture, 0);
  }

  // Riconfigura gli attributi per il tessuto
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.enableVertexAttribArray(aNormal);
  gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.enableVertexAttribArray(aTexCoord);
  gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);


  requestAnimationFrame(render);
}

// Funzioni UI esistenti 
function initializeControls() {
  lightColorPicker = document.getElementById('lightColorPicker');
  lightIntensitySlider = document.getElementById('lightIntensitySlider');
  lightIntensityValue = document.getElementById('lightIntensityValue');

  if (lightColorPicker) {
    lightColorPicker.addEventListener('input', handleColorChange);
  }
  if (lightIntensitySlider) {
    lightIntensitySlider.addEventListener('input', handleIntensityChange);
  }

  // Controlli texture
  const textureSelect = document.getElementById('textureSelect');
  const textureScaleSlider = document.getElementById('textureScaleSlider');
  const textureScaleValue = document.getElementById('textureScaleValue');
  const textureOpacitySlider = document.getElementById('textureOpacitySlider');
  const textureOpacityValue = document.getElementById('textureOpacityValue');

  if (textureSelect) {
    textureSelect.addEventListener('change', (e) => {
      const selectedTexture = e.target.value;
      if (selectedTexture === 'none') {
        useTexture = false;
        textureManager.disableTexture();
      } else {
        useTexture = true;
        textureManager.setCurrentTexture(selectedTexture);
      }
    });
  }

  if (textureScaleSlider) {
    textureScaleSlider.addEventListener('input', (e) => {
      textureScale = parseFloat(e.target.value);
      textureScaleValue.textContent = textureScale.toFixed(1);
    });
  }

  if (textureOpacitySlider) {
    textureOpacitySlider.addEventListener('input', (e) => {
      textureOpacity = parseFloat(e.target.value);
      textureOpacityValue.textContent = textureOpacity.toFixed(2);
    });
  }
}

function initializeAllControls() {
  initializeControls();
  
  const gravitySlider = document.getElementById('gravitySlider');
  const gravityValue = document.getElementById('gravityValue');
  const stiffnessSlider = document.getElementById('stiffnessSlider');
  const stiffnessValue = document.getElementById('stiffnessValue');
  const dampingSlider = document.getElementById('dampingSlider');
  const dampingValue = document.getElementById('dampingValue');
  
  const resetBtn = document.getElementById('resetBtn');
  const windBtn = document.getElementById('windBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  
  // Event listeners per i controlli della fisica
  if (gravitySlider) {
    gravitySlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      gravityValue.textContent = value.toFixed(1);
    });
  }
  
  if (resetBtn) {
    resetBtn.addEventListener('click', () => cloth.reset());
  }
  
  if (windBtn) {
    windBtn.addEventListener('click', () => cloth.addWind([0, 0, 2]));
  }
  
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      isPaused = !isPaused;
      pauseBtn.textContent = isPaused ? '▶️ Riprendi' : '⏸️ Pausa';
      if (!isPaused) {
        lastTime = performance.now();
        requestAnimationFrame(render);
      }
    });
  }

  // Event listeners per i controlli degli oggetti
  const addSphereBtn = document.getElementById('addSphereBtn');
  const addCubeBtn = document.getElementById('addCubeBtn');
  const clearObjectsBtn = document.getElementById('clearObjectsBtn');
  
  if (addSphereBtn) {
    addSphereBtn.addEventListener('click', () => {
      objectManager.addObject(new Sphere([
        (Math.random() - 0.5) * 2,
        Math.random() * 0.5 - 1,
        (Math.random() - 0.5) * 2
      ], 0.2 + Math.random() * 0.2, [Math.random(), Math.random(), Math.random()]));
    });
  }
  
  if (addCubeBtn) {
    addCubeBtn.addEventListener('click', () => {
      objectManager.addObject(new Cube([
        (Math.random() - 0.5) * 2,
        Math.random() * 0.5 - 1,
        (Math.random() - 0.5) * 2
      ], 0.3 + Math.random() * 0.2, [Math.random(), Math.random(), Math.random()]));
    });
  }
  
  if (clearObjectsBtn) {
    clearObjectsBtn.addEventListener('click', () => {
      objectManager.clear();
      objectRenderer.cleanup();
    });
  }

    // Controlli audio
  const audioToggleBtn = document.getElementById('audioToggleBtn');
  const audioVolumeSlider = document.getElementById('audioVolumeSlider');
  const audioVolumeValue = document.getElementById('audioVolumeValue');
  const audioSensitivitySlider = document.getElementById('audioSensitivitySlider');
  const audioSensitivityValue = document.getElementById('audioSensitivityValue');

  if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', () => {
      const isEnabled = !audioManager.isEnabled;
      audioManager.setEnabled(isEnabled);
      audioToggleBtn.textContent = isEnabled ? '🔊 Attivo' : '🔇 Disattivo';
      audioToggleBtn.className = isEnabled ? '' : 'danger';
    });
  }

  if (audioVolumeSlider) {
    audioVolumeSlider.addEventListener('input', (e) => {
      const volume = parseFloat(e.target.value);
      audioManager.setVolume(volume);
      audioVolumeValue.textContent = volume.toFixed(2);
    });
  }

  if (audioSensitivitySlider) {
    audioSensitivitySlider.addEventListener('input', (e) => {
      const sensitivity = parseFloat(e.target.value);
      audioManager.updateSettings({ deformationSensitivity: sensitivity });
      audioSensitivityValue.textContent = sensitivity.toFixed(1);
    });
  }
}

document.addEventListener('DOMContentLoaded', initializeAllControls);

requestAnimationFrame(render);