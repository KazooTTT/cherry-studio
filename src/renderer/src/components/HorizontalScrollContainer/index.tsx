import Scrollbar from '@renderer/components/Scrollbar'
import { ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

/**
 * 水平滚动容器
 * @param children 子元素
 * @param dependencies 依赖项
 * @param scrollDistance 滚动距离
 * @param className 类名
 * @param gap 间距
 * @param paddingRight 右侧内边距
 * @param expandable 是否可展开
 */
export interface HorizontalScrollContainerProps {
  children: React.ReactNode
  dependencies?: readonly unknown[]
  scrollDistance?: number
  className?: string
  gap?: string
  paddingRight?: string
  expandable?: boolean
}

const HorizontalScrollContainer: React.FC<HorizontalScrollContainerProps> = ({
  children,
  dependencies = [],
  scrollDistance = 200,
  className,
  gap = '8px',
  paddingRight = '2rem',
  expandable = false
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScroll, setCanScroll] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const handleScrollRight = () => {
    scrollRef.current?.scrollBy({ left: scrollDistance, behavior: 'smooth' })
  }

  const handleContainerClick = (e: React.MouseEvent) => {
    if (expandable) {
      // 确保不是点击了其他交互元素（如 tag 的关闭按钮）
      const target = e.target as HTMLElement
      if (!target.closest('[data-no-expand]')) {
        setIsExpanded(!isExpanded)
      }
    }
  }

  const checkScrollability = () => {
    const scrollElement = scrollRef.current
    if (scrollElement) {
      setCanScroll(scrollElement.scrollWidth > scrollElement.clientWidth)
    }
  }

  useEffect(() => {
    const scrollElement = scrollRef.current
    if (!scrollElement) return

    checkScrollability()

    const resizeObserver = new ResizeObserver(checkScrollability)
    resizeObserver.observe(scrollElement)

    window.addEventListener('resize', checkScrollability)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', checkScrollability)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  return (
    <Container
      className={className}
      $paddingRight={paddingRight}
      $expandable={expandable}
      onClick={expandable ? handleContainerClick : undefined}>
      <ScrollContent ref={scrollRef} $gap={gap} $isExpanded={isExpanded} $expandable={expandable}>
        {children}
      </ScrollContent>
      {canScroll && !isExpanded && (
        <ScrollButton onClick={handleScrollRight} className="scroll-right-button">
          <ChevronRight size={14} />
        </ScrollButton>
      )}
    </Container>
  )
}

const Container = styled.div<{ $paddingRight: string; $expandable?: boolean }>`
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
  padding-right: ${(props) => props.$paddingRight};
  position: relative;
  cursor: ${(props) => (props.$expandable ? 'pointer' : 'default')};

  &:hover {
    .scroll-right-button {
      opacity: 1;
    }
  }
`

const ScrollContent = styled(Scrollbar)<{
  $gap: string
  $isExpanded?: boolean
  $expandable?: boolean
}>`
  display: flex;
  overflow-x: ${(props) => (props.$expandable && props.$isExpanded ? 'hidden' : 'auto')};
  overflow-y: hidden;
  white-space: ${(props) => (props.$expandable && props.$isExpanded ? 'normal' : 'nowrap')};
  gap: ${(props) => props.$gap};
  flex-wrap: ${(props) => (props.$expandable && props.$isExpanded ? 'wrap' : 'nowrap')};

  &::-webkit-scrollbar {
    display: none;
  }
`

const ScrollButton = styled.div`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
  cursor: pointer;
  background: var(--color-background);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 6px 16px 0 rgba(0, 0, 0, 0.08),
    0 3px 6px -4px rgba(0, 0, 0, 0.12),
    0 9px 28px 8px rgba(0, 0, 0, 0.05);
  color: var(--color-text-2);

  &:hover {
    color: var(--color-text);
    background: var(--color-list-item);
  }
`

export default HorizontalScrollContainer
