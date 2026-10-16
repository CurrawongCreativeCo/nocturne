import { ProcessLayout } from './process-layout'
import type { SectionProps } from '../../../types'

export function ProcessVertical(props: SectionProps<'process'>) {
  return (
    <ProcessLayout
      {...props}
      lineClassName="top-[1.125rem] bottom-0 left-[calc(1.125rem-1px)]"
      sideOf={() => 'end'}
    />
  )
}
