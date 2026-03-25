/**
 * Frame-by-frame canvas recorder using MediaRecorder API.
 * Press R to start/stop recording. Downloads WebM when stopped.
 */
export class Recorder {
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private _recording = false;
  private canvas: HTMLCanvasElement;
  private info: HTMLElement | null;
  private fps: number;

  constructor(canvas: HTMLCanvasElement, fps = 60) {
    this.canvas = canvas;
    this.fps = fps;
    this.info = document.getElementById("info");
  }

  get recording() {
    return this._recording;
  }

  start() {
    this.chunks = [];
    this.stream = this.canvas.captureStream(this.fps);

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType,
      videoBitsPerSecond: 20_000_000, // 20 Mbps
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.mediaRecorder.onstop = () => this.save();

    this.mediaRecorder.start();
    this._recording = true;
    this.updateInfo();
  }

  stop() {
    if (this.mediaRecorder && this._recording) {
      this.mediaRecorder.stop();
      this._recording = false;
      this.updateInfo();
    }
  }

  toggle() {
    this._recording ? this.stop() : this.start();
  }

  private save() {
    const blob = new Blob(this.chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `video-art-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
    this.chunks = [];
  }

  private updateInfo() {
    if (!this.info) return;
    if (this._recording) {
      this.info.textContent = "● REC (press R to stop)";
      this.info.classList.add("recording");
    } else {
      this.info.textContent = "press R to record";
      this.info.classList.remove("recording");
    }
  }
}
