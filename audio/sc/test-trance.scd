// T6 Trance Sequencer Tests — chords, arp, layers, NRT

(
var errors = 0;
var libDir = PathName(thisProcess.nowExecutingPath).pathOnly +/+ "lib/";
var synthDefDir = PathName(thisProcess.nowExecutingPath).pathOnly +/+ "synthdefs/";
var patternDir = PathName(thisProcess.nowExecutingPath).pathOnly +/+ "patterns/";
var renderDir = PathName(thisProcess.nowExecutingPath).pathOnly ++ "../render/test-output/";
var scsynth = "/Applications/SuperCollider.app/Contents/Resources/scsynth";

"=== T6 Trance Sequencer Tests ===".postln;
File.mkdir(renderDir);

// Load libs
(libDir +/+ "scales.scd").load;
(libDir +/+ "chords.scd").load;
(libDir +/+ "arp.scd").load;
(libDir +/+ "bjorklund.scd").load;

// Test 1: Chord gen Am scale — all notes in scale
(
	var rootMidi = 69; // A
	var chords = ~chordProgression.(rootMidi, \minor, [1, 6, 3, 7], 0);
	var allNotes = chords.flatten;
	var allInScale = allNotes.every { |midi| ~noteInScale.(midi, rootMidi, \minor) };

	if(allInScale, {
		"TEST 1 PASS: Am chord progression — all notes in scale".postln;
	}, {
		var outOfScale = allNotes.reject { |m| ~noteInScale.(m, rootMidi, \minor) };
		("TEST 1 FAIL: notes out of scale: " ++ outOfScale).postln;
		errors = errors + 1;
	});
);

// Test 2a: Arp direction up
(
	var chord = [60, 64, 67]; // C E G
	var result = ~arpeggiate.(chord, \up, 1);
	if(result == [60, 64, 67], {
		"TEST 2a PASS: arp up".postln;
	}, {
		("TEST 2a FAIL: got " ++ result).postln;
		errors = errors + 1;
	});
);

// Test 2b: Arp direction down
(
	var chord = [60, 64, 67];
	var result = ~arpeggiate.(chord, \down, 1);
	if(result == [67, 64, 60], {
		"TEST 2b PASS: arp down".postln;
	}, {
		("TEST 2b FAIL: got " ++ result).postln;
		errors = errors + 1;
	});
);

// Test 2c: Arp direction random — same elements different order possible
(
	var chord = [60, 64, 67];
	var result = ~arpeggiate.(chord, \random, 1);
	if(result.sort == [60, 64, 67], {
		"TEST 2c PASS: arp random — correct elements".postln;
	}, {
		("TEST 2c FAIL: got " ++ result).postln;
		errors = errors + 1;
	});
);

// Test 2d: Arp octave span 3
(
	var chord = [60, 64, 67];
	var result = ~arpeggiate.(chord, \up, 3);
	if(result.size == 9 && result.last == (67 + 24), {
		"TEST 2d PASS: arp octave span 3 — 9 notes".postln;
	}, {
		("TEST 2d FAIL: size=" ++ result.size ++ " last=" ++ result.last).postln;
		errors = errors + 1;
	});
);

// Test 2e: Arp gate pattern
(
	var chord = [60, 64, 67];
	var gate = [1, 0, 1];
	var result = ~arpeggiate.(chord, \up, 1, gate);
	var hasRest = result.includes(\rest);
	if(hasRest, {
		"TEST 2e PASS: arp gate — contains rests".postln;
	}, {
		("TEST 2e FAIL: no rests in " ++ result).postln;
		errors = errors + 1;
	});
);

// Load SynthDefs
PathName(synthDefDir).files.do { |f|
	if(f.extension == "scd", { f.fullPath.load });
};
[\kick, \bass, \hat, \clap, \supersaw, \pad, \lead, \arp_pluck, \riser].do { |n|
	SynthDescLib.global.synthDescs[n].def.writeDefFile;
};

// Load trance patterns
(patternDir +/+ "trance-layers.scd").load;
(patternDir +/+ "trance-macro.scd").load;
(patternDir +/+ "trance-master.scd").load;

// Test 6: 32-bar trance NRT render
(
	var bpm = 138, bars = 32;
	var barDur = 4 * 60 / bpm;
	var totalDur = bars * barDur;
	var rootMidi = 69; // Am
	var chords = ~chordProgression.(rootMidi, \minor, [1, 6, 3, 7], 0);
	var score = Array.new;
	var oscFile = renderDir ++ "trance-32bar-score.osc";
	var outFile = renderDir ++ "trance-32bar-test.wav";
	var cmd, result;

	// Build a simple score with pad + arp + bass layers
	(bars * 4).do { |beat|
		var time = beat * (60 / bpm);
		var chordIdx = (beat / 4).floor.asInteger % chords.size;
		var chord = chords[chordIdx];

		// Sub bass on every beat
		score = score.add([time, [\s_new, \bass, 3000 + beat, 0, 0,
			\freq, chord[0].midicps / 2, \amp, 0.5, \dur, 60/bpm * 0.9, \cutoff, 300]]);

		// Arp pluck on every 8th note
		if(beat % 1 == 0, {
			var arpNote = chord.wrapAt(beat % chord.size);
			score = score.add([time, [\s_new, \arp_pluck, 4000 + beat, 0, 0,
				\freq, (arpNote + 12).midicps, \amp, 0.35, \decay, 0.08]]);
		});
	};

	// Pad every 4 bars
	(bars / 4).floor.asInteger.do { |section|
		var time = section * 4 * barDur;
		var chord = chords[section % chords.size];
		chord.do { |note, i|
			score = score.add([time, [\s_new, \pad, 5000 + (section*10) + i, 0, 0,
				\freq, note.midicps, \amp, 0.25, \dur, 4 * barDur, \attack, 1.5, \release, 1.5]]);
		};
	};

	score = score.add([totalDur, [\c_set, 0, 0]]);
	score = score.sort { |a, b| a[0] <= b[0] };

	Score.write(score, oscFile);
	cmd = scsynth ++ " -N " ++ oscFile.shellQuote ++ " _ " ++ outFile.shellQuote ++ " 48000 WAV float";
	result = cmd.systemCmd;

	if(result == 0 && File.exists(outFile), {
		var sf = SoundFile.openRead(outFile);
		if(sf.notNil && (sf.numFrames > 48000), {
			("TEST 6 PASS: trance 32bar — " ++ sf.numFrames ++ " frames").postln;
			sf.close;
		}, {
			"TEST 6 FAIL: too few frames".postln;
			errors = errors + 1;
			sf.close;
		});
	}, {
		("TEST 6 FAIL: NRT exit " ++ result).postln;
		errors = errors + 1;
	});
);

"".postln;
if(errors > 0, {
	("=== FAIL: " ++ errors ++ " error(s) ===").postln;
	1.exit;
}, {
	"=== PASS: All trance sequencer tests passed ===".postln;
	0.exit;
});
)
