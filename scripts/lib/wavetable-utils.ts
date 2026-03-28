// NRT wavetable buffer allocation commands (b_alloc + b_gen sine1)
// Phase 2 §4.3.3 — 8 consecutive buffers with progressive harmonic complexity

export interface NrtCommand {
  time: number;
  msg: (string | number)[];
}

export const generateWavetableCommands = (bufBase: number): NrtCommand[] => {
  const commands: NrtCommand[] = [];
  const bufSize = 2048; // wavetable format = 2x signal size (1024)

  for (let i = 0; i < 8; i++) {
    const bufNum = bufBase + i;
    const numHarmonics = (i + 1) ** 2; // 1, 4, 9, 16, 25, 36, 49, 64

    commands.push({
      time: 0,
      msg: ["/b_alloc", bufNum, bufSize, 1],
    });

    const amps = Array.from({ length: numHarmonics }, (_, j) =>
      ((numHarmonics - j) / numHarmonics) ** 2,
    );

    commands.push({
      time: 0,
      msg: ["/b_gen", bufNum, "sine1", 7, ...amps],
    });
  }

  return commands;
};
