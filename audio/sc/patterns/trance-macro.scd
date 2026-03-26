// Trance Macro Automation — filter/reverb/width over 32 bars

~tranceMacro = { |bars=32, bpm=138|
	var barDur = 4 * 60 / bpm; // seconds per bar
	var totalDur = bars * barDur;

	(
		filterOpen: Env.new(
			[0.2, 0.5, 0.9, 0.3, 0.8],
			[totalDur * 0.25, totalDur * 0.25, totalDur * 0.25, totalDur * 0.25],
			\sin
		),
		reverbSize: Env.new(
			[0.3, 0.6, 0.2, 0.8, 0.4],
			[totalDur * 0.25, totalDur * 0.25, totalDur * 0.25, totalDur * 0.25],
			\lin
		),
		stereoWidth: Env.new(
			[0.3, 0.7, 0.5, 0.9, 0.5],
			[totalDur * 0.25, totalDur * 0.25, totalDur * 0.25, totalDur * 0.25],
			\sin
		)
	);
};

"Trance macro automation loaded.".postln;
