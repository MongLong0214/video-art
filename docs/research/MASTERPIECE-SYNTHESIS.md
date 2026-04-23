# DMT / LSD Masterpiece Reference System

Date: 2026-04-23
Status: Focused DMT/LSD artwork and implementation reference
Owner: video-art
Primary target: gallery-sellable, commercial-ready, loopable DMT/LSD-style fractal + mandala videos
Canonical file: `docs/research/MASTERPIECE-SYNTHESIS.md`

This is the single source of truth for DMT/LSD visual reference, masterpiece artwork canon, shader technique synthesis, commercial-use gating, production recipes, and local implementation mapping.

## Executive Summary

The target is not "trippy shader noise." The target is a master-level visual system with:

- infinite travel: log-polar/log-spherical zoom, slit-scan tunnel, recursive scale
- sacred structure: mandala grids, center/gates/rings, visual-music timing
- living intelligence: orbit traps, entity pareidolia, plant/serpent/ecology motifs
- commercial finish: layered translucency, filmic tonemap, iridescence, fog, restrained bloom
- loop discipline: every time term closes over the render duration
- rights discipline: no copied art, no copied non-commercial shader code, source ledger for all reuse

The strongest production direction:

1. Use OSAR-style log-spherical/log-polar recursion as math inspiration.
2. Use IQ-style MIT snippets and original in-house shader code as the safest implementation base.
3. Use the masterpiece canon for composition, motion grammar, and palette direction only.
4. Use the local shader archive as a mined reference library, not as commercial code, until each file is license-cleared.
5. Build named shot families rather than anonymous parameter variants.

## Commercial Use Gate

This is operational guidance, not legal advice. For commercial release, unresolved rights block direct reuse.

| Class | Meaning | Allowed Use | Blocked Use | Action |
| --- | --- | --- | --- | --- |
| Green | Explicitly commercial-safe, e.g. MIT or CC0 | Reuse code/math with required attribution/license | None beyond license terms | Keep source ledger |
| Yellow | Reference-only or unclear license | Study visual grammar, recreate independently | Copy code, frames, images, text, compositions | Use inspiration only or request permission |
| Red | Non-commercial, share-alike, all-rights-reserved, or unknown Shadertoy default | Internal study only | Commercial direct reuse | Replace with in-house implementation or clear rights |

Rules:

- Do not copy, crop, animate, collage, trace, texture-sample, train on, project, or remix external artwork without rights.
- Do extract geometry, rhythm, palette relationships, value hierarchy, and motif taxonomy.
- Treat Shadertoy shaders as Red unless a file-specific license permits commercial use.
- Treat Alex Grey / Allyson Grey, Belson, Whitney, Trumbull, Android Jones, Luke Brown, Amaringo, kene, Horsthuis, Sage, Venosa, Hoffmann, Klarwein, and Fuchs works as reference-only unless licensed.
- Cultural motifs such as Shipibo-Konibo kene require extra care; do not turn sacred/community symbols into generic ornament.

Core licensing facts:

| Source | Commercial Status | Notes |
| --- | --- | --- |
| OSAR log-spherical note | Yellow | no explicit reuse license found; use as technique inspiration |
| Zoomquilt | Yellow | composition reference only unless legal notice permits more |
| Inigo Quilez articles | Green for MIT code snippets, Yellow for prose | preserve MIT attribution |
| The Book of Shaders | Red/Yellow | learning reference; site content is not free to copy |
| Electric Sheep | Yellow/Red | commercial/attribution-free use requires license |
| CoSM / Alex Grey / Allyson Grey | Red | explicit restrictions on modification, collage, commercial reproduction, projections without approval |
| Center for Visual Music / Belson / Whitney / Fischinger | Red | rights-managed archival material |
| Shadertoy | Red by default | unlicensed shader default is CC BY-NC-SA 3.0 |

## Success Criteria

| Capability | Standard | Evidence |
| --- | --- | --- |
| Seamless loop | first/final frame perceptually match | `scripts/validate-loop.ts` or RMSE/SSIM check |
| Infinite travel | recursion reads as continuous inward/outward space | log-radius or periodic camera proof |
| Mandala identity | symmetry feels intentional, not generic spin | center, rings, gates, segment plan |
| Fractal body | spatial depth, not flat noise | SDF/raymarch/volume layer |
| Commercial safety | direct reuse is license-cleared | source ledger |
| Reproducibility | render can be regenerated | config + shader + command |
| Finish | no hobby-tier CG look | AgX/filmic grade, fog, controlled bloom, palette hierarchy |

## Document Structure

This file keeps one non-duplicated canonical copy of the detailed material:

- `PART I - Production Reference Bank` covers source registries, structural clusters, local implementation references, and production workflow.
- `PART II - Full Masterpiece Artwork Canon` covers the full artwork canon and production extraction notes.
- `PART III - Full Shader / VFX Research Synthesis` covers shader techniques, VFX cases, tonemap, DMT phenomenology, and the v47 recipe.
- `PART IV - Artwork Production Schemas` covers reference, rights, and shot-planning templates.

---

# PART I - Production Reference Bank

## Original Purpose

This production reference bank exists to build loopable psychedelic/fractal videos using stable visual systems rather than generic visual noise. It focuses on visual structure and rendering technique, not drug-use guidance.

Scope:

- endless zoom
- log-polar and log-spherical warp
- kaleidoscopic mandala symmetry
- fractal tunnel
- psychedelic visual-language references
- commercial-use constraints
- local implementation mapping

## Highest-Priority References

### Pierre Cusa / OSAR - Log-spherical Mapping in SDF Raymarching

URL:

- https://www.osar.fr/notes/logspherical/

Why it matters:

- This is the clearest bridge between infinite-zoom perception and actual shader-space mapping.
- It connects SDF raymarching, recursive geometry, and visual infinity.
- It is more specific than generic "fractal zoom" references because it shows how coordinate mapping can create infinite self-similar spatial behavior.

Use for:

- log-radius remapping
- shell recursion
- spherical wrapping
- tunnelized zoom that still reads as spatial volume
- recursive spatial shells for DMT tunnel variants

Commercial status:

- Yellow. No explicit reuse license found on the page during verification.
- Use as technique inspiration, not copied code/text.

### Zoomquilt

URLs:

- https://zoomquilt.org/
- https://zoom.zoomquilt.org/

Why it matters:

- One of the cleanest infinite inward travel references.
- Useful for pacing, reveal cadence, scale landmarks, and the feeling of never reaching a final center.

Use for:

- shot pacing
- center-lock composition
- recursive reveal cadence
- scale-periodic image structure

Commercial status:

- Yellow. No explicit open reuse license confirmed.
- Use composition principles only.

### Inigo Quilez - Raymarching / Distance Fields / Palettes / Menger

URLs:

- https://iquilezles.org/articles/raymarchingdf/
- https://iquilezles.org/articles/distfunctions/
- https://iquilezles.org/articles/palettes/
- https://iquilezles.org/articles/menger/

Why it matters:

- Production-ready math vocabulary for SDFs, raymarching, distance functions, Menger-style fractal structures, and cosine palettes.
- IQ snippets are often the safest shader foundation when license allows.

Use for:

- SDF primitives
- raymarching loop structure
- soft shadows and normal estimation
- distance field composition
- Menger structures
- cosine palette functions

Commercial status:

- Green for code snippets when marked MIT.
- Yellow for article prose.
- Preserve attribution and license text.

### The Book of Shaders

URLs:

- https://thebookofshaders.com/13/
- https://thebookofshaders.com/11/
- https://thebookofshaders.com/09/
- https://thebookofshaders.com/05/
- https://thebookofshaders.com/07/

Why it matters:

- Compact explanations of fBm, noise, shaping functions, patterns, and fragment-shader thinking.
- Good for designing clean procedural layers that are understandable and maintainable.

Use for:

- fBm
- procedural noise
- pattern-space design
- 2D shape and tile logic
- shader education and vocabulary

Commercial status:

- Red/Yellow. Site content is not safe to copy for commercial reuse without permission.
- Use as learning reference.

### Electric Sheep / Scott Draves

URL:

- https://electricsheep.org/

Why it matters:

- Canonical fractal-flame motion reference.
- Useful for evolving abstract forms, color breathing, and slow transcendental transitions.

Use for:

- morphing color flow
- living abstract motion
- attractor-like transition behavior
- non-hard-cut psychedelic evolution

Commercial status:

- Yellow/Red. Free content can vary by CC BY-NC or CC BY depending on source; commercial use or attribution-free use requires appropriate license.

### John Edmark

URL:

- https://www.johnedmark.com/

Why it matters:

- Phyllotaxis, golden-angle growth, radial recursion, kinetic rotational illusion.
- Directly useful for mandala petals and hypnotic center-out growth.

Use for:

- Fibonacci bloom
- rotational petal timing
- growth illusion
- center-out sculpture logic

Commercial status:

- Yellow. No open reuse license found. Use as reference only unless rights are cleared.

### Center for Visual Music - Jordan Belson / James Whitney / John Whitney / Oskar Fischinger

URLs:

- https://www.centerforvisualmusic.org/JordanBelson/
- https://www.centerforvisualmusic.org/JamesWhitney/
- https://www.centerforvisualmusic.org/JohnWhitney/
- https://www.centerforvisualmusic.org/OskarFischinger/
- https://www.centerforvisualmusic.org/Belson
- https://centerforvisualmusic.org/Belson/

Why it matters:

- Strong historical bridge between mandala, cosmic tunnel, abstract light, spiritual visual music, and algorithmic motion.

Use for:

- cosmic aura
- point mandala
- visual music timing
- restrained sacred abstraction
- moving-light composition

Commercial status:

- Red. Rights-managed archival material. Do not reuse frames or film material.

## Structural Reference Clusters

### A. Infinite Zoom / Recursive Tunnel / Droste Logic

References:

- OSAR logspherical: https://www.osar.fr/notes/logspherical/
- Zoomquilt: https://zoomquilt.org/
- Droste effect background: https://en.wikipedia.org/wiki/Droste_effect
- Escher-like recursive image logic as composition grammar, not surface style

What to steal:

- Center-anchored compositions with strong foveal pull.
- Nested shells or rings that preserve orientation through zoom.
- Integer loop counts in log-radius space.
- Composition that reveals new detail every scale octave.
- Repeatable scale landmarks so infinite zoom does not become pure blur.

