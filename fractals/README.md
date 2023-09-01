# Fractals

An interactive explorer for the **Mandelbrot** and **Julia** sets, with smooth
colouring, zoom, and pan.

[← Back to the gallery](../index.html) · open [index.html](index.html) to run.

## How it works

Both sets come from iterating the same complex map:

$$z_{n+1} = z_n^2 + c$$

- **Mandelbrot:** for each pixel, `c` is the pixel's position and `z` starts at
  0. The pixel is in the set if `z` never escapes to infinity.
- **Julia:** `c` is a fixed constant (the two sliders) and `z` starts at the
  pixel's position.

A point is considered "escaped" once `|z| > 2`. The number of iterations before
escape drives the colour. To avoid banding, a **smooth iteration count** is used:

$$\mu = n + 1 - \log_2\!\left(\log |z_n|\right)$$

which produces continuous gradients instead of hard colour rings.

For responsiveness the fractal is rendered **on demand** — only when you change a
parameter, zoom, or pan — rather than every frame, and the internal resolution
is capped so deep zooms stay interactive. The HUD shows the current zoom factor
and render time.

## Controls

| Control | Effect |
|---|---|
| **Set** | Mandelbrot or Julia. |
| **Iterations** | Maximum iterations (more = finer detail, slower). |
| **Palette** | Fire, ocean, psychedelic, or mono. |
| **Julia Re / Im** | The constant `c` for the Julia set. |
| **Reset view** | Return to the default framing. |

Interaction: **scroll** to zoom toward the cursor, **drag** to pan, and
**double-click** to zoom in on a point.
