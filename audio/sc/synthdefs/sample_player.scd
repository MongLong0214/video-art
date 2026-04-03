// sample_player — backward-compatible v2 playback contract
// buf=-1 sentinel keeps old silent behavior.
// Mono input assumed (sample_extract.py outputs mono WAV).
// v2 adds: loopMode, xfade, sustainLevel, rateLag, legato, slide, slideTime.

SynthDef(\sample_player, { |out=0, buf=(-1), amp=0.8, dur=1, pan=0,
    rate=1.0, startPos=0, attack=0.005, release=0.05,
    hpFreq=20, lpFreq=20000,
    loopMode=0, xfade=0.01, sustainLevel=1.0,
    rateLag=0.0, legato=0, slide=0, slideTime=0.05|

    var sig, env, frames, playing, loopFlag, playRate;
    var attackTime, releaseTime, sustainDur, sustainAmp, xfadeTime;

    // buf sentinel: -1 = no buffer assigned → silent
    playing = (buf >= 0);
    frames = BufFrames.kr(buf.max(0));
    loopFlag = loopMode > 0;

    // Rate changes can glide for phrase playback; legacy behavior remains when slide/rateLag = 0.
    playRate = Lag.kr(rate, rateLag.max(slide * slideTime));

    // PlayBuf (mono input)
    sig = PlayBuf.ar(
        1,
        buf.max(0),
        BufRateScale.kr(buf.max(0)) * playRate,
        startPos: startPos * frames,
        loop: loopFlag,
        doneAction: 0
    );

    // HP/LP filter for isolation
    sig = HPF.ar(sig, hpFreq);
    sig = LPF.ar(sig, lpFreq);

    // v2 envelope semantics:
    // - legato softens the attack/release shape for overlapped phrases
    // - sustainLevel allows held notes below full amplitude
    // - xfade guarantees a short crossfade-style plateau before release
    attackTime = Select.kr(legato > 0, [attack, attack.min(0.001)]);
    releaseTime = release.max(xfade);
    sustainDur = (dur - attackTime - releaseTime).max(0);
    sustainAmp = Select.kr(legato > 0, [sustainLevel.clip(0, 1), sustainLevel.max(0.95).clip(0, 1)]);
    xfadeTime = xfade.max(0.001).min(sustainDur);

    env = EnvGen.kr(
        Env.new(
            [0, 1, sustainAmp, sustainAmp, 0],
            [attackTime, xfadeTime, (sustainDur - xfadeTime).max(0), releaseTime],
            [-4, -2, 0, -4]
        ),
        doneAction: 2
    );

    sig = sig * env * amp * playing;
    sig = Pan2.ar(sig, pan);
    Out.ar(out, sig);
}).add;
