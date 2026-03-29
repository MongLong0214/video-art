// clap — tight techno clap (909 inspired, modern processing)
// Snappy transient + mid-range body + no reverb tail

SynthDef(\clap, { |out=0, freq=1200, amp=0.6, dur=0.2, pan=0, spread=0.5, decay=0.15|
    var sig, noise, burst, tail;

    noise = WhiteNoise.ar;

    // Double burst (snappier than triple)
    burst = noise * EnvGen.kr(Env.perc(0.0001, 0.005)) +
            (noise * EnvGen.kr(Env.new([0, 0, 1, 0], [0.015, 0.0001, 0.005])));

    // Tail: filtered noise body
    tail = noise * EnvGen.kr(Env.new([0, 0, 0.7, 0], [0.025, 0.001, decay * 0.8], [-5]));

    sig = burst + tail;

    // Tight bandpass: 800-3000Hz (techno clap sweet spot)
    sig = BPF.ar(sig, freq.clip(600, 4000), 0.4) * 4;

    // Add some 200Hz body thump
    sig = sig + (BPF.ar(noise * EnvGen.kr(Env.perc(0.001, 0.04)), 200, 0.3) * 0.8);

    // Hard clip for punch
    sig = (sig * 2.5).clip(-1, 1);

    // Minimal room (very dry)
    sig = sig + (FreeVerb.ar(sig, 0.15, 0.08, 0.5) * spread * 0.15);

    sig = sig * amp;
    DetectSilence.ar(sig, 0.001, 0.05, doneAction: 2);
    sig = Pan2.ar(sig, pan);
    Out.ar(out, sig);
}).add;
