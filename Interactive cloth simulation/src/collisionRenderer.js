export class ObjectRenderer {
  constructor(gl, program) {
    this.gl = gl;
    this.program = program;
    
    // Buffer per gli oggetti
    this.objectBuffers = new Map();
    
    // Locations per gli shader
    this.aPosition = gl.getAttribLocation(program, 'aPosition');
    this.aNormal = gl.getAttribLocation(program, 'aNormal');
    this.aTexCoord = gl.getAttribLocation(program, 'aTexCoord');
    this.uModel = gl.getUniformLocation(program, 'uModel');
    this.uObjectColor = gl.getUniformLocation(program, 'uObjectColor');
    this.uIsObject = gl.getUniformLocation(program, 'uIsObject');
  }

  // Crea i buffer per un oggetto
  createBuffersForObject(object, objectId) {
    const gl = this.gl;
    const geometry = object.generateVertices();
    
    // Buffer delle posizioni
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.vertices), gl.STATIC_DRAW);
    
    // Buffer delle normali
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.normals), gl.STATIC_DRAW);
    
    // Buffer degli indici
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geometry.indices), gl.STATIC_DRAW);
    
    // Salva i buffer
    this.objectBuffers.set(objectId, {
      positionBuffer,
      normalBuffer,
      indexBuffer,
      indexCount: geometry.indices.length,
      object
    });
  }

  // Aggiorna i buffer di un oggetto (per quando cambia posizione)
  updateObjectBuffers(object, objectId) {
    this.createBuffersForObject(object, objectId);
  }

  renderObjects(objects, viewMatrix, projectionMatrix) {
    const gl = this.gl;
    
    if (objects.length === 0) return;
    
    // Indica allo shader che stiamo renderizzando oggetti
    gl.uniform1i(this.uIsObject, 1);
  
    objects.forEach((object, index) => {
      if (!object.visible) return;
      
      const objectId = `${object.type}_${index}`;
      
      // SEMPRE aggiorna i buffer per oggetti in movimento
      this.createBuffersForObject(object, objectId);
      
      const buffers = this.objectBuffers.get(objectId);
      
      // Imposta il colore dell'oggetto
      gl.uniform3fv(this.uObjectColor, object.color);
      
      // Matrice del modello (identità)
      const modelMatrix = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      ];
      gl.uniformMatrix4fv(this.uModel, false, modelMatrix);
      
      // Configura buffer delle posizioni
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positionBuffer);
      gl.vertexAttribPointer(this.aPosition, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.aPosition);
      
      // Configura buffer delle normali
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normalBuffer);
      gl.vertexAttribPointer(this.aNormal, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.aNormal);
      
      // Configura buffer degli indici
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indexBuffer);
      
      // Renderizza l'oggetto
      gl.drawElements(gl.TRIANGLES, buffers.indexCount, gl.UNSIGNED_SHORT, 0);
    });
    
    // Ripulisci completamente lo stato degli attributi
    gl.disableVertexAttribArray(this.aPosition);
    gl.disableVertexAttribArray(this.aNormal);
    if (this.aTexCoord >= 0) {
      gl.disableVertexAttribArray(this.aTexCoord);
    }
    
    // Unbind tutti i buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    // Ripristina il flag per il tessuto
    gl.uniform1i(this.uIsObject, 0);
  }
  // Pulisce i buffer di un oggetto
  cleanupObject(objectId) {
    const buffers = this.objectBuffers.get(objectId);
    if (buffers) {
      this.gl.deleteBuffer(buffers.positionBuffer);
      this.gl.deleteBuffer(buffers.normalBuffer);
      this.gl.deleteBuffer(buffers.indexBuffer);
      this.objectBuffers.delete(objectId);
    }
  }

  // Pulisce tutti i buffer
  cleanup() {
    for (const [objectId] of this.objectBuffers) {
      this.cleanupObject(objectId);
    }
  }
}