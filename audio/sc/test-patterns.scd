// T5 Techno Pattern Tests

(
var errors, libDir, synthDir, patDir, readFile;
errors = 0;
libDir = "/Users/isaac/WebstormProjects/video-art/audio/sc/lib/";
synthDir = "/Users/isaac/WebstormProjects/video-art/audio/sc/synthdefs/";
patDir = "/Users/isaac/WebstormProjects/video-art/audio/sc/patterns/";

readFile = { |path| File.use(path, "r", { |f| f.readAllString }) };

"=== T5 Techno Pattern Tests ===".postln;
(libDir +/+ "bjorklund.scd").load;

if(~bjorklund.(4,16).sum == 4 && (~bjorklund.(4,16).size == 16),
  { "T1a PASS: bjorklund(4,16)".postln }, { "T1a FAIL".postln; errors = errors + 1 });
if(~bjorklund.(7,16).sum == 7,
  { "T1b PASS: bjorklund(7,16)".postln }, { "T1b FAIL".postln; errors = errors + 1 });
if(~bjorklund.(3,8).sum == 3,
  { "T1c PASS: bjorklund(3,8)".postln }, { "T1c FAIL".postln; errors = errors + 1 });
if(~bjorklund.(0,16).sum == 0,
  { "T1d PASS: bjorklund(0,16)".postln }, { "T1d FAIL".postln; errors = errors + 1 });

PathName(synthDir).files.do { |f| if(f.extension=="scd", { f.fullPath.load }) };
(patDir +/+ "techno-kick.scd").load;
(patDir +/+ "techno-hat.scd").load;
(patDir +/+ "techno-clap.scd").load;
(patDir +/+ "techno-master.scd").load;

[\technoKick, \technoHat, \technoClap, \technoMaster].do { |n|
  if(Pdef(n).source.notNil,
    { ("PASS: " ++ n).postln }, { ("FAIL: " ++ n).postln; errors = errors + 1 });
};

if(readFile.(patDir +/+ "techno-kick.scd").contains("Pwrand"),
  { "T5a PASS: kick has Pwrand".postln }, { "T5a FAIL".postln; errors = errors + 1 });
if(readFile.(patDir +/+ "techno-kick.scd").contains("Pseg"),
  { "T5b PASS: kick has Pseg automation".postln }, { "T5b FAIL".postln; errors = errors + 1 });
if(readFile.(patDir +/+ "techno-hat.scd").contains("Pseg"),
  { "T5c PASS: hat has Pseg density".postln }, { "T5c FAIL".postln; errors = errors + 1 });

if(errors > 0,
  { ("=== FAIL: " ++ errors ++ " error(s) ===").postln; 1.exit },
  { "=== T5 ALL PASS ===".postln; 0.exit });
)
