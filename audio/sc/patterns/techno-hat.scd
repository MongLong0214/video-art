// Techno Hat Pdef — Bjorklund(7,16) with density variation

Pdef(\technoHat,
	Pbind(
		\instrument, \hat,
		\dur, 0.25,
		\amp, Pseq(~bjorklund.(7, 16).collect { |hit|
			if(hit == 1, { Pwrand([0.4, 0.3, 0.5], [0.5, 0.3, 0.2], 1) }, { 0 })
		}, inf),
		\freq, 8000,
		\openness, Pseg([0, 0.5, 0], [8, 8], \sin, inf), // density variation every 8 bars
		\tone, 0.5,
		\pan, Pwhite(-0.3, 0.3)
	)
);

"Techno hat pattern loaded.".postln;
