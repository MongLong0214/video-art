// acid_bass RLPFD variant — TB303 dedicated filter (SC3-plugins BhobUGens)
// Loaded ONLY when SC3-plugins detected at runtime. Falls back to MoogFF version.
// Same parameters as acid_bass.scd. RLPFD provides more authentic 303 resonance.

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

    // RLPFD — TB303 dedicated resonant LPF with built-in distortion
    sig = RLPFD.ar(sig,
        (cutoff + (fenv * envDepth * accentMul)).clip(20, 20000),
        (resonance + (accent * 0.5)).clip(0, 1.0),  // RLPFD resonance range 0-1
        dist * 0.5  // RLPFD dist parameter
    );

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
