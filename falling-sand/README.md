# Falling Sand

A pixel-cellular sandbox. Paint sand, water, walls, and plant seeds, then watch
them fall, flow, and grow according to simple per-cell rules.

## How it works

The world is a grid of cells, each holding one material: empty, sand, water,
wall, or plant. Every frame the grid is scanned **bottom-to-top** so a particle
moves at most one cell per step (scanning top-down would let it fall the whole
column at once).

Per-material rules:

- **Sand** — falls straight down; if blocked, tries to slide diagonally. It can
  displace water, so it sinks through it.
- **Water** — falls down, then diagonally, then spreads sideways, so it seeks a
  flat level.
- **Wall** — immovable.
- **Plant** — occasionally grows into an adjacent water cell, creeping through
  puddles.

The scan direction alternates left/right per row to avoid a directional bias in
how piles and flows settle. Rendering writes directly into an `ImageData` at
grid resolution and scales it up (with smoothing off) for crisp pixels.

## Controls

| Control | Effect |
|---|---|
| **Material** | Sand, water, wall, plant seed, or eraser. |
| **Brush** | Paint radius. |
| **Cell size** | Simulation resolution (reallocates the grid). |
| **Clear** | Empty the world. |

Interaction: **click and drag** to paint the selected material.
