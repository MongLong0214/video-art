// hat — metallic techno hi-hat
// Square wave cluster (808/909 method) + noise + HPF
// Reference: analog drum machine metallic character

SynthDef(\hat, { |out=0, freq=8000, amp=0.5, dur=0.1, pan=0, openness=0, tone=0.5|
    var sig, env, decayTime, metal, noise;

    decayTime = dur * (1 + (openness * 5));

    // Metallic: 6 square waves at inharmonic ratios (808 method)
    metal = Mix.ar([
        Pulse.ar(263.5, 0.5),
        Pulse.ar(400, 0.5),
        Pulse.ar(421, 0.5),
        Pulse.ar(474, 0.5),
        Pulse.ar(587, 0.5),
        Pulse.ar(845, 0.5),
    ]) / 6;

    // HPF for brightness
    metal = HPF.ar(metal, 4000 + (tone * 4000));
    metal = BPF.ar(metal, freq.clip(4000, 18000), 0.8) * 2;

    // Minimal noise layer
    noise = HPF.ar(WhiteNoise.ar, 7000) * 0.15;

    sig = metal + noise;

    // Gentle
    sig = (sig * 1.0).tanh;

    env = EnvGen.kr(Env.perc(0.001, decayTime, curve: -6), doneAction: 2);
    sig = sig * env * amp;

    sig = Pan2.ar(sig, pan);
    Out.ar(out, sig);
}).add;