Implementation notes:

- Animate `log(r)` with modulo space, not raw radius.
- Keep rotation count integer over the loop.
- If camera advances, loop it on an integer spatial period.
- Avoid unique landmarks that appear only once unless they also recur on the scale lattice.

### B. Kaleidoscope / Mandala / Radial Fold

References:

- The Book of Shaders patterns and shaping:
  - https://thebookofshaders.com/05/
  - https://thebookofshaders.com/07/
  - https://thebookofshaders.com/09/
- John Edmark: https://www.johnedmark.com/
- Center for Visual Music / Belson + Whitney:
  - https://www.centerforvisualmusic.org/JordanBelson/
  - https://www.centerforvisualmusic.org/JamesWhitney/

What to steal:

- Segment folding before heavy warp.
- Radial petal layering with different angular velocities.
- Breathing rings instead of only spinning rings.
- Symmetry changes as sectional transitions: 6-way -> 8-way -> 12-way.
- Center/ring/gate hierarchy rather than flat mirror repetition.

Implementation notes:

- Fold angle before expensive pattern/fractal evaluation.
- Use smooth abs or smoothed mirror folds to avoid hard seam lines.
- Layer 4-fold cardinal gate structure with 8/12-fold outer filigree.
- Keep the central void intentional.

### C. 3D Fractal Body / Cave / Corridor / Tunnel

References:

- IQ Menger: https://iquilezles.org/articles/menger/
- Mandelbulb historical reference: https://blog.hvidtfeldts.net/index.php/2011/07/mandelbulb-3d-fractal/
- Fractal Forums: https://fractalforums.org/
- Julius Horsthuis fractal films

What to steal:

- Raymarched interior geometry, not just 2D UV tricks.
- Alternating open-space and dense-detail bands.
- Fog and glow as depth separators.
- Orbit-trap-driven material color instead of flat palette application.
- Camera exploration through formula-space.

Implementation notes:

- Use SDF/fractal structure behind screen-space mandala.
- Give scale through fog, AO, shadows, and aperture-like center.
- Separate body, iridescence, and atmosphere if possible.

### D. Psychedelic Visual-Language / Form Constants

References:

- Heinrich Kluver form constants: https://en.wikipedia.org/wiki/Form_constant
- Bressloff et al. geometric visual hallucinations:
  - https://pubmed.ncbi.nlm.nih.gov/11860679/
  - https://doi.org/10.1162/089976602760128018

Why these matter:

- They explain why tunnels, lattices, cobwebs, spirals, and honeycombs read as hallucinatory without copying specific artworks.
- They help design preset families with strong motif identity.

Form-constant translations:

- tunnel/funnel -> central travel through recursive shells
- spiral -> rotating inward helix or galaxy
- lattice -> honeycomb, checker, woven veil
- cobweb -> radial spokes plus rings

Implementation primitive mapping:

- tunnel/funnel -> log-polar zoom, camera Z modulo, radial fog
- spiral -> angle plus radius twist
- lattice -> hex/truchet/Voronoi patterns
- cobweb -> polar grid SDF and ring mask

## Artist And Film References

### Jordan Belson

URLs:

- https://www.centerforvisualmusic.org/JordanBelson/
- https://www.centerforvisualmusic.org/Belson
- https://centerforvisualmusic.org/Belson/

Keywords:

- cosmic void
- radiating center
- temple-space
- plasma mandala
- sacred celestial experience
- meditative light fields

Use:

- slow center-breath motion
- soft radial fields
- central sun/void
- cosmic aura
- restrained visual intensity

Do not:

- use film stills or motion material
- remix or project Belson films

### James Whitney

URLs:

- https://www.centerforvisualmusic.org/JamesWhitney/
- https://www.centerforvisualmusic.org/WMEnlightenment.html
- https://www.centerforvisualmusic.org/library/WMJamesWRetro.htm
- https://lightcone.org/en/film-1549-lapis

Keywords:

- bead-like radial motion
- spiritual mandala precision
- point mandala
- alchemical motion
- dot fields

Use:

- point field mandala engine
- additive particles
- ring phase offsets
- positive/negative space inversion

### John Whitney

URLs:

- https://www.centerforvisualmusic.org/JohnWhitney/
- https://www.oscars.org/film-archive/collections/whitney-collection
- https://lightcone.org/en/film-1556-arabesque
- https://www.acmi.net.au/works/114089--arabesque/

Keywords:

- analog/digital computer motion
- harmonic visual structure
- Arabesque
- algorithmic elegance

Use:

- harmonic ratios
- Lissajous/epicycle curves
- music-like geometry
- algorithmic mandala blooming

### Oskar Fischinger

URLs:

- https://www.centerforvisualmusic.org/OskarFischinger/
- https://www.centerforvisualmusic.org/Fischinger/OFFilmnotes.htm
- https://lightcone.org/en/film-509-motion-painting-n-1

Keywords:

- abstract music visualization
- shape choreography
- motion painting
- stepwise visual development

Use:

- staggered reveals
- painted growth overlays
- time-composed visual form

### John Edmark

URL:

- https://www.johnedmark.com/

Keywords:

- phyllotaxis bloom
- rotational illusion
- Fibonacci growth
- kinetic sculpture

Use:

- golden-angle petal offsets
- center-out bloom
- rotational increments that produce perceptual strobing

### Scott Draves / Electric Sheep

URL:

- https://electricsheep.org/

Keywords:

- fractal flame morphing
- luminous transcendental color
- collective evolving abstract animation

Use:

- long-form morphing
- slow color field transformation
- living attractor feel

## Technical References By Production Problem

### Need A Seamless Infinite Inward Zoom

References:

- OSAR logspherical
- Zoomquilt
- Droste effect
- log-polar mapping

Rules:

- Animate `log(r)` with modulo space, not raw radius.
- Keep rotation count integer over the loop.
- Keep camera advance on integer spatial periods.
- Avoid non-recurring landmarks.
- Use phase-locked palette/camera/fold/time.

### Need "DMT Tunnel" Intensity Without Muddy Noise

Rules:

- Use orbit traps, sharp symmetry folds, and nested SDF repetition before adding bloom.
- Let palette and trap values do the hallucination work.
- Bloom should amplify structure, not replace it.
- Prefer 2-3 readable scales on screen at once.
- Use central Chrysanthemum + edge Schnorkel + midground Plasmatis.

### Need A Mandala That Does Not Feel Generic

Layer systems:

- outer slow radial petals
- mid-frequency cell/truchet rings
- inner tunnel core
- tiny high-frequency sparkle or vein network

Break sameness with:

- slight phase offsets between rings
- alternating segment counts
- differential color cycling across near/mid/far depth bands
- explicit cardinal gates

## Strong Local References Already In Repo

- `docs/plans/2026-04-23-dmt-tunnel-design.md`
  - log-polar + kaleidoscope + Mandelbox hybrid direction
- `src/shaders/dmt-tunnel.frag`
  - procedural tunnel shader with Kali IFS, channel offsets, AgX tonemap
- `src/sketches/dmt-tunnel.ts`
  - fullscreen quad runner, config loading, loop normalization
- `src/sketches/dmt-config.ts`
  - DMT config contract
- `public/dmt-config-a.json` to `public/dmt-config-d.json`
  - current variant bank
- `src/lib/effect-composer.ts`
  - kaleidoscope, mandala overlay, aura, bloom, feedback, post stack
- `public/presets/shader-dev-mandala-flow.json`
  - layered polar twist, domain warp, IQ palette, kaleidoscope, mandala pass
- `public/presets/shader-dev-sacred-geometry.json`
  - SDF/star/Julia/Voronoi/kaleidoscope direction
- `public/presets/shader-dev-psychedelic-fractal.json`
  - Julia, Worley, aura/god-rays, film grade
- `src/shaders/sketches/fractal-cave.frag`
  - raymarching, SDF, CSG, AO, soft shadow
- `scripts/export-dmt.ts`
  - production capture
- `scripts/validate-loop.ts`
  - loop validation
- `scripts/shader-compile-check.ts`
  - browser shader compile smoke
- `docs/shader-dev-manual.md`
  - implemented technique inventory

## Production Design Principles

### Infinite Loop Discipline

All loopable systems must express time as phase:

```glsl
float phase = fract(uTime / uLoopDuration);
float loopAngle = phase * TAU * float(integerTurns);
```

Rules:

- Zoom uses log-space modulo, not raw radius drift.
- Rotation, camera travel, palette phase, fold offset, and noise loops must all close.
- Use integer turn counts for rotation and camera travel.
- If using noise, sample periodic coordinates.
- Avoid one-off landmarks unless scale-periodic.

### Psychedelic Clarity

Layered legibility:

1. Large-scale read: tunnel, mandala, cave, lattice, entity.
2. Mid-scale structure: petals, truchet cells, orbit traps, Voronoi veins.
3. Micro-detail: sparks, edge shimmer, CA, fine lines.
4. Depth separation: fog, glow falloff, AO, luminance hierarchy.
5. Color system: one dominant palette plus controlled channel separation.

### Commercial Differentiation

Enforce:

- named shot families
- distinct geometry stack per family
- license-cleared implementation primitives
- loop proof
- parameter source-of-truth
- export evidence
- source ledger

## Anti-Amateur Checklist

Use this during render review before calling a variant "masterpiece" or commercial-ready.

- No literal Alex Grey eyes or copied anatomy-energy diagrams.
- No copied Shipibo-Konibo kene linework.
- No copied Pablo Amaringo serpents, spirits, plant teachers, or celestial palaces.
- No unlicensed Shadertoy code in commercial output.
- No all-rainbow palette without value hierarchy.
- No bloom hiding weak structure.
- No random kaleidoscope post effect as the whole concept.
- No infinite zoom without scale landmarks.
- No fractal noise without subject, depth, or rhythm.
- No DMT entity reduced to a generic alien face.
- No cultural motifs without context, collaboration, or permission.
- No non-loop-safe time terms in a final loop render.
- No render without reproducible config, shader path, and command.

## Full Production Workflow

### Intake

