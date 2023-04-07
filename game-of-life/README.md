# Conway's Game of Life

The classic cellular automaton. Every cell is alive or dead and updates in
lockstep based only on its eight neighbours.

## The rules

On each generation, for every cell:

- A **live** cell with 2 or 3 live neighbours survives.
- A **dead** cell with exactly 3 live neighbours becomes alive (birth).
- All other cells die or stay dead.

The grid is **toroidal** — edges wrap around, so gliders leaving one side
reappear on the other.

## Implementation notes

- The board is a flat `Uint8Array` with a second buffer for the next
  generation; the two are swapped each step (no per-cell allocation).
- Neighbour counting wraps with modulo indexing.
- Rendering colours live cells by column for a subtle gradient.

## Controls

| Control | Effect |
|---|---|
| **Cell size** | Pixels per cell (reallocates the grid). |
| **Speed** | Generations per second. |
| **Pattern** | Random soup, Gosper glider gun, pulsar, or empty. |
| **Pause / Play** | Stop or run the simulation. |
| **Step** | Advance a single generation. |
| **Clear** | Kill everything. |
| **Randomize** | New random soup. |

Interaction: **click or drag** on the grid to toggle cells (great for drawing
your own seeds while paused).
