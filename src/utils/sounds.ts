// Sound effects utility using Web Audio API
class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    // Initialize AudioContext on first user interaction
    this.initializeAudioContext();
  }

  private initializeAudioContext() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      // Create AudioContext lazily on first interaction
      document.addEventListener('click', () => {
        if (!this.audioContext) {
          this.audioContext = new AudioContext();
        }
      }, { once: true });
    }
  }

  private ensureAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    // Resume if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private playTypingSound() {
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const currentTime = ctx.currentTime;

    // Create a short, subtle click sound for typing
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // High frequency short click
    oscillator.frequency.setValueAtTime(800, currentTime);
    oscillator.type = 'sine';

    // Very short envelope for typing
    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.05);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.05);
  }

  private playClickSound() {
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const currentTime = ctx.currentTime;

    // Create a satisfying click sound for buttons
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Lower frequency for button click
    oscillator.frequency.setValueAtTime(600, currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, currentTime + 0.1);
    oscillator.type = 'sine';

    // Sharp attack, quick decay
    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.1);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.1);
  }

  public play(soundName: 'typing' | 'click') {
    if (!this.enabled) return;

    try {
      this.ensureAudioContext();
      
      if (soundName === 'typing') {
        this.playTypingSound();
      } else if (soundName === 'click') {
        this.playClickSound();
      }
    } catch (error) {
      // Silently fail if audio can't play
      console.debug('Audio playback failed:', error);
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }
}

// Create singleton instance
export const soundManager = new SoundManager();

// Hook for React components
export function useSound() {
  const playTyping = () => soundManager.play('typing');
  const playClick = () => soundManager.play('click');

  return {
    playTyping,
    playClick,
    setEnabled: (enabled: boolean) => soundManager.setEnabled(enabled),
    isEnabled: () => soundManager.isEnabled(),
  };
}