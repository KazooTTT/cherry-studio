import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { objectEntriesStrict } from '@renderer/types'

export interface TranslateState {
  translateInput: string
  translatedContent: string
  settings: {
    autoCopy: boolean
  }
}

const initialState: TranslateState = {
  translateInput: '',
  translatedContent: '',
  settings: {
    autoCopy: false
  }
} as const

const translateSlice = createSlice({
  name: 'translate',
  initialState,
  reducers: {
    setTranslateInput: (state, action: PayloadAction<string>) => {
      state.translateInput = action.payload
    },
    setTranslatedContent: (state, action: PayloadAction<string>) => {
      state.translatedContent = action.payload
    },
    updateSettings: (state, action: PayloadAction<TranslateState['settings']>) => {
      for (const [key, value] of objectEntriesStrict(action.payload)) {
        state.settings[key] = value
      }
    }
  }
})

export const { setTranslateInput, setTranslatedContent } = translateSlice.actions

export default translateSlice.reducer
