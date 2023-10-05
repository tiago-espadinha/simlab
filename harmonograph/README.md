# Lissajous / Harmonograph

Delicate looping figures traced by combining sine waves — a digital version of
the Victorian **harmonograph**, a pendulum-driven drawing machine.

## How it works

A pen position is computed from sums of sinusoids, one set for `x` and one for
`y`. In **harmonograph** mode each axis combines two damped sine terms:

$$x(t) = \sum_i A_i \sin(f_i t + p_i)\, e^{-d_i t}$$

with an analogous expression for `y(t)`.

- The **frequencies** `f` set the figure's shape. Simple integer ratios (2:3,
  3:4, …) give closed, symmetric curves; slightly detuned frequencies make the
  figure slowly precess.
- The **phase** offsets rotate and open up the loops.
- The **damping** `e^{-d t}` makes the amplitude shrink over time, so the curve
  spirals inward — that decaying quality is what makes real harmonograph output
  so distinctive.

**Pure Lissajous** mode drops the damping and the extra terms, giving the classic
closed oscilloscope curves.

The figure is drawn progressively across frames, with optional rainbow colouring
keyed to time.

## Controls

| Control | Effect |
|---|---|
| **Freq X / Freq Y** | Base frequencies for each axis. |
| **Phase** | Phase offset between the oscillators. |
| **Damping** | Rate the amplitude decays (harmonograph mode). |
| **Mode** | Harmonograph (damped, 4 terms) or pure Lissajous. |
| **Rainbow** | Colour the trace by time vs. a single hue. |
| **Redraw** | Trace the current figure again. |
| **Randomize** | Pick new random frequencies and phase. |

Every parameter change starts a fresh trace, so it's easy to explore.
