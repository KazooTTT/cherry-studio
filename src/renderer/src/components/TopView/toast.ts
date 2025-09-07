import { addToast, ToastProps } from '@heroui/react'

type ToastPropsColored = Omit<ToastProps, 'color'>

const createToast = (color: 'danger' | 'success' | 'warning' | 'default') => {
  return (arg: ToastPropsColored | string): string | null => {
    if (typeof arg === 'string') {
      return addToast({ color, title: arg })
    } else {
      return addToast({ color, ...arg })
    }
  }
}

// syntatic sugar, oh yeah
export const error = createToast('danger')
export const success = createToast('success')
export const warning = createToast('warning')
export const info = createToast('default')
