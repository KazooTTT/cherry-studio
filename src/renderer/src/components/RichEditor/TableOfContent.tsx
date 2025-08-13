import type { Editor } from '@tiptap/core'
import type { TableOfContentDataItem } from '@tiptap/extension-table-of-contents'

import { TableOfContentsWrapper, ToCDock } from './styles'

interface ToCItemProps {
  item: TableOfContentDataItem
  onItemClick: (e: React.MouseEvent, id: string) => void
}

export const ToCItem: React.FC<ToCItemProps> = ({ item, onItemClick }) => {
  return (
    <div
      className={`toc-item ${item.isActive && !item.isScrolledOver ? 'is-active' : ''} ${item.isScrolledOver ? 'is-scrolled-over' : ''}`}
      style={
        {
          '--level': item.level
        } as React.CSSProperties
      }>
      <a href={`#${item.id}`} onClick={(e) => onItemClick(e, item.id)} data-item-index={item.itemIndex}>
        {item.textContent}
      </a>
    </div>
  )
}

interface ToCProps {
  items?: TableOfContentDataItem[]
  editor?: Editor | null
}

export const ToC: React.FC<ToCProps> = ({ items = [], editor }) => {
  if (items.length === 0) {
    return null
  }

  const onItemClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault()

    if (editor) {
      const element = editor.view.dom.querySelector(`[data-toc-id="${id}"]`)
      if (element) {
        const pos = editor.view.posAtDOM(element, 0)
        editor.chain().setTextSelection(pos).focus().scrollIntoView().run()

        if (history.pushState) {
          history.pushState(null, '', `#${id}`)
        }
      }
    }
  }

  return (
    <ToCDock>
      <div className="toc-rail">
        {items.map((item) => (
          <button
            type="button"
            key={`rail-${item.id}`}
            className={`toc-rail-button level-${item.level} ${item.isActive ? 'active' : ''} ${item.isScrolledOver ? 'scrolled-over' : ''}`}
            title={item.textContent}
            onClick={(e) => onItemClick(e, item.id)}
          />
        ))}
      </div>

      {/* floating panel */}
      <div className="toc-panel">
        <TableOfContentsWrapper>
          <div className="table-of-contents">
            {items.map((item) => (
              <ToCItem onItemClick={onItemClick} key={item.id} item={item} />
            ))}
          </div>
        </TableOfContentsWrapper>
      </div>
    </ToCDock>
  )
}

export default ToC
