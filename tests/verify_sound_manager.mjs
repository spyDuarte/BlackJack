// Mock global window and AudioContext
global.window = {};

class MockAudioBufferSourceNode {
    constructor() {
        this.buffer = null;
    }
    connect(dest) {}
    start(time) { this.started = true; }
}

class MockOscillatorNode {
    constructor() {
        this.frequency = { value: 0 };
    }
    connect(dest) {}
    start(time) { this.started = true; }
    stop(time) { this.stopped = true; }
}

class MockGainNode {
    constructor() {
        this.gain = {
            value: 1,
            setValueAtTime: (val, time) => {},
            exponentialRampToValueAtTime: (val, time) => {}
        };
    }
    connect(dest) {}
}

class MockAudioContext {
    constructor() {
        this.state = 'running';
        this.destination = {};
        this.currentTime = 0;
    }
    createBufferSource() { return new MockAudioBufferSourceNode(); }
    createOscillator() { return new MockOscillatorNode(); }
    createGain() { return new MockGainNode(); }
    decodeAudioData(buffer) { return Promise.resolve({ length: 100 }); }
    resume() {
        this.state = 'running';
        return Promise.resolve();
    }
}

global.window.AudioContext = MockAudioContext;
global.window.webkitAudioContext = MockAudioContext;

// Mock fetch
global.fetch = async (url) => {
    return {
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(8)
    };
};

import { SoundManager } from '../src/utils/SoundManager.js';

async function verify() {
    console.log('Verifying SoundManager with fallback...');

    // 1. Test successful load and sample playback
    const manager = new SoundManager();
    await new Promise(resolve => setTimeout(resolve, 100)); // wait for init

    // Verify buffers loaded (using our successful fetch mock)
    const cardBuffers = manager.buffers['card'];
    if (!cardBuffers || cardBuffers.length !== 3) {
        throw new Error('Expected 3 card buffers');
    }

    // Spy on createBufferSource to confirm sample playback
    let samplePlayed = false;
    manager.context.createBufferSource = () => {
        const source = new MockAudioBufferSourceNode();
        source.start = () => { samplePlayed = true; };
        return source;
    };

    manager.play('card');
    if (!samplePlayed) throw new Error('Sample did not play when buffers were present');
    console.log('Sample playback verified.');

    // 2. Test fallback (simulate missing buffers)
    // Clear buffers for 'chip' to force fallback
    manager.buffers['chip'] = [];

    let synthPlayed = false;
    manager.context.createOscillator = () => {
        const osc = new MockOscillatorNode();
        osc.start = () => { synthPlayed = true; };
        return osc;
    };

    manager.play('chip');
    if (!synthPlayed) throw new Error('Fallback synthetic sound did not play when buffers were empty');
    console.log('Fallback synthesis verified.');

    console.log('Verification passed.');
}

verify().catch(e => {
    console.error('Verification Failed:', e);
    process.exit(1);
});
