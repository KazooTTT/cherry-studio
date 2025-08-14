import { mergeAttributes } from '@tiptap/core'
import Link from '@tiptap/extension-link'
import { Plugin, PluginKey } from '@tiptap/pm/state'

// Plugin to handle hover interactions
const linkHoverPlugin = new PluginKey('linkHover')

interface LinkHoverPluginOptions {
  onLinkHover?: (
    attrs: { href: string; text: string; title?: string },
    position: DOMRect,
    element: HTMLElement,
    linkRange?: { from: number; to: number }
  ) => void
  onLinkHoverEnd?: () => void
  editable?: boolean
}

const createLinkHoverPlugin = (options: LinkHoverPluginOptions) => {
  return new Plugin({
    key: linkHoverPlugin,
    props: {
      handleDOMEvents: {
        mouseover: (view, event) => {
          // Don't process hover if not editable
          if (!options.editable) return false

          const target = event.target as HTMLElement
          const linkElement = target.closest('a[href]') as HTMLAnchorElement

          if (linkElement) {
            const href = linkElement.getAttribute('href') || ''
            const text = linkElement.textContent || ''
            const title = linkElement.getAttribute('title') || ''
            const rect = linkElement.getBoundingClientRect()

            // Find the position and range of this link in the document
            const pos = view.posAtDOM(linkElement, 0)
            let linkRange: { from: number; to: number } | undefined

            if (pos >= 0) {
              const $pos = view.state.doc.resolve(pos)
              const linkMark = $pos
                .marks()
                .find((mark) => mark.type.name === 'enhancedLink' || mark.type.name === 'link')

              if (linkMark) {
                // Find the range of the link mark
                let from = pos
                let to = pos

                // Find start
                while (from > 0) {
                  const $from = view.state.doc.resolve(from - 1)
                  if (!$from.marks().some((m) => m.type === linkMark.type && m.attrs.href === linkMark.attrs.href)) {
                    break
                  }
                  from--
                }

                // Find end
                while (to < view.state.doc.content.size) {
                  const $to = view.state.doc.resolve(to)
                  if (!$to.marks().some((m) => m.type === linkMark.type && m.attrs.href === linkMark.attrs.href)) {
                    break
                  }
                  to++
                }

                linkRange = { from, to }
              }
            }

            options.onLinkHover?.({ href, text, title }, rect, linkElement, linkRange)
          }

          return false
        },
        mouseout: (_, event) => {
          const target = event.target as HTMLElement
          const linkElement = target.closest('a[href]')

          if (linkElement) {
            // Check if we're still within the link or moving to the popup
            const relatedTarget = event.relatedTarget as HTMLElement
            const isMovingToPopup = relatedTarget?.closest('[data-link-editor]')
            const isStillInLink = relatedTarget?.closest('a[href]') === linkElement

            if (!isMovingToPopup && !isStillInLink) {
              options.onLinkHoverEnd?.()
            }
          }

          return false
        }
      }
    }
  })
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    enhancedLink: {
      setEnhancedLink: (attributes: { href: string; title?: string }) => ReturnType
      toggleEnhancedLink: (attributes: { href: string; title?: string }) => ReturnType
      unsetEnhancedLink: () => ReturnType
      updateLinkText: (text: string) => ReturnType
    }
  }
}

export interface EnhancedLinkOptions {
  onLinkHover?: (
    attrs: { href: string; text: string; title?: string },
    position: DOMRect,
    element: HTMLElement,
    linkRange?: { from: number; to: number }
  ) => void
  onLinkHoverEnd?: () => void
  editable?: boolean
}

export const EnhancedLink = Link.extend<EnhancedLinkOptions>({
  name: 'enhancedLink',

  addOptions() {
    return {
      ...this.parent?.(),
      protocols: ['http', 'https', 'mailto', 'tel'],
      openOnClick: true,
      onLinkHover: undefined,
      onLinkHoverEnd: undefined,
      editable: true
    }
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setEnhancedLink:
        (attributes) =>
        ({ commands }) => {
          return commands.setLink(attributes)
        },
      toggleEnhancedLink:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleLink(attributes)
        },
      unsetEnhancedLink:
        () =>
        ({ commands }) => {
          return commands.unsetLink()
        },
      updateLinkText:
        (text: string) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          const { from, to } = selection

          if (dispatch) {
            tr.insertText(text, from, to)
          }

          return true
        }
    }
  },

  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() || []),
      createLinkHoverPlugin({
        onLinkHover: this.options.onLinkHover,
        onLinkHoverEnd: this.options.onLinkHoverEnd,
        editable: this.options.editable
      })
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        class: 'rich-editor-link'
      }),
      0
    ]
  },

  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: (element) => element.getAttribute('href'),
        renderHTML: (attributes) => {
          if (!attributes.href) {
            return {}
          }
          return {
            href: attributes.href
          }
        }
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('title'),
        renderHTML: (attributes) => {
          if (!attributes.title) {
            return {}
          }
          return {
            title: attributes.title
          }
        }
      }
    }
  }
})
