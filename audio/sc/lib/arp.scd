// Arpeggiator — generates note sequences from chords

// Arpeggiate a chord with direction and octave span
~arpeggiate = { |chord, direction=\up, octaveSpan=1, gate=nil|
	var notes = Array.new;
	var result;

	// Expand chord across octave span
	octaveSpan.clip(1, 3).do { |oct|
		chord.do { |note|
			notes = notes.add(note + (oct * 12));
		};
	};

	// Apply direction
	result = switch(direction,
		\up, { notes.sort },
		\down, { notes.sort.reverse },
		\random, { notes.scramble },
		{ notes.sort } // default: up
	);

	// Apply gate pattern (array of 1s and 0s)
	if(gate.notNil, {
		result = result.collect { |note, i|
			if(gate.wrapAt(i) == 1, { note }, { \rest });
		};
	});

	result;
};

"Arp library loaded.".postln;
