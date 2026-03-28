// acid_bass — MoogFF 303-style acid bass
// Phase 2 US-1. Core SC (MoogFF). SC3-plugins RLPFD upgrade at runtime.
// accent: filter only (depth 2x, resonance +0.5, decay 2x). amp 30% boost. dur INVARIANT.

SynthDef(\acid_bass, { |out=0, freq=110, amp=0.7, dur=0.3, pan=0,
    cutoff=800, resonance=2.0, envDepth=4000, envDecay=0.2,
    accent=0, slide=0, slideTime=0.1, wave=0, dist=0.3|

    var sig, fenv, aenv, lagFreq, accentMul;

    accentMul = 1 + accent;

    // Slide (portamento)
    lagFreq = Lag.kr(freq, slide * slideTime);

    // Oscillator: saw(0) or pulse(1)
    sig = Select.ar(wave.round, [Saw.ar(lagFreq), Pulse.ar(lagFreq, 0.5)]);

    // Filter envelope — accent increases depth and extends decay
    fenv = EnvGen.kr(
        Env.perc(0.01, envDecay * accentMul, curve: -4),
        doneAction: 0
    );

    // MoogFF (core SC, always available) — gain 0-4 for resonance
    sig = MoogFF.ar(sig,
        (cutoff + (fenv * envDepth * accentMul)).clip(20, 20000),
        (resonance + (accent * 0.5)).clip(0, 3.9)
    );

    // Distortion stage
    sig = (sig * (1 + (dist * 4))).tanh;

    // Amplitude envelope — dur INVARIANT (303: accent doesn't extend note)
    aenv = EnvGen.kr(
        Env.perc(0.005, dur, curve: -4),
        doneAction: 2
    );

    // Accent: amp 30% boost
    sig = sig * aenv * amp * (1 + (accent * 0.3));
    sig = Pan2.ar(sig, pan);
    Out.ar(out, sig);
}).add;
