# SimLab - Physics &amp; Visual Sandbox

A collection of ten self-contained canvas experiments in physics and generative
visuals. No build step, no dependencies — just plain HTML, CSS, and JavaScript.

Open [index.html](index.html) for the gallery, or jump straight into any project
folder below.

## Running locally

```bash
# from inside the sandbox/ folder
python -m http.server 8000
# then visit http://localhost:8000
```

## The experiments

| Project               | Folder                                     | What it demonstrates                       |
| --------------------- | ------------------------------------------ | ------------------------------------------ |
| Particle Gravity      | [particle-gravity/](particle-gravity/)     | Softened inverse-square attraction         |
| N-Body / Solar System | [n-body/](n-body/)                         | Mutual Newtonian gravity + orbital seeding |
| Spring-Mass Cloth     | [cloth/](cloth/)                           | Verlet integration + distance constraints  |
| Game of Life          | [game-of-life/](game-of-life/)             | Conway's cellular automaton                |
| Reaction-Diffusion    | [reaction-diffusion/](reaction-diffusion/) | The Gray-Scott model                       |
| Falling Sand          | [falling-sand/](falling-sand/)             | Cellular material simulation               |
| 2D Ripple             | [ripple/](ripple/)                         | The discrete wave equation                 |
| Double Pendulum       | [double-pendulum/](double-pendulum/)       | Deterministic chaos (RK4)                  |
| Fractals              | [fractals/](fractals/)                     | Escape-time Mandelbrot / Julia sets        |
| Harmonograph          | [harmonograph/](harmonograph/)             | Damped superimposed sinusoids              |

Each folder has its own `index.html`, `main.js`, and `README.md`. All ten share
a single stylesheet, [common.css](common.css).
