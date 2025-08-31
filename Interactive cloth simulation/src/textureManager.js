export class TextureManager {
    constructor(gl) {
      this.gl = gl;
      this.textures = new Map();
      this.currentTexture = null;
    }
  
    // Crea una texture procedurale per la seta
    createSilkTexture(width = 256, height = 256) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
  
      // Gradiente base per effetto seta
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#f8f8ff');
      gradient.addColorStop(0.3, '#e6e6fa');
      gradient.addColorStop(0.7, '#dda0dd');
      gradient.addColorStop(1, '#d8bfd8');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
  
      // Aggiungi pattern di seta con linee sottili
      ctx.globalCompositeOperation = 'multiply';
      ctx.strokeStyle = 'rgba(200, 180, 200, 0.3)';
      ctx.lineWidth = 1;
      
      for (let i = 0; i < width; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + height * 0.1, height);
        ctx.stroke();
      }
  
      return this.createTextureFromCanvas(canvas, 'silk');
    }
  
    // Crea una texture procedurale per il lino
    createLinenTexture(width = 256, height = 256) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
  
      // Colore base lino
      ctx.fillStyle = '#f5f5dc';
      ctx.fillRect(0, 0, width, height);
  
      // Pattern intrecciato del lino
      ctx.fillStyle = '#e6e6cd';
      
      const weaveSize = 8;
      for (let y = 0; y < height; y += weaveSize) {
        for (let x = 0; x < width; x += weaveSize) {
          if ((Math.floor(x / weaveSize) + Math.floor(y / weaveSize)) % 2) {
            ctx.fillRect(x, y, weaveSize, weaveSize);
          }
        }
      }
  
      // Aggiungi texture granulosa
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 20;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
      }
      
      ctx.putImageData(imageData, 0, 0);
      return this.createTextureFromCanvas(canvas, 'linen');
    }
  
    // Crea una texture procedurale per il cotone
    createCottonTexture(width = 256, height = 256) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
  
      // Colore base cotone
      ctx.fillStyle = '#fffef0';
      ctx.fillRect(0, 0, width, height);
  
      // Pattern del cotone con piccoli cerchi
      ctx.fillStyle = '#f0f0e6';
      
      for (let y = 0; y < height; y += 12) {
        for (let x = 0; x < width; x += 12) {
          const offsetX = (y % 24) ? 6 : 0;
          ctx.beginPath();
          ctx.arc(x + offsetX + Math.random() * 4, y + Math.random() * 4, 2 + Math.random() * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
  
      return this.createTextureFromCanvas(canvas, 'cotton');
    }
  
    // Crea una texture procedurale per la jeans
    createDenimTexture(width = 256, height = 256) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
  
      // Colore base denim
      ctx.fillStyle = '#4682b4';
      ctx.fillRect(0, 0, width, height);
  
      // Pattern intrecciato denim
      ctx.strokeStyle = '#2f4f4f';
      ctx.lineWidth = 2;
      
      // Linee verticali
      for (let x = 0; x < width; x += 6) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // Linee orizzontali più sottili
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#5a7fa7';
      for (let y = 0; y < height; y += 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
  
      return this.createTextureFromCanvas(canvas, 'denim');
    }
  
    // Crea una texture procedurale per il velluto
    createVelvetTexture(width = 256, height = 256) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
  
      // Gradiente per effetto velluto
      const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2);
      gradient.addColorStop(0, '#8b0000');
      gradient.addColorStop(0.5, '#660000');
      gradient.addColorStop(1, '#4d0000');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
  
      // Aggiungi texture vellutata
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random() * 30 - 15;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise * 0.5));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise * 0.5));
      }
      
      ctx.putImageData(imageData, 0, 0);
      return this.createTextureFromCanvas(canvas, 'velvet');
    }
  
    // Crea texture WebGL da canvas
    createTextureFromCanvas(canvas, name) {
      const gl = this.gl;
      const texture = gl.createTexture();
      
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      
      // Imposta i parametri di texture
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      
      gl.generateMipmap(gl.TEXTURE_2D);
      
      this.textures.set(name, texture);
      return texture;
    }
  
    // Carica texture da URL
    async loadTextureFromURL(url, name) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        
        image.onload = () => {
          const gl = this.gl;
          const texture = gl.createTexture();
          
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
          
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          
          gl.generateMipmap(gl.TEXTURE_2D);
          
          this.textures.set(name, texture);
          resolve(texture);
        };
        
        image.onerror = reject;
        image.src = url;
      });
    }
  
    // Inizializza tutte le texture procedurali
    initializeAllTextures() {
      this.createSilkTexture();
      this.createLinenTexture();
      this.createCottonTexture();
      this.createDenimTexture();
      this.createVelvetTexture();
    }
  
    // Ottieni una texture per nome
    getTexture(name) {
      return this.textures.get(name);
    }
  
    // Imposta la texture corrente
    setCurrentTexture(name) {
      const texture = this.textures.get(name);
      if (texture) {
        this.currentTexture = texture;
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        return true;
      }
      return false;
    }
  
    // Ottieni la lista dei nomi delle texture disponibili
    getTextureNames() {
      return Array.from(this.textures.keys());
    }
  
    // Disabilita la texture corrente
    disableTexture() {
      this.currentTexture = null;
    }
  }