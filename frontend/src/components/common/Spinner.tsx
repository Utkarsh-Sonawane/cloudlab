import { clsx } from 'clsx'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  fullscreen?: boolean
}

export function Spinner({ size = 'md', className, fullscreen }: Props) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }

  const spinner = (
    <div className={clsx('relative', sizes[size], className)}>
      <div className={clsx('absolute inset-0 rounded-full border-2 border-brand-500/20')} />
      <div className={clsx('absolute inset-0 rounded-full border-2 border-transparent border-t-brand-500 animate-spin')} />
    </div>
  )

  if (fullscreen) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[200px]">
        {spinner}
      </div>
    )
  }
  return spinner
}
