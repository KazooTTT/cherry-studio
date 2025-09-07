import { addToast } from '@heroui/react'

type ToastPropsColored = Omit<Parameters<typeof addToast>[0], 'color'>

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
