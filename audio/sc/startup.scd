// SuperCollider startup — SynthDef loader skeleton
// Loads all SynthDef files from synthdefs/ directory

(
s = Server.default;
s.options.numOutputBusChannels = 2;
s.options.sampleRate = 48000;

// SynthDef load paths (populated by T2/T3)
var synthDefDir = PathName(thisProcess.nowExecutingPath).pathOnly +/+ "synthdefs/";

"=== SC Startup ===".postln;
("SynthDef directory: " ++ synthDefDir).postln;

// Load all .scd files in synthdefs/
if(File.exists(synthDefDir), {
	PathName(synthDefDir).files.do { |f|
		if(f.extension == "scd", {
			("Loading: " ++ f.fileName).postln;
			f.fullPath.load;
		});
	};
	"All SynthDefs loaded.".postln;
}, {
	"No synthdefs/ directory found — skeleton mode.".postln;
});

"=== SC Startup Complete ===".postln;
)