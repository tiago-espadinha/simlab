# 2D Ripple

A pond you can disturb. Click to send waves rippling across a height field that
propagates and reflects like a real water surface.

## How it works

This is a discrete solution of the **2D wave equation** using two buffers, the
current height field and the previous one. Each cell's next value comes from the
average of its four neighbours minus its own past value:

$$h_\text{next} = \left(\frac{h_L + h_R + h_U + h_D}{2} - h_\text{prev}\right) \cdot d$$

- The neighbour average makes disturbances spread outward.
- Subtracting the previous value gives the wave its momentum (oscillation).
- `d` is the **damping** factor (< 1) so ripples gradually fade instead of
  ringing forever.

The two buffers are swapped each step. Rendering shades each pixel from the
local height and its horizontal gradient (a cheap fake-lighting trick), written
into an `ImageData` and scaled to the canvas.

## Controls

| Control | Effect |
|---|---|
| **Damping** | How quickly ripples decay (higher = longer-lived). |
| **Strength** | Size of each disturbance. |
| **Palette** | Ocean, ink, or neon shading. |
| **Rain** | Randomly drop ripples automatically. |
| **Calm water** | Reset the surface to flat. |

Interaction: **click or drag** to drop ripples.
