// Clap SynthDef — noise bursts + short reverb + amp envelope
// Params: freq, amp, dur, pan, spread, decay

SynthDef(\clap, { |out=0, freq=1200, amp=0.6, dur=0.2, pan=0, spread=0.5, decay=0.15|
	var sig, env, burstEnv;

	// Multiple noise bursts for clap character
	burstEnv = Env.new(
		[0, 1, 0, 0.7, 0, 0.5, 0],
		[0.001, 0.003, 0.001, 0.003, 0.001, decay],
		\lin
	);

	sig = WhiteNoise.ar;
	sig = BPF.ar(sig, freq.clip(200, 16000), 0.5);

	env = EnvGen.kr(burstEnv, doneAction: 2);
	sig = sig * env * amp;

	// Short reverb for spread
	sig = sig + (FreeVerb.ar(sig, spread, 0.3, 0.2) * 0.3);

	sig = Pan2.ar(sig, pan);
	Out.ar(out, sig);
}).add;
