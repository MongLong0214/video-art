// Trance Master — complete trance sequencer with structure

~buildTranceScore = { |rootMidi=69, scaleName=\minor, bpm=138, bars=32|
	var chordDegrees = ~progressions[\trance_am]; // [1, 6, 3, 7]
	var chords = ~chordProgression.(rootMidi, scaleName, chordDegrees, 0);
	var barDur = 4 * 60 / bpm;
	var totalDur = bars * barDur;

	// Build Ppar from active layers
	var layerPatterns = [\sub_bass, \rolling_bass, \arp, \pad, \lead].collect { |name|
		var builder = ~tranceLayers[name];
		if(builder.notNil, {
			builder.(rootMidi, chords, bpm);
		}, { nil });
	}.reject(_.isNil);

	Pfindur(totalDur, Ppar(layerPatterns));
};

"Trance master loaded.".postln;
