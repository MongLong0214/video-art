// T6 Trance Sequencer Tests

(
var errors, libDir, synthDir, patDir, readFile;
var rootMidi, chords, allInScale, up, down, randArp, span3, gated, macro;

errors = 0;
libDir = "/Users/isaac/WebstormProjects/video-art/audio/sc/lib/";
synthDir = "/Users/isaac/WebstormProjects/video-art/audio/sc/synthdefs/";
patDir = "/Users/isaac/WebstormProjects/video-art/audio/sc/patterns/";
readFile = { |path| File.use(path, "r", { |f| f.readAllString }) };

"=== T6 Trance Sequencer Tests ===".postln;

(libDir +/+ "scales.scd").load;
(libDir +/+ "chords.scd").load;
(libDir +/+ "arp.scd").load;

rootMidi = 69;
chords = ~chordProgression.(rootMidi, \minor, [1, 6, 3, 7], 0);
allInScale = chords.flatten.every { |m| ~noteInScale.(m, rootMidi, \minor) };
if(allInScale, { "T1 PASS: Am chords".postln }, { "T1 FAIL".postln; errors = errors + 1 });

up = ~arpeggiate.([60,64,67], \up, 1);
if(up == [60,64,67], { "T2a PASS: up".postln }, { "T2a FAIL".postln; errors = errors + 1 });
down = ~arpeggiate.([60,64,67], \down, 1);
if(down == [67,64,60], { "T2b PASS: down".postln }, { "T2b FAIL".postln; errors = errors + 1 });
randArp = ~arpeggiate.([60,64,67], \random, 1);
if(randArp.sort == [60,64,67], { "T2c PASS: random".postln }, { "T2c FAIL".postln; errors = errors + 1 });
span3 = ~arpeggiate.([60,64,67], \up, 3);
if(span3.size == 9, { "T2d PASS: 3-oct".postln }, { "T2d FAIL".postln; errors = errors + 1 });
gated = ~arpeggiate.([60,64,67], \up, 1, [1,0,1]);
if(gated.includes(\rest), { "T2e PASS: gate".postln }, { "T2e FAIL".postln; errors = errors + 1 });

PathName(synthDir).files.do { |f| if(f.extension=="scd", { f.fullPath.load }) };
(patDir +/+ "trance-layers.scd").load;
(patDir +/+ "trance-macro.scd").load;
(patDir +/+ "trance-master.scd").load;

if(~tranceLayers.notNil && (~tranceLayers.size == 6),
  { "T3 PASS: 6 layers".postln }, { "T3 FAIL".postln; errors = errors + 1 });

if([\sub_bass, \rolling_bass, \arp, \pad, \lead, \riser].every { |n| ~tranceLayers[n].notNil },
  { "T4 PASS: all layer builders".postln }, { "T4 FAIL".postln; errors = errors + 1 });

if(readFile.(patDir +/+ "trance-macro.scd").contains("filterOpen"),
  { "T5 PASS: macro has filterOpen".postln }, { "T5 FAIL".postln; errors = errors + 1 });

macro = ~tranceMacro.(32, 138);
if(macro[\filterOpen].isKindOf(Env) && macro[\reverbSize].isKindOf(Env),
  { "T6 PASS: macro returns Envs".postln }, { "T6 FAIL".postln; errors = errors + 1 });

if(~buildTranceScore.notNil,
  { "T7 PASS: buildTranceScore".postln }, { "T7 FAIL".postln; errors = errors + 1 });

if(readFile.(patDir +/+ "trance-master.scd").contains("tranceMacro"),
  { "T8 PASS: master uses macro".postln }, { "T8 FAIL".postln; errors = errors + 1 });

if(errors > 0,
  { ("=== FAIL: " ++ errors ++ " error(s) ===").postln; 1.exit },
  { "=== T6 ALL PASS ===".postln; 0.exit });
)
