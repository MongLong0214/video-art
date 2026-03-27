// SuperDirt Boot Script — B-LIVE
// Loads SuperDirt with Phase A SynthDefs + Dirt-Samples + custom samples

(
s.waitForBoot {
	var loaded = 0;
	var total = 9;
	var projectRoot = thisProcess.nowExecutingPath.dirname.dirname.dirname;
	var synthDefsDir = projectRoot +/+ "sc" +/+ "synthdefs";
	var samplesDir = projectRoot +/+ "samples";
	var synthDefFiles = [
		"kick", "bass", "hat", "clap", "supersaw", "pad", "lead", "arp_pluck", "riser"
	];

	// Load Phase A SynthDefs
	synthDefFiles.do { |name|
		var filePath = synthDefsDir +/+ name ++ ".scd";
		if(File.exists(filePath)) {
			filePath.load;
			loaded = loaded + 1;
			("  ✓ SynthDef loaded: " ++ name).postln;
		} {
			("  ✗ SynthDef not found: " ++ filePath).postln;
		};
	};

	(loaded.asString ++ "/" ++ total.asString ++ " loaded").postln;

	if(loaded < total) {
		("WARNING: Only " ++ loaded.asString ++ " of " ++ total.asString ++ " SynthDefs loaded").postln;
	};

	// Start SuperDirt with 8 orbits
	~dirt = SuperDirt(2, s);
	~dirt.loadSoundFiles;

	// Load custom samples directory if it exists and has files
	if(File.exists(samplesDir)) {
		// Validate: only load from within audio/samples/ (path traversal prevention)
		var resolvedSamples = PathName(samplesDir).fullPath;
		var resolvedProject = PathName(projectRoot).fullPath;
		if(resolvedSamples.beginsWith(resolvedProject)) {
			~dirt.loadSoundFiles(samplesDir +/+ "*");
			("Custom samples dir loaded: " ++ samplesDir).postln;
		} {
			"WARNING: samples dir outside project root, skipping".postln;
		};
	};

	s.sync;

	~dirt.start(57120, 0 ! 8);

	// Wait for SuperDirt to fully initialize before loading FX modules
	Routine({
		var baseDir = thisProcess.nowExecutingPath.dirname;
		var fxPath = baseDir +/+ "custom-fx.scd";
		var presetsPath = baseDir +/+ "genre-presets.scd";
		var loggerPath = baseDir +/+ "osc-logger.scd";

		1.wait;
		s.sync;

		// Load custom FX modules (comp/sidechain/sat/eq + addModule + orderModules)
		if(File.exists(fxPath)) {
			fxPath.load;
		} {
			"WARNING: custom-fx.scd not found, FX modules not loaded".postln;
		};

		// Load genre presets system
		if(File.exists(presetsPath)) {
			presetsPath.load;
		} {
			"WARNING: genre-presets.scd not found".postln;
		};

		// Conditionally load OSC logger (--log flag)
		if(~enableLogging == true) {
			if(File.exists(loggerPath)) {
				loggerPath.load;
				"OSC logging enabled".postln;
			} {
				"WARNING: osc-logger.scd not found".postln;
			};
		};

		"=== SuperDirt ready (8 orbits, port 57120) ===".postln;
	}).play;
};
)
