import { loggerService } from '@logger'
import CodeEditor from '@renderer/components/CodeEditor'
import { HSpaceBetweenStack } from '@renderer/components/Layout'
import RichEditor from '@renderer/components/RichEditor'
import { RichEditorRef } from '@renderer/components/RichEditor/types'
import Selector from '@renderer/components/Selector'
import { useNotesSettings } from '@renderer/hooks/useNotesSettings'
import { useSettings } from '@renderer/hooks/useSettings'
import HeaderNavbar from '@renderer/pages/notes/HeaderNavbar'
import FileManager from '@renderer/services/FileManager'
import {
  createFolder,
  createNote,
  deleteNode,
  getNotesTree,
  isParentNode,
  moveNode,
  renameNode,
  sortAllLevels,
  toggleNodeExpanded,
  toggleStarred,
  updateNote,
  uploadNote
} from '@renderer/services/NotesService'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import { selectActiveNodeId, setActiveNodeId } from '@renderer/store/note'
import { NotesSortType, NotesTreeNode } from '@renderer/types/note'
import { Empty, Spin } from 'antd'
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import NotesSidebar from './NotesSidebar'

const logger = loggerService.withContext('NotesPage')

const NotesPage: FC = () => {
  const editorRef = useRef<RichEditorRef>(null)
  const { t } = useTranslation()
  const { showWorkspace } = useSettings()
  const dispatch = useAppDispatch()
  const activeNodeId = useAppSelector(selectActiveNodeId)
  const { settings, updateSettings } = useNotesSettings()
  const [notesTree, setNotesTree] = useState<NotesTreeNode[]>([])
  const [currentContent, setCurrentContent] = useState<string>('')
  const [tokenCount, setTokenCount] = useState(0)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  useEffect(() => {
    const updateCharCount = () => {
      const textContent = editorRef.current?.getContent() || currentContent
      const plainText = textContent.replace(/<[^>]*>/g, '')
      setTokenCount(plainText.length)
    }
    updateCharCount()
  }, [currentContent])

  // 查找树节点 by ID
  const findNodeById = useCallback((tree: NotesTreeNode[], nodeId: string): NotesTreeNode | null => {
    for (const node of tree) {
      if (node.id === nodeId) {
        return node
      }
      if (node.children) {
        const found = findNodeById(node.children, nodeId)
        if (found) return found
      }
    }
    return null
  }, [])

  // 保存当前笔记内容
  const saveCurrentNote = useCallback(
    async (content: string) => {
      if (!activeNodeId || content === currentContent) return

      try {
        const activeNode = findNodeById(notesTree, activeNodeId)
        if (activeNode && activeNode.type === 'file') {
          await updateNote(activeNode, content)
        }
      } catch (error) {
        logger.error('Failed to save note:', error as Error)
      }
    },
    [activeNodeId, currentContent, findNodeById, notesTree]
  )

  const handleMarkdownChange = (newMarkdown: string) => {
    setCurrentContent(newMarkdown)
    saveCurrentNote(newMarkdown)
  }

  const handleCommandsReady = (commandAPI: Pick<RichEditorRef, 'unregisterCommand'>) => {
    const disabledCommands = ['image', 'inlineMath']
    disabledCommands.forEach((commandId) => {
      commandAPI.unregisterCommand(commandId)
    })
  }

  // 初始化加载笔记树
  useEffect(() => {
    const loadNotesTree = async () => {
      try {
        const tree = await getNotesTree()
        logger.debug('Loaded notes tree:', tree)
        setNotesTree(tree)
      } catch (error) {
        logger.error('Failed to load notes tree:', error as Error)
      }
    }

    loadNotesTree()
  }, [])

  // 加载笔记内容
  useEffect(() => {
    const loadNoteContent = async () => {
      if (activeNodeId && notesTree.length > 0) {
        setIsLoading(true)
        try {
          const activeNode = findNodeById(notesTree, activeNodeId)
          logger.debug('Active node:', activeNode)
          if (activeNode && activeNode.type === 'file' && activeNode.fileId) {
            try {
              const fileMetadata = await FileManager.getFile(activeNode.fileId)
              logger.debug('File metadata:', fileMetadata)
              if (fileMetadata) {
                const content = await window.api.file.read(fileMetadata.id + fileMetadata.ext)
                logger.debug(content)
                setCurrentContent(content)
              }
            } catch (error) {
              logger.error('Failed to read file:', error as Error)
              setCurrentContent('')
            }
          }
        } catch (error) {
          logger.error('Failed to load note content:', error as Error)
          setCurrentContent('')
        } finally {
          setIsLoading(false)
        }
      } else if (!activeNodeId) {
        setCurrentContent('')
      }
    }

    loadNoteContent()
    // eslint-disable-next-line
  }, [activeNodeId, notesTree.length, findNodeById])

  // 创建文件夹
  const handleCreateFolder = async (name: string, parentId?: string) => {
    try {
      await createFolder(name, parentId)
      const updatedTree = await getNotesTree()
      setNotesTree(updatedTree)
    } catch (error) {
      logger.error('Failed to create folder:', error as Error)
    }
  }

  // 创建笔记
  const handleCreateNote = async (name: string, parentId?: string) => {
    try {
      const newNote = await createNote(name, '', parentId)
      const updatedTree = await getNotesTree()
      setNotesTree(updatedTree)
      dispatch(setActiveNodeId(newNote.id))
    } catch (error) {
      logger.error('Failed to create note:', error as Error)
    }
  }

  // 选择节点
  const handleSelectNode = async (node: NotesTreeNode) => {
    if (node.type === 'file') {
      try {
        dispatch(setActiveNodeId(node.id))

        if (node.fileId) {
          const updatedFileMetadata = await FileManager.getFile(node.fileId)
          if (updatedFileMetadata && updatedFileMetadata.origin_name !== node.name) {
            // 如果数据库中的显示名称与树节点中的名称不同，更新树节点
            const updatedTree = [...notesTree]
            const updatedNode = findNodeById(updatedTree, node.id)
            if (updatedNode) {
              updatedNode.name = updatedFileMetadata.origin_name
              setNotesTree(updatedTree)
            }
          }
        }
      } catch (error) {
        logger.error('Failed to load note:', error as Error)
      }
    } else if (node.type === 'folder') {
      // 切换文件夹展开状态
      await handleToggleExpanded(node.id)
    }
  }

  // 删除节点
  const handleDeleteNode = async (nodeId: string) => {
    try {
      const isActiveNodeOrParent =
        activeNodeId && (nodeId === activeNodeId || isParentNode(notesTree, nodeId, activeNodeId))

      await deleteNode(nodeId)
      const updatedTree = await getNotesTree()
      setNotesTree(updatedTree)

      // 如果删除的是当前活动节点，清空编辑器
      if (isActiveNodeOrParent) {
        dispatch(setActiveNodeId(undefined))
        setCurrentContent('')
        if (editorRef.current) {
          editorRef.current.clear()
        }
      }
    } catch (error) {
      logger.error('Failed to delete node:', error as Error)
    }
  }

  // 重命名节点
  const handleRenameNode = async (nodeId: string, newName: string) => {
    try {
      await renameNode(nodeId, newName)
      const updatedTree = await getNotesTree()
      setNotesTree(updatedTree)
    } catch (error) {
      logger.error('Failed to rename node:', error as Error)
    }
  }

  // 切换展开状态
  const handleToggleExpanded = async (nodeId: string) => {
    try {
      await toggleNodeExpanded(nodeId)
      const updatedTree = await getNotesTree()
      setNotesTree(updatedTree)
    } catch (error) {
      logger.error('Failed to toggle expanded:', error as Error)
    }
  }

  // 切换收藏状态
  const handleToggleStar = async (nodeId: string) => {
    try {
      await toggleStarred(nodeId)
      const updatedTree = await getNotesTree()
      setNotesTree(updatedTree)
    } catch (error) {
      window.message.error(t('notes.starred_failed'))
      logger.error(`Failed to toggle star for note: ${error}`)
    }
  }

  // 处理文件上传
  const handleUploadFiles = async (files: File[]) => {
    try {
      setIsLoading(true)
      const markdownFiles = Array.from(files).filter((file) => file.name.toLowerCase().endsWith('.md'))

      if (markdownFiles.length === 0) {
        window.message.warning(t('notes.only_markdown'))
        return
      }

      for (const file of markdownFiles) {
        try {
          await uploadNote(file)
        } catch (error) {
          logger.error(`Failed to upload note file ${file.name}:`, error as Error)
          window.message.error(t('notes.upload_failed', { name: file.name }))
        }
      }

      // 上传完成后刷新笔记树
      const updatedTree = await getNotesTree()
      setNotesTree(updatedTree)
      window.message.success(t('notes.upload_success', { count: markdownFiles.length }))
    } catch (error) {
      logger.error('Failed to handle file uploads:', error as Error)
      window.message.error(t('notes.upload_failed'))
    } finally {
      setIsLoading(false)
    }
  }

  // 处理节点移动
  const handleMoveNode = async (
    sourceNodeId: string,
    targetNodeId: string,
    position: 'before' | 'after' | 'inside'
  ) => {
    try {
      const success = await moveNode(sourceNodeId, targetNodeId, position)
      if (success) {
        logger.debug(`Move node ${sourceNodeId} ${position} node ${targetNodeId}`)
        const updatedTree = await getNotesTree()
        setNotesTree(updatedTree)
      } else {
        logger.error(`Failed to move node ${sourceNodeId} ${position} node ${targetNodeId}`)
      }
    } catch (error) {
      logger.error('Failed to move nodes:', error as Error)
    }
  }

  // 处理节点排序
  const handleSortNodes = async (sortType: NotesSortType) => {
    try {
      logger.info(`Sorting notes with type: ${sortType}`)
      await sortAllLevels(sortType)
      const updatedTree = await getNotesTree()
      setNotesTree(updatedTree)
    } catch (error) {
      logger.error('Failed to sort notes:', error as Error)
      throw error
    }
  }

  const getCurrentNoteContent = useCallback(() => {
    if (settings.editorMode === 'source') {
      return currentContent
    } else {
      return editorRef.current?.getMarkdown() || currentContent
    }
  }, [currentContent, settings.editorMode])

  return (
    <Container id="notes-page">
      <ContentContainer id="content-container">
        {showWorkspace && (
          <NotesSidebar
            notesTree={notesTree}
            activeNodeId={activeNodeId}
            onSelectNode={handleSelectNode}
            onCreateFolder={handleCreateFolder}
            onCreateNote={handleCreateNote}
            onDeleteNode={handleDeleteNode}
            onRenameNode={handleRenameNode}
            onToggleExpanded={handleToggleExpanded}
            onToggleStar={handleToggleStar}
            onMoveNode={handleMoveNode}
            onSortNodes={handleSortNodes}
            onUploadFiles={handleUploadFiles}
          />
        )}
        <EditorWrapper>
          <HeaderNavbar notesTree={notesTree} getCurrentNoteContent={getCurrentNoteContent} />
          {activeNodeId ? (
            <>
              {isLoading ? (
                <LoadingContainer>
                  <Spin tip={t('common.loading')} />
                </LoadingContainer>
              ) : (
                <>
                  <RichEditorContainer>
                    {settings.editorMode === 'source' ? (
                      <CodeEditor
                        value={currentContent}
                        language="markdown"
                        onChange={handleMarkdownChange}
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
                        onMarkdownChange={handleMarkdownChange}
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
              )}
            </>
          ) : (
            <EmptyContainer>
              <Empty description={t('notes.empty')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </EmptyContainer>
          )}
        </EditorWrapper>
      </ContentContainer>
    </Container>
  )
}

const Container = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
`

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

const ContentContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  min-height: 0;
`

const EditorWrapper = styled.div`
  display: flex;
  position: relative;
  flex-direction: column;
  justify-content: space-between;
  width: 100%;
  flex: 1;
  max-width: 100%;
  overflow: hidden;
  min-height: 0;
  min-width: 0;
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

export default NotesPage
