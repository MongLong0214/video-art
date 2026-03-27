// Custom FX Modules for SuperDirt — B-LIVE
// Registered via ~dirt.addModule for orbit chain integration

(
// Allocate sidechain bus for cross-orbit signal
~sidechainBus = Bus.audio(s, 1);

// --- Compressor ---
SynthDef(\customCompressor, { |out, compress=0, threshold=(-20), ratio=4, compAttack=0.01, compRelease=0.1|
	var sig = In.ar(out, 2);
	sig = Compander.ar(sig, sig,
		thresh: threshold.dbamp,
		slopeAbove: 1 / ratio,
		clampTime: compAttack,
		relaxTime: compRelease,
		mul: compress.linlin(0, 1, 1, 2)
	);
	ReplaceOut.ar(out, sig);
}).add;

// --- Saturator ---
SynthDef(\customSaturator, { |out, saturate=0, drive=0|
	var sig = In.ar(out, 2);
	sig = (sig * (1 + (drive * 8))).tanh * saturate.linlin(0, 1, 1, 0.7);
	sig = sig + (In.ar(out, 2) * (1 - saturate));
	ReplaceOut.ar(out, sig);
}).add;

// --- 3-Band EQ ---
SynthDef(\customEQ, { |out, loGain=0, midGain=0, hiGain=0, loFreq=250, hiFreq=4000|
	var sig = In.ar(out, 2);
	sig = BLowShelf.ar(sig, loFreq, 1, loGain);
	sig = BPeakEQ.ar(sig, (loFreq * hiFreq).sqrt, 1, midGain);
	sig = BHiShelf.ar(sig, hiFreq, 1, hiGain);
	ReplaceOut.ar(out, sig);
}).add;

// --- Sidechain Compressor (cross-orbit via shared bus) ---
// kick orbit writes to sidechainBus, other orbits read from it
SynthDef(\customSidechain, { |out, sideGain=1, sideRelease=0.2|
	var sig = In.ar(out, 2);
	var control = In.ar(~sidechainBus.index, 1);
	sig = Compander.ar(sig, control,
		thresh: 0.3,
		slopeAbove: 0.1,
		clampTime: 0.005,
		relaxTime: sideRelease,
		mul: sideGain
	);
	ReplaceOut.ar(out, sig);
}).add;

// Allocate sidechain bus
~sidechainBus = Bus.audio(s, 1);

// --- Register modules ---
~dirt.addModule(\customCompressor, { |dirtEvent|
	dirtEvent.sendSynth(\customCompressor, [
		\compress, ~compress,
		\threshold, ~threshold,
		\ratio, ~ratio,
		\compAttack, ~compAttack,
		\compRelease, ~compRelease
	]);
});

~dirt.addModule(\customSaturator, { |dirtEvent|
	dirtEvent.sendSynth(\customSaturator, [
		\saturate, ~saturate,
		\drive, ~drive
	]);
});

~dirt.addModule(\customEQ, { |dirtEvent|
	dirtEvent.sendSynth(\customEQ, [
		\loGain, ~loGain,
		\midGain, ~midGain,
		\hiGain, ~hiGain,
		\loFreq, ~loFreq,
		\hiFreq, ~hiFreq
	]);
});

~dirt.addModule(\customSidechain, { |dirtEvent|
	dirtEvent.sendSynth(\customSidechain, [
		\sideGain, ~sideGain,
		\sideRelease, ~sideRelease
	]);
});

// Set FX chain order (sidechain before compressor for ducking)
~dirt.orderModules([
	\customSidechain,
	\customCompressor,
	\customSaturator,
	\customEQ,
	\superdirt_reverb,
	\superdirt_delay
]);

"=== Custom FX modules loaded (4/4) ===".postln;
)
