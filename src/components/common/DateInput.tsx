import type { InputHTMLAttributes } from 'react'

interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  size?: 'small' | 'middle'
  variant?: 'outlined' | 'borderless'
}

/** Native `<input type="date">` styled to match antd's Input — used wherever a plain
 * YYYY-MM-DD string is needed, since antd's DatePicker works with dayjs objects instead. */
export default function DateInput({ size = 'middle', variant = 'outlined', className, ...props }: DateInputProps) {
  const classes = [
    'date-input',
    size === 'small' ? 'date-input-sm' : '',
    variant === 'borderless' ? 'date-input-borderless' : '',
    className,
  ].filter(Boolean).join(' ')
  return <input type="date" className={classes} {...props} />
}
