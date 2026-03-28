// squelch — resonant filter sweep + self-oscillation
// Phase 2 US-6. MoogFF gain→4 for self-oscillation. LFO modulation.

SynthDef(\squelch, { |out=0, freq=440, amp=0.5, dur=0.5, pan=0,
    sweepStart=200, sweepEnd=4000, sweepCurve=(-4),
    resonance=0.8, source=0, lfoRate=0, lfoDepth=0|

    var sig, fenv, env, lfo;

    // Source: noise(0), saw(1), pulse(2)
    sig = Select.ar(source.round, [WhiteNoise.ar, Saw.ar(freq), Pulse.ar(freq, 0.5)]);

    // Filter frequency sweep
    fenv = EnvGen.kr(
        Env.new([sweepStart, sweepEnd], [dur], [sweepCurve])
    );

    // Optional LFO modulation
    lfo = SinOsc.kr(lfoRate) * lfoDepth;

    // MoogFF — gain 3.5+ enables self-oscillation
    sig = MoogFF.ar(sig,
        (fenv + lfo).clip(20, 20000),
        (resonance * 4).clip(0, 3.95)
    );

    // Amplitude envelope
    env = EnvGen.kr(Env.perc(0.01, dur), doneAction: 2);
    sig = sig * env * amp;
    sig = Pan2.ar(sig, pan);
    Out.ar(out, sig);
}).add;