1. Choose target family from taxonomy.
2. Choose references from registry/canon.
3. Mark every reference Green, Yellow, Red.
4. Decide whether output is direct implementation, inspired implementation, or mood-only.

### Design

1. Write one-line shot intent.
2. Choose geometry stack.
3. Define loop period, resolution, FPS, export target.
4. Define palette and post-FX limits.
5. Define verification criteria before rendering.

### Implementation

1. Edit shader/config.
2. Keep preset/config as source of truth.
3. Avoid manual one-offs that cannot be replayed.
4. Record source influence and license class.

### Verification

```bash
npm run check:shaders
npm run test -- src/lib/effect-composer.test.ts src/shaders/sketches/fractal-cave.test.ts scripts/shader-compile-check.test.ts src/lib/docs-manual.test.ts
npm run pipeline:validate
```

Final candidate checks:

- file exists
- correct resolution/FPS
- no console shader errors
- first/final frame loop proof
- no unresolved Red/Yellow direct-use assets

---

# PART II - Full Masterpiece Artwork Canon

## Purpose

This canon identifies master-level works and movements whose visual grammar can be translated into original commercial-safe infinite-loop fractal and mandala videos.

It is not a generic inspiration list. It is a structured sourcebook for extracting:

- composition
- palette architecture
- motion grammar
- symbolic layering
- entity design principles
- sacred geometry structure
- visual-music pacing
- fractal cinema scale

## What "Masterpiece-Level" Means

A reference qualifies if it has at least three:

- recognized influence on psychedelic, visionary, visual-music, or fractal art
- repeatable visual grammar translatable into procedural animation
- deep compositional architecture
- relation to altered-state perception
- production lesson for loopable video
- high risk of generic copying, requiring structural extraction

## Canon Map

| Cluster | Masters | What To Extract |
| --- | --- | --- |
| Anatomical cosmic visionary | Alex Grey, Allyson Grey | translucent bodies, psychic energy grids, universal lattice |
| Amazonian ayahuasca visionary | Pablo Amaringo, Shipibo-Konibo kene, Sara Flores | dense spirit worlds, plant/entity ecology, geometric song-lines |
| Fantastic realism / old-master visionary | Ernst Fuchs, Mati Klarwein, Robert Venosa, Martina Hoffmann | jewel glazing, sacred surrealism, mythic body-architecture |
| Contemporary festival / digital visionary | Android Jones, Luke Brown, Amanda Sage | hyperdimensional beings, live-energy color, digital mandala entities |
| Visual music cinema | Jordan Belson, James Whitney, John Whitney, Oskar Fischinger | abstract sacred motion, dot mandalas, audiovisual geometry |
| Fractal / immersive cinema | Julius Horsthuis, Douglas Trumbull | infinite worlds, slit-scan tunnel, fulldome recursion |

## Alex Grey - Sacred Mirrors / Universal Mind Lattice / Psychic Energy System

Primary sources:

- https://www.alexgrey.com/art/sacred-mirrors/sacred-mirrors-frame/
- https://www.cosm.org/vision/use-of-art
- https://www.cosm.org/visit/mushroom-cafe/alex-grey

Why master-level:

- `Sacred Mirrors` is a canonical contemporary visionary art body.
- `Psychic Energy System`, `Spiritual Energy System`, and `Universal Mind Lattice` bridge body, aura, grid, and cosmic field.
- Strong anatomy-to-energy translation model.

What to extract:

- Multi-layer transparency: skin -> nervous system -> aura -> lattice -> cosmic field.
- Central standing/seated figure as calibration object.
- Energy lines obey body topology.
- Lattice field reads as universal intelligence.

Shader translation:

- transparent central silhouette or depth-mask subject
- nested line fields using SDF curves and Voronoi veins
- rim aura plus inner glow
- parametric node-edge net with parallax

Commercial status:

- Red. Direct reuse blocked unless permission.

## Allyson Grey - Secret Writing / Chaos, Order, Secret Writing

Sources:

- https://www.cosm.org/vision/team
- https://www.cosm.org/vision/use-of-art

Why master-level:

- Distinct symbolic layer: glyphs feel like language but remain nonliteral.
- DMT reports often include impossible writing or information-dense symbolic fields.

What to extract:

- chaos field
- order grid
- secret writing overlay
- glyph density gradients
- script as rhythm carrier

Shader translation:

- pseudo-glyph SDF strokes in polar tiles
- glyph reveal by loop phase
- abstract enough to avoid copying exact symbols

Commercial status:

- Red.

## Pablo Amaringo - Ayahuasca Visions / Vision of the Snakes / Kapukiri

Sources:

- https://www.randomhousebooks.com/books/2743
- https://ayahuasca.com/gallery/featured-art/the-ayahuasca-visions-of-pablo-amaringo/
- https://trueamaringos.com/paintings/
- https://www.hgcharing.com/books/the-ayahuasca-visions-of-pablo-amaringo

Why master-level:

- Foundational Amazonian visionary painting corpus.
- `Ayahuasca Visions` documents nearly 50 paintings as religious iconography and visionary narrative.
- Captures simultaneity: spirits, serpents, plant teachers, palaces, animals, celestial vehicles, rivers, healing scenes.

What to extract:

- dense all-over composition without empty space
- serpentine energy as path, border, carrier, entity
- layered forest/water/sky/celestial architecture
- repeated plant/entity motifs as ecosystem

Shader translation:

- layered procedural masks
- serpent curves
- leaf lattices
- star palaces
- water ripples
- vision ecology system with layer roles

Commercial status:

- Red/Yellow. Rights and cultural sensitivity.

## Shipibo-Konibo Kene / Sara Flores / Amazonian Geometric Song-Lines

Sources:

- https://www.quaibranly.fr/en/professionals/touring-exhibitions/shamanic-visions-1
- https://www.quaibranly.fr/en/exhibitions-and-events/at-the-museum/exhibitions/event-details/e/shamanic-visions-40094
- https://shipiboshamanism.com/en/kene.html

Why master-level:

- Non-Western geometric system where pattern, song, healing, and cosmology are linked.
- Quai Branly frames Shipibo-Konibo geometry as central to ayahuasca image production.

What to extract:

- continuous angular line grammar
- pattern as vibration/song
- labyrinthine paths with controlled density
- fine line plus field relation

Shader translation:

- respectful song-line lattice inspired by line-as-vibration
- polar L-systems
- truchet
- Voronoi ridges
- do not copy sacred/community symbols

Commercial status:

- Red/Yellow. High cultural-appropriation risk.

## Robert Venosa - Ayahuasca Dream / Illuminatus / OMNI Visionary Surrealism

Sources:

- https://www.venosa.com/
- https://www.venosa.com/celestial-enteties
- https://www.venosa.com/omni-magazine
- https://www.venosa.com/exhibitions

Why master-level:

- Central Western visionary painter translating entheogenic states into polished fantastic realism.
- `Ayahuasca Dream` bridges Amazonian visionary art and Western old-master technique.

What to extract:

- organic entities emerging from light fields
- gemlike dimensional shading
- alien/spiritual beings inside coherent spatial scenes
- soft-edged morphing forms retaining anatomy and intention

Shader translation:

- orbit-trap color as entity emergence
- SDF body forms + translucent volumetric halos
- specular jewel highlights
- biological curves

Commercial status:

- Red/Yellow.

## Martina Hoffmann - Inner Landscapes / Universal Woman

Sources:

- https://www.martinahoffmann.com/
- https://www.martinahoffmann.com/biography
- https://artgallery.qcc.cuny.edu/profile/martina-hoffmann/

Why master-level:

- Feminine visionary realism, inner landscapes, expanded consciousness.
- Brings presence, mythic body, and emotional intimacy.

What to extract:

- figure intimacy inside cosmic space
- sacred feminine archetype as anchor
- warm embodied color fields
- shadow/light duality

Shader translation:

- central archetype silhouette or face-like pareidolia field
- slower breathing aura
- less high-frequency chaos near figure

Commercial status:

- Red/Yellow.

## Mati Klarwein - Aleph Sanctuary / Annunciation / Bitches Brew

Sources:

- http://www.matiklarweinart.com/
- https://www.galacticresonance.org/exhibit/mati-klarwein/
- https://outsiderart.co.uk/portfolio/mati-klarwein/
- https://peoplesgdarchive.org/item/2701/bitches-brew

Why master-level:

- Deep LSD-era visual painter.
- Global symbolism, sacred eroticism, surreal ecology, album-cover scale impact.
- `Aleph Sanctuary` is an immersive cubic temple, not just an image.

What to extract:

- symbolic simultaneity
- doorway/temple as vision container
- planetary, ritual, erotic, cosmic layers
- micro-scenes embedded in macro symbols

Shader translation:

- vision cube loop
- recursive panels rotating inward
- nested frame-within-frame structure
- procedural glyph panels

Commercial status:

- Red/Yellow.

## Ernst Fuchs - Vienna School of Fantastic Realism / Planeta Caelestis

Sources:

- https://www.wien.info/en/see-do/sights-from-a-to-z/ernst-fuchs-museum-345232
- https://www.visitingvienna.com/sights/museums/ernst-fuchs/
- https://visionary.art/art-history-theory/an-introduction-to-ernst-fuchs/
- https://www.gallery-vienna.com/artists/fuchs-ernst/

Why master-level:

- Root node for contemporary visionary art.
- Old-master technique, religious/mythic symbolism, dream/hallucination imagery.
- Technical lineage into Klarwein, Venosa, Sage, and broader visionary art.

What to extract:

- layered glaze depth
- precise drawing
- sacred architecture
- mannerist body shapes
- apocalyptic/celestial symbolism

Shader translation:

- compositional hierarchy
- architectural frame logic
- cathedral/frieze structures
- linework and volumetric light as sacred object

Commercial status:

- Red/Yellow.

## Android Jones - SAMSKARA / Electro-Mineralism / Live Experiences

Sources:

- https://androidjones.com/pages/press
- https://androidjones.com/pages/gallery
- https://americanart.si.edu/exhibitions/burning-man/online/android-jones

Why master-level:

- Major contemporary digital visionary reference for immersive projection, festivals, VR/AR, live performance.
- `SAMSKARA` is a 360 dome journey through consciousness and cosmos.

What to extract:

- hyperdigital entities
- layered symmetry + painterly digital brush energy
- dome/VR immersion
- energy fields around faces and animal/human archetypes

