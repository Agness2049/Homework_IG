export class GeometricObject {
  constructor(position, color = [0.8, 0.3, 0.3]) {
    this.position = [...position];
    this.color = [...color];
    this.velocity = [0, 0, 0]; // Aggiungi velocità
    this.visible = true;
  }

  // Metodo astratto per il test di collisione
  checkCollision(particlePos) {
    throw new Error("checkCollision deve essere implementato dalla sottoclasse");
  }

  // Metodo astratto per risolvere la collisione
  resolveCollision(particlePos, particlePrev) {
    throw new Error("resolveCollision deve essere implementato dalla sottoclasse");
  }
}

export class Sphere extends GeometricObject {
  constructor(position, radius, color = [0.8, 0.3, 0.3]) {
    super(position, color);
    this.radius = radius;
    this.type = 'sphere';
  }

  checkCollision(particlePos) {
    const dx = particlePos[0] - this.position[0];
    const dy = particlePos[1] - this.position[1];
    const dz = particlePos[2] - this.position[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return distance < this.radius;
  }

  resolveCollision(particlePos, particlePrev) {
    const dx = particlePos[0] - this.position[0];
    const dy = particlePos[1] - this.position[1];
    const dz = particlePos[2] - this.position[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (distance < this.radius && distance > 0) {
      // Normalizza il vettore di distanza
      const normalX = dx / distance;
      const normalY = dy / distance;
      const normalZ = dz / distance;
      
      // Sposta la particella sulla superficie della sfera
      particlePos[0] = this.position[0] + normalX * this.radius;
      particlePos[1] = this.position[1] + normalY * this.radius;
      particlePos[2] = this.position[2] + normalZ * this.radius;
      
      // Calcola la velocità
      const velX = particlePos[0] - particlePrev[0];
      const velY = particlePos[1] - particlePrev[1];
      const velZ = particlePos[2] - particlePrev[2];
      
      // Componente della velocità normale alla superficie
      const normalVel = velX * normalX + velY * normalY + velZ * normalZ;

      // Rimuovi la componente normale (con un po' di rimbalzo)
      const bounce = 0.3;
      if (normalVel < 0) {
        particlePrev[0] = particlePos[0] - (velX - normalX * normalVel * (1 + bounce));
        particlePrev[1] = particlePos[1] - (velY - normalY * normalVel * (1 + bounce));
        particlePrev[2] = particlePos[2] - (velZ - normalZ * normalVel * (1 + bounce));
        
        // Notifica la collisione per l'audio
        if (this.audioManager) {
          const collisionIntensity = Math.abs(normalVel) * 0.5;
          this.audioManager.playCollisionSound(this, collisionIntensity);
        }
      }
    }
  }

  // Genera vertici per il rendering
  generateVertices(detail = 16) {
    const vertices = [];
    const normals = [];
    const indices = [];
    
    // Genera i vertici della sfera
    for (let lat = 0; lat <= detail; lat++) {
      const theta = lat * Math.PI / detail;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      
      for (let lon = 0; lon <= detail; lon++) {
        const phi = lon * 2 * Math.PI / detail;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);
        
        const x = cosPhi * sinTheta;
        const y = cosTheta;
        const z = sinPhi * sinTheta;
        
        // Posizione del vertice
        vertices.push(
          this.position[0] + x * this.radius,
          this.position[1] + y * this.radius,
          this.position[2] + z * this.radius
        );
        
        // Normale
        normals.push(x, y, z);
      }
    }
    
    // Genera gli indici
    for (let lat = 0; lat < detail; lat++) {
      for (let lon = 0; lon < detail; lon++) {
        const first = lat * (detail + 1) + lon;
        const second = first + detail + 1;
        
        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }
    
    return { vertices, normals, indices };
  }
}

export class Cube extends GeometricObject {
  constructor(position, size, color = [0.3, 0.8, 0.3]) {
    super(position, color);
    this.size = size;
    this.halfSize = size / 2;
    this.type = 'cube';
  }

  checkCollision(particlePos) {
    return (
      particlePos[0] >= this.position[0] - this.halfSize &&
      particlePos[0] <= this.position[0] + this.halfSize &&
      particlePos[1] >= this.position[1] - this.halfSize &&
      particlePos[1] <= this.position[1] + this.halfSize &&
      particlePos[2] >= this.position[2] - this.halfSize &&
      particlePos[2] <= this.position[2] + this.halfSize
    );
  }

  resolveCollision(particlePos, particlePrev) {
    if (!this.checkCollision(particlePos)) return;
    
    // Calcola le distanze dai bordi del cubo
    const dx = particlePos[0] - this.position[0];
    const dy = particlePos[1] - this.position[1];
    const dz = particlePos[2] - this.position[2];
    
    // Trova la faccia più vicina
    const distX = this.halfSize - Math.abs(dx);
    const distY = this.halfSize - Math.abs(dy);
    const distZ = this.halfSize - Math.abs(dz);
    
    const bounce = 0.3;
    
    if (distX < distY && distX < distZ) {
      // Collisione con faccia X
      particlePos[0] = this.position[0] + (dx > 0 ? this.halfSize : -this.halfSize);
      const velX = particlePos[0] - particlePrev[0];
      particlePrev[0] = particlePos[0] - velX * bounce;
      // Notifica la collisione per l'audio
      if (this.audioManager) {
        this.audioManager.playCollisionSound(this, Math.abs(velX) * 0.3);
      }
    } else if (distY < distZ) {
      // Collisione con faccia Y
      particlePos[1] = this.position[1] + (dy > 0 ? this.halfSize : -this.halfSize);
      const velY = particlePos[1] - particlePrev[1];
      particlePrev[1] = particlePos[1] - velY * bounce;
          // Notifica la collisione per l'audio
      if (this.audioManager) {
        this.audioManager.playCollisionSound(this, Math.abs(velY) * 0.3);
      }
    } else {
      // Collisione con faccia Z
      particlePos[2] = this.position[2] + (dz > 0 ? this.halfSize : -this.halfSize);
      const velZ = particlePos[2] - particlePrev[2];
      particlePrev[2] = particlePos[2] - velZ * bounce;
          // Notifica la collisione per l'audio
      if (this.audioManager) {
        this.audioManager.playCollisionSound(this, Math.abs(velZ) * 0.3);
      }
    }
  }

  // Genera vertici per il rendering
  generateVertices() {
    const vertices = [
      // Faccia frontale
      this.position[0] - this.halfSize, this.position[1] - this.halfSize, this.position[2] + this.halfSize,
      this.position[0] + this.halfSize, this.position[1] - this.halfSize, this.position[2] + this.halfSize,
      this.position[0] + this.halfSize, this.position[1] + this.halfSize, this.position[2] + this.halfSize,
      this.position[0] - this.halfSize, this.position[1] + this.halfSize, this.position[2] + this.halfSize,
      
      // Faccia posteriore
      this.position[0] - this.halfSize, this.position[1] - this.halfSize, this.position[2] - this.halfSize,
      this.position[0] - this.halfSize, this.position[1] + this.halfSize, this.position[2] - this.halfSize,
      this.position[0] + this.halfSize, this.position[1] + this.halfSize, this.position[2] - this.halfSize,
      this.position[0] + this.halfSize, this.position[1] - this.halfSize, this.position[2] - this.halfSize,
      
      // Faccia superiore
      this.position[0] - this.halfSize, this.position[1] + this.halfSize, this.position[2] - this.halfSize,
      this.position[0] - this.halfSize, this.position[1] + this.halfSize, this.position[2] + this.halfSize,
      this.position[0] + this.halfSize, this.position[1] + this.halfSize, this.position[2] + this.halfSize,
      this.position[0] + this.halfSize, this.position[1] + this.halfSize, this.position[2] - this.halfSize,
      
      // Faccia inferiore
      this.position[0] - this.halfSize, this.position[1] - this.halfSize, this.position[2] - this.halfSize,
      this.position[0] + this.halfSize, this.position[1] - this.halfSize, this.position[2] - this.halfSize,
      this.position[0] + this.halfSize, this.position[1] - this.halfSize, this.position[2] + this.halfSize,
      this.position[0] - this.halfSize, this.position[1] - this.halfSize, this.position[2] + this.halfSize,
      
      // Faccia destra
      this.position[0] + this.halfSize, this.position[1] - this.halfSize, this.position[2] - this.halfSize,
      this.position[0] + this.halfSize, this.position[1] + this.halfSize, this.position[2] - this.halfSize,
      this.position[0] + this.halfSize, this.position[1] + this.halfSize, this.position[2] + this.halfSize,
      this.position[0] + this.halfSize, this.position[1] - this.halfSize, this.position[2] + this.halfSize,
      
      // Faccia sinistra
      this.position[0] - this.halfSize, this.position[1] - this.halfSize, this.position[2] - this.halfSize,
      this.position[0] - this.halfSize, this.position[1] - this.halfSize, this.position[2] + this.halfSize,
      this.position[0] - this.halfSize, this.position[1] + this.halfSize, this.position[2] + this.halfSize,
      this.position[0] - this.halfSize, this.position[1] + this.halfSize, this.position[2] - this.halfSize
    ];
    
    const normals = [
      // Faccia frontale
      0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
      // Faccia posteriore
      0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
      // Faccia superiore
      0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
      // Faccia inferiore
      0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
      // Faccia destra
      1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
      // Faccia sinistra
      -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0
    ];
    
    const indices = [
      0,  1,  2,    0,  2,  3,    // frontale
      4,  5,  6,    4,  6,  7,    // posteriore
      8,  9,  10,   8,  10, 11,   // superiore
      12, 13, 14,   12, 14, 15,   // inferiore
      16, 17, 18,   16, 18, 19,   // destra
      20, 21, 22,   20, 22, 23    // sinistra
    ];
    
    return { vertices, normals, indices };
  }
}

export class ObjectManager {
  constructor() {
    this.objects = [];
  }

  addObject(object) {
    this.objects.push(object);
  }

  removeObject(object) {
    const index = this.objects.indexOf(object);
    if (index > -1) {
      this.objects.splice(index, 1);
    }
  }

  checkCollisions(particle) {
    for (const obj of this.objects) {
      if (obj.visible && obj.checkCollision(particle.pos)) {
        obj.resolveCollision(particle.pos, particle.prev);
      }
    }
  }

  // Sposta un oggetto
  moveObject(index, newPosition) {
    if (index >= 0 && index < this.objects.length) {
      this.objects[index].position = [...newPosition];
    }
  }

  // Ottieni tutti gli oggetti di un tipo specifico
  getObjectsByType(type) {
    return this.objects.filter(obj => obj.type === type);
  }

  // Rimuovi tutti gli oggetti
  clear() {
    this.objects = [];
  }

  // Ottieni il numero di oggetti
  count() {
    return this.objects.length;
  }

    // Imposta il riferimento all'AudioManager per tutti gli oggetti
  setAudioManager(audioManager) {
    this.audioManager = audioManager;
    for (const obj of this.objects) {
      obj.audioManager = audioManager;
    }
  }

  // Sovrascrivi addObject per includere audioManager
  addObject(object) {
    if (this.audioManager) {
      object.audioManager = this.audioManager;
    }
    this.objects.push(object);
  }

  updatePhysics(dt) {
    const gravity = [0, -9.81, 0];
    const damping = 0.99;
    
    for (const obj of this.objects) {
      if (!obj.velocity) obj.velocity = [0, 0, 0]; // Inizializza se manca
      
      // Applica gravità
      obj.velocity[0] += gravity[0] * dt;
      obj.velocity[1] += gravity[1] * dt;
      obj.velocity[2] += gravity[2] * dt;
      
      // Applica velocità alla posizione
      obj.position[0] += obj.velocity[0] * dt;
      obj.position[1] += obj.velocity[1] * dt;
      obj.position[2] += obj.velocity[2] * dt;
      
      // Collisione con il suolo
      if (obj.position[1] < -1.8) {
        obj.position[1] = -1.8;
        obj.velocity[1] = -obj.velocity[1] * 0.3; // Rimbalzo attutito
        obj.velocity[0] *= damping;
        obj.velocity[2] *= damping;
      }
    }
  }
}