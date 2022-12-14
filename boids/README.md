# Boids Flocking

Craig Reynolds' classic flocking model: each bird-like "boid" follows three
local steering rules, and coordinated flock motion emerges with no leader and no
global plan.

## How it works

Every boid steers using three forces computed from its neighbours:

- **Separation** — steer away from boids that are too close (avoid crowding).
- **Alignment** — match the average heading of nearby boids.
- **Cohesion** — steer toward the average position of nearby boids.

Each rule produces a *desired velocity*; the boid is nudged toward it by a
force-limited **Reynolds steering** term, so turns stay smooth. Neighbours are
found with a **spatial hash grid** (roughly `O(n)` instead of `O(n²)`), and the
simulation runs on a **fixed timestep** so behaviour is frame-rate independent.

## Controls

| Control | Effect |
|---|---|
| **Boids** | Number of boids in the flock (20–400). |
| **Separation** | How strongly boids avoid each other. |
| **Alignment** | How strongly boids match neighbours' heading. |
| **Cohesion** | How strongly boids pull toward the flock centre. |
| **Speed** | Cruising speed in world px/s. |
| **Preset** | Jump to a tuned mix: school, swarm, scatter, or vortex. |
| **Wrap edges** | Wrap around the canvas vs. turn back at the borders. |
| **Flee cursor** | Boids scatter away from the mouse. |
| **Trails** | Fade the previous frame for motion trails. |
| **Pause / Reset** | Freeze the sim or re-seed the flock. |

Interaction: **click** the canvas to add a scatter burst; **move** the cursor to
push the flock around (with *Flee cursor* on).
