// Techno Kick Pdef — Bjorklund(4,16) with probability variation

Pdef(\technoKick,
	Pbind(
		\instrument, \kick,
		\dur, 0.25, // 16th notes
		\amp, Pseq(~bjorklund.(4, 16).collect { |hit|
			if(hit == 1, { Pwrand([0.8, 0.7, 0.9], [0.6, 0.3, 0.1], 1) }, { 0 })
		}, inf),
		\freq, 50,
		\drive, Pseg([0, 0.3, 0], [16, 16], \lin, inf), // slow drive automation
		\decay, 0.3,
		\click, 1,
		\pan, 0
	)
);

"Techno kick pattern loaded.".postln;