Shader translation:

- electric mineral palettes
- chrome, jewel, neon, metallic warmth
- entity pareidolia in center of fractal fields
- holographic material logic

Commercial status:

- Red/Yellow.

## Luke Brown - Sophia / Apotheosis / Quintessence / Vishvarupa

Sources:

- https://www.lukebrownart.com/about-artist-luke-brown
- https://www.lukebrownart.com/paintings
- https://www.lukebrownart.com/digital-art

Why master-level:

- Extreme precision visionary painting.
- Fractal anatomies, deities, portals, hyperdimensional beings.
- Directly relevant to DMT entity + mandala + fractal anatomy target.

What to extract:

- entity inside symmetrical radiant architecture
- micro-detail with hand intent
- vertical deity/portal composition
- eyes, masks, guardians, sacred animals

Shader translation:

- central entity silhouette from mirrored SDF/texture masks
- fractal filigree and radial orbit traps
- stable entity read while background loops

Commercial status:

- Red/Yellow.

## Amanda Sage - Regeneration / Transformational Portraiture

Sources:

- https://www.amandasage.com/
- https://www.amandasagecollection.com/pages/about
- https://nomosjournal.org/2013/08/carrying-the-torch-into-the-new-world/

Why master-level:

- Fuchs/Vienna lineage extended into contemporary transformational art, live painting, festival culture.

What to extract:

- portrait/figure as gateway
- egg/seed/portal motifs
- warm color waves around grounded figure
- live-painting immediacy with craft

Shader translation:

- portal portrait family
- central figure calm, surrounding field blooming
- slow regenerative loops

Commercial status:

- Red/Yellow.

## Julius Horsthuis - Fraktaal / Fractal Time / Geometric Properties / Recombination

Sources:

- https://www.julius-horsthuis.com/
- https://www.julius-horsthuis.com/fraktaal/
- https://www.julius-horsthuis.com/fractal-time
- https://www.julius-horsthuis.com/geometric-properties
- https://www.fddb.org/fulldome-shows/recombination-the-fulldome-journey/

Why master-level:

- Current gold standard for cinematic fractal worlds and immersive fractal dome experiences.
- `Fraktaal` demonstrates world-building from formula exploration.
- `Fractal Time` and `Geometric Properties` show fractals as architecture, nature, existential space.

What to extract:

- fractal worlds feel discovered
- camera through architecture-scale formulas
- math repetition becomes landscape/temple/machine/organism
- peripheral detail matters

Shader translation:

- camera paths through SDF/fractal worlds
- fog and scale cues
- cathedral/jungle/machine/cosmic city variants

Commercial status:

- Yellow/Red.

## Jordan Belson - Allures / Samadhi / Mandala / Chakra / LSD

Sources:

- https://www.centerforvisualmusic.org/Belson
- https://centerforvisualmusic.org/Belson/
- https://www.centerforvisualmusic.org/store/

Why master-level:

- Abstract cinema that feels sacred, cosmic, altered-state without representational overload.
- CVM frames Belson as major visual music artist evoking sacred celestial experiences.

What to extract:

- slow radiating center
- soft cosmic gradients
- sacred abstraction through restraint
- light as subject

Shader translation:

- cosmic aura preset
- soft radial fields
- central sun/void
- respiratory modulation
- avoid over-detail

Commercial status:

- Red.

## James Whitney - Yantra / Lapis / Dwija

Sources:

- https://www.centerforvisualmusic.org/WMEnlightenment.html
- https://www.centerforvisualmusic.org/library/WMJamesWRetro.htm
- https://lightcone.org/en/film-1549-lapis
- https://www.oscars.org/film-archive/collections/whitney-collection

Why master-level:

- `Lapis` is one of the most precise mandala motion references ever made.
- `Yantra` and `Lapis` connect point fields, mandala, alchemy, visual music, meditative perception.

What to extract:

- dots as living particles
- positive/negative space inversion
- inward/outward pulse
- micro-points create macro-sacred geometry

Shader translation:

- point-mandala engine
- polar rings
- loop-locked ring phase
- additive glow
- central void

Commercial status:

- Red.

## John Whitney - Arabesque / Catalog / Permutations

Sources:

- https://www.oscars.org/film-archive/collections/whitney-collection
- https://lightcone.org/en/film-1556-arabesque
- https://www.acmi.net.au/works/114089--arabesque/

Why master-level:

- `Arabesque` is foundational computer-animation work for psychedelic blooming geometry.
- Bridges Islamic geometry, algorithmic motion, and visual music.

What to extract:

- harmonic curves
- geometric blooming
- music-like visual structure
- algorithmic elegance

Shader translation:

- Lissajous/epicycle mandala
- harmonic ratios for petal counts and phase offsets
- audio analysis through harmonic parameters later

Commercial status:

- Red/Yellow.

## Oskar Fischinger - Motion Painting No. 1 / An Optical Poem

Sources:

- https://www.centerforvisualmusic.org/Fischinger/OFFilmnotes.htm
- https://lightcone.org/en/film-509-motion-painting-n-1

Why master-level:

- Older visual-music discipline behind later psychedelic abstraction.
- Pure abstract motion can feel composed, emotional, inevitable.

What to extract:

- abstract forms unfolding step-by-step
- visual rhythm as composition
- controlled timing

Shader translation:

- painted growth overlays
- shapes accrete over loop and resolve back
- easing, delays, staggered reveals

Commercial status:

- Red/Yellow.

## Douglas Trumbull / 2001 Stargate Sequence

Sources:

- https://2001archive.org/resources/the-special-effects-of-2001-a-space-odyssey/
- https://stage.movingimage.org/feature/2001-a-space-odyssey/
- https://peoplesgdarchive.org/item/4040/stargate-sequence-2001-a-space-odyssey

Why master-level:

- Definitive cinematic interdimensional tunnel.
- Slit-scan look remains one of the strongest references for DMT tunnel travel.

What to extract:

- vanishing-perspective light corridors
- long-exposure streaks
- color fields rushing past viewer
- abstract travel through scale and speed

Shader translation:

- radial slit-scan emulation
- horizontal/vertical strips stretched toward center
- log-polar zoom
- hard luminous bands + chemical overlays

Commercial status:

- Red.

## Practical Masterpiece Translation Matrix

| Desired Output | Primary Masters | Procedural Translation |
| --- | --- | --- |
| DMT entity portal | Alex Grey, Luke Brown, Android Jones | central silhouette/entity + aura grid + radial fractal filigree |
| Ayahuasca ecosystem | Pablo Amaringo, Shipibo kene, Martina Hoffmann | layered plant/serpent/song-line motifs with respectful abstraction |
| Cosmic mandala film | James Whitney, Jordan Belson, Oskar Fischinger | point mandala + soft aura + restrained visual music timing |
| Infinite fractal cathedral | Julius Horsthuis, Ernst Fuchs, OSAR, IQ | SDF/fractal architecture + log-spherical recursion + sacred framing |
| LSD optical poster motion | Mati Klarwein, John Whitney, Trumbull | high-contrast symbolic panels + harmonic curves + slit-scan tunnel |
| Festival-grade hyperdigital | Android Jones, Amanda Sage, Luke Brown | holographic materials + entity pareidolia + jewel palette + bloom discipline |

---

# PART III - Full Shader / VFX Research Synthesis

## Why Previous Attempts Failed

v46 failure modes:

- Surface-hit-and-shade paradigm -> plastic CG look, not atmospheric.
- Fixed fractal parameters -> dead, no breathing.
- Simple tonemap -> digital HDR smash, not film.
- Single-layer fractal -> no churn/life.
- Monochrome integration path -> no rainbow glancing.

## Tier 1 - Shader Technique

Research files:

- `docs/research/dmt-shaders/*.glsl`

## DMT Art Code / Math Deep Dive

This section is the implementation-grade math stack for DMT-style visuals. Use it when moving from visual reference to actual shader code.

### 1. Sphere Tracing / Signed Distance Fields

Primary references:

- John C. Hart, `Sphere Tracing: A Geometric Method for the Antialiased Ray Tracing of Implicit Surfaces`: https://experts.illinois.edu/en/publications/sphere-tracing-a-geometric-method-for-the-antialiased-ray-tracing
- IQ distance functions: https://iquilezles.org/articles/distfunctions/
- Fragmentarium / distance-estimated fractals: https://syntopia.github.io/Fragmentarium/

Core idea:

- A signed distance function estimates how far the current ray point is from the nearest surface.
- Sphere tracing advances by that distance so it can safely approach implicit geometry.
- This is the backbone for DMT fractal caves, entity bodies, mandala architecture, and recursive tunnels.

Minimal project-safe skeleton:

```glsl
float march(vec3 ro, vec3 rd) {
  float t = 0.0;
  for (int i = 0; i < 160; i++) {
    vec3 p = ro + rd * t;
    float d = sceneDE(p);
    if (d < 0.001) return t;
    if (t > 80.0) break;
    t += d * 0.85;
  }
  return -1.0;
}
```

DMT translation:

- Use for cathedral tunnels, entity shells, fractal flowers, and sacred geometry interiors.
- Combine with volumetric glow so the result is not only hard-surface CG.
- Keep a safety multiplier such as `0.75-0.9` for unstable fractal DEs.

Commercial class:

- Hart paper and IQ concepts are safe as math references; preserve code licenses for snippets.

### 2. Mandelbulb Distance Estimation

Primary references:

- Mandelbulb overview: https://www.mandelbulb.com/about/
- Paul Bourke Mandelbulb notes: https://paulbourke.net/fractals/bulb/
- Syntopia Mandelbulb / DE series: https://blog.hvidtfeldts.net/index.php/category/distance-estimation/
- Dynamic Mandelbulb fractals, 2025: https://www.sciencedirect.com/science/article/pii/S0960077925008422

Core math:

- Mandelbulb extends Mandelbrot iteration into 3D via spherical coordinates.
- Common power is 8.
- Distance estimate typically follows the form:

```text
d ~= 0.5 * log(r) * r / dr
```

Project-safe conceptual GLSL:

