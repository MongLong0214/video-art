// Techno Master — combines all patterns + filter/delay automation

// Filter cutoff automation (macro) — sweeps over 4 bars
Pdef(\technoFilter,
	Pbind(
		\type, \set,
		\id, Pn(Pfunc({ ~technoFilterBus.value }), inf),
		\cutoff, Pseg([400, 4000, 400], [4, 4], \exp, inf),
		\dur, 0.25
	)
);

// Delay feedback automation
Pdef(\technoDelay,
	Pbind(
		\type, \set,
		\id, Pn(Pfunc({ ~technoDelayBus.value }), inf),
		\feedback, Pseg([0.1, 0.6, 0.1], [8, 8], \sin, inf),
		\dur, 0.5
	)
);

// Master pattern — parallel combination
Pdef(\technoMaster,
	Ppar([
		Pdef(\technoKick),
		Pdef(\technoHat),
		Pdef(\technoClap),
	])
);

"Techno master pattern loaded.".postln;
