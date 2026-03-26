// Hi-hat SynthDef — noise + bandpass filter + short decay
// Params: freq, amp, dur, pan, openness, tone

SynthDef(\hat, { |out=0, freq=8000, amp=0.5, dur=0.1, pan=0, openness=0, tone=0.5|
	var sig, env, decayTime;

	// Openness controls decay: 0=closed(short), 1=open(long)
	decayTime = dur * (1 + (openness * 4));

	sig = WhiteNoise.ar;
	sig = BPF.ar(sig, freq.clip(200, 18000), tone.clip(0.1, 1));

	// High-frequency shimmer
	sig = sig + (BPF.ar(WhiteNoise.ar, 12000, 0.3) * 0.3);

	env = EnvGen.kr(Env.perc(0.001, decayTime), doneAction: 2);
	sig = sig * env * amp;

	sig = Pan2.ar(sig, pan);
	Out.ar(out, sig);
}).add;
