# N-Body / Solar System

A gravitational sandbox where every body attracts every other body with
Newtonian gravity. Includes a stable-ish solar system, a binary star system,
and a random cluster.

## How it works

For each pair of bodies the acceleration on body *i* from body *j* is:

$$\vec{a}_i = \sum_{j \ne i} \frac{G \, m_j}{d_{ij}^2 + \epsilon} \, \hat{d}_{ij}$$

This is an **O(n²)** all-pairs computation, which is fine for the small body
counts here. A softening term `ε` keeps close encounters stable.

Orbits are seeded with the circular-orbit velocity so planets don't immediately
fall into the star:

$$v = \sqrt{\frac{G \, M_\text{central}}{r}}$$

applied perpendicular to the radius vector. Integration uses a semi-implicit
(symplectic) Euler step at a fixed timestep, which conserves energy far better
than plain Euler over long runs.

## Controls

| Control | Effect |
|---|---|
| **Sim speed** | Time-scaling factor for the integrator. |
| **Scene** | Solar system, binary + planets, or random cluster. |
| **Trails** | Leave fading orbital trails. |
| **Pause / Play** | Freeze or resume. |
| **Reset scene** | Rebuild the current scene. |

Interaction: **drag and release** on the canvas to fling a new body — the drag
vector sets its initial velocity.
