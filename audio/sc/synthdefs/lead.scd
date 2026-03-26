// Lead SynthDef — single saw/square + vibrato + drive
// Params: freq, amp, dur, pan, vibrato, portamento, drive

SynthDef(\lead, { |out=0, freq=440, amp=0.5, dur=0.5, pan=0, vibrato=0.3, portamento=0, drive=0.2|
	var sig, env, vib, freqMod;

	// Vibrato
	vib = SinOsc.kr(5) * vibrato * freq * 0.02;
	freqMod = freq + vib;

	sig = Mix.ar([
		Saw.ar(freqMod),
		Pulse.ar(freqMod * 0.999, 0.4) * 0.5,
	]);

	// Drive
	sig = (sig * (1 + (drive * 3))).tanh;

	env = EnvGen.kr(Env.perc(0.01, dur), doneAction: 2);
	sig = sig * env * amp;

	sig = Pan2.ar(sig, pan);
	Out.ar(out, sig);
}).add;
