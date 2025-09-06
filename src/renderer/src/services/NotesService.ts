import { loggerService } from '@logger'
import db from '@renderer/databases'
import {
  findNodeInTree,
  findParentNode,
  getNotesTree,
  insertNodeIntoTree,
  isParentNode,
  moveNodeInTree,
  removeNodeFromTree,
  renameNodeFromTree
} from '@renderer/services/NotesTreeService'
import { NotesSortType, NotesTreeNode } from '@renderer/types/note'
import { getFileDirectory } from '@renderer/utils'
import { v4 as uuidv4 } from 'uuid'

const MARKDOWN_EXT = '.md'
const NOTES_TREE_ID = 'notes-tree-structure'

const logger = loggerService.withContext('NotesService')

/**
 * 初始化/同步笔记树结构
 */
export async function initWorkSpace(folderPath: string, sortType: NotesSortType): Promise<void> {
  const tree = await window.api.file.getDirectoryStructure(folderPath)
  await sortAllLevels(sortType, tree)
}

/**
 * 创建新文件夹
 */
export async function createFolder(name: string, folderPath: string): Promise<NotesTreeNode> {
  const { safeName, exists } = await window.api.file.checkFileName(folderPath, name, false)
  if (exists) {
    logger.warn(`Folder already exists: ${safeName}`)
  }

  const tree = await getNotesTree()
  const folderId = uuidv4()

  const targetPath = await window.api.file.mkdir(`${folderPath}/${safeName}`)

  // 查找父节点ID
  const parentNode = tree.find((node) => node.externalPath === folderPath) || findNodeByExternalPath(tree, folderPath)

  const folder: NotesTreeNode = {
    id: folderId,
    name: safeName,
    treePath: parentNode ? `${parentNode.treePath}/${safeName}` : `/${safeName}`,
    externalPath: targetPath,
    type: 'folder',
    children: [],
    expanded: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  insertNodeIntoTree(tree, folder, parentNode?.id)

  return folder
}

/**
 * 创建新笔记文件
 */
export async function createNote(name: string, content: string = '', folderPath: string): Promise<NotesTreeNode> {
  const { safeName, exists } = await window.api.file.checkFileName(folderPath, name, true)
  if (exists) {
    logger.warn(`Note already exists: ${safeName}`)
  }

  const tree = await getNotesTree()
  const noteId = uuidv4()
  const notePath = `${folderPath}/${safeName}${MARKDOWN_EXT}`

  await window.api.file.write(notePath, content)

  // 查找父节点ID
  const parentNode = tree.find((node) => node.externalPath === folderPath) || findNodeByExternalPath(tree, folderPath)

  const note: NotesTreeNode = {
    id: noteId,
    name: safeName,
    treePath: parentNode ? `${parentNode.treePath}/${safeName}` : `/${safeName}`,
    externalPath: notePath,
    type: 'file',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  insertNodeIntoTree(tree, note, parentNode?.id)

  return note
}

export interface UploadResult {
  uploadedNodes: NotesTreeNode[]
  totalFiles: number
  skippedFiles: number
  fileCount: number
  folderCount: number
}

/**
 * 上传文件或文件夹，支持单个或批量上传，保持文件夹结构
 */
export async function uploadFiles(files: File[], targetFolderPath: string): Promise<UploadResult> {
  const tree = await getNotesTree()
  const uploadedNodes: NotesTreeNode[] = []
  let skippedFiles = 0

  // 过滤非 markdown 文件
  const markdownFiles = Array.from(files).filter((file) => {
    if (file.name.toLowerCase().endsWith(MARKDOWN_EXT)) {
      return true
    }
    skippedFiles++
    logger.warn(`Skipping non-markdown file: ${file.name}`)
    return false
  })

  if (markdownFiles.length === 0) {
    return {
      uploadedNodes: [],
      totalFiles: files.length,
      skippedFiles,
      fileCount: 0,
      folderCount: 0
    }
  }

  // 按路径分组文件，处理文件夹结构
  const filesByPath = new Map<string, File[]>()
  const foldersToCreate = new Set<string>()

  for (const file of markdownFiles) {
    const filePath = file.webkitRelativePath || file.name
    const relativeDirPath = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : ''
    const fullDirPath = relativeDirPath ? `${targetFolderPath}/${relativeDirPath}` : targetFolderPath

    // 收集需要创建的文件夹路径
    if (relativeDirPath) {
      const pathParts = relativeDirPath.split('/')
      let currentPath = targetFolderPath
      for (const part of pathParts) {
        currentPath = `${currentPath}/${part}`
        foldersToCreate.add(currentPath)
      }
    }

    // 按目录分组文件
    if (!filesByPath.has(fullDirPath)) {
      filesByPath.set(fullDirPath, [])
    }
    filesByPath.get(fullDirPath)!.push(file)
  }

  // 先创建所有需要的文件夹
  const createdFolders = new Map<string, NotesTreeNode>()
  const sortedFolders = Array.from(foldersToCreate).sort()

  for (const folderPath of sortedFolders) {
    try {
      const relativePath = folderPath.replace(targetFolderPath + '/', '')
      const folderName = relativePath.split('/').pop()!
      const parentFolderPath = folderPath.substring(0, folderPath.lastIndexOf('/'))

      // 创建文件夹（如果不存在）
      try {
        await window.api.file.mkdir(folderPath)
      } catch (error) {
        logger.debug(`Folder already exists or error creating: ${folderPath}`)
      }

      // 查找父节点
      const parentNode =
        parentFolderPath === targetFolderPath
          ? tree.find((node) => node.externalPath === parentFolderPath) ||
            findNodeByExternalPath(tree, parentFolderPath)
          : createdFolders.get(parentFolderPath)

      // 检查树中是否已存在该文件夹节点
      const existingNode = findNodeByExternalPath(tree, folderPath)
      if (existingNode) {
        createdFolders.set(folderPath, existingNode)
        continue
      }

      // 创建文件夹节点
      const folderId = uuidv4()
      const folder: NotesTreeNode = {
        id: folderId,
        name: folderName,
        treePath: parentNode ? `${parentNode.treePath}/${folderName}` : `/${folderName}`,
        externalPath: folderPath,
        type: 'folder',
        children: [],
        expanded: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      insertNodeIntoTree(tree, folder, parentNode?.id)
      createdFolders.set(folderPath, folder)
      uploadedNodes.push(folder)

      logger.debug(`Created folder: ${folderPath}`)
    } catch (error) {
      logger.error(`Failed to create folder ${folderPath}:`, error as Error)
    }
  }

  // 然后上传所有文件
  for (const [dirPath, dirFiles] of filesByPath.entries()) {
    for (const file of dirFiles) {
      try {
        const fileName = (file.webkitRelativePath || file.name).split('/').pop()!
        const nameWithoutExt = fileName.replace(MARKDOWN_EXT, '')

        const { safeName, exists } = await window.api.file.checkFileName(dirPath, nameWithoutExt, true)
        if (exists) {
          logger.warn(`Note already exists: ${safeName}`)
        }

        const notePath = `${dirPath}/${safeName}${MARKDOWN_EXT}`

        // 查找父节点
        const parentNode =
          dirPath === targetFolderPath
            ? tree.find((node) => node.externalPath === dirPath) || findNodeByExternalPath(tree, dirPath)
            : createdFolders.get(dirPath) || findNodeByExternalPath(tree, dirPath)

        const noteId = uuidv4()
        const note: NotesTreeNode = {
          id: noteId,
          name: safeName,
          treePath: parentNode ? `${parentNode.treePath}/${safeName}` : `/${safeName}`,
          externalPath: notePath,
          type: 'file',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        const content = await file.text()
        await window.api.file.write(notePath, content)
        insertNodeIntoTree(tree, note, parentNode?.id)
        uploadedNodes.push(note)

        logger.debug(`Uploaded file: ${notePath}`)
      } catch (error) {
        logger.error(`Failed to upload file ${file.name}:`, error as Error)
      }
    }
  }

  const fileCount = uploadedNodes.filter((node) => node.type === 'file').length
  const folderCount = uploadedNodes.filter((node) => node.type === 'folder').length

  return {
    uploadedNodes,
    totalFiles: files.length,
    skippedFiles,
    fileCount,
    folderCount
  }
}

/**
 * 删除笔记或文件夹
 */
export async function deleteNode(nodeId: string): Promise<void> {
  const tree = await getNotesTree()
  const node = findNodeInTree(tree, nodeId)
  if (!node) {
    throw new Error('Node not found')
  }
  if (node.type === 'folder') {
    await window.api.file.deleteExternalDir(node.externalPath)
  } else if (node.type === 'file') {
    await window.api.file.deleteExternalFile(node.externalPath)
  }

  removeNodeFromTree(tree, nodeId)
}

/**
 * 重命名笔记或文件夹
 */
export async function renameNode(nodeId: string, newName: string): Promise<NotesTreeNode> {
  const tree = await getNotesTree()
  const node = findNodeInTree(tree, nodeId)
  if (!node) {
    throw new Error('Node not found')
  }

  const dirPath = getFileDirectory(node.externalPath)
  const { safeName, exists } = await window.api.file.checkFileName(dirPath, newName, node.type === 'file')

  if (exists) {
    logger.warn(`Target name already exists: ${safeName}`)
    throw new Error(`Target name already exists: ${safeName}`)
  }

  if (node.type === 'file') {
    await window.api.file.rename(node.externalPath, safeName)
  } else if (node.type === 'folder') {
    await window.api.file.renameDir(node.externalPath, safeName)
  }
  return renameNodeFromTree(tree, nodeId, safeName)
}

/**
 * 移动节点
 */
export async function moveNode(
  sourceNodeId: string,
  targetNodeId: string,
  position: 'before' | 'after' | 'inside'
): Promise<boolean> {
  try {
    const tree = await getNotesTree()

    // 找到源节点和目标节点
    const sourceNode = findNodeInTree(tree, sourceNodeId)
    const targetNode = findNodeInTree(tree, targetNodeId)

    if (!sourceNode || !targetNode) {
      logger.error(`Move nodes failed: node not found (source: ${sourceNodeId}, target: ${targetNodeId})`)
      return false
    }

    // 不允许文件夹被放入文件中
    if (position === 'inside' && targetNode.type === 'file' && sourceNode.type === 'folder') {
      logger.error('Move nodes failed: cannot move a folder inside a file')
      return false
    }

    // 不允许将节点移动到自身内部
    if (position === 'inside' && isParentNode(tree, sourceNodeId, targetNodeId)) {
      logger.error('Move nodes failed: cannot move a node inside itself or its descendants')
      return false
    }

    let targetPath: string = ''

    if (position === 'inside') {
      // 目标是文件夹内部
      if (targetNode.type === 'folder') {
        targetPath = targetNode.externalPath
      } else {
        logger.error('Cannot move node inside a file node')
        return false
      }
    } else {
      const targetParent = findParentNode(tree, targetNodeId)
      if (targetParent) {
        targetPath = targetParent.externalPath
      } else {
        targetPath = getFileDirectory(targetNode.externalPath!)
      }
    }

    // 构建新的文件路径
    const sourceName = sourceNode.externalPath!.split('/').pop()!
    const sourceNameWithoutExt = sourceName.replace(sourceNode.type === 'file' ? MARKDOWN_EXT : '', '')

    const { safeName } = await window.api.file.checkFileName(
      targetPath,
      sourceNameWithoutExt,
      sourceNode.type === 'file'
    )

    const baseName = safeName + (sourceNode.type === 'file' ? MARKDOWN_EXT : '')
    const newPath = `${targetPath}/${baseName}`

    if (sourceNode.externalPath !== newPath) {
      try {
        if (sourceNode.type === 'folder') {
          await window.api.file.moveDir(sourceNode.externalPath, newPath)
        } else {
          await window.api.file.move(sourceNode.externalPath, newPath)
        }
        sourceNode.externalPath = newPath
        logger.debug(`Moved external ${sourceNode.type} to: ${newPath}`)
      } catch (error) {
        logger.error(`Failed to move external ${sourceNode.type}:`, error as Error)
        return false
      }
    }

    return await moveNodeInTree(tree, sourceNodeId, targetNodeId, position)
  } catch (error) {
    logger.error('Move nodes failed:', error as Error)
    return false
  }
}

/**
 * 对节点数组进行排序
 */
function sortNodesArray(nodes: NotesTreeNode[], sortType: NotesSortType): void {
  // 首先分离文件夹和文件
  const folders: NotesTreeNode[] = nodes.filter((node) => node.type === 'folder')
  const files: NotesTreeNode[] = nodes.filter((node) => node.type === 'file')

  // 根据排序类型对文件夹和文件分别进行排序
  const sortFunction = getSortFunction(sortType)
  folders.sort(sortFunction)
  files.sort(sortFunction)

  // 清空原数组并重新填入排序后的节点
  nodes.length = 0
  nodes.push(...folders, ...files)
}

/**
 * 根据排序类型获取相应的排序函数
 */
function getSortFunction(sortType: NotesSortType): (a: NotesTreeNode, b: NotesTreeNode) => number {
  switch (sortType) {
    case 'sort_a2z':
      return (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'accent' })

    case 'sort_z2a':
      return (a, b) => b.name.localeCompare(a.name, undefined, { sensitivity: 'accent' })

    case 'sort_updated_desc':
      return (a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        return timeB - timeA
      }

    case 'sort_updated_asc':
      return (a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        return timeA - timeB
      }

    case 'sort_created_desc':
      return (a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return timeB - timeA
      }

    case 'sort_created_asc':
      return (a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return timeA - timeB
      }

    default:
      return (a, b) => a.name.localeCompare(b.name)
  }
}

/**
 * 递归排序笔记树中的所有层级
 */
export async function sortAllLevels(sortType: NotesSortType, tree?: NotesTreeNode[]): Promise<void> {
  try {
    if (!tree) {
      tree = await getNotesTree()
    }
    sortNodesArray(tree, sortType)
    recursiveSortNodes(tree, sortType)
    await db.notes_tree.put({ id: NOTES_TREE_ID, tree })
    logger.info(`Sorted all levels of notes successfully: ${sortType}`)
  } catch (error) {
    logger.error('Failed to sort all levels of notes:', error as Error)
    throw error
  }
}

/**
 * 递归对节点中的子节点进行排序
 */
function recursiveSortNodes(nodes: NotesTreeNode[], sortType: NotesSortType): void {
  for (const node of nodes) {
    if (node.type === 'folder' && node.children && node.children.length > 0) {
      sortNodesArray(node.children, sortType)
      recursiveSortNodes(node.children, sortType)
    }
  }
}

/**
 * 根据外部路径查找节点（递归查找）
 */
function findNodeByExternalPath(nodes: NotesTreeNode[], externalPath: string): NotesTreeNode | null {
  for (const node of nodes) {
    if (node.externalPath === externalPath) {
      return node
    }
    if (node.children && node.children.length > 0) {
      const found = findNodeByExternalPath(node.children, externalPath)
      if (found) {
        return found
      }
    }
  }
  return null
}
