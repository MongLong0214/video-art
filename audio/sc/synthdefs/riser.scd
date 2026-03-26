// Riser SynthDef — ascending pitch + noise blend + amp ramp
// Params: freq, amp, dur, pan, sweepRange, noiseAmount

SynthDef(\riser, { |out=0, freq=100, amp=0.5, dur=4, pan=0, sweepRange=4000, noiseAmount=0.3|
	var sig, env, pitchSweep, noise;

	// Rising pitch sweep
	pitchSweep = XLine.kr(freq, freq + sweepRange, dur);
	sig = Saw.ar(pitchSweep);

	// Noise blend
	noise = WhiteNoise.ar * noiseAmount;
	sig = sig + noise;

	// LP filter follows pitch
	sig = RLPF.ar(sig, pitchSweep * 2, 0.5);

	// Amplitude ramp up
	env = EnvGen.kr(Env.new([0, amp], [dur]), doneAction: 2);
	sig = sig * env;

	sig = Pan2.ar(sig, pan);
	Out.ar(out, sig);
}).add;
