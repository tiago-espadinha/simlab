# Particle Gravity Sandbox

Thousands of lightweight particles fall through a field of user-placed
attractors, pulled by a softened inverse-square gravity law.

## How it works

Each particle feels a force from every attractor:

$$\vec{F} = \frac{G \cdot s}{d^2 + \epsilon} \, \hat{d}$$

- `d` is the distance to the attractor and `d̂` the unit direction toward it.
- `ε` (softening) is added to `d²` so the force stays finite when a particle
  passes very close to an attractor — without it, particles would be flung to
  infinity by the singularity.
- `s` is the attractor sign: `+1` attracts, `−1` repels.

Velocity is integrated with a fixed timestep, lightly damped (the **Drag**
slider), and clamped to a maximum speed. Particles bounce softly off the walls.
The cursor acts as a temporary weak attractor while it's over the canvas.

## Controls

| Control | Effect |
|---|---|
| **Particles** | Number of particles (200–4000). |
| **Gravity** | Strength of the attraction constant `G`. |
| **Drag** | Velocity damping per step (0 = frictionless). |
| **Trails** | Fade previous frames instead of clearing. |
| **Clear attractors** | Remove all placed attractors. |
| **Respawn particles** | Scatter the particles again. |

Interactions: **left-click** adds an attractor, **right-click** adds a repeller,
and moving the **cursor** nudges nearby particles.
