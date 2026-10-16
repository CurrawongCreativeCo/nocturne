import { ProcessLayout } from './process-layout'
import type { SectionProps } from '../../../types'

/** One column below `md`; from `md` the line runs down the middle and steps fall left and right in turn. */
export function ProcessAlternating(props: SectionProps<'process'>) {
  return (
    <ProcessLayout
      {...props}
      lineClassName="top-[1.125rem] bottom-0 left-[calc(1.125rem-1px)] md:left-[calc(50%-1px)]"
      sideOf={(index) => (index % 2 === 0 ? 'start' : 'end')}
    />
  )
}
