// fm_lead — 2-operator FM lead
// Phase 2 US-2. Core SC only (no FM7).

SynthDef(\fm_lead, { |out=0, freq=440, amp=0.5, dur=0.5, pan=0,
    mRatio=2, cRatio=1, index=3, iScale=5,
    vibrato=0.3, drive=0.2|

    var car, mod, env, iEnv, vib;

    // Modulation index envelope (bright attack → mellow sustain)
    iEnv = EnvGen.kr(
        Env.new([index, index * iScale, index], [0.01, dur * 0.8], [4, -4])
    );

    // Vibrato
    vib = SinOsc.kr(5) * vibrato * freq * 0.02;

    // Modulator → Carrier
    mod = SinOsc.ar((freq + vib) * mRatio, mul: (freq + vib) * mRatio * iEnv);
    car = SinOsc.ar((freq + vib) * cRatio + mod);

    // Drive (.tanh soft clipping)
    car = (car * (1 + (drive * 3))).tanh;

    // Amplitude envelope
    env = EnvGen.kr(Env.perc(0.01, dur), doneAction: 2);
    car = car * env * amp;

    car = Pan2.ar(car, pan);
    Out.ar(out, car);
}).add;