```glsl
float mandelbulbDE(vec3 p, float power) {
  vec3 z = p;
  float dr = 1.0;
  float r = 0.0;
  for (int i = 0; i < 10; i++) {
    r = length(z);
    if (r > 4.0) break;
    float theta = acos(z.z / max(r, 1e-6));
    float phi = atan(z.y, z.x);
    dr = pow(r, power - 1.0) * power * dr + 1.0;
    float zr = pow(r, power);
    theta *= power;
    phi *= power;
    z = zr * vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta)) + p;
  }
  return 0.5 * log(r) * r / dr;
}
```

DMT translation:

- Organic bulbous entity bodies.
- Chrysanthemum fractal flower core.
- Breakthrough variant with spiky power > 8.
- Use in-loop sinusoidal displacements for "living" geometry, but phase-lock them for seamless loops.

Commercial class:

- Mathematical formulation is usable; do not copy non-permissive shader implementations.

### 3. Mandelbox / Box Fold + Sphere Fold

Primary references:

- Syntopia Mandelbox DE: https://blog.hvidtfeldts.net/index.php/2011/11/distance-estimated-3d-fractals-vi-the-mandelbox/
- FractalForums Mandelbox DE discussion: https://www.fractalforums.com/3d-fractal-generation/a-mandelbox-distance-estimate-formula/
- Jos Leys Mandelbox article: https://images-des-maths.pages.math.cnrs.fr/freeze/Mandelbox.html

Core operations:

- Box fold reflects space across cube bounds.
- Sphere fold inverts or scales points near/inside radii.
- Repeated fold-scale-offset creates architectural 3D fractal structure.

Project-safe conceptual GLSL:

```glsl
void boxFold(inout vec3 z, inout float dr) {
  z = clamp(z, -1.0, 1.0) * 2.0 - z;
}

void sphereFold(inout vec3 z, inout float dr) {
  float r2 = dot(z, z);
  float minR2 = 0.25;
  float fixedR2 = 1.0;
  if (r2 < minR2) {
    float s = fixedR2 / minR2;
    z *= s; dr *= s;
  } else if (r2 < fixedR2) {
    float s = fixedR2 / r2;
    z *= s; dr *= s;
  }
}
```

DMT translation:

- More architectural than Mandelbulb.
- Good for "fractal cathedral", "folding rooms", and machine-like waiting-room geometry.
- Mix with soft kaleidoscope and fog to avoid concrete-block look.

Commercial class:

- Use as mathematical concept; audit code source if copied.

### 4. Kaleidoscopic IFS / KIFS

Primary references:

- Fragmentarium examples: https://syntopia.github.io/Fragmentarium/
- Knighty KIFS discussion: https://www.fractalforums.com/ifs-iterated-function-systems/kaleidoscopic-%28escape-time-ifs%29
- Syntopia hybrid systems / geometric orbit trapping: https://blog.hvidtfeldts.net/index.php/2012/05/distance-estimated-3d-fractals-part-viii-epilogue/

Core idea:

- Fold space across symmetry planes.
- Rotate or stretch between folds.
- Repeat transformation to create recursive symmetric structures.

Project-safe conceptual fold:

```glsl
void tetraFold(inout vec3 p) {
  if (p.x + p.y < 0.0) p.xy = -p.yx;
  if (p.x + p.z < 0.0) p.xz = -p.zx;
  if (p.y + p.z < 0.0) p.zy = -p.yz;
}
```

DMT translation:

- Entity bodies made of mirrored sacred planes.
- Hyperspatial mandala shells.
- Machine-elf geometries.
- Very useful for "intelligent geometry" because folds imply intention.

Commercial class:

- FractalForums code is reference-only unless license is clear. Rebuild in-house.

### 5. Log-Polar / Droste / Moebius Mapping

Primary references:

- OSAR log-spherical mapping: https://www.osar.fr/notes/logspherical/
- Leiden Escher/Droste project: https://www.universiteitleiden.nl/en/research/research-projects/science/escher-and-the-droste-effect
- Max Planck lecture page: https://www.mpim-bonn.mpg.de/node/2879

Core idea:

- Convert radius to logarithmic axis.
- Translate along log-radius for an infinite zoom.
- Add angle as a second coordinate for spiral/Droste behavior.

Project-safe conceptual GLSL:

```glsl
vec2 logPolar(vec2 p, float phase, float turns) {
  float r = max(length(p), 1e-5);
  float a = atan(p.y, p.x);
  return vec2(log(r) - phase, a / 6.2831853 * turns);
}
```

DMT translation:

- Infinite inward tunnel.
- Chrysanthemum recursion.
- Folding-room paradox.
- Use Moebius-like inversion before log-polar mapping for richer curvature.

Commercial class:

- Use math concepts; do not copy OSAR page code/text without permission.

### 6. Polar Kaleidoscope / Angular Symmetry

Primary references:

- GLRE kaleidoscope math: https://glre.dev/addons/space/kaleidoscope
- IQ domain/symmetry operators: https://iquilezles.org/articles/distfunctions/

Core math:

```text
theta' = min(theta mod alpha, alpha - (theta mod alpha))
alpha = 2*pi / segmentCount
```

Project-safe conceptual GLSL:

```glsl
vec2 kaleido(vec2 p, float n) {
  float r = length(p);
  float a = atan(p.y, p.x);
  float seg = 6.2831853 / n;
  a = abs(mod(a + seg * 0.5, seg) - seg * 0.5);
  return vec2(cos(a), sin(a)) * r;
}
```

DMT translation:

- Do this before fractal sampling so symmetry is structural.
- Use 4-fold gates plus 8/12-fold outer filigree.
- Smooth fold seams for premium output.

Commercial class:

- Math is safe; specific implementations depend on source license.

### 7. Orbit Traps As Color, Geometry, And Intelligence

Primary references:

- Syntopia orbit trapping notes: https://blog.hvidtfeldts.net/index.php/category/distance-estimation/
- IQ fractal shaders in local archive and Shadertoy refs

Core idea:

- During iteration, store minimum distance to simple objects: axes, planes, sphere, cylinder, torus, line, or custom SDF.
- Use trap vector for color, AO, glow, or even geometry.

Project-safe conceptual GLSL:

```glsl
vec4 trap = vec4(1e6);
for (int i = 0; i < 10; i++) {
  z = fractalStep(z);
  trap.x = min(trap.x, abs(z.x));
  trap.y = min(trap.y, abs(z.y));
  trap.z = min(trap.z, abs(z.z));
  trap.w = min(trap.w, dot(z, z));
}
```

DMT translation:

- Trap channels become "intelligence signals."
- Use traps to stabilize entity faces, eye-like fields, jewel highlights, and aura line density.
- Avoid palette-only color; tie color to path history.

Commercial class:

- Concept safe; source-specific code must be audited.

### 8. Domain Repetition / Scale Repetition / Instance IDs

Primary references:

- IQ distance functions and domain repetition: https://iquilezles.org/articles/distfunctions/
- Mercury hg_sdf: http://mercury.sexy/hg_sdf/

Core idea:

- Repeat space before evaluating a primitive.
- Use cell ID for variation.

Project-safe conceptual GLSL:

```glsl
vec3 repeatCell(inout vec3 p, vec3 size) {
  vec3 id = floor((p + size * 0.5) / size);
  p = mod(p + size * 0.5, size) - size * 0.5;
  return id;
}
```

DMT translation:

- Infinite temple panels.
- Candyland/Legoland repeated blocks.
- Repeating gates in tunnel walls.
- Use ID hash to vary color/symbols without breaking loop.

Commercial class:

- IQ snippets may be MIT if marked; hg_sdf has its own license terms and must be checked.

### 9. Reaction-Diffusion / Gray-Scott / Turing Patterns

Primary references:

- Gray-Scott / Turing pattern paper: https://www.mdpi.com/2227-7390/11/6/1459
- Procedural texture survey: https://pmc.ncbi.nlm.nih.gov/articles/PMC7070409/
- Gray-Scott for 2D/3D pattern formation: https://www.sciencedirect.com/science/article/pii/S0010465523003193

Core idea:

- Two fields diffuse and react over time.
- Produces biological spots, stripes, coral, cellular, and morphogenetic patterns.

Project-safe conceptual update:

```text
du = diffU * laplace(U) - U*V*V + feed*(1-U)
dv = diffV * laplace(V) + U*V*V - (kill+feed)*V
```

DMT translation:

- Living skin on entities.
- Plasmatis gel midground.
- Biological aura textures.
- Background membranes that feel organic rather than noise-generated.

Commercial class:

- Equations are mathematical references. Implement original simulation code.

### 10. L-Systems / Botanical Growth / Serpent-Plant Geometry

Primary references:

- Algorithmic Botany publications: https://www.algorithmicbotany.org/papers/
- `The Algorithmic Beauty of Plants`: https://algorithmicbotany.org/papers/
- `The Artificial Life of Plants`: https://algorithmicbotany.org/papers/l-sys.sig95.html

Core idea:

- Rewrite symbols over iterations.
- Interpret symbols as turtle-graphics or branch-growth commands.

DMT translation:

- Plant teachers.
- Serpent-vine curves.
- Amaringo-inspired ecology without copying specific motifs.
- Use L-system output as masks or SDF strokes.

Commercial class:

- Use as mathematical/generative reference; respect publication and code licenses.

### 11. Voronoi / Worley / Cellular Geometry

Primary references:

- Blender Voronoi/Worley documentation: https://docs.blender.org/manual/en/3.6/render/shader_nodes/textures/voronoi.html
- Procedural texture survey: https://pmc.ncbi.nlm.nih.gov/articles/PMC7070409/

Core idea:

- Space is partitioned by nearest feature points.
- F1/F2 distances create cells, veins, cracks, and honeycomb.

Project-safe conceptual GLSL:

```glsl
float worley(vec2 p) {
  vec2 g = floor(p);
  vec2 f = fract(p);
  float d = 1e5;
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(x, y);
    vec2 h = hash22(g + o);
    d = min(d, length(o + h - f));
  }
  return d;
}
```

DMT translation:

- Honeycomb form constants.
- Jewel cells.
- Entity skin.
- Kene-adjacent line fields without copying actual kene patterns.

Commercial class:

- Math safe; code source license must be audited.

### 12. Flow Fields / Non-Overlapping Curves

Primary references:

- Flow-field curve systems as a math category for ornamental line motion.

