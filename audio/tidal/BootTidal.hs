-- BootTidal.hs — B-LIVE pipeline
-- OSC target: 127.0.0.1:57120 (loopback only)

:set -XOverloadedStrings
:set prompt ""

import Sound.Tidal.Context

:{
let target = superdirtTarget
      { oAddress = "127.0.0.1"
      , oPort = 57120
      }
:}

:{
let orbits = [0..7]
    sdConfig = defaultConfig
      { cFrameTimespan = 1/20 }
:}

stream <- startStream sdConfig [(target, orbits)]

:{
let d1 = streamReplace stream 1
    d2 = streamReplace stream 2
    d3 = streamReplace stream 3
    d4 = streamReplace stream 4
    d5 = streamReplace stream 5
    d6 = streamReplace stream 6
    d7 = streamReplace stream 7
    d8 = streamReplace stream 8
    hush = streamHush stream
    solo = streamSolo stream
    unsolo = streamUnsolo stream
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
