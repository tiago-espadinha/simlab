# Spring-Mass Cloth

A hanging sheet of point masses linked by springs, simulated with Verlet
integration and iterative constraint relaxation. Grab it, swing it, blow wind
through it, or tear it apart.

## How it works

The cloth is a grid of **points**; adjacent points are joined by **links** of a
fixed rest length. Two techniques drive it:

**Verlet integration** stores each point's current and previous position and
infers velocity from their difference — no explicit velocity variable needed:

$$v=x_t - x_{t-1}$$
$$x_{t+1} = x_t + v + a \cdot dt^2$$

**Constraint relaxation** then runs several passes that pull each linked pair
back toward its rest length. More passes = a stiffer cloth (the **Stiffness**
slider controls the iteration count). The top row is partially pinned so the
sheet hangs.

Tearing simply marks a link dead when the tear cursor passes over its midpoint;
dead links are skipped by both the solver and the renderer.

## Controls

| Control | Effect |
|---|---|
| **Columns** | Grid resolution (rebuilds the cloth). |
| **Gravity** | Downward pull. |
| **Stiffness** | Constraint iterations per step. |
| **Wind** | Oscillating horizontal gust. |
| **Show points** | Draw the mass points. |
| **Reset cloth** | Rebuild from scratch. |

Interaction: **drag** to grab and move the cloth; **right-click drag** to tear it.
