export class AudioManager {
    constructor() {
      this.audioContext = null;
      this.masterGain = null;
      this.oscillators = new Map();
      this.noiseBuffer = null;
      this.isInitialized = false;
      this.isEnabled = true;
      
      // Parametri audio configurabili
      this.settings = {
        volume: 0.3,
        deformationSensitivity: 1.0,
        pitchRange: [200, 800], // Hz
        noiseAmount: 0.2,
        reverbAmount: 0.3,
        filterCutoff: 1000
      };
      
      // Stati per il controllo audio
      this.lastDeformationTime = 0;
      this.currentDeformationLevel = 0;
      this.deformationHistory = [];
    }
  
    // Inizializza il contesto audio
    async initialize() {
      if (this.isInitialized) return;
      
      try {
        // Il contesto audio deve essere inizializzato con un gesto dell'utente
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Crea il nodo di guadagno principale
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.setValueAtTime(this.settings.volume, this.audioContext.currentTime);
        this.masterGain.connect(this.audioContext.destination);
        
        // Crea buffer di rumore per texture sonora
        await this.createNoiseBuffer();
        
        this.isInitialized = true;
        console.log('Audio Manager inizializzato');
      } catch (error) {
        console.error('Errore nell\'inizializzazione audio:', error);
      }
    }
    
    // Crea buffer di rumore bianco per texture sonora
    async createNoiseBuffer() {
      const bufferSize = this.audioContext.sampleRate * 2; // 2 secondi
      this.noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const output = this.noiseBuffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    }
    
    // Riprende il contesto audio se è stato sospeso
    async resumeAudioContext() {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    }
    
    // Calcola l'intensità della deformazione basata sulla forza applicata
    calculateDeformationIntensity(force) {
      const magnitude = Math.sqrt(force[0] * force[0] + force[1] * force[1] + force[2] * force[2]);
      return Math.min(magnitude * this.settings.deformationSensitivity, 1.0);
    }
    
    // Suono principale per la deformazione del tessuto
    playDeformationSound(force, particlePosition) {
      if (!this.isInitialized || !this.isEnabled) return;
      
      const intensity = this.calculateDeformationIntensity(force);
      if (intensity < 0.01) return; // Soglia minima per evitare rumori insignificanti
      
      const now = this.audioContext.currentTime;
      this.currentDeformationLevel = intensity;
      this.lastDeformationTime = now;
      
      // Aggiorna la storia della deformazione per effetti dinamici
      this.deformationHistory.push({ time: now, intensity });
      if (this.deformationHistory.length > 10) {
        this.deformationHistory.shift();
      }
      
      // Suono sintetico che simula lo sfregamento del tessuto
      this.playTextileRubSound(intensity, particlePosition);
      
      // Aggiungi sottili click per simulare le fibre che si spostano
      if (intensity > 0.3) {
        this.playFiberClickSound(intensity);
      }
    }
    
    // Simula il suono dello sfregamento del tessuto
    playTextileRubSound(intensity, position) {
      const duration = 0.3 + intensity * 0.4;
      
      // Oscillatore principale con frequenza variabile
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();
      
      // Configurazione oscillatore
      const baseFreq = this.settings.pitchRange[0] + 
                      (this.settings.pitchRange[1] - this.settings.pitchRange[0]) * intensity;
      osc.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
      osc.type = 'sawtooth';
      
      // Configurazione filtro per simulare la texture del tessuto
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(this.settings.filterCutoff, this.audioContext.currentTime);
      filter.Q.setValueAtTime(1 + intensity * 3, this.audioContext.currentTime);
      
      // Envelope ADSR per naturalezza
      const now = this.audioContext.currentTime;
      const attackTime = 0.02;
      const decayTime = 0.1;
      const sustainLevel = intensity * 0.4;
      const releaseTime = duration - attackTime - decayTime;
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(intensity * 0.6, now + attackTime);
      gain.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
      gain.gain.linearRampToValueAtTime(0, now + duration);
      
      // Connessioni
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      
      // Avvia e ferma
      osc.start(now);
      osc.stop(now + duration);
      
      // Aggiungi rumore per texture
      if (this.settings.noiseAmount > 0) {
        this.addNoiseTexture(intensity, duration);
      }
    }
    
