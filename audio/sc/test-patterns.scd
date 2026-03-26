// T5 Techno Pattern Tests — Bjorklund + pattern load + NRT render

(
var errors = 0;
var libDir = PathName(thisProcess.nowExecutingPath).pathOnly +/+ "lib/";
var synthDefDir = PathName(thisProcess.nowExecutingPath).pathOnly +/+ "synthdefs/";
var patternDir = PathName(thisProcess.nowExecutingPath).pathOnly +/+ "patterns/";
var renderDir = PathName(thisProcess.nowExecutingPath).pathOnly ++ "../render/test-output/";
var scsynth = "/Applications/SuperCollider.app/Contents/Resources/scsynth";

"=== T5 Techno Pattern Tests ===".postln;
File.mkdir(renderDir);

// Load libs
(libDir +/+ "bjorklund.scd").load;

// Test 1a: Bjorklund(4,16)
(
	var result = ~bjorklund.(4, 16);
	var expected = [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0];
	if(result == expected, {
		"TEST 1a PASS: bjorklund(4,16)".postln;
	}, {
		("TEST 1a FAIL: got " ++ result).postln;
		errors = errors + 1;
	});
);

// Test 1b: Bjorklund(7,16) — 7 hits distributed in 16 steps
(
	var result = ~bjorklund.(7, 16);
	if(result.sum == 7 && result.size == 16, {
		"TEST 1b PASS: bjorklund(7,16) — 7 hits".postln;
	}, {
		("TEST 1b FAIL: sum=" ++ result.sum ++ " size=" ++ result.size).postln;
		errors = errors + 1;
	});
);

// Test 1c: Bjorklund(3,8) — 3 hits distributed in 8 steps
(
	var result = ~bjorklund.(3, 8);
	if(result.sum == 3 && result.size == 8, {
		"TEST 1c PASS: bjorklund(3,8) — 3 hits".postln;
	}, {
		("TEST 1c FAIL: sum=" ++ result.sum ++ " size=" ++ result.size).postln;
		errors = errors + 1;
	});
);

// Load SynthDefs for NRT
PathName(synthDefDir).files.do { |f|
	if(f.extension == "scd", { f.fullPath.load });
};
[\kick, \bass, \hat, \clap].do { |n|
	SynthDescLib.global.synthDescs[n].def.writeDefFile;
};

// Load patterns
(patternDir +/+ "techno-kick.scd").load;
(patternDir +/+ "techno-hat.scd").load;
(patternDir +/+ "techno-clap.scd").load;
(patternDir +/+ "techno-master.scd").load;

// Test 2-4: Pattern loads
[\technoKick, \technoHat, \technoClap].do { |name|
	if(Pdef(name).source.notNil, {
		("TEST PASS: " ++ name ++ " pattern loaded").postln;
	}, {
		("TEST FAIL: " ++ name ++ " pattern not loaded").postln;
		errors = errors + 1;
	});
};

// Test 6: 16-bar techno NRT render
(
	var bpm = 130, bars = 16;
	var barDur = 4 * 60 / bpm;
	var totalDur = bars * barDur;
	var score, oscFile, outFile, cmd, result;
	oscFile = renderDir ++ "techno-16bar-score.osc";
	outFile = renderDir ++ "techno-16bar-test.wav";

	// Build NRT score from kick pattern
	score = [
		[0.0, [\s_new, \kick, 1000, 0, 0, \freq, 50, \amp, 0.8, \dur, 0.3, \decay, 0.3]],
	];
	// Add kicks on beats for 16 bars
	(bars * 4).do { |beat|
		var time = beat * (60 / bpm);
		score = score.add([time, [\s_new, \kick, 1001 + beat, 0, 0, \freq, 50, \amp, 0.8, \dur, 0.3]]);
	};
	// Add hats on off-beats
	(bars * 8).do { |eighth|
		var time = eighth * (30 / bpm);
		if(eighth % 2 == 1, {
			score = score.add([time, [\s_new, \hat, 2001 + eighth, 0, 0, \amp, 0.4, \dur, 0.05]]);
		});
	};
	score = score.add([totalDur, [\c_set, 0, 0]]);
	score = score.sort { |a, b| a[0] <= b[0] };

	Score.write(score, oscFile);
	cmd = scsynth ++ " -N " ++ oscFile.shellQuote ++ " _ " ++ outFile.shellQuote ++ " 48000 WAV float";
	result = cmd.systemCmd;

	if(result == 0 && File.exists(outFile), {
		var sf = SoundFile.openRead(outFile);
		if(sf.notNil && (sf.numFrames > 48000), {
			("TEST 6 PASS: techno 16bar — " ++ sf.numFrames ++ " frames").postln;
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
	"=== PASS: All techno pattern tests passed ===".postln;
	0.exit;
});
)
