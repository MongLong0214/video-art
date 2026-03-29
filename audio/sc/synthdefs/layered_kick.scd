// layered_kick — heavy techno kick (Drumcode/Mord weight)
// Deep sub sweep + saturated body + sharp click + long tail

SynthDef(\layered_kick, { |out=0, freq=50, amp=0.8, dur=0.5, pan=0,
    subDecay=0.4, bodyDecay=0.1, clickAmp=0.6,
    bodyFreq=200, drive=0, punch=0.5|

    var sub, body, click, sig, pitchEnv, subEnv;

    // Sub: deep sweep 180→48Hz with LONG tail
    pitchEnv = EnvGen.kr(
        Env.new([freq * 3.6, freq * 1.5, freq, freq * 0.96],
                [0.008, 0.04, subDecay + 0.3],
                [-6, -3, -2])
    );
    sub = SinOsc.ar(pitchEnv);
    // 2nd harmonic for weight
    sub = sub + (SinOsc.ar(pitchEnv * 2, 0, 0.25));
    // Sub envelope — long sustain for techno thump
    subEnv = EnvGen.kr(Env.new([0, 1, 0.8, 0], [0.001, subDecay * 0.3, subDecay + 0.25], [0, -2, -4]));
    sub = sub * subEnv;

    // Body: mid-range punch (100-300Hz)
    body = SinOsc.ar(bodyFreq * 0.7) + (SinOsc.ar(bodyFreq * 1.3) * 0.4);
    body = (body * 4).fold(-1, 1); // wavefold distortion
    body = LPF.ar(body, 400);
    body = body * EnvGen.kr(Env.perc(0.001, bodyDecay + 0.03, level: 0.5, curve: -6));

    // Click: ultra-sharp transient for attack
    click = Impulse.ar(0) + HPF.ar(WhiteNoise.ar, 2500);
    click = click * clickAmp * EnvGen.kr(Env.perc(0.0001, 0.006));

    sig = (sub * 0.65) + (body * 0.25) + (click * 0.1);

    // Punch compression
    sig = sig * (1 + (punch * EnvGen.kr(Env.perc(0.0003, 0.02)) * 5));

    // Warm saturation (not harsh)
    sig = (sig * (1 + (drive * 3))).tanh;

    // HPF to remove DC offset
    sig = HPF.ar(sig, 25);

    sig = sig * amp * 1.2;
    DetectSilence.ar(sig, 0.001, 0.1, doneAction: 2);
    sig = Pan2.ar(sig, pan);
    Out.ar(out, sig);
}).add;
