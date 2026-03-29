// pad — dark heavy techno pad
// Thick detuned saws + sub pulse + dark filter + saturation

SynthDef(\pad, { |out=0, freq=220, amp=0.4, dur=4, pan=0, attack=1, release=1.5, filterEnv=0.5|
    var sig, env, fenv, lfo;

    // 4 detuned oscillators for thickness
    sig = Mix.ar([
        Saw.ar(freq * 0.997),
        Saw.ar(freq * 1.003),
        Saw.ar(freq * 0.5 * 1.001) * 0.7,  // sub octave
        Pulse.ar(freq * 0.5, 0.3) * 0.5,    // sub pulse for weight
    ]) / 2;

    // Dual LFO for organic movement
    lfo = SinOsc.kr(0.12) * 400 + SinOsc.kr(0.19) * 250;

    // Dark filter sweep — stays low
    fenv = EnvGen.kr(Env.new(
        [80, 80 + (filterEnv * 2500), 120],
        [attack * 0.5, dur - (attack * 0.5)]
    ));
    sig = RLPF.ar(sig, (fenv + lfo).clip(40, 8000), 0.3);

    // Gentle warmth
    sig = (sig * 1.1).tanh;

    // Subtle chorus
    sig = sig + DelayC.ar(sig, 0.03, SinOsc.kr(0.6, 0, 0.004, 0.012)) * 0.6;

    env = EnvGen.kr(Env.new([0, 1, 1, 0], [attack, dur - attack - release, release]), doneAction: 2);
    sig = sig * env * amp;

    sig = Pan2.ar(sig, pan);
    Out.ar(out, sig);
}).add;
