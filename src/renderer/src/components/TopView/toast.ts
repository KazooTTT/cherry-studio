import { addToast } from '@heroui/toast'
import { RequireSome } from '@renderer/types'

type AddToastProps = Parameters<typeof addToast>[0]
type ToastPropsColored = Omit<AddToastProps, 'color'>

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

/**
 * Display an error toast notification with red color
 * @param arg - Toast content (string) or toast options object
 * @returns Toast ID or null
 */
export const error = createToast('danger')

/**
 * Display a success toast notification with green color
 * @param arg - Toast content (string) or toast options object
 * @returns Toast ID or null
 */
export const success = createToast('success')

/**
 * Display a warning toast notification with yellow color
 * @param arg - Toast content (string) or toast options object
 * @returns Toast ID or null
 */
export const warning = createToast('warning')

/**
 * Display an info toast notification with default color
 * @param arg - Toast content (string) or toast options object
 * @returns Toast ID or null
 */
export const info = createToast('default')

/**
 * Display a loading toast notification that resolves with a promise
 * @param args - Toast options object containing a promise to resolve
 * @returns Toast ID or null
 */
export const loading = (args: RequireSome<AddToastProps, 'promise'>) => {
  return addToast(args)
}
