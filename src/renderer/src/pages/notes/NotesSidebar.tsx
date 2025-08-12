import { loggerService } from '@logger'
import SaveToKnowledgePopup from '@renderer/components/Popups/SaveToKnowledgePopup'
import Scrollbar from '@renderer/components/Scrollbar'
import { useKnowledgeBases } from '@renderer/hooks/useKnowledge'
import { NotesTreeNode } from '@renderer/types/note'
import { Dropdown, Input, MenuProps, Tooltip } from 'antd'
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Edit3,
  File,
  FilePlus,
  FileSearch,
  Folder,
  FolderOpen,
  FolderPlus,
  Star,
  StarOff,
  Trash2
} from 'lucide-react'
import { FC, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

interface NotesSidebarProps {
  onCreateFolder: (name: string, parentId?: string) => void
  onCreateNote: (name: string, parentId?: string) => void
  onSelectNode: (node: NotesTreeNode) => void
  onDeleteNode: (nodeId: string) => void
  onRenameNode: (nodeId: string, newName: string) => void
  onToggleExpanded: (nodeId: string) => void
  onToggleStar: (nodeId: string) => void
  onMoveNode: (nodeId: string, targetParentId?: string) => void
  activeNodeId?: string
  notesTree: NotesTreeNode[]
}

const logger = loggerService.withContext('NotesSidebar')

const NotesSidebar: FC<NotesSidebarProps> = ({
  onCreateFolder,
  onCreateNote,
  onSelectNode,
  onDeleteNode,
  onRenameNode,
  onToggleExpanded,
  onToggleStar,
  onMoveNode,
  activeNodeId,
  notesTree
}) => {
  const { t } = useTranslation()
  const { bases } = useKnowledgeBases()
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null)
  const [isShowStarred, setIsShowStarred] = useState(false)

  const handleCreateFolder = useCallback(() => {
    onCreateFolder(t('notes.untitled_folder'))
  }, [onCreateFolder, t])

  const handleCreateNote = useCallback(() => {
    onCreateNote(t('notes.untitled_note'))
  }, [onCreateNote, t])

  const handleStartEdit = useCallback((node: NotesTreeNode) => {
    setEditingNodeId(node.id)
    setEditingName(node.name)
  }, [])

  const handleFinishEdit = useCallback(() => {
    if (editingNodeId && editingName.trim()) {
      onRenameNode(editingNodeId, editingName.trim())
    }
    setEditingNodeId(null)
    setEditingName('')
    logger.debug(`Renamed node ${editingNodeId} to "${editingName.trim()}"`)
  }, [editingNodeId, editingName, onRenameNode])

  const handleCancelEdit = useCallback(() => {
    setEditingNodeId(null)
    setEditingName('')
  }, [])

  const handleDeleteNode = useCallback(
    (node: NotesTreeNode) => {
      const confirmKey = node.type === 'folder' ? 'delete_folder_confirm' : 'delete_note_confirm'

      window.modal.confirm({
        title: t('notes.delete'),
        content: t(`notes.${confirmKey}`, { name: node.name }),
        centered: true,
        okButtonProps: { danger: true },
        onOk: () => {
          onDeleteNode(node.id)
        }
      })
    },
    [onDeleteNode, t]
  )

  const handleExportKnowledge = useCallback(
    async (note: NotesTreeNode) => {
      try {
        if (bases.length === 0) {
          window.message.warning(t('chat.save.knowledge.empty.no_knowledge_base'))
          return
        }

        const result = await SaveToKnowledgePopup.showForNote(note)

        if (result?.success) {
          window.message.success(t('notes.export_success', { count: result.savedCount }))
        }
      } catch (error) {
        window.message.error(t('notes.export_failed'))
        logger.error(`Failed to export note to knowledge base: ${error}`)
      }
    },
    [bases.length, t]
  )

  const handleDragStart = useCallback((e: React.DragEvent, node: NotesTreeNode) => {
    setDraggedNodeId(node.id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', node.id)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, node: NotesTreeNode) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverNodeId(node.id)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverNodeId(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, targetNode: NotesTreeNode) => {
      e.preventDefault()
      const draggedId = e.dataTransfer.getData('text/plain')

      if (draggedId && draggedId !== targetNode.id) {
        const targetParentId = targetNode.type === 'folder' ? targetNode.id : undefined
        onMoveNode(draggedId, targetParentId)
      }

      setDraggedNodeId(null)
      setDragOverNodeId(null)
    },
    [onMoveNode]
  )

  const handleDragEnd = useCallback(() => {
    setDraggedNodeId(null)
    setDragOverNodeId(null)
  }, [])

  // 切换收藏视图
  const handleToggleStarredView = useCallback(() => {
    setIsShowStarred(!isShowStarred)
  }, [isShowStarred])

  // 筛选收藏的笔记
  const filteredTree = useMemo(() => {
    if (!isShowStarred) return notesTree
    const flattenNodes = (nodes: NotesTreeNode[]): NotesTreeNode[] => {
      let result: NotesTreeNode[] = []

      for (const node of nodes) {
        if (node.type === 'file' && node.is_starred) {
          result.push(node)
        }

        if (node.children && node.children.length > 0) {
          result = [...result, ...flattenNodes(node.children)]
        }
      }
      return result
    }

    return flattenNodes(notesTree)
  }, [notesTree, isShowStarred])

  // TODO 通过拖动上传文件

  // 实现右键菜单
  const getMenuItems = useCallback(
    (node: NotesTreeNode) => {
      const baseMenuItems: MenuProps['items'] = [
        {
          label: t('notes.rename'),
          key: 'rename',
          icon: <Edit3 size={14} />,
          onClick: () => {
            handleStartEdit(node)
          }
        }
      ]
      if (node.type !== 'folder') {
        baseMenuItems.push(
          {
            label: node.is_starred ? t('notes.unstar') : t('notes.star'),
            key: 'star',
            icon: node.is_starred ? <StarOff size={14} /> : <Star size={14} />,
            onClick: () => {
              onToggleStar(node.id)
            }
          },
          {
            label: t('notes.export_knowledge'),
            key: 'export_knowledge',
            icon: <FileSearch size={14} />,
            onClick: () => {
              handleExportKnowledge(node)
            }
          }
        )
      }
      baseMenuItems.push(
        { type: 'divider' },
        {
          label: t('notes.delete'),
          danger: true,
          key: 'delete',
          icon: <Trash2 size={14} />,
          onClick: () => {
            handleDeleteNode(node)
          }
        }
      )

      return baseMenuItems
    },
    [t, handleStartEdit, onToggleStar, handleExportKnowledge, handleDeleteNode]
  )

  const renderTreeNode = useCallback(
    (node: NotesTreeNode, depth: number = 0) => {
      const isActive = node.id === activeNodeId
      const isEditing = editingNodeId === node.id
      const hasChildren = node.children && node.children.length > 0
      const isDragging = draggedNodeId === node.id
      const isDragOver = dragOverNodeId === node.id

      return (
        <div key={node.id}>
          <Dropdown menu={{ items: getMenuItems(node) }} trigger={['contextMenu']}>
            <div>
              <TreeNodeContainer
                active={isActive}
                depth={depth}
                isDragging={isDragging}
                isDragOver={isDragOver}
                draggable={!isEditing}
                onDragStart={(e) => handleDragStart(e, node)}
                onDragOver={(e) => handleDragOver(e, node)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, node)}
                onDragEnd={handleDragEnd}>
                <TreeNodeContent onClick={() => onSelectNode(node)}>
                  <NodeIndent depth={depth} />

                  {node.type === 'folder' && (
                    <ExpandIcon
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleExpanded(node.id)
                      }}
                      title={node.expanded ? t('notes.collapse') : t('notes.expand')}>
                      {node.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </ExpandIcon>
                  )}

                  <NodeIcon>
                    {node.type === 'folder' ? (
                      node.expanded ? (
                        <FolderOpen size={16} />
                      ) : (
                        <Folder size={16} />
                      )
                    ) : (
                      <File size={16} />
                    )}
                  </NodeIcon>

                  {isEditing ? (
                    <EditInput
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onPressEnter={handleFinishEdit}
                      onBlur={handleFinishEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          handleCancelEdit()
                        }
                      }}
                      autoFocus
                      size="small"
                    />
                  ) : (
                    <NodeName>{node.name}</NodeName>
                  )}
                </TreeNodeContent>
              </TreeNodeContainer>
            </div>
          </Dropdown>

          {node.type === 'folder' && node.expanded && hasChildren && (
            <div>{node.children!.map((child) => renderTreeNode(child, depth + 1))}</div>
          )}
        </div>
      )
    },
    [
      activeNodeId,
      editingNodeId,
      editingName,
      draggedNodeId,
      dragOverNodeId,
      onSelectNode,
      onToggleExpanded,
      handleFinishEdit,
      handleCancelEdit,
      handleDragStart,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handleDragEnd,
      getMenuItems,
      t
    ]
  )

  return (
    <SidebarContainer>
      <SidebarHeader>
        <HeaderActions>
          {!isShowStarred && (
            <>
              <Tooltip title={t('notes.new_folder')} mouseEnterDelay={0.8}>
                <ActionButton onClick={handleCreateFolder}>
                  <FolderPlus size={18} />
                </ActionButton>
              </Tooltip>

              <Tooltip title={t('notes.new_note')} mouseEnterDelay={0.8}>
                <ActionButton onClick={handleCreateNote}>
                  <FilePlus size={18} />
                </ActionButton>
              </Tooltip>

              <Tooltip title={t('notes.show_starred')} mouseEnterDelay={0.8}>
                <ActionButton onClick={handleToggleStarredView}>
                  <Star size={18} />
                </ActionButton>
              </Tooltip>
            </>
          )}
          {isShowStarred && (
            <Tooltip title={t('common.back')} mouseEnterDelay={0.8}>
              <ActionButton onClick={handleToggleStarredView}>
                <ArrowLeft size={18} />
              </ActionButton>
            </Tooltip>
          )}
        </HeaderActions>
      </SidebarHeader>

      <NotesTreeContainer>
        <StyledScrollbar>
          <TreeContent>{filteredTree.map((node) => renderTreeNode(node))}</TreeContent>
        </StyledScrollbar>
      </NotesTreeContainer>
    </SidebarContainer>
  )
}

