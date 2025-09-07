import '@renderer/databases'

import { HeroUIProvider } from '@heroui/react'
import { addToast, closeAll, closeToast, getToastQueue, isToastClosing } from '@heroui/toast'
import { ErrorBoundary } from '@renderer/components/ErrorBoundary'
import { ToastPortal } from '@renderer/components/ToastPortal'
import { error, info, loading, success, warning } from '@renderer/components/TopView/toast'
import { useSettings } from '@renderer/hooks/useSettings'
import store, { persistor } from '@renderer/store'
import { useEffect } from 'react'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'

import AntdProvider from '../../context/AntdProvider'
import { CodeStyleProvider } from '../../context/CodeStyleProvider'
import { ThemeProvider } from '../../context/ThemeProvider'
import HomeWindow from './home/HomeWindow'

// Inner component that uses the hook after Redux is initialized
function MiniWindowContent(): React.ReactElement {
  const { customCss } = useSettings()

  useEffect(() => {
    let customCssElement = document.getElementById('user-defined-custom-css') as HTMLStyleElement
    if (customCssElement) {
      customCssElement.remove()
    }

    if (customCss) {
      customCssElement = document.createElement('style')
      customCssElement.id = 'user-defined-custom-css'
      customCssElement.textContent = customCss
      document.head.appendChild(customCssElement)
    }
  }, [customCss])

  return <HomeWindow />
}

function MiniWindow(): React.ReactElement {
  useEffect(() => {
    window.toast = {
      getToastQueue: getToastQueue,
      addToast: addToast,
      closeToast: closeToast,
      closeAll: closeAll,
      isToastClosing: isToastClosing,
      error,
      success,
      warning,
      info,
      loading
    }
  }, [])

  return (
    <Provider store={store}>
      <HeroUIProvider>
        <ThemeProvider>
          <AntdProvider>
            <CodeStyleProvider>
              <PersistGate loading={null} persistor={persistor}>
                <ErrorBoundary>
                  <MiniWindowContent />
                </ErrorBoundary>
              </PersistGate>
            </CodeStyleProvider>
          </AntdProvider>
        </ThemeProvider>
        <ToastPortal />
      </HeroUIProvider>
    </Provider>
  )
}

export default MiniWindow
