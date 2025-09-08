import type { generateTextParams, streamTextParams } from '../../../runtime/types'
import { definePlugin } from '../../'
import type { AiRequestContext } from '../../types'

export const googleToolsPlugin = () =>
  definePlugin({
    name: 'googleToolsPlugin',
    transformParams: <T = generateTextParams | streamTextParams>(params: T, context: AiRequestContext) => {
      const { providerId } = context
      if (providerId === 'google') {
        // params.tools = googleTools
      }
      return params
    }
  })
