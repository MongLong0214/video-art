/**
 * Deterministic clock for frame-perfect recording.
 * In record mode, time advances by fixed dt per frame regardless of real time.
 */
export class Clock {
  private _time = 0;
  private _frame = 0;
  private _fps: number;
  private _dt: number;
  private _recording = false;
  private _realStart = 0;

  constructor(fps = 60) {
    this._fps = fps;
    this._dt = 1 / fps;
  }

  get time() {
    return this._time;
  }
  get frame() {
    return this._frame;
  }
  get dt() {
    return this._dt;
  }
  get fps() {
    return this._fps;
  }

  startRecording() {
    this._recording = true;
    this._time = 0;
    this._frame = 0;
  }

  stopRecording() {
    this._recording = false;
  }

  tick() {
    if (this._recording) {
      this._time = this._frame * this._dt;
    } else {
      if (this._frame === 0) this._realStart = performance.now() / 1000;
      this._time = performance.now() / 1000 - this._realStart;
    }
    this._frame++;
    return { time: this._time, dt: this._dt, frame: this._frame };
  }

  setFps(fps: number) {
    this._fps = fps;
    this._dt = 1 / fps;
  }

  reset() {
    this._time = 0;
    this._frame = 0;
    this._realStart = performance.now() / 1000;
  }
}
