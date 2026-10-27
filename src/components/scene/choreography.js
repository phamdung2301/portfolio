import * as THREE from 'three'

/**
 * S1 — Scroll choreography: one scene state per section.
 *
 * The camera already interpolates across 5 keyframes (CameraRig.jsx).
 * These states extend that journey to the REST of the scene, so each
 * section has its own lighting mood instead of one static look:
 *   hero     — neutral cyan workspace at rest
 *   about    — violet rim, monitor dims (the desk steps back, copy leads)
 *   skills   — orbs glow at full boost, key light up (the cluster is the star)
 *   projects — orbs dim, monitor brightens, spotlight beam peaks (work leads)
 *   contact  — warm pink lamp, everything else dims (one warm light left)
 *
 * Values are interpolated with the same smoothstep the camera uses, and
 * every consumer damps toward its target in useFrame — nothing ever snaps.
 * No new dependencies, no TypeScript: plain JS, matching the rest of the repo.
 * No pause control is wired here: per user decision 2026-10-27 the site
 * has no manual motion-pause button.
 */
export const SCENE_STATES = [
  {
    id: 'hero',
    fog: '#07070a',
    ambient: 0.35,
    key: 1.6,
    rim: 22,
    cyan: 12,
    monitor: 0.85,
    monitorColor: '#12b8d8',
    orbBoost: 0,
    beam: 0.1,
    beamX: 0,
    beamColor: '#45d8f0',
  },
  {
    id: 'about',
    fog: '#0b0b14',
    ambient: 0.32,
    key: 1.3,
    rim: 16,
    cyan: 18,
    monitor: 0.6,
    monitorColor: '#b39bff',
    orbBoost: 0.1,
    beam: 0.08,
    beamX: -1.8,
    beamColor: '#b39bff',
  },
  {
    id: 'skills',
    fog: '#070a10',
    ambient: 0.38,
    key: 1.9,
    rim: 28,
    cyan: 20,
    monitor: 0.7,
    monitorColor: '#5eead4',
    orbBoost: 1,
    beam: 0.2,
    beamX: 0,
    beamColor: '#5eead4',
  },
  {
    id: 'projects',
    fog: '#0a0710',
    ambient: 0.3,
    key: 1.4,
    rim: 30,
    cyan: 10,
    monitor: 1.15,
    monitorColor: '#45d8f0',
    orbBoost: 0,
    beam: 0.28,
    beamX: 1.6,
    beamColor: '#45d8f0',
  },
  {
    id: 'contact',
    fog: '#0d070a',
    ambient: 0.34,
    key: 1.0,
    rim: 14,
    cyan: 8,
    monitor: 0.95,
    monitorColor: '#f9a8d4',
    orbBoost: 0.15,
    beam: 0.16,
    beamX: 0,
    beamColor: '#f9a8d4',
  },
]

const lerp = (a, b, t) => a + (b - a) * t

/**
 * Sample the interpolated scene state for a global scroll progress t (0..1).
 * Returns fresh THREE.Color objects per call; callers call this once per
 * frame and reuse the result inside that frame.
 */
export function getSceneState(t) {
  const clamped = Math.min(1, Math.max(0, t))
  const scaled = clamped * (SCENE_STATES.length - 1)
  const index = Math.min(SCENE_STATES.length - 2, Math.floor(scaled))
  const local = scaled - index
  // Smoothstep, same easing as CameraRig, so light and camera move as one.
  const eased = local * local * (3 - 2 * local)
  const a = SCENE_STATES[index]
  const b = SCENE_STATES[index + 1]

  return {
    id: local < 0.5 ? a.id : b.id,
    fog: new THREE.Color(a.fog).lerp(new THREE.Color(b.fog), eased),
    ambient: lerp(a.ambient, b.ambient, eased),
    key: lerp(a.key, b.key, eased),
    rim: lerp(a.rim, b.rim, eased),
    cyan: lerp(a.cyan, b.cyan, eased),
    monitor: lerp(a.monitor, b.monitor, eased),
    monitorColor: new THREE.Color(a.monitorColor).lerp(
      new THREE.Color(b.monitorColor),
      eased,
    ),
    orbBoost: lerp(a.orbBoost, b.orbBoost, eased),
    beam: lerp(a.beam, b.beam, eased),
    beamX: lerp(a.beamX, b.beamX, eased),
    beamColor: new THREE.Color(a.beamColor).lerp(
      new THREE.Color(b.beamColor),
      eased,
    ),
  }
}
