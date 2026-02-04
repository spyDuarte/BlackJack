export class SoundManager {
    constructor(enabled = true) {
        this.enabled = enabled;
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
                        // Silence 404s during development if expected
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

    /**
     * Plays a sound of the given type.
     * If multiple variations exist, picks one randomly.
     * @param {string} type - The category of sound to play (e.g., 'card', 'chip')
     */
    play(type) {
        if (!this.enabled || !this.context) return;

        // Auto-resume context if suspended (browser autoplay policy)
        if (this.context.state === 'suspended') {
            this.context.resume().catch(() => {});
        }

        const buffers = this.buffers[type];
        if (!buffers || buffers.length === 0) return;

        try {
            // Pick a random variation to avoid repetition
            const buffer = buffers[Math.floor(Math.random() * buffers.length)];

            const source = this.context.createBufferSource();
            source.buffer = buffer;

            const gainNode = this.context.createGain();
            // Set volume (could be configurable)
            gainNode.gain.value = 0.5;

            source.connect(gainNode);
            gainNode.connect(this.context.destination);

            source.start(0);
        } catch (error) {
            console.warn(`Error playing sound '${type}':`, error);
        }
    }

    /**
     * Helper to play a random sound from a category (explicit method)
     * @param {string} category
     */
    playRandom(category) {
        this.play(category);
    }
}
