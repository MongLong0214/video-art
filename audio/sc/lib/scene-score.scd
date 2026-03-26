// SceneScore — energy-based section system
// Format: [{name, bars, layers, energy}]

// Energy → parameter mapping
~energyToParams = { |energy|
	(
		openness: energy.linlin(0, 1, 0.1, 0.9),
		brightness: energy.linlin(0, 1, 0.2, 1.0),
		distortion: energy.linlin(0, 1, 0, 0.5),
		filterCutoff: energy.linexp(0, 1, 200, 8000),
		reverbSize: energy.linlin(0, 1, 0.6, 0.2),
		amp: energy.linlin(0, 1, 0.3, 0.9)
	);
};

// Determine active layers based on energy
~energyToLayers = { |energy|
	var active = Array.new;
	if(energy > 0.0, { active = active.add(\sub_bass) });
	if(energy >= 0.2, { active = active.add(\pad) });
	if(energy >= 0.4, { active = active.add(\rolling_bass) });
	if(energy >= 0.5, { active = active.add(\arp) });
	if(energy >= 0.7, { active = active.add(\lead) });
	if(energy >= 0.8, { active = active.add(\riser) });
	active;
};

// Build NRT score from SceneScore sections
~buildSceneNRT = { |sections, bpm, rootMidi=69, scaleName=\minor|
	var score = Array.new;
	var currentTime = 0;
	var barDur = 4 * 60 / bpm;
	var chordDegrees = [1, 6, 3, 7];
	var chords = ~chordProgression.(rootMidi, scaleName, chordDegrees, 0);

	sections.do { |section|
		var sectionDur = section[\bars] * barDur;
		var energy = section[\energy];
		var params = ~energyToParams.(energy);
		var activeLayers = ~energyToLayers.(energy);

		// Add kick on every beat if energy > 0.3
		if(energy > 0.3, {
			(section[\bars] * 4).do { |beat|
				var time = currentTime + (beat * (60 / bpm));
				score = score.add([time, [\s_new, \kick, -1, 0, 0,
					\freq, 50, \amp, params[\amp] * 0.8,
					\drive, params[\distortion], \decay, 0.3]]);
			};
		});

		// Add hat if energy > 0.4
		if(energy > 0.4, {
			(section[\bars] * 8).do { |eighth|
				var time = currentTime + (eighth * (30 / bpm));
				if(eighth % 2 == 1, {
					score = score.add([time, [\s_new, \hat, -1, 0, 0,
						\amp, params[\amp] * 0.4,
						\openness, params[\openness], \dur, 0.05]]);
				});
			};
		});

		// Add bass notes
		if(activeLayers.includes(\sub_bass), {
			(section[\bars]).do { |bar|
				var time = currentTime + (bar * barDur);
				var chordIdx = bar % chords.size;
				score = score.add([time, [\s_new, \bass, -1, 0, 0,
					\freq, chords[chordIdx][0].midicps / 2,
					\amp, params[\amp] * 0.5,
					\cutoff, params[\filterCutoff],
					\dur, barDur * 0.9]]);
			};
		});

		// Add pad if active
		if(activeLayers.includes(\pad), {
			(section[\bars] / 4).ceil.asInteger.do { |chunk|
				var time = currentTime + (chunk * 4 * barDur);
				var chord = chords[chunk % chords.size];
				chord.do { |note, i|
					score = score.add([time, [\s_new, \pad, -1, 0, 0,
						\freq, note.midicps,
						\amp, params[\amp] * 0.25,
						\dur, 4 * barDur.min(sectionDur - (chunk * 4 * barDur)),
						\attack, 1.5, \release, 1.5,
						\filterEnv, params[\openness]]]);
				};
			};
		});

		// Add arp if active
		if(activeLayers.includes(\arp), {
			(section[\bars] * 4).do { |beat|
				var time = currentTime + (beat * (60 / bpm));
				var chordIdx = (beat / 4).floor.asInteger % chords.size;
				var note = chords[chordIdx].wrapAt(beat);
				score = score.add([time, [\s_new, \arp_pluck, -1, 0, 0,
					\freq, (note + 12).midicps,
					\amp, params[\amp] * 0.3,
					\decay, 0.08, \brightness, params[\brightness]]]);
			};
		});

		currentTime = currentTime + sectionDur;
	};

	// End marker
	score = score.add([currentTime, [\c_set, 0, 0]]);
	score = score.sort { |a, b| a[0] <= b[0] };
	score;
};

"SceneScore library loaded.".postln;
