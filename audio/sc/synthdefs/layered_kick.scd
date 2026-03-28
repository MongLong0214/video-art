// layered_kick — 3-layer kick (Nathan Ho kick_electro pattern)
// Phase 2 US-5. Sub(sine+multi-stage pitchEnv) + Body(Formant) + Click(Impulse+BPF)

SynthDef(\layered_kick, { |out=0, freq=50, amp=0.8, dur=0.5, pan=0,
    subDecay=0.4, bodyDecay=0.1, clickAmp=0.6,
    bodyFreq=200, drive=0, punch=0.5|

    var sub, body, click, sig;

    // Layer 1: Sub — multi-stage pitch envelope
    sub = SinOsc.ar(
        EnvGen.kr(Env.new(
            [freq * 5, freq * 2.4, freq],
            [dur / 8.57, dur / 3.75],
            \exp
        ))
    ) * EnvGen.kr(Env.linen(0.001, subDecay / 3, subDecay));

    // Layer 2: Body — Formant UGen
    body = LPF.ar(
        Formant.ar(bodyFreq * 0.5, bodyFreq * 2, bodyFreq * 4),
        bodyFreq * 3
    ) * EnvGen.kr(Env.perc(0.001, bodyDecay, level: 0.15));

    // Layer 3: Click — Impulse + BPF transient
    click = BPF.ar(
        Impulse.ar(0) * clickAmp,
        6100, 1.0
    );

    // Mix + punch transient
    sig = sub + body + click;
    sig = sig * (1 + (punch * EnvGen.kr(Env.perc(0.001, 0.01)) * 3));

    // Distortion (.tanh)
    sig = (sig * (1 + (drive * 4))).tanh;

    sig = sig * amp;
    DetectSilence.ar(sig, 0.001, 0.1, doneAction: 2);
    sig = Pan2.ar(sig, pan);
    Out.ar(out, sig);
}).add;
