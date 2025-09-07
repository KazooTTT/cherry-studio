import { addToast, ToastProps } from '@heroui/react'

// identical function signature with addToast.
export const error = ({ ...props }: ToastProps): string | null => {
  return addToast({ color: 'danger', ...props })
}

export const success = ({ ...props }: ToastProps): string | null => {
  return addToast({ color: 'success', ...props })
}

export const warning = ({ ...props }: ToastProps): string | null => {
  return addToast({ color: 'warning', ...props })
}

export const info = ({ ...props }: ToastProps): string | null => {
  return addToast({ color: 'default', ...props })
}
