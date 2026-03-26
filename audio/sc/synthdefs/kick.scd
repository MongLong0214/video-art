// Kick SynthDef — sine wave + pitch envelope + optional distortion
// Params: freq, amp, dur, pan, drive, click, decay

SynthDef(\kick, { |out=0, freq=50, amp=0.8, dur=0.5, pan=0, drive=0, click=1, decay=0.3|
	var sig, env, pitchEnv, clickEnv;

	// Pitch envelope: click frequency → base frequency
	pitchEnv = EnvGen.kr(Env.perc(0.001, 0.05), doneAction: 0) * click * 200;
	sig = SinOsc.ar(freq + pitchEnv);

	// Optional distortion
	sig = if(drive > 0,
		(sig * (1 + (drive * 4))).tanh,
		sig
	);

	// Amplitude envelope
	env = EnvGen.kr(Env.perc(0.001, decay), doneAction: 2);
	sig = sig * env * amp;

	// Pan
	sig = Pan2.ar(sig, pan);

	Out.ar(out, sig);
}).add;
