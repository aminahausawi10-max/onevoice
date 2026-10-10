/**
 * ONE VOICE - Audio Synthesizer (Web Audio API)
 * Generates genuine telephone DTMF frequencies and call ringing tones
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.ringOscillator = null;
        this.ringGain = null;
        this.isRinging = false;
        
        // Standard ITU-T DTMF keypad frequencies
        this.dtmfFrequencies = {
            '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
            '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
            '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
            '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
        };
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Play standard DTMF tone on button press
    playDtmf(key) {
        this.init();
        const freqs = this.dtmfFrequencies[key];
        if (!freqs) return;

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freqs[0], this.ctx.currentTime);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freqs[1], this.ctx.currentTime);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(this.ctx.currentTime + 0.18);
        osc2.stop(this.ctx.currentTime + 0.18);
    }

    // Start telephone ringing sound (440Hz + 480Hz US ringback tone)
    startRingback() {
        this.init();
        if (this.isRinging) return;
        this.isRinging = true;

        const playRingCycle = () => {
            if (!this.isRinging) return;

            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(440, this.ctx.currentTime);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(480, this.ctx.currentTime);

            gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.12, this.ctx.currentTime + 1.2);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.3);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.ctx.destination);

            osc1.start();
            osc2.start();
            osc1.stop(this.ctx.currentTime + 1.3);
            osc2.stop(this.ctx.currentTime + 1.3);

            if (this.isRinging) {
                this.ringTimer = setTimeout(playRingCycle, 3000);
            }
        };

        playRingCycle();
    }

    stopRingback() {
        this.isRinging = false;
        if (this.ringTimer) {
            clearTimeout(this.ringTimer);
        }
    }

    // Play call connected beep
    playConnectBeep() {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    // Play call ended beep
    playEndCallTone() {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }
}

window.soundEngine = new SoundEngine();
