// Trance Layers — 6 independent layers with Bus routing

// Layer definitions: sub_bass, rolling_bass, arp, pad, lead, riser
~tranceLayers = (
	sub_bass: { |rootMidi, chords, bpm|
		Pbind(
			\instrument, \bass,
			\dur, 1,
			\midinote, Pseq(chords.collect { |c| c[0] - 12 }, inf), // root -1 oct
			\amp, 0.7,
			\cutoff, 200,
			\resonance, 0.2,
			\envAmount, 0.3
		)
	},
	rolling_bass: { |rootMidi, chords, bpm|
		Pbind(
			\instrument, \bass,
			\dur, 0.25,
			\midinote, Pseq(chords.collect { |c| Pseq([c[0], c[0]-12, c[0], c[0]+12], 1) }.flatten, inf),
			\amp, 0.5,
			\cutoff, Pseg([400, 1200, 400], [4, 4], \exp, inf),
			\resonance, 0.4,
			\envAmount, 0.6
		)
	},
	arp: { |rootMidi, chords, bpm|
		Pbind(
			\instrument, \arp_pluck,
			\dur, 0.125,
			\midinote, Pseq(chords.collect { |c|
				~arpeggiate.(c, \up, 2).collect { |n| if(n == \rest, \rest, n) }
			}.flatten, inf),
			\amp, 0.4,
			\decay, 0.08,
			\brightness, 0.8,
			\pan, Pwhite(-0.5, 0.5)
		)
	},
	pad: { |rootMidi, chords, bpm|
		Pbind(
			\instrument, \pad,
			\dur, 4,
			\midinote, Pseq(chords.collect { |c| c }, inf),
			\amp, 0.3,
			\attack, 1.5,
			\release, 1.5,
			\filterEnv, 0.4
		)
	},
	lead: { |rootMidi, chords, bpm|
		Pbind(
			\instrument, \lead,
			\dur, Pseq([0.5, 0.25, 0.25, 0.5, 0.5], inf),
			\midinote, Pseq(chords.collect { |c| c[2] + 12 }, inf), // 5th +1 oct
			\amp, 0.35,
			\vibrato, 0.3,
			\drive, 0.2
		)
	},
	riser: { |rootMidi, chords, bpm|
		Pbind(
			\instrument, \riser,
			\dur, 16, // one riser per 16 bars
			\freq, rootMidi.midicps / 2,
			\amp, 0.4,
			\sweepRange, 4000,
			\noiseAmount, 0.3
		)
	}
);

"Trance layers loaded.".postln;
