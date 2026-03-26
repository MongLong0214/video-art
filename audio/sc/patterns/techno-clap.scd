// Techno Clap Pdef — Bjorklund(3,8) with probability position shift

Pdef(\technoClap,
	Pbind(
		\instrument, \clap,
		\dur, 0.5, // 8th notes
		\amp, Pseq(~bjorklund.(3, 8).collect { |hit|
			if(hit == 1, { Prand([0.5, 0.6, 0.4], 1) }, { 0 })
		}, inf),
		\freq, 1200,
		\spread, 0.5,
		\decay, 0.15,
		\pan, Pwhite(-0.2, 0.2)
	)
);

"Techno clap pattern loaded.".postln;
