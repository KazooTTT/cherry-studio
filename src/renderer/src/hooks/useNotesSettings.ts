import { useAppDispatch, useAppSelector } from '@renderer/store'
import { NotesSettings, selectNotesSettings, updateNotesSettings } from '@renderer/store/note'

export const useNotesSettings = () => {
  const dispatch = useAppDispatch()
  const settings = useAppSelector(selectNotesSettings)

  const updateSettings = (newSettings: Partial<NotesSettings>) => {
    dispatch(updateNotesSettings(newSettings))
  }

  return {
    settings,
    updateSettings
  }
}
