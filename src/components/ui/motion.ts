import type { Transition } from 'motion/react'

/**
 * House springs. Critically damped (no bounce) everywhere: nothing here is flung by the user, so
 * overshoot would read as wobble rather than momentum. Springs start from the current on-screen
 * value, so any animation can be interrupted mid-flight.
 */
export const spring: Transition = { type: 'spring', bounce: 0, duration: 0.4 }
export const springFast: Transition = { type: 'spring', bounce: 0, duration: 0.25 }
export const springSheet: Transition = { type: 'spring', bounce: 0, duration: 0.35 }

/** Content arriving: a short rise + fade. */
export const rise = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: spring,
}
