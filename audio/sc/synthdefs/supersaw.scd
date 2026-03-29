// supersaw — heavy techno stab/lead
// Thick detuned saws + sub layer + aggressive filter + saturation

SynthDef(\supersaw, { |out=0, freq=440, amp=0.5, dur=1, pan=0, detune=0.3, mix=0.7, cutoff=4000|
    var sig, env, voices, sub, lfo;

    // 7 wide-detuned saws
    voices = Array.fill(7, { |i|
        var dt = (i - 3) * detune * 0.015; // wider detune
        Saw.ar(freq * (1 + dt));
    });
    sig = Mix.ar(voices) / 3.5;

    // Sub octave for weight
    sub = Saw.ar(freq * 0.5) * 0.3;
    sub = LPF.ar(sub, 200);

    // LFO filter movement
    lfo = SinOsc.kr(0.3) * 800;

    // Aggressive resonant filter
    sig = RLPF.ar(sig, (cutoff + lfo).clip(80, 18000), 0.25);

    sig = sig + sub;

    // Warm saturation (not harsh)
    sig = (sig * 1.3).tanh;

    env = EnvGen.kr(Env.linen(0.003, dur - 0.103, 0.1), doneAction: 2);
    sig = sig * env * amp;

    sig = Pan2.ar(sig, pan);
    Out.ar(out, sig);
}).add;
