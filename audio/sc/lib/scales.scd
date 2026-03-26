// Scale definitions + chord generation for trance sequencer

// Scale note classes (semitones from root)
~scaleMap = (
	major: [0, 2, 4, 5, 7, 9, 11],
	minor: [0, 2, 3, 5, 7, 8, 10],
	dorian: [0, 2, 3, 5, 7, 9, 10],
	phrygian: [0, 1, 3, 5, 7, 8, 10],
	mixolydian: [0, 2, 4, 5, 7, 9, 10]
);

// Root note MIDI mapping
~rootMap = (
	"C": 60, "Cm": 60, "C#": 61, "C#m": 61,
	"D": 62, "Dm": 62, "D#": 63, "D#m": 63,
	"E": 64, "Em": 64, "F": 65, "Fm": 65,
	"F#": 66, "F#m": 66, "G": 67, "Gm": 67,
	"G#": 68, "G#m": 68, "A": 69, "Am": 69,
	"A#": 70, "A#m": 70, "B": 71, "Bm": 71
);

// Get scale degrees as MIDI notes across octaves
~getScaleNotes = { |rootMidi, scaleName, octaves=2|
	var intervals = ~scaleMap[scaleName] ?? ~scaleMap[\minor];
	var notes = Array.new;
	octaves.do { |oct|
		intervals.do { |interval|
			notes = notes.add(rootMidi + interval + (oct * 12));
		};
	};
	notes;
};

// Check if a MIDI note belongs to a scale
~noteInScale = { |midi, rootMidi, scaleName|
	var intervals = ~scaleMap[scaleName] ?? ~scaleMap[\minor];
	var noteClass = (midi - rootMidi) % 12;
	intervals.includes(noteClass);
};

"Scales library loaded.".postln;
