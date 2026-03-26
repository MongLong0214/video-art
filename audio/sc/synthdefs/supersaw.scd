// Supersaw SynthDef — 7-voice detuned saw + LP filter
// Params: freq, amp, dur, pan, detune, mix, cutoff

SynthDef(\supersaw, { |out=0, freq=440, amp=0.5, dur=1, pan=0, detune=0.3, mix=0.7, cutoff=4000|
	var sig, env, voices;

	// 7 detuned sawtooth oscillators
	voices = Array.fill(7, { |i|
		var dt = (i - 3) * detune;
		Saw.ar(freq * (1 + (dt * 0.01)));
	});

	sig = Mix.ar(voices) / 7;

	// LP filter
	sig = RLPF.ar(sig, cutoff.clip(20, 20000), 0.5);

	// Mix with dry
	sig = (sig * mix) + (Saw.ar(freq) * (1 - mix));

	env = EnvGen.kr(Env.asr(0.01, 1, 0.1), gate: 1, doneAction: 0);
	env = env * EnvGen.kr(Env.linen(0.01, dur - 0.11, 0.1), doneAction: 2);
	sig = sig * env * amp;

	sig = Pan2.ar(sig, pan);
	Out.ar(out, sig);
}).add;
