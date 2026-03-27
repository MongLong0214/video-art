// NRT Multi-Stem Renderer — reads score config JSON, renders 8ch WAV
// Usage: sclang render-stems-nrt.scd <config.json> <output.wav>

(
var args = thisProcess.argv;
var configPath, outputPath, config, entries, score;

if(args.size < 2) {
	"Usage: sclang render-stems-nrt.scd <config.json> <output.wav>".postln;
	1.exit;
};

configPath = args[0];
outputPath = args[1];

("Loading config: " ++ configPath).postln;

// Parse config JSON
try {
	config = File.read(configPath).parseJSON;
} { |err|
	("ERROR: Failed to parse config: " ++ err.errorString).postln;
	1.exit;
};

entries = config.at("entries");
if(entries.isNil || (entries.size == 0)) {
	"ERROR: No entries in config".postln;
	1.exit;
};

("Entries: " ++ entries.size.asString).postln;

// Load SynthDefs (14 total: 9 instruments + 4 FX + 1 NRT sidechain send)
(
	var scDir = thisProcess.nowExecutingPath.dirname.dirname;  // audio/sc/
	var synthDefsDir = scDir +/+ "synthdefs";
	var fxPath = scDir +/+ "superdirt" +/+ "custom-fx.scd";
	var synthDefFiles = [
		"kick", "bass", "hat", "clap", "supersaw", "pad", "lead", "arp_pluck", "riser"
	];

	synthDefFiles.do { |name|
		var filePath = synthDefsDir +/+ name ++ ".scd";
		if(File.exists(filePath)) { filePath.load };
	};

	// Load custom FX SynthDefs
	if(File.exists(fxPath)) { fxPath.load };

	// NRT sidechain send SynthDef (inline)
	SynthDef(\nrt_sidechain_send, { |inBus=0, outBus=100|
		var sig = In.ar(inBus, 2);
		Out.ar(outBus, Mix.ar(sig));
	}).writeDefFile;

	// NRT sample playback (Dirt-Samples via Buffer.read + b_allocRead)
	SynthDef(\nrtPlayBuf, { |out=0, bufnum=0, amp=0.5, pan=0, speed=1, dur=1|
		var sig = PlayBuf.ar(2, bufnum, BufRateScale.kr(bufnum) * speed, doneAction: 2);
		sig = sig * amp * EnvGen.kr(Env.linen(0.001, dur, 0.01), doneAction: 2);
		sig = Balance2.ar(sig[0], sig[1], pan);
		Out.ar(out, sig);
	}).writeDefFile;

	// NRT Reverb (replaces SuperDirt built-in)
	SynthDef(\nrtReverb, { |out=0, room=0.5, size=0.8, dry=0.5|
		var sig = In.ar(out, 2);
		sig = FreeVerb.ar(sig, room, size, dry);
		ReplaceOut.ar(out, sig);
	}).writeDefFile;

	// NRT Delay (replaces SuperDirt built-in)
	SynthDef(\nrtDelay, { |out=0, delaytime=0.3, delayfeedback=0.5, dry=0.5|
		var sig = In.ar(out, 2);
		var delayed = CombL.ar(sig, 1.0, delaytime, delayfeedback * 4);
		sig = (sig * dry) + (delayed * (1 - dry));
		ReplaceOut.ar(out, sig);
	}).writeDefFile;

	// Write all loaded SynthDefs to disk for NRT
	SynthDescLib.global.synthDescs.do { |desc|
		if(desc.def.notNil) { desc.def.writeDefFile };
	};
);

// Build Score from entries
score = entries.collect { |entry|
	var time = entry.at("time").asFloat;
	var cmd = entry.at("cmd");
	var oscMsg;

	oscMsg = cmd.collect { |item, i|
		if(i == 0) {
			("\\" ++ item.asString).asSymbol
		} {
			var asNum = item.asString.asFloat;
			if(item.asString == asNum.asString) { asNum } { item.asString.asSymbol }
		};
	};

	[time, oscMsg]
};

("Score built: " ++ score.size.asString ++ " events").postln;

// Render via NRT
(
	var channels = config.at("outputChannels").asInteger ? 8;
	var sr = config.at("sampleRate").asInteger ? 48000;
	var oscPath = configPath.replace(".json", ".osc");

	Score(score).recordNRT(
		oscPath,
		outputPath,
		sampleRate: sr,
		headerFormat: "WAV",
		sampleFormat: "float",
		options: ServerOptions.new
			.numOutputBusChannels_(channels)
			.sampleRate_(sr)
			.memSize_(8192 * 16)
	);

	("NRT render complete: " ++ outputPath).postln;
);

0.exit;
)
