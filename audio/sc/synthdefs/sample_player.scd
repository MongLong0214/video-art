// sample_player — PlayBuf one-shot sample playback
// Phase 2 US-11. buf=-1 sentinel (silent when no buffer assigned).
// Mono input assumed (sample_extract.py outputs mono WAV).

SynthDef(\sample_player, { |out=0, buf=(-1), amp=0.8, dur=1, pan=0,
    rate=1.0, startPos=0, attack=0.005, release=0.05,
    hpFreq=20, lpFreq=20000|

    var sig, env, frames, playing;

    // buf sentinel: -1 = no buffer assigned → silent
    playing = (buf >= 0);
    frames = BufFrames.kr(buf.max(0));

    // PlayBuf (mono input)
    sig = PlayBuf.ar(1, buf.max(0),
        BufRateScale.kr(buf.max(0)) * rate,
        startPos: startPos * frames,
        doneAction: 0
    );

    // HP/LP filter for isolation
    sig = HPF.ar(sig, hpFreq);
    sig = LPF.ar(sig, lpFreq);

    // Amplitude envelope
    env = EnvGen.kr(
        Env.new([0, 1, 1, 0], [attack, (dur - attack - release).max(0), release]),
        doneAction: 2
    );

    sig = sig * env * amp * playing;
    sig = Pan2.ar(sig, pan);
    Out.ar(out, sig);
}).add;
