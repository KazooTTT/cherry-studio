import { NotesSettings } from '@renderer/store/note'
import { Copy, Edit3, Eye, FileText, MonitorSpeaker, Type } from 'lucide-react'
import { ReactNode } from 'react'

export interface MenuItem {
  key: string
  type?: 'divider' | 'component'
  labelKey: string
  icon?: React.ComponentType<any>
  action?: (settings: NotesSettings, updateSettings: (newSettings: Partial<NotesSettings>) => void) => void
  children?: MenuItem[]
  isActive?: (settings: NotesSettings) => boolean
  component?: (settings: NotesSettings, updateSettings: (newSettings: Partial<NotesSettings>) => void) => ReactNode
  copyAction?: boolean
}

export const menuItems: MenuItem[] = [
  {
    key: 'copy-content',
    labelKey: 'notes.copyContent',
    icon: Copy,
    copyAction: true
  },
  {
    key: 'divider0',
    type: 'divider',
    labelKey: ''
  },
  {
    key: 'fullwidth',
    labelKey: 'notes.settings.fullWidth',
    icon: MonitorSpeaker,
    action: (settings, updateSettings) => updateSettings({ isFullWidth: !settings.isFullWidth }),
    isActive: (settings) => settings.isFullWidth
  },
  {
    key: 'divider1',
    type: 'divider',
    labelKey: ''
  },
  {
    key: 'font',
    labelKey: 'notes.settings.fontFamily',
    icon: Type,
    children: [
      {
        key: 'default-font',
        labelKey: 'notes.settings.defaultFont',
        action: (_, updateSettings) => updateSettings({ fontFamily: 'default' }),
        isActive: (settings) => settings.fontFamily === 'default'
      },
      {
        key: 'serif-font',
        labelKey: 'notes.settings.serifFont',
        action: (_, updateSettings) => updateSettings({ fontFamily: 'serif' }),
        isActive: (settings) => settings.fontFamily === 'serif'
      }
    ]
  },
  {
    key: 'divider2',
    type: 'divider',
    labelKey: ''
  },
  {
    key: 'mode',
    labelKey: 'notes.settings.viewMode',
    icon: Eye,
    children: [
      {
        key: 'editor-mode',
        labelKey: 'notes.settings.editorMode',
        icon: Edit3,
        action: (_, updateSettings) => updateSettings({ editorMode: 'editor' }),
        isActive: (settings) => settings.editorMode === 'editor'
      },
      {
        key: 'source-mode',
        labelKey: 'notes.settings.sourceMode',
        icon: FileText,
        action: (_, updateSettings) => updateSettings({ editorMode: 'source' }),
        isActive: (settings) => settings.editorMode === 'source'
      },
      {
        key: 'preview-mode',
        labelKey: 'notes.settings.previewMode',
        icon: Eye,
        action: (_, updateSettings) => updateSettings({ editorMode: 'preview' }),
        isActive: (settings) => settings.editorMode === 'preview'
      }
    ]
  }
]
