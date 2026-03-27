-- BootTidal.hs — B-LIVE pipeline
-- OSC target: 127.0.0.1:57120 (loopback only)

:set -XOverloadedStrings
:set prompt ""

import Sound.Tidal.Context

tidal <- startTidal (superdirtTarget {oAddress = "127.0.0.1", oPort = 57120}) (defaultConfig {cFrameTimespan = 1/20})

:{
let only = (hush >>)
    p = streamReplace tidal
    hush = streamHush tidal
    list = streamList tidal
    mute = streamMute tidal
    unmute = streamUnmute tidal
    unmuteAll = streamUnmuteAll tidal
    solo = streamSolo tidal
    unsolo = streamUnsolo tidal
    unsoloAll = streamUnsoloAll tidal
    once = streamOnce tidal
    asap = once
    nudgeAll = streamNudgeAll tidal
    all = streamAll tidal
    resetCycles = streamResetCycles tidal
    setcps = asap . cps
    d1 = p 1 . (|< orbit 0)
    d2 = p 2 . (|< orbit 1)
    d3 = p 3 . (|< orbit 2)
    d4 = p 4 . (|< orbit 3)
    d5 = p 5 . (|< orbit 4)
    d6 = p 6 . (|< orbit 5)
    d7 = p 7 . (|< orbit 6)
    d8 = p 8 . (|< orbit 7)
:}

-- Custom FX parameters
:{
let compress = pF "compress"
    threshold = pF "threshold"
    ratio = pF "ratio"
    compAttack = pF "compAttack"
    compRelease = pF "compRelease"
    saturate = pF "saturate"
    drive = pF "drive"
    loGain = pF "loGain"
    midGain = pF "midGain"
    hiGain = pF "hiGain"
    loFreq = pF "loFreq"
    hiFreq = pF "hiFreq"
    sideGain = pF "sideGain"
    sideRelease = pF "sideRelease"
:}

-- Phase A SynthDef parameters
:{
let cutoff = pF "cutoff"
    resonance = pF "resonance"
    detune = pF "detune"
    width = pF "width"
    click = pF "click"
    decay = pF "decay"
:}

-- B-PRESET: SynthDef-specific parameters
-- Note: attack/release are Tidal builtins — no need to redefine
:{
let openness = pF "openness"
    tone = pF "tone"
    filterEnv = pF "filterEnv"
    vibrato = pF "vibrato"
    portamento = pF "portamento"
    brightness = pF "brightness"
    sweepRange = pF "sweepRange"
    noiseAmount = pF "noiseAmount"
    envAmount = pF "envAmount"
    clapSpread = pF "spread"
    sawMix = pF "mix"
:}

-- B-PRESET: Preset switching helpers
:{
let presetName = pS "presetName"
    setPreset name = once $ s "setpreset" # presetName (pure name)
    getPreset = once $ s "getpreset"
:}

:set prompt "tidal> "