Core idea:

- Curves follow a vector field.
- Premium line work comes from collision constraints, margin control, and selective variation.

DMT translation:

- Use flow fields for Schnorkel filigree.
- Use collision/no-overlap for premium line density.
- Use probabilistic palettes for hand-curated DMT color distributions.

Implementation hint:

- Precompute CPU/SVG/texture paths for high-quality curves, or approximate in shader with streamline advection.
- For real-time shader, use vector-field noise and signed stroke distance.

Commercial class:

- Hobbs artwork/algorithm details are reference-only; implement original code.

### 13. Thin-Film Interference / Iridescence

Primary references:

- Sun and Wang, `Interference Shaders of Thin Films`: https://diglib.eg.org/items/41eee7c7-6966-48a0-82a1-6fb769615dfa
- Maxon Thin Film Shader docs: https://help.maxon.net/c4d/en-us/Content/html/XTHINFILM.html
- Foundry Modo Thin Film material: https://learn.foundry.com/modo/12.2/content/help/pages/shading_lighting/shader_items/thin_film.html
- Nakamoto/Koike 2024 parameter estimation: https://www.jstage.jst.go.jp/article/mta/12/1/12_54/_article/-char/en

Core idea:

- Thin transparent films reflect light from front/back surfaces.
- Phase difference depends on wavelength, film thickness, view angle, and IOR.

Project-safe conceptual approximation:

```glsl
vec3 thinFilmApprox(float ndotv, float thickness) {
  vec3 lambda = vec3(680.0, 530.0, 440.0);
  vec3 phase = 6.2831853 * thickness * ndotv / lambda;
  return 0.5 + 0.5 * cos(phase + vec3(0.0, 2.1, 4.2));
}
```

DMT translation:

- Annihilation-style petrol slick.
- Entity shell iridescence.
- Rainbow at glancing angles.
- Separate pass for comp control.

Commercial class:

- Academic/renderer docs are references; implement original approximation unless license permits code reuse.

### 14. AgX / Filmic Color Management

Primary references:

- Blender 4.0 AgX release notes: https://developer.blender.org/docs/release_notes/4.0/color_management/
- Blender manual AgX: https://docs.blender.org/manual/en/4.3/render/color_management.html
- AgX implementation discussion/repositories should be source-audited before code reuse.

Core idea:

- AgX maps HDR render values into display range with better bright saturated color handling.
- Blender notes AgX replaces Filmic for new files and handles over-exposed colors more camera-like.

DMT translation:

- Neon colors can be pushed without ugly clipping.
- Highlights should roll toward white rather than flat channel clipping.
- Combine AgX with mild S-curve, vignette, and grain.

Commercial class:

- Use as color-management target. Code reuse depends on implementation license.

### 15. Loop Math / Periodic Time Discipline

Core rule:

```glsl
float phase = fract(uTime / loopDuration);
float cyc(float n) { return 6.2831853 * phase * n; }
```

Use:

- camera orbit: integer cycles
- fractal breath: integer cycles
- palette phase: integer cycles
- noise coordinate: circular phase

Project-safe examples:

```glsl
vec2 periodicNoiseSeed(float phase, float n) {
  float a = 6.2831853 * phase * n;
  return vec2(cos(a), sin(a));
}

vec3 loopOrbit(float phase) {
  return vec3(cos(cyc(2.0)), 0.35 * sin(cyc(3.0)), sin(cyc(2.0)));
}
```

DMT translation:

- The loop must feel like an eternal return, not a crossfade.
- Avoid non-integer incommensurate motion for final exports unless using a hidden seamless state reset.

## GLSL Reference Library For DMT Art

This is the practical GLSL-first reference stack. Prefer Green sources for direct reuse. Treat Yellow/Red sources as study material and rebuild the code yourself.

### Production-Safe / High-Value GLSL Libraries

| Reference | URL | Best For | DMT Use | Commercial Gate |
| --- | --- | --- | --- | --- |
| IQ distance functions | https://iquilezles.org/articles/distfunctions/ | SDF primitives, repetition, symmetry, smooth ops | fractal cathedral, mandala SDFs, tunnels | Green/Yellow depending snippet license |
| IQ palettes | https://iquilezles.org/articles/palettes/ | cosine palettes | DMT hue cycling, orbit-trap color | Green/Yellow |
| Mercury hg_sdf | https://mercury.sexy/hg_sdf/ | SDF primitive library, folds, domain ops | architectural SDFs, repetition, demoscene-style compactness | Yellow; check license before direct reuse |
| webgl-noise / Ashima + Stefan Gustavson | https://github.com/ashima/webgl-noise | MIT GLSL simplex/classic/cellular noise | fBm, domain warp, periodic noise, textureless noise | Green, MIT |
| Efficient Computational Noise in GLSL | https://www.tandfonline.com/doi/abs/10.1080/2151237X.2012.649621 | computational GLSL noise theory | textureless procedural detail | Paper/reference; code via MIT repo |
| LYGIA shader library | https://github.com/patriciogonzalezvivo/lygia | granular GLSL functions: math, SDF, color, filters, generative, lighting | fast prototyping and cross-language shader snippets | Yellow; dual license, verify commercial terms |
| glsl-tone-map | https://github.com/dmnsgn/glsl-tone-map | ACES, AgX, Uchimura, Lottes, Reinhard, Uncharted tonemaps | commercial finish stack | Green, MIT |
| GLRE kaleidoscope | https://glre.dev/addons/space/kaleidoscope | angular symmetry formula | polar/kaleido folds | Yellow; reference math |

### Shadertoy / Study-Only GLSL Targets

These are useful but should not be copied into commercial output unless each shader's license permits it.

| Shader / Family | URL | Extract | DMT Translation | Gate |
| --- | --- | --- | --- | --- |
| IQ Apollonian / inversion fractal | https://www.shadertoy.com/view/4ds3zn | inversion loop, orbit trap, AO | entity body, jewel fractal, central flower | Red/Yellow unless license permits |
| Log Moebius Transform | https://www.shadertoy.com/view/WtlyWs | complex inversion + log-polar zoom | infinite Droste tunnel | Red/Yellow |
| Way of Light | https://www.shadertoy.com/view/cdsSRf | volumetric accumulation | sacred light tunnel | Red/Yellow |
| IQ Mandelbulb | https://www.shadertoy.com/view/ltfSWn | Mandelbulb DE and shading | organic breakthrough fractal | Red/Yellow |
| IQ Menger | https://www.shadertoy.com/view/4sX3Rn | Menger SDF/raymarch | architectural fractal temple | Green if MIT header preserved in local archive |
| IQ Rainforest | https://www.shadertoy.com/view/4ttSWf | atmospheric fog/material integration | depth-rich background / forest-jungle variant | Red/Yellow |
| nimitz Protean Clouds | https://www.shadertoy.com/view/3l23Rh | volumetric density + dynamic stepping | tunnel fog and living atmosphere | Red, CC BY-NC-SA in local archive |
| mrange Truchet+Kaleid | https://www.shadertoy.com/view/7lKSWW | smooth kaleid, truchet planes | lattice/cobweb tunnel | Yellow/Red; mixed snippets |
| Psychedelic Ray Marching | https://www.shadertoy.com/view/MfsyDM | abstract raymarch palette/geometry | DMT body reference | Yellow until license audit |
| Pseudo-Kleinian | https://www.shadertoy.com/view/wtGGDR | Kleinian-like corridor geometry | entity breakthrough / folding room | Yellow until audit |
| Log Moebius Psyche | https://www.shadertoy.com/view/XdyXD3 | log/Moebius psychedelic warp | DMT tunnel warp | Yellow until audit |
| 3D Kleinian SDF | https://www.shadertoy.com/view/tc23Dt | Kleinian fractal body | deep fractal architecture | Yellow until audit |
| IFS Menger Fold | https://www.shadertoy.com/view/td2fzt | IFS/Menger folds + CA pass | machine geometry + chromatic separation | Yellow/Red |
| KIFS Playing | https://www.shadertoy.com/view/M3fXWl | KIFS recursive interior | hyperspace shell | Yellow until audit |

### Local GLSL Archive: Use This First

Local path:

- `docs/research/dmt-shaders/`

Use local files as study material because they are already in the repo and can be license-audited. Do not assume commercial safety.

| Local File | What To Study | Suggested Rebuild Target |
| --- | --- | --- |
| `4sX3Rn-menger.glsl` | IQ Menger DE, normal, soft shadow, AO-style material | `fractal-cave` / v47 cathedral |
| `WtscW4-blackle-concert-visuals.glsl` | concert-ready reflective SDF energy, CC0 header | v47d / VJ variant |
| `flXBzB-blackle-sine-sdf.glsl` | analytic sine SDF, Chebyshev-style distance | Schnorkel line math |
| `wsBBWD-mrange-spiral-galaxy.glsl` | polar spiral galaxy composition | spiral / central flower |
| `7lKSWW-mrange-truchet-kaleid.glsl` | truchet + smooth kaleidoscope | neuroform lattice |
| `3l23Rh-protean-clouds.glsl` | volumetric fog and dynamic march | atmospheric tunnel, concept only |
| `way-of-light.glsl` | luminous KIFS tunnel | sacred light cathedral, concept only |
| `XdyXD3-log-moebius-psyche.glsl` | log/Moebius warp | infinite DMT tunnel |
| `MfsyDM-psychedelic-raymarch.glsl` | psychedelic raymarch body | general DMT geometry |
| `ltfSWn-mandelbulb.glsl` | Mandelbulb DE | breakthrough flower/body |
| `tc23Dt-3d-kleinian.glsl` | Kleinian SDF | folding-room architecture |
| `wtGGDR-pseudo-kleinian.glsl` | pseudo-Kleinian corridor/cave | v47d entity breakthrough |
| `td2fzt-ifs-menger-fold.glsl` | Menger fold and chromatic pass | machine-elf geometry |
| `M3fXWl-kifs-playing.glsl` | KIFS recursive interior | hyperspace shell |
| `MlXSWX-shane-abstract-corridor.glsl` | abstract corridor pacing | tunnel wall logic |
| `4td3zj-shane-hex-truchet.glsl` | hex truchet raymarch | surface-pattern architecture |
| `4ttSWf-rainforest.glsl` | fog and organic atmosphere | jungle/fractal ecology |
| `stBcW1-mrange-stars-galaxy.glsl` | star/galaxy field | cosmic background |

