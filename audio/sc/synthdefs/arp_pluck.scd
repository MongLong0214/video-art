// Arp Pluck SynthDef — short pluck envelope
// Params: freq, amp, dur, pan, decay, brightness

SynthDef(\arp_pluck, { |out=0, freq=440, amp=0.5, dur=0.15, pan=0, decay=0.1, brightness=0.7|
	var sig, env;

	sig = Saw.ar(freq);

	// Brightness filter — fast decay envelope
	sig = RLPF.ar(sig,
		EnvGen.kr(Env.perc(0.001, decay)) * brightness * 8000 + 200,
		0.3
	);

	env = EnvGen.kr(Env.perc(0.001, decay), doneAction: 2);
	sig = sig * env * amp;

	sig = Pan2.ar(sig, pan);
	Out.ar(out, sig);
}).add;
