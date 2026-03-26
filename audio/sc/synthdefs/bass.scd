// Bass SynthDef — sawtooth + LP filter + amp envelope
// Params: freq, amp, dur, pan, cutoff, resonance, envAmount

SynthDef(\bass, { |out=0, freq=55, amp=0.7, dur=0.3, pan=0, cutoff=800, resonance=0.3, envAmount=0.5|
	var sig, env, filterEnv;

	sig = Saw.ar(freq);

	// Filter envelope
	filterEnv = EnvGen.kr(Env.perc(0.01, dur * 0.8)) * envAmount * cutoff;
	sig = RLPF.ar(sig, (cutoff + filterEnv).clip(20, 20000), resonance.clip(0.01, 1));

	// Amplitude envelope
	env = EnvGen.kr(Env.perc(0.005, dur), doneAction: 2);
	sig = sig * env * amp;

	sig = Pan2.ar(sig, pan);
	Out.ar(out, sig);
}).add;
