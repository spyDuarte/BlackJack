// Mock global window and AudioContext
global.window = {};

class MockAudioBufferSourceNode {
    constructor() {
        this.buffer = null;
        this.started = false;
    }
    connect(dest) {}
    start(time) { this.started = true; }
}

class MockGainNode {
    constructor() {
        this.gain = { value: 1 };
    }
    connect(dest) {}
}

class MockAudioContext {
    constructor() {
        this.state = 'running';
        this.destination = {};
    }
    createBufferSource() { return new MockAudioBufferSourceNode(); }
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
    console.log('Verifying SoundManager...');

    const manager = new SoundManager();

    // Wait for async init and preload
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('Context created:', !!manager.context);
    if (!manager.context) throw new Error('Context failed to create');

    // Wait for preload to finish
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify buffers loaded
    const cardBuffers = manager.buffers['card'];
    console.log('Card buffers loaded:', cardBuffers ? cardBuffers.length : 0);

    if (!cardBuffers || cardBuffers.length !== 3) {
        throw new Error(`Expected 3 card buffers, got ${cardBuffers ? cardBuffers.length : 0}`);
    }

    // Verify play
    console.log('Testing play("card")...');
    let played = false;

    // Patch createBufferSource to detect playback
    const originalCreateSource = manager.context.createBufferSource;
    manager.context.createBufferSource = () => {
        const source = new MockAudioBufferSourceNode(); // Use our mock directly or call original if it returned a real object (but here MockAudioContext returns MockAudioBufferSourceNode)
        // We can just spy on the result of the original call since it returns our Mock
        source.start = () => { played = true; };
        return source;
    };

    manager.play('card');

    if (!played) throw new Error('Sound did not play');
    console.log('Sound played successfully.');

    // Verify random variations logic
    console.log('Testing playRandom("chip")...');
    const chipBuffers = manager.buffers['chip'];
    if (!chipBuffers || chipBuffers.length !== 2) {
         throw new Error('Expected 2 chip buffers');
    }

    // Just ensure it runs without error
    manager.playRandom('chip');

    console.log('Verification passed.');
}

verify().catch(e => {
    console.error('Verification Failed:', e);
    process.exit(1);
});
