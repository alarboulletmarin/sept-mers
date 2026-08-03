import type { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'quiet' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  full?: boolean
}

export function Button({
  variant = 'ghost',
  full = false,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [
    styles.base,
    styles[variant],
    full || variant === 'primary' ? styles.full : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return <button type={type} className={classes} {...rest} />
}
