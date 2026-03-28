// wavetable_pad — VOsc 8-buffer morphing pad
// Phase 2 US-3. Buffer allocation via NRT Score (b_alloc + b_gen sine1).
// bufBase default=8 (0-7 SC reserved)

SynthDef(\wavetable_pad, { |out=0, freq=220, amp=0.4, dur=4, pan=0,
    morph=0.5, attack=1, release=1.5,
    filterCutoff=4000, filterRes=0.4, detune=0.005,
    bufBase=8|

    var sig, sig2, env, fenv, bufPos, sustainDur;

    // morph → buffer position (0-7 range from bufBase)
    bufPos = morph.linlin(0, 1, bufBase, bufBase + 7);

    // 2-voice detuned for stereo width
    sig = VOsc.ar(bufPos, freq);
    sig2 = VOsc.ar(bufPos, freq * (1 + detune));
    sig = [sig, sig2];

    // Filter
    fenv = EnvGen.kr(Env.new([200, filterCutoff, filterCutoff * 0.5],
        [attack, dur - attack]));
    sig = RLPF.ar(sig, fenv.clip(20, 20000), filterRes);

    // Amplitude envelope — guard against attack+release > dur
    sustainDur = (dur - attack - release).max(0);
    env = EnvGen.kr(
        Env.new([0, 1, 1, 0], [attack, sustainDur, release]),
        doneAction: 2
    );

    sig = sig * env * amp;
    Out.ar(out, sig);
}).add;
