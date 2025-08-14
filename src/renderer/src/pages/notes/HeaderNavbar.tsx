import { NavbarHeader } from '@renderer/components/app/Navbar'
import { HStack } from '@renderer/components/Layout'
import { useNavbarPosition } from '@renderer/hooks/useSettings'
import { useShowWorkspace } from '@renderer/hooks/useStore'
import { Tooltip } from 'antd'
import { t } from 'i18next'
import { PanelLeftClose, PanelRightClose } from 'lucide-react'
import { useCallback } from 'react'
import styled from 'styled-components'

const HeaderNavbar = () => {
  const { isTopNavbar } = useNavbarPosition()
  const { showWorkspace, toggleShowWorkspace } = useShowWorkspace()

  const handleToggleShowWorkspace = useCallback(() => {
    toggleShowWorkspace()
  }, [toggleShowWorkspace])

  return (
    <NavbarHeader className="home-navbar">
      <HStack alignItems="center">
        {isTopNavbar && showWorkspace && (
          <Tooltip title={t('navbar.hide_sidebar')} mouseEnterDelay={0.8}>
            <NavbarIcon onClick={handleToggleShowWorkspace}>
              <PanelLeftClose size={18} />
            </NavbarIcon>
          </Tooltip>
        )}
        {isTopNavbar && !showWorkspace && (
          <Tooltip title={t('navbar.show_sidebar')} mouseEnterDelay={0.8}>
            <NavbarIcon onClick={handleToggleShowWorkspace} style={{ marginRight: 8 }}>
              <PanelRightClose size={18} />
            </NavbarIcon>
          </Tooltip>
        )}
        {/*todo 添加breadcrumb路径导航*/}
      </HStack>
    </NavbarHeader>
  )
}

export const NavbarIcon = styled.div`
  -webkit-app-region: none;
  border-radius: 8px;
  height: 30px;
  padding: 0 7px;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  .iconfont {
    font-size: 18px;
    color: var(--color-icon);
    &.icon-a-addchat {
      font-size: 20px;
    }
    &.icon-a-darkmode {
      font-size: 20px;
    }
    &.icon-appstore {
      font-size: 20px;
    }
  }
  .anticon {
    color: var(--color-icon);
    font-size: 16px;
  }
  &:hover {
    background-color: var(--color-background-mute);
    color: var(--color-icon-white);
  }
`

export default HeaderNavbar
