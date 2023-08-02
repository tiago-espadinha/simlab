# Double Pendulum

Two pendulum arms linked end to end — one of the simplest systems that exhibits
**deterministic chaos**. Run several near-identical copies to watch them diverge.

## How it works

The state is the two arm angles and their angular velocities. The angular
accelerations come from the exact equations of motion for a double pendulum
(derived from the Lagrangian), which couple both arms through their masses,
lengths, and gravity.

Those equations are integrated with **RK4** (fourth-order Runge-Kutta), which
samples the derivative four times per step and blends them. RK4 is far more
accurate than Euler here — important because the system is so sensitive that
integration error alone would visibly change the trajectory.

### Why the copies fan out

Each copy starts with an almost imperceptible difference in the first angle
(about 10⁻⁴ radians). Because the system is chaotic, that tiny gap grows
exponentially: within seconds the copies, which began as one line, spray apart.
This is the classic "sensitive dependence on initial conditions."

## Controls

| Control | Effect |
|---|---|
| **Mass 1 / Mass 2** | Bob masses (change the dynamics). |
| **Gravity** | Gravitational strength. |
| **Copies** | Number of near-identical pendulums. |
| **Trail** | Trace the path of the lower bob. |
| **Pause / Play** | Freeze or resume. |
| **Reset** | Restart from the initial angles. |

Interaction: **click** to grab and reposition the pendulum's first arm.
