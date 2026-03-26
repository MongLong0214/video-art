// Chord progression engine — diatonic chords from scale

// Generate diatonic triad from scale degree
~diatonicChord = { |rootMidi, scaleName, degree, octave=0|
	var scaleNotes = ~getScaleNotes.(rootMidi, scaleName, 3);
	var idx = degree - 1; // 1-indexed
	var chord = [
		scaleNotes[idx + (octave * 7)],
		scaleNotes[idx + 2 + (octave * 7)],
		scaleNotes[idx + 4 + (octave * 7)]
	];
	chord;
};

// Generate a chord progression (array of triads)
~chordProgression = { |rootMidi, scaleName, degrees, octave=0|
	degrees.collect { |deg|
		~diatonicChord.(rootMidi, scaleName, deg, octave);
	};
};

// Standard progressions
~progressions = (
	trance_am: [1, 6, 3, 7],   // Am F C G (in minor: i VI III VII)
	trance_4chord: [1, 5, 6, 4], // i v VI iv
	trance_epic: [1, 3, 4, 5, 6, 4, 5, 1], // 8-chord epic
);

"Chords library loaded.".postln;
