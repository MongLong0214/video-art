// OSC Logger — captures /dirt/play events to JSONL file
// Loaded conditionally by boot.scd when ~enableLogging is true
// Binds to 127.0.0.1:57120 only (loopback — no external access)

(
var logDir, logPath, logFile, partNumber, fileStartTime, eventCount;

logDir = ~oscLogDir ?? (thisProcess.nowExecutingPath.dirname.dirname.dirname.dirname +/+ "out" +/+ "osclog");
File.mkdir(logDir);

partNumber = 0;
eventCount = 0;
fileStartTime = SystemClock.seconds;

logPath = logDir +/+ format("session_%_part%.osclog",
	Date.getDate.stamp, partNumber);
logFile = File(logPath, "w");

("OSC Logger started: " ++ logPath).postln;

// Main OSC capture — async via Routine to avoid blocking audio thread
~oscLogger = OSCFunc({ |msg, time|
	var params, jsonParts, jsonLine;
	var currentTime = SystemClock.seconds;

	// 10-minute file rotation
	if((currentTime - fileStartTime) >= 600) {
		logFile.flush;
		logFile.close;
		partNumber = partNumber + 1;
		fileStartTime = currentTime;
		logPath = logDir +/+ format("session_%_part%.osclog",
			Date.getDate.stamp, partNumber);
		logFile = File(logPath, "w");
		("OSC Logger rotated: " ++ logPath).postln;
	};

	// Build JSONL from OSC message pairs (key, value, key, value, ...)
	params = msg[1..];
	jsonParts = List.new;
	jsonParts.add(format("\"ts\":%", (time - ~sessionStartTime).round(0.001)));

	// SuperDirt sends alternating key-value pairs
	(0, 2 .. params.size - 2).do { |i|
		var key = params[i].asString;
		var val = params[i + 1];
		if(val.isKindOf(String)) {
			jsonParts.add(format("\"%\":\"%\"", key, val));
		} {
			jsonParts.add(format("\"%\":%", key, val.round(0.0001)));
		};
	};

	jsonLine = "{" ++ jsonParts.join(",") ++ "}";
	logFile.write(jsonLine ++ "\n");
	eventCount = eventCount + 1;
}, '/dirt/play');

~sessionStartTime = SystemClock.seconds;
~oscLogEventCount = { eventCount };
~oscLogDir = logDir;

~oscLogFinalize = {
	logFile.flush;
	logFile.close;
	("OSC Logger finalized: " ++ eventCount.asString ++ " events captured").postln;
};

"OSC Logger active (127.0.0.1:57120 only)".postln;
)
