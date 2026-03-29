// LIVE TECHNO — Cmd+Enter로 블록 실행, 수정 후 다시 Cmd+Enter

// === STEP 1: 부팅 (Cmd+Enter) ===
(
s.options.numBuffers = 1024 * 64;
s.options.memSize = 8192 * 16;
s.options.numOutputBusChannels = 2;

s.waitForBoot {
    var base = "/Users/isaac/projects/video-art";

    // Load SynthDefs
    ["layered_kick","hat","clap","acid_bass","pad","supersaw","squelch","sample_player","fm_lead"].do { |name|
        (base +/+ "audio/sc/synthdefs" +/+ name ++ ".scd").load;
    };

    // Load samples
    ~kick = Buffer.read(s, base +/+ "out/analysis/void-acid-carousel/samples/kick_001.wav");
    ~kick2 = Buffer.read(s, base +/+ "out/analysis/void-acid-carousel/samples/kick_004.wav");
    ~hat1 = Buffer.read(s, base +/+ "out/analysis/void-acid-carousel/samples/hat_001.wav");
    ~hat2 = Buffer.read(s, base +/+ "out/analysis/void-acid-carousel/samples/hat_004.wav");
    ~bass1 = Buffer.read(s, base +/+ "out/analysis/void-acid-carousel/samples/bass_001.wav");

    s.sync;
    TempoClock.default.tempo = 140/60;
    "=== READY ===".postln;
};
)

// === STEP 2: 킥 (Cmd+Enter) ===
(
Pdef(\kick,
    Pbind(
        \instrument, \sample_player,
        \buf, Pseq([~kick, ~kick2], inf),
        \dur, 1,
        \amp, 0.6,
        \rate, 0.85,
        \lpFreq, 5000,
        \hpFreq, 20,
    )
).play(quant: 4);
)

// === 햇 (Cmd+Enter) ===
(
Pdef(\hat,
    Pbind(
        \instrument, \sample_player,
        \buf, Pseq([~hat1, ~hat2], inf),
        \dur, 0.25,
        \amp, Pseq([0.08, 0.12, 0.2, 0.12], inf),
        \rate, 1.0,
        \hpFreq, 5000,
        \lpFreq, 12000,
    )
).play(quant: 4);
)

// === 베이스 (Cmd+Enter) ===
(
Pdef(\bass,
    Pbind(
        \instrument, \sample_player,
        \buf, ~bass1,
        \dur, 0.5,
        \amp, Pseq([0, 0.5], inf),
        \rate, 1.0,
        \hpFreq, 25,
        \lpFreq, 200,
    )
).play(quant: 4);
)

// === 다크 패드 (Cmd+Enter) ===
(
Pdef(\pad,
    Pbind(
        \instrument, \pad,
        \freq, 65,
        \dur, 4,
        \amp, 0.3,
        \attack, 1.5,
        \release, 1.0,
        \filterEnv, Pseg([0.03, 0.2, 0.03], [16, 16], \lin, inf),
    )
).play(quant: 4);
)

// === 슈퍼쏘 빌드 (Cmd+Enter) ===
(
Pdef(\saw,
    Pbind(
        \instrument, \supersaw,
        \freq, 65,
        \dur, 4,
        \amp, Pseg([0.0, 0.25, 0.0], [32, 32], \lin, inf),
        \detune, Pseg([0.2, 0.6, 0.2], [32, 32], \lin, inf),
        \cutoff, Pseg([300, 3000, 300], [32, 32], \exp, inf),
        \mix, 0.8,
    )
).play(quant: 4);
)

// === 정지 ===
// 개별: Pdef(\kick).stop;
// 전체: Cmd+.
