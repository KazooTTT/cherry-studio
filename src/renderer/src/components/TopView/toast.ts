import { addToast, ToastProps } from '@heroui/react'

type ToastPropsColored = Omit<ToastProps, 'color'>

// identical function signature with addToast, except the color.
export const error = ({ ...props }: ToastPropsColored): string | null => {
  return addToast({ color: 'danger', ...props })
}

export const success = ({ ...props }: ToastPropsColored): string | null => {
  return addToast({ color: 'success', ...props })
}

export const warning = ({ ...props }: ToastPropsColored): string | null => {
  return addToast({ color: 'warning', ...props })
}

export const info = ({ ...props }: ToastPropsColored): string | null => {
  return addToast({ color: 'default', ...props })
}
