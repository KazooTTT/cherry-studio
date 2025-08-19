import CodeEditor from '@renderer/components/CodeEditor'
import { HSpaceBetweenStack } from '@renderer/components/Layout'
import RichEditor from '@renderer/components/RichEditor'
import { RichEditorRef } from '@renderer/components/RichEditor/types'
import Selector from '@renderer/components/Selector'
import { useNotesSettings } from '@renderer/hooks/useNotesSettings'
import { Empty, Spin } from 'antd'
import { FC, memo, RefObject, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

interface NotesEditorProps {
  activeNodeId?: string
  currentContent: string
  tokenCount: number
  isLoading: boolean
  editorRef: RefObject<RichEditorRef | null>
  onMarkdownChange: (content: string) => void
}

const NotesEditor: FC<NotesEditorProps> = memo(
  ({ activeNodeId, currentContent, tokenCount, isLoading, onMarkdownChange, editorRef }) => {
    const { t } = useTranslation()
    const { settings, updateSettings } = useNotesSettings()
    const handleCommandsReady = useCallback((commandAPI: Pick<RichEditorRef, 'unregisterCommand'>) => {
      const disabledCommands = ['image', 'inlineMath']
      disabledCommands.forEach((commandId) => {
        commandAPI.unregisterCommand(commandId)
      })
    }, [])

    if (!activeNodeId) {
      return (
        <EmptyContainer>
          <Empty description={t('notes.empty')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </EmptyContainer>
      )
    }

    if (isLoading) {
      return (
        <LoadingContainer>
          <Spin tip={t('common.loading')} />
        </LoadingContainer>
      )
    }

    return (
      <>
        <RichEditorContainer>
          {settings.editorMode === 'source' ? (
            <CodeEditor
              value={currentContent}
              language="markdown"
              onChange={onMarkdownChange}
              height="100%"
              style={{
                height: '100%'
              }}
            />
          ) : (
            <RichEditor
              key={`${activeNodeId}-${settings.editorMode === 'preview' ? 'preview' : 'edit'}`}
              ref={editorRef}
              initialContent={currentContent}
              onMarkdownChange={onMarkdownChange}
              onCommandsReady={handleCommandsReady}
              showToolbar={settings.editorMode === 'editor'}
              editable={settings.editorMode === 'editor'}
              showTableOfContents
              enableContentSearch
              className="notes-rich-editor"
              isFullWidth={settings.isFullWidth}
              fontFamily={settings.fontFamily}
            />
          )}
        </RichEditorContainer>
        <BottomPanel>
          <HSpaceBetweenStack width="100%" justifyContent="space-between" alignItems="center">
            <TokenCount>
              {t('notes.characters')}: {tokenCount}
            </TokenCount>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--color-text-3)',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
              <Selector
                value={settings.editorMode}
                onChange={(value: 'editor' | 'source' | 'preview') => updateSettings({ editorMode: value })}
                options={[
                  { label: t('notes.settings.editorMode'), value: 'editor' },
                  { label: t('notes.settings.sourceMode'), value: 'source' },
                  { label: t('notes.settings.previewMode'), value: 'preview' }
                ]}
              />
            </div>
          </HSpaceBetweenStack>
        </BottomPanel>
      </>
    )
  }
)

NotesEditor.displayName = 'NotesEditor'

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
`

const EmptyContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  flex: 1;
`

const RichEditorContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  transition: opacity 0.2s ease-in-out;

  .notes-rich-editor {
    border: none;
    flex: 1;
    background: transparent;

    .rich-editor-wrapper {
      height: 100%;
      display: flex;
      flex-direction: column;
      transition: all 0.15s ease-in-out;
    }

    .rich-editor-content {
      flex: 1;
      overflow: auto;
      padding: 16px;
      transition: all 0.15s ease-in-out;
    }

    /* 预览模式下的样式优化 */
    &[data-preview='true'] {
      .ProseMirror {
        cursor: default !important;
      }
    }
  }
`

const BottomPanel = styled.div`
  padding: 8px 16px;
  border-top: 1px solid var(--color-border);
  background: var(--color-background-soft);
  flex-shrink: 0;
  height: 48px;
  display: flex;
  align-items: center;
`

const TokenCount = styled.div`
  font-size: 12px;
  color: var(--color-text-3);
  user-select: none;
  line-height: 1;
`

export default NotesEditor