### GLSL Building Blocks To Implement In This Repo

#### A. `lib/glsl/loop-phase.glsl`

Purpose:

- one canonical source for loop-locked time.

Suggested functions:

```glsl
float phase01(float t, float duration) { return fract(t / duration); }
float phaseTau(float t, float duration, float cycles) {
  return 6.2831853 * phase01(t, duration) * cycles;
}
vec2 phaseCircle(float t, float duration, float cycles) {
  float a = phaseTau(t, duration, cycles);
  return vec2(cos(a), sin(a));
}
```

#### B. `lib/glsl/polar-kaleido.glsl`

Purpose:

- structural polar symmetry before fractal sampling.

Suggested functions:

```glsl
vec2 polarFold(vec2 p, float n) {
  float r = length(p);
  float a = atan(p.y, p.x);
  float seg = 6.2831853 / n;
  a = abs(mod(a + seg * 0.5, seg) - seg * 0.5);
  return vec2(cos(a), sin(a)) * r;
}
```

#### C. `lib/glsl/log-droste.glsl`

Purpose:

- seamless infinite zoom coordinate.

Suggested functions:

```glsl
vec2 drosteUV(vec2 p, float phase, float turns, float zoomScale) {
  float r = max(length(p), 1e-5);
  float a = atan(p.y, p.x);
  float lr = log(r) / log(zoomScale) - phase;
  return vec2(fract(lr), fract(a / 6.2831853 * turns));
}
```

#### D. `lib/glsl/orbit-trap.glsl`

Purpose:

- reusable orbit-trap color and AO channels.

Suggested pattern:

```glsl
vec4 trapInit() { return vec4(1e6); }
vec4 trapUpdate(vec4 trap, vec3 z) {
  trap.x = min(trap.x, abs(z.x));
  trap.y = min(trap.y, abs(z.y));
  trap.z = min(trap.z, abs(z.z));
  trap.w = min(trap.w, dot(z, z));
  return trap;
}
```

#### E. `lib/glsl/film-finish.glsl`

Purpose:

- final commercial grade in one place.

Required stages:

- AgX or AgX-like tone map
- S-curve
- controllable saturation
- vignette
- grain
- chromatic aberration

#### F. `lib/glsl/thin-film.glsl`

Purpose:

- separate iridescence pass for Annihilation/petrol-slick look.

Suggested minimal approximation:

```glsl
vec3 thinFilmApprox(float ndotv, float thicknessNm) {
  vec3 lambda = vec3(680.0, 530.0, 440.0);
  vec3 phase = 6.2831853 * thicknessNm * ndotv / lambda;
  return 0.5 + 0.5 * cos(phase + vec3(0.0, 2.09, 4.18));
}
```

### GLSL Quality Rules

- Prefer small reusable include files over one giant shader.
- Put all loop timing behind a single phase helper.
- Any non-integer animation cycle must be flagged non-loop-safe.
- Keep all license-derived code in a ledger.
- If borrowing MIT code, preserve notice.
- If borrowing Shadertoy code, verify the shader-specific license first.
- Separate "study shader" from "commercial shader" in filenames or docs.
- Avoid magic constants unless documented with visual purpose.
- Add shader compile smoke test after any new include.



### IQ Apollonian - Inversion Fractal + Orbit Trap

Building block:

```glsl
vec4 orb;
float map(vec3 p, float s) {
  float scale = 1.0;
  orb = vec4(1000.0);
  for (int i=0; i<8; i++) {
    p = -1.0 + 2.0*fract(0.5*p+0.5);
    float r2 = dot(p,p);
    orb = min(orb, vec4(abs(p), r2));
    float k = s/r2;
    p *= k; scale *= k;
  }
  return 0.25*abs(p.y)/scale;
}
```

2-stage color mix from orbit trap:

```glsl
vec3 rgb = vec3(1.0);
rgb = mix(rgb, vec3(1.0,0.80,0.2), clamp(6.0*tra.y, 0.0, 1.0));
rgb = mix(rgb, vec3(1.0,0.55,0.0), pow(clamp(1.0-2.0*tra.z, 0, 1), 8.0));
float ao = pow(clamp(tra.w*2.0, 0, 1), 1.2);
```

Fractal parameter breathing:

```glsl
float s = 1.1 + 0.5*smoothstep(-0.3, 0.3, cos(0.1*iTime));
```

3-axis incommensurate orbit:

```glsl
vec3 ro = vec3(
  2.8*cos(0.1 + .33*t),
  0.4 + 0.30*cos(.37*t),
  2.8*cos(0.5 + .35*t)
);
```

Production translation:

- For final seamless loops, replace incommensurate time with integer cycles per loop.
- Keep orbit-trap color and AO.
- Use breathing fractal parameter for life.

### Way of Light - Volumetric Color Accumulation

Core idea:

```glsl
for (int i=0; i<MAX_STEPS; i++) {
  vec2 map = Map(p);
  col = mix(col, Palette(int(floor(map.y)), depth), .02 * (1.-sum));
  s = max(abs(map.x), 2. * sd);
  d += s * STEP_FAC * (1.1 - fract(map.y));
}
```

Background:

```glsl
bg = pow(dir, 5.)*.2;
bg += pow(dir, 5000.)*.8;
bg *= (1. - S(.99,.9,dir) * noise(...));
```

Post:

```glsl
col = mix(col, S(vec3(.1),vec3(1.),col), PP_CONT);
col *= S(PP_VIGN, -PP_VIGN/5., dot(uv,uv));
```

Lesson:

- Do not only hit-test then shade.
- Ray should march through colored volume.
- Progressive color accumulation gives atmospheric richness.

### Log-Polar Moebius - True Infinite Zoom

Core idea:

```glsl
vec2 U = (2.*u - R) / R.y;
vec2 z = U - vec2(-1,0); U.x -= .5;
U *= mat2(z, -z.y, z.x) / dot(U,U);
U = log(length(U+=.5))*vec2(.5,-.5)
    + iTime/8.
    + atan(U.y, U.x)/6.2832 * vec2(6,1);
```

Lesson:

- Time advances along log axis.
- Log-polar coordinate space gives Droste-style zoom.
- Moebius inversion creates richer spatial curvature than plain radial zoom.

### IQ Rainforest - Fog / Atmosphere Masterpiece

Extract:

- distance-based exponential fog
- multi-layer sun/sky gradients
- material palette integration
- atmospheric perspective as scale cue

Example:

```glsl
col = mix(col, fogCol, 1.0 - exp(-0.003*t*t));
```

### mrange Truchet + Kaleidoscope - Smooth Folds

Core idea:

```glsl
float SABS(float x, float k) { return sqrt(x*x + k); }
float smoothKaleidoscope(inout vec2 p, float sm, float rep) {
  // polar -> mirror-fold -> smooth -> cartesian
}
```

Lesson:

- Hard kaleidoscope fold seams look cheap.
- Smooth fold transitions keep premium surface quality.

### Other Round 2 Shaders

- Shane `Abstract Corridor` (`MlXSWX`): tunnel with organic wall texture.
- Shane `Raymarched Hex Truchet` (`4td3zj`): pattern-on-surface mastery.
- blackle `Sine SDF Analytic Chebyshev` (`flXBzB`): minimalist analytic SDF elegance.
- blackle `@Party Concert Visuals 2020` (`WtscW4`): literal concert/VJ reference.
- mrange `Stars and Galaxy` (`stBcW1`): cosmic rendering.
- mrange `Spiral Galaxy` (`wsBBWD`): spiral-arm composition.

## Tier 2 - Commercial Visionary Artists

### Android Jones - Electromineralism

Signature:

- electric/mineral crystal palette
- amethyst, citrine, emerald, gold
- hundreds of translucent digital layers
- 360 dome radial composition in `SAMSKARA`

Lesson:

- Commercial tier equals layered translucency, not flat gradient.
- Edge details matter in dome/immersive thinking.

### Alex Grey - Sacred Mirrors

Signature:

- X-ray multi-layer anatomy
- chakras/auras
- psychic/spiritual energy through body

Lesson:

- DMT commercial art often shows layered interior, not only outside surface.

## Tier 3 - Film VFX Pipelines

### Enter The Void - BUF / Gaspar Noe

References:

- Ernst Haeckel botanical/biological drawings
- DMT sequence

Production facts:

- flicker recipe is CA + motion blur + focus pulls + ghosting
- over 100 flicker proposals were made
- only a few were selected
- long production effort: years, hundreds of shots, hours of rendering

Lesson:

- Flicker is multi-component, not a single effect.
- DMT sequence quality comes from iteration and curation.

### Doctor Strange - Mirror Dimension

VFX concepts:

- Mandelbrot/Mandelbulb
- volumetric fractals
- near distance estimation ray marching
- Houdini -> Arnold procedural iso surface shader

Critical lesson:

- They broke the equation but kept fractal feel.
- Pure math is hobby tier; artist-broken math is commercial tier.

Implementation:

- Use parametric fractal with hand-tuned offsets per layer.
- Let art direction override pure formula.

### Annihilation - Shimmer

VFX concepts:

- unwrapped Mandelbulb as wall
- multiple Mandelbulbs at different speeds
- separate iridescence layer
- petrol slick rainbow at glancing angles

Lesson:

- Multi-layer temporal churn creates life.
- Separate iridescence pass gives comp control.

### Samsara / Baraka

Lessons:

- slow meditative radial symmetry
- 70mm film grain tactile quality
- slower can be more commercial than faster

## Tier 4 - Color Grading And Tonemap

### AgX

Why it matters:

- replaced ACES in many modern workflows for saturated color handling
- better out-of-gamut behavior
- less hue shift in saturated regions

Pipeline:

- logarithmic encoding in wide gamut
- sigmoid polynomial
- inverse transform

Variants:

- Neutral
- Golden
- Punchy

Lesson:

- AgX instead of Reinhard/basic ACES is a visible commercial jump.

### ACES Narkowicz Fit

```glsl
vec3 aces(vec3 x) {
  return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0);
}
```

### Uchimura

Use:

- configurable HDR toe/linear/shoulder response

