// SynthDef load + NRT render test

(
var errors = 0;
var synthDefDir = PathName(thisProcess.nowExecutingPath).pathOnly +/+ "synthdefs/";
var renderDir = PathName(thisProcess.nowExecutingPath).pathOnly ++ "../render/test-output/";
var expectedDefs = [\kick, \bass, \hat, \clap, \supersaw, \pad, \lead, \arp_pluck, \riser];
var scsynth = "/Applications/SuperCollider.app/Contents/Resources/scsynth";

"=== SynthDef Load + NRT Test ===".postln;

File.mkdir(renderDir);

// Load all SynthDef source files
PathName(synthDefDir).files.do { |f|
	if(f.extension == "scd", {
		("Loading: " ++ f.fileName).postln;
		f.fullPath.load;
	});
};

// Write all SynthDefs to disk for NRT
expectedDefs.do { |name|
	var desc = SynthDescLib.global.synthDescs[name];
	if(desc.notNil, {
		desc.def.writeDefFile;
		("OK: \\" ++ name ++ " loaded + written").postln;
	}, {
		("FAIL: \\" ++ name ++ " NOT found").postln;
		errors = errors + 1;
	});
};

// NRT render each SynthDef
expectedDefs.do { |name|
	var scoreList, oscFile, outFile, duration = 2, cmd, result;
	oscFile = renderDir ++ name.asString ++ "-score.osc";
	outFile = renderDir ++ name.asString ++ "-test.wav";

	scoreList = [
		[0.0, [\s_new, name, 1000, 0, 0, \freq, 220, \amp, 0.8, \dur, 1.5]],
		[duration, [\c_set, 0, 0]]
	];

	// Write binary OSC score
	Score.write(scoreList, oscFile);

	// Run scsynth -N
	cmd = scsynth ++ " -N " ++ oscFile.shellQuote ++ " _ " ++ outFile.shellQuote ++ " 48000 WAV float";
	("Running: " ++ cmd).postln;
	result = cmd.systemCmd;

	if(result == 0, {
		if(File.exists(outFile), {
			var sf = SoundFile.openRead(outFile);
			if(sf.notNil, {
				var frames = sf.numFrames;
				sf.close;
				if(frames > 1000, {
					("NRT OK: " ++ name ++ " — " ++ frames ++ " frames").postln;
				}, {
					("NRT FAIL: " ++ name ++ " — " ++ frames ++ " frames (too few)").postln;
					errors = errors + 1;
				});
			}, {
				("NRT FAIL: " ++ name ++ " — cannot read WAV").postln;
				errors = errors + 1;
			});
		}, {
			("NRT FAIL: " ++ name ++ " — file not found").postln;
			errors = errors + 1;
		});
	}, {
		("NRT FAIL: " ++ name ++ " — scsynth exit " ++ result).postln;
		errors = errors + 1;
	});
};

"".postln;
if(errors > 0, {
	("=== FAIL: " ++ errors ++ " error(s) ===").postln;
	1.exit;
}, {
	"=== PASS: All SynthDefs loaded and NRT rendered ===".postln;
	0.exit;
});
)
