// granular_pad — GrainBuf texture/ambience
// Phase 2 US-4. Mono GrainBuf → Pan2 (bus architecture consistency).

SynthDef(\granular_pad, { |out=0, freq=220, amp=0.4, dur=4, pan=0,
    buf=0, density=8, grainDur=0.1, rate=1.0,
    posRand=0.5, panWidth=0.5|

    var sig, env, trig, pos;

    // Grain trigger
    trig = Impulse.kr(density);

    // Random position within buffer
    pos = TRand.kr(0.1, 0.9, trig) * posRand + ((1 - posRand) * 0.5);

    // Granular synthesis (mono → Pan2 for bus consistency)
    sig = GrainBuf.ar(1, trig, grainDur, buf,
        rate + LFNoise1.kr(4).range(-0.05, 0.05),
        pos,
        2,
        envbufnum: -1
    );

    // Amplitude envelope
    env = EnvGen.kr(
        Env.new([0, 1, 1, 0], [dur * 0.2, dur * 0.6, dur * 0.2]),
        doneAction: 2
    );

    sig = sig * env * amp;
    sig = LeakDC.ar(sig);
    sig = Pan2.ar(sig, pan);
    Out.ar(out, sig);
}).add;
