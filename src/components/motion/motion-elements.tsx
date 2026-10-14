'use client'

import * as m from 'motion/react-m'

/*
 * Client wrappers so server components can render animated elements. Pass serialisable props only:
 * initial, animate, whileInView, viewport, transition, variants (names or plain objects).
 * Function props such as onDragEnd or onAnimationComplete can't cross the server/client boundary;
 * put those in their own client component that imports `m` from 'motion/react-m' itself.
 */
export const MotionDiv = m.div
export const MotionSection = m.section
export const MotionArticle = m.article
export const MotionUl = m.ul
export const MotionLi = m.li
export const MotionSpan = m.span
export const MotionP = m.p
export const MotionFigure = m.figure
