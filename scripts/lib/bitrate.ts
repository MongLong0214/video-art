/**
 * Resolution-based bitrate selection for ffmpeg encoding.
 * Scope: 30fps renders only (60fps is out of scope — PRD-pipeline-hardening AC-5.6).
 */

const ANCHORS: [number, number][] = [
  [921_600, 8],     // 720p  (1280x720)
  [2_073_600, 15],  // 1080p (1920x1080)
  [3_686_400, 25],  // 1440p (2560x1440)
  [8_294_400, 40],  // 4K    (3840x2160)
];

/**
 * Get ffmpeg bitrate string based on total pixel count.
 * Interpolation: linear between anchors, floor rounding.
 * Clamp: below 720p → "8M", above 4K → "40M".
 */
export function getBitrate(resolution: [number, number]): string {
  const pixels = resolution[0] * resolution[1];

  // Clamp below
  if (pixels <= ANCHORS[0][0]) return `${ANCHORS[0][1]}M`;
  // Clamp above
  if (pixels >= ANCHORS[ANCHORS.length - 1][0]) return `${ANCHORS[ANCHORS.length - 1][1]}M`;

  // Find surrounding anchors and interpolate
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const [px0, br0] = ANCHORS[i];
    const [px1, br1] = ANCHORS[i + 1];
    if (pixels >= px0 && pixels <= px1) {
      const t = (pixels - px0) / (px1 - px0);
      const bitrate = Math.floor(br0 + t * (br1 - br0));
      return `${bitrate}M`;
    }
  }

  return `${ANCHORS[ANCHORS.length - 1][1]}M`;
}
