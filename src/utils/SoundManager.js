export class SoundManager {
    constructor(enabled = true) {
        this.enabled = enabled;
        this.volume = 0.5;
        this.context = null;
        this.buffers = {};
        this.initialized = false;
        this.maxConcurrent = 5;
        this.activeSources = [];
        this.cardNoiseBuffer = null;

        // Configuration for sound files with variations
        // NOTE: Assets are currently missing, so we use empty arrays to trigger fallback to synthetic sounds
        // and avoid 404 errors in console during preload.
        this.soundConfig = {
            'card': [],
            'chip': [],
            'win': [],
            'lose': [],
            'button': []
        };

        // Fallback synthetic sound configuration
        this.synthSounds = {
            card: { frequency: 800, duration: 0.1 },
            win: { frequency: 523.25, duration: 0.3 },
            lose: { frequency: 220, duration: 0.5 },
            chip: { frequency: 1000, duration: 0.05 },
            button: { frequency: 600, duration: 0.08 }
        };

        // Lazy initialization: defer AudioContext creation until first user interaction
        this.cardNoiseBuffer = null;
    }

    async ensureInitialized() {
        if (this.initialized) return;
        this.initialized = true;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) {
                console.warn('Web Audio API not supported');
                return;
            }

            this.context = new AudioContext();
            // Preload sounds in background (non-blocking)
            this.preloadSounds();
        } catch (error) {
            console.warn('Failed to initialize SoundManager:', error);
        }
    }

    async preloadSounds() {
        if (!this.context) return;

        const loadPromises = [];

        for (const [category, files] of Object.entries(this.soundConfig)) {
            this.buffers[category] = [];

            files.forEach(url => {
                const promise = fetch(url)
                    .then(response => {
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        return response.arrayBuffer();
                    })
                    .then(arrayBuffer => this.context.decodeAudioData(arrayBuffer))
                    .then(audioBuffer => {
                        this.buffers[category].push(audioBuffer);
                    })
                    .catch(error => {
                        // Log warning but continue loading other sounds
                        console.warn(`Failed to load sound ${url}: ${error.message}`);
                    });

                loadPromises.push(promise);
            });
        }

        await Promise.all(loadPromises);
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (enabled && this.context && this.context.state === 'suspended') {
            this.context.resume().catch(() => {});
        }
    }

    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
    }

    /**
     * Plays a sound of the given type.
     * Lazily initializes AudioContext on first call (requires user gesture).
     * Enforces a pool limit of maxConcurrent simultaneous sounds.
     * @param {string} type - The category of sound to play (e.g., 'card', 'chip')
     */
    play(type) {
        if (!this.enabled) return;

        // Lazy init on first play (triggered by user interaction)
        this.ensureInitialized();
        if (!this.context) return;

        // Auto-resume context if suspended
        if (this.context.state === 'suspended') {
            this.context.resume().catch(() => {});
        }

        // Enforce audio pool limit
        this.cleanupSources();
        if (this.activeSources.length >= this.maxConcurrent) {
            // Stop the oldest source
            const oldest = this.activeSources.shift();
            try { oldest.stop(); } catch {}
        }

        const buffers = this.buffers[type];

        // If we have loaded buffers for this type, play one randomly
        if (buffers && buffers.length > 0) {
            this.playSample(buffers);
        } else {
            // Fallback to synthetic sound
            this.playSynthetic(type);
        }
    }

    cleanupSources() {
        this.activeSources = this.activeSources.filter(s => {
            try {
                return s.playbackState !== 'finished';
            } catch {
                return false;
            }
        });
    }

    playSample(buffers) {
        try {
            const buffer = buffers[Math.floor(Math.random() * buffers.length)];
            const source = this.context.createBufferSource();
            source.buffer = buffer;

            const gainNode = this.context.createGain();
            gainNode.gain.value = this.volume;

            source.connect(gainNode);
            gainNode.connect(this.context.destination);

            source.onended = () => {
                const idx = this.activeSources.indexOf(source);
                if (idx > -1) this.activeSources.splice(idx, 1);
            };

            source.start(0);
            this.activeSources.push(source);
        } catch (error) {
            console.warn('Error playing sample:', error);
        }
    }

    playSynthetic(type) {
        try {
            const ct = this.context.currentTime;
            const vol = this.volume * 0.2;

            if (type === 'card') {
                // Card sound: filtered noise burst simulating a card flip
                if (!this.cardNoiseBuffer) {
                    const bufferSize = this.context.sampleRate * 0.08;
                    this.cardNoiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
                    const data = this.cardNoiseBuffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
                }

                const noise = this.context.createBufferSource();
                noise.buffer = this.cardNoiseBuffer;

                const filter = this.context.createBiquadFilter();
                filter.type = 'highpass';
                filter.frequency.value = 3000;

                const gain = this.context.createGain();
                gain.gain.setValueAtTime(vol, ct);
                gain.gain.exponentialRampToValueAtTime(0.01, ct + 0.08);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.context.destination);
                noise.start(ct);
            } else if (type === 'win') {
                // Win sound: ascending arpeggio of 3 tones
                const freqs = [523.25, 659.25, 783.99];
                freqs.forEach((freq, i) => {
                    const osc = this.context.createOscillator();
                    const gain = this.context.createGain();
                    osc.type = 'triangle';
                    osc.frequency.value = freq;
                    osc.connect(gain);
                    gain.connect(this.context.destination);
                    const start = ct + i * 0.12;
                    gain.gain.setValueAtTime(0, start);
                    gain.gain.linearRampToValueAtTime(vol, start + 0.03);
                    gain.gain.exponentialRampToValueAtTime(0.01, start + 0.25);
                    osc.start(start);
                    osc.stop(start + 0.25);
                });
            } else if (type === 'lose') {
                // Lose sound: descending two-tone
                const osc = this.context.createOscillator();
                const gain = this.context.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, ct);
                osc.frequency.linearRampToValueAtTime(200, ct + 0.4);
                osc.connect(gain);
                gain.connect(this.context.destination);
                gain.gain.setValueAtTime(vol, ct);
                gain.gain.exponentialRampToValueAtTime(0.01, ct + 0.5);
                osc.start(ct);
                osc.stop(ct + 0.5);
            } else if (type === 'chip') {
                // Chip sound: quick metallic click with two short tones
                [1200, 1800].forEach((freq, i) => {
                    const osc = this.context.createOscillator();
                    const gain = this.context.createGain();
                    osc.type = 'square';
                    osc.frequency.value = freq;
                    osc.connect(gain);
                    gain.connect(this.context.destination);
                    const start = ct + i * 0.03;
                    gain.gain.setValueAtTime(vol * 0.6, start);
                    gain.gain.exponentialRampToValueAtTime(0.01, start + 0.04);
                    osc.start(start);
                    osc.stop(start + 0.04);
                });
            } else {
                // Default button sound: short clean blip
                const sound = this.synthSounds[type] || this.synthSounds.button;
                if (!sound) return;
                const osc = this.context.createOscillator();
                const gain = this.context.createGain();
                osc.frequency.value = sound.frequency;
                osc.connect(gain);
                gain.connect(this.context.destination);
                gain.gain.setValueAtTime(vol, ct);
                gain.gain.exponentialRampToValueAtTime(0.01, ct + sound.duration);
                osc.start(ct);
                osc.stop(ct + sound.duration);
            }
        } catch (error) {
            console.warn('Error playing synthetic sound:', error);
        }
    }

    playRandom(category) {
        this.play(category);
    }
}
