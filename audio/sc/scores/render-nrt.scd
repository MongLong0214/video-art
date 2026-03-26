// render-nrt.scd — NRT score generator
// Reads audio config → builds SceneScore → renders via scsynth -N
// Called by: render-audio.ts via sclang -i none render-nrt.scd <configPath>

(
var configPath, libDir, synthDefDir, sceneDir, scsynth;
var genre, bpm, duration, energy, rootMidi, scaleName, outputDir;
var sections, score, oscFile, outFile, cmd, result;

configPath = thisProcess.argv[0];
if(configPath.isNil, {
	"ERROR: No config path. Usage: sclang render-nrt.scd <config.scd>".postln;
	1.exit;
});

libDir = PathName(thisProcess.nowExecutingPath).pathOnly ++ "../lib/";
synthDefDir = PathName(thisProcess.nowExecutingPath).pathOnly ++ "../synthdefs/";
sceneDir = PathName(thisProcess.nowExecutingPath).pathOnly ++ "../scenes/";
scsynth = "/Applications/SuperCollider.app/Contents/Resources/scsynth";

"=== NRT Render ===".postln;
("Config: " ++ configPath).postln;
configPath.load;

if(~audioConfig.isNil, {
	"ERROR: ~audioConfig not defined".postln;
	1.exit;
});

genre = ~audioConfig[\genre];
bpm = ~audioConfig[\bpm];
duration = ~audioConfig[\duration];
energy = ~audioConfig[\energy];
outputDir = ~audioConfig[\outputDir];
scaleName = ~audioConfig[\scale] ? \minor;

// Load libs first (needed for ~rootMap)
(libDir +/+ "scales.scd").load;
(libDir +/+ "chords.scd").load;
(libDir +/+ "arp.scd").load;
(libDir +/+ "scene-score.scd").load;

rootMidi = ~rootMap[~audioConfig[\key]] ? 69;

("bpm=" ++ bpm ++ " genre=" ++ genre ++ " dur=" ++ duration ++ "s energy=" ++ energy ++ " root=" ++ rootMidi).postln;

// Load + write SynthDefs
PathName(synthDefDir).files.do { |f| if(f.extension=="scd", { f.fullPath.load }) };
[\kick, \bass, \hat, \clap, \pad, \arp_pluck, \lead, \riser, \supersaw].do { |n|
	SynthDescLib.global.synthDescs[n].def.writeDefFile;
};

// Load scene preset
if(genre == \techno, {
	(sceneDir +/+ "techno-default.scd").load;
	sections = ~technoDefault;
}, {
	(sceneDir +/+ "trance-default.scd").load;
	sections = ~tranceDefault;
});

// Deterministic seed
thisThread.randSeed_(42);

("Building NRT: " ++ sections.size ++ " sections").postln;
score = ~buildSceneNRT.(sections, bpm, rootMidi, scaleName);
("Score: " ++ score.size ++ " events").postln;

oscFile = outputDir +/+ "nrt-score.osc";
outFile = outputDir +/+ "stem-master.wav";

Score.write(score, oscFile);
"Score written.".postln;

cmd = scsynth ++ " -N " ++ oscFile.shellQuote ++ " _ " ++ outFile.shellQuote ++ " 48000 WAV float -d 1024";
result = cmd.systemCmd;
("scsynth exit: " ++ result).postln;

if(result == 0 && File.exists(outFile), {
	"=== NRT Render Complete ===".postln;
	0.exit;
}, {
	"ERROR: NRT render failed".postln;
	1.exit;
});
)