const SidebarContainer = styled.div`
  width: 280px;
  height: 100vh;
  background-color: var(--color-background);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
`

const SidebarHeader = styled.div`
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
`

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

const NotesTreeContainer = styled.div`
  flex: 1;
  overflow: hidden;
`

const StyledScrollbar = styled(Scrollbar)`
  height: 100%;
`

const TreeContent = styled.div`
  padding: 8px;
`

const TreeNodeContainer = styled.div<{ active: boolean; depth: number; isDragging?: boolean; isDragOver?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 2px;
  background-color: ${(props) => {
    if (props.isDragOver) return 'var(--color-primary-background)'
    if (props.active) return 'var(--color-background-soft)'
    return 'transparent'
  }};
  border: 1px solid
    ${(props) => {
      if (props.isDragOver) return 'var(--color-primary)'
      if (props.active) return 'var(--color-border)'
      return 'transparent'
    }};
  opacity: ${(props) => (props.isDragging ? 0.5 : 1)};
  transition: all 0.2s ease;

  &:hover {
    background-color: var(--color-background-soft);

    .node-actions {
      opacity: 1;
    }
  }
`

const TreeNodeContent = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
`

const NodeIndent = styled.div<{ depth: number }>`
  width: ${(props) => props.depth * 16}px;
  flex-shrink: 0;
`

const ExpandIcon = styled.div`
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-2);
  margin-right: 4px;

  &:hover {
    color: var(--color-text);
  }
`

const NodeIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  color: var(--color-text-2);
  flex-shrink: 0;
`

const NodeName = styled.div`
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: var(--color-text);
`

const EditInput = styled(Input)`
  flex: 1;
  font-size: 13px;

  .ant-input {
    font-size: 13px;
    padding: 2px 6px;
    border: 1px solid var(--color-primary);
  }
`

const ActionButton = styled.div`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: var(--color-text-2);
  cursor: pointer;

  &:hover {
    background-color: var(--color-background-soft);
    color: var(--color-text);
  }
`

export default NotesSidebar
