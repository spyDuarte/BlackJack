export class SoundManager {
    constructor(enabled = true) {
        this.enabled = enabled;
        this.audioContext = null;
        this.sounds = {
            card: { frequency: 800, duration: 0.1 },
            win: { frequency: 523.25, duration: 0.3 },
            lose: { frequency: 220, duration: 0.5 },
            chip: { frequency: 1000, duration: 0.05 },
            button: { frequency: 600, duration: 0.08 }
        };
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    play(type) {
        if (!this.enabled) return;

        try {
            if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
                return;
            }

            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            const sound = this.sounds[type] || this.sounds.button;
            oscillator.frequency.value = sound.frequency;
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + sound.duration);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + sound.duration);
        } catch (error) {
            // Sound not supported or error
        }
    }
}
