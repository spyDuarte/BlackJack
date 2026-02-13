
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SoundManager } from './SoundManager';

describe('SoundManager', () => {
  let soundManager;
  let contextMock;

  beforeEach(() => {
    soundManager = new SoundManager();
    contextMock = {
      sampleRate: 44100,
      createBuffer: vi.fn(() => ({
        getChannelData: vi.fn(() => new Float32Array(100)),
      })),
      createBufferSource: vi.fn(() => ({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      })),
      createBiquadFilter: vi.fn(() => ({
        frequency: { value: 0 },
        connect: vi.fn(),
      })),
      createGain: vi.fn(() => ({
        gain: {
          value: 0,
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      })),
      createOscillator: vi.fn(() => ({
        frequency: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      })),
      destination: {},
      currentTime: 0,
      state: 'running',
      resume: vi.fn().mockResolvedValue(),
      decodeAudioData: vi.fn().mockResolvedValue({}),
    };

    // Mock global AudioContext
    globalThis.window = {
        AudioContext: class { constructor() { return contextMock; } },
        webkitAudioContext: class { constructor() { return contextMock; } },
    };
  });

  it('should create buffer for card sound only once with optimization', async () => {
    await soundManager.ensureInitialized();
    // soundManager.context is set by ensureInitialized using the mock

    // First call
    await soundManager.play('card');
    expect(contextMock.createBuffer).toHaveBeenCalledTimes(1);

    // Second call
    await soundManager.play('card');
    expect(contextMock.createBuffer).toHaveBeenCalledTimes(1);
  });
});
