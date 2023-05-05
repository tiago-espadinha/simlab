# Reaction-Diffusion (Gray-Scott)

Two virtual chemicals diffuse across a grid and react, producing organic,
self-organising patterns — coral, spots, stripes, and mitosis-like blobs.

## How it works

The **Gray-Scott** model tracks two concentrations, `U` and `V`, at every grid
cell. Each step updates them by:

$$U' = U + \left(D_u \nabla^2 U - U V^2 + F(1 - U)\right)$$
$$V' = V + \left(D_v \nabla^2 V + U V^2 - (F + K)V\right)$$

- $\nabla^2$ is the **Laplacian**, approximated with a weighted 3×3 stencil
  (it measures how much a cell differs from its neighbours — i.e. diffusion).
- $UV^2$ is the reaction: `V` consumes `U` to make more `V`.
- **F** (feed) replenishes `U`; **K** (kill) removes `V`.

Tiny changes in `F` and `K` produce wildly different regimes — that's the whole
fun of the presets. The simulation runs on a downscaled grid, written to an
offscreen `ImageData`, then stretched to fit the canvas. Several solver steps
run per frame so patterns evolve at a watchable pace.

## Controls

| Control | Effect |
|---|---|
| **Feed** | Feed rate `F`. |
| **Kill** | Kill rate `K`. |
| **Preset** | Coral, mitosis, worms, or spots (sets `F`/`K`). |
| **Palette** | Teal, fire, or mono colour mapping. |
| **Reseed** | Drop fresh random seeds of `V`. |
| **Clear** | Reset to all `U`. |

Interaction: **click and drag** to inject chemical `V` and grow new structures.
