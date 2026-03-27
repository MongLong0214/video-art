// Genre Presets — SC-side preset loader + runtime switching
// Loaded by boot.scd after SuperDirt + custom-fx initialization
// Presets in audio/presets/genres/ and audio/presets/user/

(
var projectRoot = thisProcess.nowExecutingPath.dirname.dirname.dirname;
var genresDir = projectRoot +/+ "presets" +/+ "genres";
var userDir = projectRoot +/+ "presets" +/+ "user";

~currentPreset = nil;
~currentPresetName = "none";

~loadPreset = { |name|
	// SC-side input validation — path traversal prevention
	if(name.asString.matchRegexp("^[a-zA-Z0-9_-]+$").not) {
		("WARNING: Invalid preset name: " ++ name.asString).postln;
	} {
		var presetPath, json;

		// Cache guard — skip reload if same preset
		if(name.asString == ~currentPresetName) {
			("Preset already active: " ++ name.asString).postln;
		} {
			// Search genres/ first, then user/
			presetPath = genresDir +/+ name.asString ++ ".json";
			if(File.exists(presetPath).not) {
				presetPath = userDir +/+ name.asString ++ ".json";
			};

			if(File.exists(presetPath)) {
				// Error-safe JSON parsing
				try {
					json = File.read(presetPath).parseJSON;
					~currentPreset = json;
					~currentPresetName = name.asString;

					// Apply fxDefaults only to ALL orbits (synthParams = TS layer only)
					if(json.at("fxDefaults").notNil) {
						~dirt.orbits.do { |orbit|
							json.at("fxDefaults").keysValuesDo { |k, v|
								orbit.set(k.asSymbol, v.asFloat);
							};
						};
					};

					("Preset loaded: " ++ name.asString).postln;
				} { |err|
					("ERROR: Failed to parse preset: " ++ err.errorString).postln;
				};
			} {
				("WARNING: Preset not found: " ++ name.asString).postln;
			};
		};
	};
};

// Listen for setpreset events via SuperDirt /dirt/play
// Tidal sends: once $ s "setpreset" # presetName (pure "hard_techno")
~presetHandler = OSCFunc({ |msg|
	var params = msg[1..];
	var synthName, pName;

	(0, 2 .. params.size - 2).do { |i|
		if(params[i].asString == "s") { synthName = params[i+1].asString };
		if(params[i].asString == "presetName") { pName = params[i+1].asString };
	};

	if(synthName == "setpreset" && pName.notNil) {
		~loadPreset.(pName);
	};

	// Handle getpreset query
	if(synthName == "getpreset") {
		("Current preset: " ++ ~currentPresetName).postln;
	};
}, '/dirt/play');

"Genre presets loaded (genres: " ++ genresDir ++ ")".postln;
)