    // Suoni di "click" per simulare le fibre che si spostano
    playFiberClickSound(intensity) {
      const clickDuration = 0.05;
      const numClicks = Math.floor(1 + intensity * 3);
      
      for (let i = 0; i < numClicks; i++) {
        const delay = Math.random() * 0.1;
        setTimeout(() => {
          this.createClickSound(intensity * 0.3, clickDuration);
        }, delay * 1000);
      }
    }
    
    // Crea un singolo suono di click
    createClickSound(intensity, duration) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(800 + Math.random() * 400, this.audioContext.currentTime);
      
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(600, this.audioContext.currentTime);
      
      const now = this.audioContext.currentTime;
      gain.gain.setValueAtTime(intensity, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      
      osc.start(now);
      osc.stop(now + duration);
    }
    
    // Aggiunge texture di rumore
    addNoiseTexture(intensity, duration) {
      if (!this.noiseBuffer) return;
      
      const source = this.audioContext.createBufferSource();
      const gain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();
      
      source.buffer = this.noiseBuffer;
      source.loop = true;
      
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400 + intensity * 600, this.audioContext.currentTime);
      filter.Q.setValueAtTime(2, this.audioContext.currentTime);
      
      const now = this.audioContext.currentTime;
      const noiseLevel = intensity * this.settings.noiseAmount * 0.1;
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(noiseLevel, now + 0.01);
      gain.gain.linearRampToValueAtTime(0, now + duration);
      
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      
      source.start(now);
      source.stop(now + duration);
    }
    
    // Suono per collisioni con oggetti
    playCollisionSound(object, intensity) {
      if (!this.isInitialized || !this.isEnabled) return;
      
      const duration = 0.2 + intensity * 0.3;
      let baseFreq = 150;
      
      // Frequenze diverse per tipi di oggetti diversi
      switch(object.type) {
        case 'sphere':
          baseFreq = 200 + intensity * 300;
          this.createMetallicSound(baseFreq, intensity, duration);
          break;
        case 'cube':
          baseFreq = 100 + intensity * 200;
          this.createWoodenSound(baseFreq, intensity, duration);
          break;
      }
    }
    
    // Suono metallico per le sfere
    createMetallicSound(freq, intensity, duration) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
      
      filter.type = 'peaking';
      filter.frequency.setValueAtTime(freq * 2, this.audioContext.currentTime);
      filter.Q.setValueAtTime(5, this.audioContext.currentTime);
      filter.gain.setValueAtTime(6, this.audioContext.currentTime);
      
      const now = this.audioContext.currentTime;
      gain.gain.setValueAtTime(intensity * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      
      osc.start(now);
      osc.stop(now + duration);
    }
    
    // Suono ligneo per i cubi
    createWoodenSound(freq, intensity, duration) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.audioContext.currentTime);
      filter.Q.setValueAtTime(2, this.audioContext.currentTime);
      
      const now = this.audioContext.currentTime;
      gain.gain.setValueAtTime(intensity * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      
      osc.start(now);
      osc.stop(now + duration);
    }
    
    // Suono ambientale per il vento
    playWindSound(windForce) {
      const intensity = Math.min(Math.sqrt(windForce[0]**2 + windForce[1]**2 + windForce[2]**2) * 0.1, 1);
      if (intensity < 0.05) return;
      
      const duration = 2.0;
      
      // Usa rumore bianco filtrato per simulare il vento
      if (this.noiseBuffer) {
        const source = this.audioContext.createBufferSource();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        source.buffer = this.noiseBuffer;
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300 + intensity * 200, this.audioContext.currentTime);
        filter.Q.setValueAtTime(0.7, this.audioContext.currentTime);
        
        const now = this.audioContext.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(intensity * 0.2, now + 0.1);
        gain.gain.linearRampToValueAtTime(0, now + duration);
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        source.start(now);
        source.stop(now + duration);
      }
    }
    
    // Controlli per l'utente
    setVolume(volume) {
      this.settings.volume = Math.max(0, Math.min(1, volume));
      if (this.masterGain) {
        this.masterGain.gain.setValueAtTime(this.settings.volume, this.audioContext.currentTime);
      }
    }
    
    setEnabled(enabled) {
      this.isEnabled = enabled;
    }
    
    // Aggiorna le impostazioni audio
    updateSettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings };
    }
    
    // Cleanup delle risorse audio
    destroy() {
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
      }
      this.oscillators.clear();
      this.isInitialized = false;
    }
  }