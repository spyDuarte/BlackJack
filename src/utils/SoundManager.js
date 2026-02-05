export class SoundManager {
    constructor(enabled = true) {
        this.enabled = enabled;
        this.volume = 0.5;
        this.context = null;
        this.buffers = {};

        // Configuration for sound files with variations
        this.soundConfig = {
            'card': [
                'assets/sounds/card-flip-1.mp3',
                'assets/sounds/card-flip-2.mp3',
                'assets/sounds/card-flip-3.mp3'
            ],
            'chip': [
                'assets/sounds/chip-clash-1.mp3',
                'assets/sounds/chip-clash-2.mp3'
            ],
            'win': ['assets/sounds/win-sound.mp3'],
            'lose': ['assets/sounds/lose.mp3'],
            'button': ['assets/sounds/click.mp3']
        };

        // Fallback synthetic sound configuration
        this.synthSounds = {
            card: { frequency: 800, duration: 0.1 },
            win: { frequency: 523.25, duration: 0.3 },
            lose: { frequency: 220, duration: 0.5 },
            chip: { frequency: 1000, duration: 0.05 },
            button: { frequency: 600, duration: 0.08 }
        };

        // Initialize asynchronously
        this.init();
    }

    async init() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) {
                console.warn('Web Audio API not supported');
                return;
            }

            this.context = new AudioContext();
            await this.preloadSounds();
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
     * Tries to play a sample first; falls back to synthesis if no samples are loaded.
     * @param {string} type - The category of sound to play (e.g., 'card', 'chip')
     */
    play(type) {
        if (!this.enabled || !this.context) return;

        // Auto-resume context if suspended
        if (this.context.state === 'suspended') {
            this.context.resume().catch(() => {});
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

    playSample(buffers) {
        try {
            const buffer = buffers[Math.floor(Math.random() * buffers.length)];
            const source = this.context.createBufferSource();
            source.buffer = buffer;

            const gainNode = this.context.createGain();
            gainNode.gain.value = this.volume;

            source.connect(gainNode);
            gainNode.connect(this.context.destination);

            source.start(0);
        } catch (error) {
            console.warn('Error playing sample:', error);
        }
    }

    playSynthetic(type) {
        try {
            const sound = this.synthSounds[type] || this.synthSounds.button;
            if (!sound) return;

            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.context.destination);

            oscillator.frequency.value = sound.frequency;

            // Use setValueAtTime for more robust timing
            const currentTime = this.context.currentTime;
            const synthVolume = this.volume * 0.2;
            gainNode.gain.setValueAtTime(synthVolume, currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + sound.duration);

            oscillator.start(currentTime);
            oscillator.stop(currentTime + sound.duration);
        } catch (error) {
            console.warn('Error playing synthetic sound:', error);
        }
    }

    playRandom(category) {
        this.play(category);
    }
}
