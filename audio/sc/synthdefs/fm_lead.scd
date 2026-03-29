// fm_lead — dark FM lead for techno
// 2-op FM + sub layer + distortion

SynthDef(\fm_lead, { |out=0, freq=440, amp=0.5, dur=0.5, pan=0,
    mRatio=2, cRatio=1, index=3, iScale=5,
    vibrato=0.3, drive=0.2|

    var car, mod, env, iEnv, vib, sub;

    // FM index envelope
    iEnv = EnvGen.kr(
        Env.new([index * iScale, index * 2, index], [0.01, dur * 0.6], [2, -4])
    );

    vib = SinOsc.kr(4.5) * vibrato * freq * 0.015;

    // Modulator → Carrier
    mod = SinOsc.ar((freq + vib) * mRatio, mul: (freq + vib) * mRatio * iEnv);
    car = SinOsc.ar((freq + vib) * cRatio + mod);

    // Sub layer for weight
    sub = SinOsc.ar(freq * 0.5) * 0.3;

    car = car + sub;

    // Aggressive drive
    car = (car * (1 + (drive * 6))).tanh;

    // Dark filter
    car = LPF.ar(car, 3000 + (drive * 2000));

    env = EnvGen.kr(Env.perc(0.005, dur, curve: -4), doneAction: 2);
    car = car * env * amp;

    car = Pan2.ar(car, pan);
    Out.ar(out, car);
}).add;