### Arri LogC / Print Stock

Use:

- final film emulation
- print stock LUT
- avoid raw linear-to-sRGB look

## Tier 5 - DMT Phenomenology

### Phases

1. Threshold: enhanced HD vision, edges breathing.
2. Chrysanthemum: dense unfolding flower made of fractals.
3. Magic Eye: complex symmetrical autostereograms.
4. Waiting Room: transitional dim space.
5. Breakthrough: geometric patterns with topological bifurcations.
6. Amnesia/return: dissolution.

### Common Visual Elements

- geometric patterns pulsing with dazzling colors
- dancing lattices
- interlocking grids
- cogs spinning in multiple layers
- honeycomb structures morphing
- tessellation in perceived >3D dimensions
- tunnel passage in some reports
- hyperintelligent, organic-intention-carrying patterns

### Color Palettes

- brilliant neon green against black voids
- rapidly shifting palettes
- jewel-tone ornamentation
- waiting-room amber/violet

### Entities

- machine elves
- insectoid intelligences
- geometric consciousnesses
- self-transforming beings made of language and geometry

Commercial implication:

- pure abstract fractals are not enough
- must feel intentional, intelligent, organic
- narrative arc should map threshold -> breakthrough -> return -> loop

## Hyperspace Lexicon

- Chrysanthemum: gigantic spinning kaleidoscopic fractal flower.
- Schnorkel: spirals, ornamentations, filigree.
- Jimjam: squishy goopy sticky stringy multicolored matter.
- Plasmatis: constantly shifting gel-goo around objects.
- Mangotanglement: endless organic matter grids.
- Candyland: pristine polished colorful candy appearance.
- Legoland: reality rebuilt from distinct blocks.
- Central Light: overwhelming intelligent light source.
- Dimensional Rift: dividing line showing two realities simultaneously.
- Bifurcations: concepts recursively fork.
- Folding Rooms: multidimensional spaces folding over themselves.

Visual implication:

- v47 should evoke Chrysanthemum center + Schnorkel edges + Plasmatis midground + Mangotanglement texture simultaneously.

## Tibetan Mandala Construction Rules

- concentric circles + squares from center outward
- Brahman lines cross at precise center
- four gates in cardinal directions
- proportions prescribed
- sand painting begins at center, works outward

Visual implication:

- Break pure kaleidoscope symmetry with explicit 4-fold gates.
- Add concentric rings that read as structure.

## Gallimore / Orthogonal Dimensions

Principle:

- Hyperspace feels orthogonal to normal 3D perception.

Implementation:

- depth layers that coexist impossibly
- near field apparently behind far field
- two coordinate systems visible simultaneously
- dimensional rifts as seams

## Machine-Elf Visual Principles

- humanoid-like but made of fractal shapes
- rapidly changing form
- vibrant ever-changing colors
- curious/joyous feel, not horror
- shiny/metallic/iridescent surface
- communication through geometry

## Offline TAA / Supersampling

For offline render:

- subpixel jitter per frame
- Halton 2/3 sequence
- 4-16 samples per output frame
- no realtime ghosting issue
- simpler option: render at 2x resolution then downsample

## v47 Masterpiece Recipe

Architecture:

```text
Pass 0: Base IQ Apollonian with orbit trap
Pass 1: Secondary Mandelbulb at different time speed
Pass 2: Iridescence pass, petrol slick, separate for comp control
Pass 3: Volumetric color accumulation along ray
Pass 4: Background core + halo + breaking ray noise
Pass 5: Post AgX + S-curve + CA + vignette + film grain
```

Key math:

1. Apollonian map with `s` breathing.
2. 3-axis orbital camera.
3. Multi-layer temporal churn.
4. Smooth kaleidoscope.
5. Log-polar/Moebius infinite zoom.
6. Volumetric color accumulation.
7. Orbit trap 3-stage color.
8. Free AO.
9. Separate thin-film iridescence.
10. AgX post pipeline.

Variants:

| Variant | Palette | Temporal | Fractal |
| --- | --- | --- | --- |
| v47a | jewel neon: green/magenta/gold on violet-black | meditative | Apollonian s=1.3 breath |
| v47b | warm amber ayahuasca tones | meditative | Apollonian s=1.5 wide |
| v47c | iridescent petrol slick | breakthrough | Mandelbulb 8-power |
| v47d | neon cyan/magenta void | breakthrough/entity | pseudo-Kleinian |

Loop strategy:

- all time terms integer cycles per 20s loop
- phase = mod(t/20, 1) * TAU * N
- camera orbit frequencies 2/3/4 per loop
- fractal breath 2 breaths per loop
- palette cycle 1 full rotation per loop

Quality budget:

- 200 ray-march steps
- 8 Apollonian iterations
- 1x AA for iteration
- 2x/4x supersampling for final
- 20s @ 30fps = 600 frames
- target 10-12 min/variant
- 4 variants 45-60 min total

Why v47 beats v46:

| Axis | v46 | v47 |
| --- | --- | --- |
| Tonemap | Reinhard | AgX |
| Fractal | Mandelbox + Kali | IQ Apollonian orbit trap |
| Camera | 2D rotation | 3-axis orbital |
| Lighting | normal-based | volumetric accumulation + free AO |
| Layers | 1 | 3 multi-speed |
| Iridescence | single term | separate thin-film pass |
| Background | solid | core + halo + ray-breaking noise |
| Flicker | none | CA + motion blur hint + vignette breathing |
| Palette | IQ cosine only | probabilistic multi-palette + orbit trap mapping |

## Full Shader Reference List

- IQ Apollonian: https://www.shadertoy.com/view/4ds3zn
- Log Moebius Transform 8: https://www.shadertoy.com/view/WtlyWs
- The Way of Light: https://www.shadertoy.com/view/cdsSRf
- IQ Mandelbulb: https://www.shadertoy.com/view/ltfSWn
- IQ Menger: https://www.shadertoy.com/view/4sX3Rn
- IQ Rainforest: https://www.shadertoy.com/view/4ttSWf
- nimitz Protean Clouds: https://www.shadertoy.com/view/3l23Rh
- mrange Truchet+Kaleid: https://www.shadertoy.com/view/7lKSWW
- Psychedelic Ray Marching: https://www.shadertoy.com/view/MfsyDM
- Big Brass Balls Pseudo-Kleinian: https://www.shadertoy.com/view/wtGGDR
- Log Moebius Psyche: https://www.shadertoy.com/view/XdyXD3
- 3D Kleinian SDF: https://www.shadertoy.com/view/tc23Dt
- IFS Menger Fold: https://www.shadertoy.com/view/td2fzt
- KIFS Playing: https://www.shadertoy.com/view/M3fXWl

## Full Film VFX Reference List

- Enter The Void VFX: https://www.fxguide.com/fxfeatured/enter_the_void_made_by_fx/
- Doctor Strange VFX: https://www.fxguide.com/fxfeatured/dr-stranges-magical-mystery-tour-in-time/
- Annihilation Shimmer VFX: https://vfxblog.com/2018/03/12/mandelbulbs-mutations-and-motion-capture-the-visual-effects-of-annihilation/
- 2001 Archive: https://2001archive.org/resources/the-special-effects-of-2001-a-space-odyssey/

## Full Artist Reference List

- Android Jones SAMSKARA: https://androidjones.com/pages/samskara
- Android Jones gallery: https://androidjones.com/pages/gallery
- Alex Grey Sacred Mirrors: https://www.alexgrey.com/art/sacred-mirrors/sacred-mirrors-frame/
- Julius Horsthuis: https://www.julius-horsthuis.com/
- Pablo Amaringo book: https://www.randomhousebooks.com/books/2743
- Robert Venosa: https://www.venosa.com/
- Martina Hoffmann: https://www.martinahoffmann.com/
- Luke Brown: https://www.lukebrownart.com/
- Amanda Sage: https://www.amandasage.com/

## Full Tonemap References

- AgX minimal implementation: https://iolite-engine.com/blog_posts/minimal_agx_implementation
- ACES Narkowicz: https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
- glsl-tone-map: https://github.com/dmnsgn/glsl-tone-map

## Full Phenomenology References

- Science Insights DMT visual phases: https://scienceinsights.org/what-a-dmt-trip-looks-like-geometry-tunnels-entities/
- DMT field study thematic analysis: https://pmc.ncbi.nlm.nih.gov/articles/PMC8716686/
- Rick Strassman: https://www.rickstrassman.com/publications/the-spirit-molecule/

---

# PART IV - Artwork Production Schemas

## Reference Curation Schema

```markdown
### <Reference Name>

- URL:
- Source type: article | artist | shader | film | tool | paper
- Motif family: tunnel | mandala | lattice | spiral | fractal body | plasma | entity | form constants
- Contribution:
- Commercial class: Green | Yellow | Red
- Direct reuse allowed: yes | no | unknown
- Local implementation target:
- Verification needed:
- Notes:
```

## Source Ledger Template

| Field | Value |
| --- | --- |
| Source URL | |
| Author | |
| Work / shader / article | |
| License | |
| Commercial class | Green / Yellow / Red |
| Copied code? | yes/no |
| Adapted math only? | yes/no |
| Attribution required | |
| Local file touched | |
| Verification run | |

## Shot Planning Template

```markdown
### <Shot ID> - <Name>

- Intent:
- Structure reference:
- Palette reference:
- Motion reference:
- Geometry stack:
- Loop period:
- Resolution/FPS:
- Commercial risk:
- Local files:
- Verification:
```

## Immediate Next Actions

P0:

1. Build `docs/research/dmt-shaders/index.json` with licenses, motif tags, and commercial classes.
2. Extract reusable Green GLSL helpers into `lib/glsl/` or the project's equivalent shader include location.
3. Implement one v47 proof variant using original code and license-cleared math.
4. Add no-copy checklist to render review.
5. Run shader smoke and loop validation.

P1:

1. Add 8 named production presets.
2. Add `docs/research/dmt-shotbook.md` with generated stills, parameters, loop verdicts.
3. Add source ledger entries next to production render archives.
4. Add a render-review template that maps each render to the DMT/LSD artwork criteria in this document.

P2:

1. Build link-only visual moodboard outside repo.
2. Add export/report automation.
3. Add audio-linked harmonic parameters after visual quality is stable.
