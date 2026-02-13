
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SoundManager } from '../../src/utils/SoundManager.js';

describe('SoundManager', () => {
    let soundManager;
    let mockContext;
    let createBufferMock;

    beforeEach(() => {
        createBufferMock = vi.fn().mockReturnValue({
            getChannelData: () => new Float32Array(100)
        });

        mockContext = {
            state: 'running',
            sampleRate: 44100,
            currentTime: 0,
            createBuffer: createBufferMock,
            createBufferSource: vi.fn().mockReturnValue({
                connect: vi.fn(),
                start: vi.fn(),
                stop: vi.fn(),
                buffer: null
            }),
            createGain: vi.fn().mockReturnValue({
                gain: {
                    value: 0,
                    setValueAtTime: vi.fn(),
                    exponentialRampToValueAtTime: vi.fn(),
                    linearRampToValueAtTime: vi.fn()
                },
                connect: vi.fn()
            }),
            createBiquadFilter: vi.fn().mockReturnValue({
                type: '',
                frequency: { value: 0 },
                connect: vi.fn()
            }),
            createOscillator: vi.fn().mockReturnValue({
                frequency: {
                    value: 0,
                    setValueAtTime: vi.fn(),
                    linearRampToValueAtTime: vi.fn()
                },
                type: '',
                connect: vi.fn(),
                start: vi.fn(),
                stop: vi.fn()
            }),
            destination: {}
        };

        // Mock window.AudioContext
        vi.stubGlobal('AudioContext', vi.fn().mockImplementation(() => mockContext));

        soundManager = new SoundManager();
        soundManager.initialized = true;
        soundManager.context = mockContext;
    });

    it('should cache card noise buffer', async () => {
        // Play card sound first time
        await soundManager.play('card');

        expect(createBufferMock).toHaveBeenCalledTimes(1);

        // Play card sound second time
        await soundManager.play('card');

        // Should still be called only once
        expect(createBufferMock).toHaveBeenCalledTimes(1);
    });

    it('should play other sounds without using the cached buffer logic', async () => {
        await soundManager.play('win');
        // 'win' sound uses oscillators, not createBuffer
        expect(createBufferMock).toHaveBeenCalledTimes(0);
    });
});
