export class Particle {
  constructor(x, y, z, pinned = false) {
    this.pos = [x, y, z];
    this.prev = [x, y, z];
    this.acc = [0, 0, 0];
    this.pinned = pinned;
    this.originalPos = [x, y, z]; // Store original position for reset
  }
}

export class Spring {
  constructor(a, b, rest) {
    this.a = a; this.b = b; this.rest = rest;
  }
}

export class Cloth {
  constructor(width, height, cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.width = width;
    this.height = height;
    this.particles = [];
    this.springs = [];
    this.windForce = [0, 0, 0];
    this.objectManager = null; // Reference to ObjectManager

    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= cols; x++) {
        const u = x / cols;
        const v = y / rows;
        const px = (u - 0.5) * width;
        const py = (0.5 - v) * height;
        const pz = 0;
        const pinned = (y === 0 && (x % 5 === 0));
        this.particles.push(new Particle(px, py, pz, pinned));
      }
    }

    const idx = (x, y) => y * (cols + 1) + x;
    
    // Structural springs (horizontal and vertical)
    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= cols; x++) {
        if (x < cols) this.springs.push(new Spring(idx(x, y), idx(x + 1, y), width / cols));
        if (y < rows) this.springs.push(new Spring(idx(x, y), idx(x, y + 1), height / rows));
      }
    }
    
    // Shear springs (diagonal)
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const diagonalLength = Math.hypot(width / cols, height / rows);
        this.springs.push(new Spring(idx(x, y), idx(x + 1, y + 1), diagonalLength));
        this.springs.push(new Spring(idx(x + 1, y), idx(x, y + 1), diagonalLength));
      }
    }
    
    // Bending springs (skip one particle)
    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= cols - 2; x++) {
        this.springs.push(new Spring(idx(x, y), idx(x + 2, y), 2 * width / cols));
      }
    }
    for (let y = 0; y <= rows - 2; y++) {
      for (let x = 0; x <= cols; x++) {
        this.springs.push(new Spring(idx(x, y), idx(x, y + 2), 2 * height / rows));
      }
    }
  }

  // Set the reference to the ObjectManager
  setObjectManager(objectManager) {
    this.objectManager = objectManager;
  }

  applyForces(dt) {
    const g = [0, -9.81, 0];
    const damping = 0.01;
    
    for (const p of this.particles) {
      if (p.pinned) continue;
      p.acc = [g[0] + this.windForce[0], g[1] + this.windForce[1], g[2] + this.windForce[2]];
    }

    const dt2 = dt * dt;
    for (const p of this.particles) {
      if (p.pinned) continue;
      const px = p.pos[0], py = p.pos[1], pz = p.pos[2];
      const vx = (px - p.prev[0]) * (1 - damping);
      const vy = (py - p.prev[1]) * (1 - damping);
      const vz = (pz - p.prev[2]) * (1 - damping);

      p.prev = [px, py, pz];
      p.pos[0] += vx + p.acc[0] * dt2;
      p.pos[1] += vy + p.acc[1] * dt2;
      p.pos[2] += vz + p.acc[2] * dt2;
      
      // Add ground collision
      if (p.pos[1] < -2) {
        p.pos[1] = -2;
        p.prev[1] = p.pos[1] + (p.pos[1] - p.prev[1]) * 0.3; // Bounce with energy loss
      }

      //Check object collisions
      if (this.objectManager) {
        this.objectManager.checkCollisions(p);
      }
    }
    
    // Gradually reduce wind force
    this.windForce[0] *= 0.95;
    this.windForce[1] *= 0.95;
    this.windForce[2] *= 0.95;
  }

  satisfyConstraints(iterations = 5) {
    for (let k = 0; k < iterations; k++) {
      for (const s of this.springs) {
        const A = this.particles[s.a];
        const B = this.particles[s.b];
        let dx = B.pos[0] - A.pos[0];
        let dy = B.pos[1] - A.pos[1];
        let dz = B.pos[2] - A.pos[2];
        const dist = Math.hypot(dx, dy, dz);
        if (dist === 0) continue;
        
        const diff = (dist - s.rest) / dist;
        const stiffness = 0.8;
        
        // Only apply correction if particles aren't both pinned
        if (!A.pinned && !B.pinned) {
          A.pos[0] += dx * 0.5 * stiffness * diff;
          A.pos[1] += dy * 0.5 * stiffness * diff;
          A.pos[2] += dz * 0.5 * stiffness * diff;
          B.pos[0] -= dx * 0.5 * stiffness * diff;
          B.pos[1] -= dy * 0.5 * stiffness * diff;
          B.pos[2] -= dz * 0.5 * stiffness * diff;
        } else if (!A.pinned) {
          A.pos[0] += dx * stiffness * diff;
          A.pos[1] += dy * stiffness * diff;
          A.pos[2] += dz * stiffness * diff;
        } else if (!B.pinned) {
          B.pos[0] -= dx * stiffness * diff;
          B.pos[1] -= dy * stiffness * diff;
          B.pos[2] -= dz * stiffness * diff;
        }
      }

      //Resolve again collisions after the constraint
      if (this.objectManager) {
        for (const p of this.particles) {
          if (!p.pinned) {
            this.objectManager.checkCollisions(p);
          }
        }
      }
    }
  }
  
  // Reset cloth to original position
  reset() {
    for (const p of this.particles) {
      p.pos = [...p.originalPos];
      p.prev = [...p.originalPos];
      p.acc = [0, 0, 0];
    }
    this.windForce = [0, 0, 0];
  }
  
  // Add wind effect
  addWind(force) {
    this.windForce[0] += force[0];
    this.windForce[1] += force[1];
    this.windForce[2] += force[2];
  }
  
  // Get particle index from grid coordinates
  getParticleIndex(x, y) {
    if (x < 0 || x > this.cols || y < 0 || y > this.rows) return null;
    return y * (this.cols + 1) + x;
  }
  
  // Get grid coordinates from particle index
  getGridCoords(index) {
    const x = index % (this.cols + 1);
    const y = Math.floor(index / (this.cols + 1));
    return { x, y };
  }
  
  // Apply force to a specific area
  applyAreaForce(centerX, centerY, radius, force) {
    for (let i = 0; i < this.particles.length; i++) {
      const coords = this.getGridCoords(i);
      const dx = coords.x - centerX;
      const dy = coords.y - centerY;
      const distance = Math.hypot(dx, dy);
      
      if (distance <= radius) {
        const p = this.particles[i];
        if (!p.pinned) {
          const falloff = 1 - (distance / radius);
          p.pos[0] += force[0] * falloff;
          p.pos[1] += force[1] * falloff;
          p.pos[2] += force[2] * falloff;
        }
      }
    }
  }
}