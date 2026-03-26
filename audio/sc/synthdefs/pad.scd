// Pad SynthDef — slow attack + LP sweep
// Params: freq, amp, dur, pan, attack, release, filterEnv

SynthDef(\pad, { |out=0, freq=220, amp=0.4, dur=4, pan=0, attack=1, release=1.5, filterEnv=0.5|
	var sig, env, fenv;

	sig = Mix.ar([
		Saw.ar(freq),
		Pulse.ar(freq * 1.002, 0.5) * 0.5,
	]);

	// Filter envelope — slow sweep
	fenv = EnvGen.kr(Env.new([200, 200 + (filterEnv * 3000), 400], [attack, dur - attack]));
	sig = RLPF.ar(sig, fenv.clip(20, 20000), 0.4);

	// Slow attack envelope
	env = EnvGen.kr(Env.new([0, 1, 1, 0], [attack, dur - attack - release, release]), doneAction: 2);
	sig = sig * env * amp;

	sig = Pan2.ar(sig, pan);
	Out.ar(out, sig);
}).add;
