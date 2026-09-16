import { Dispatch, useContext, useEffect, useState } from 'react'
import styled, { createGlobalStyle } from 'styled-components'
import PresentNavigationOverlay from './PresentNavigationOverlay'
import PresentMedia from './PresentMedia'
import { closePresentModeAction, GalleryAction } from '../mediaGalleryReducer'
import { MediaGalleryFieldsFragment } from '../__generated__/fragments'
import { SidebarContext } from '../../sidebar/Sidebar'
import MediaSidebar from '../../sidebar/MediaSidebar/MediaSidebar'

const StyledContainer = styled.div<{ $besidePanel: boolean }>`
  position: fixed;
  width: 100vw;
  height: 100vh;
  background-color: black;
  color: white;
  top: 0;
  left: 0;
  z-index: 100;
  overscroll-behavior: none;

  /* With the info panel pinned, a wide screen gives the photo and its
    controls the space beside the panel instead of hiding part of both under
    it - the same as a pinned sidebar on the album and timeline pages. The
    420px is the sidebar's width at this breakpoint (lg:w-[420px]). */
  @media (min-width: 1024px) {
    ${({ $besidePanel }) => ($besidePanel ? 'width: calc(100vw - 420px);' : '')}
  }
`

// Locks scrolling on the page behind the fullscreen viewer. Scoped to
// html/body rather than every element, so panels rendered on top of the
// viewer (e.g. the media info sidebar) can still scroll their own content.
const PreventScroll = createGlobalStyle`
  html, body {
    overflow: hidden !important;
  }

  /* The media info panel is the shared sidebar, which normally sits at z-40 -
    below this fullscreen view at z-100, so opening it from here changed its
    state without ever showing it. Lifting it only while the viewer is mounted
    leaves its stacking everywhere else exactly as it was. */
  [data-sidebar] {
    z-index: 110 !important;
  }
`

type PresentViewProps = {
  className?: string
  imageLoaded?(): void
  activeMedia: MediaGalleryFieldsFragment
  dispatchMedia: Dispatch<GalleryAction>
  disableSaveCloseInHistory?: boolean
}

const PresentView = ({
  className,
  imageLoaded,
  activeMedia,
  dispatchMedia,
  disableSaveCloseInHistory,
}: PresentViewProps) => {
  const {
    updateSidebar,
    setPinned,
    pinned,
    content: sidebarContent,
    owner: sidebarOwner,
  } = useContext(SidebarContext)
  // PresentView owns the sidebar only after the user opens this info panel.
  // A sidebar opened before presentation mode remains owned by its caller.
  // The symbol is created once and kept in state so it stays stable across
  // renders, giving the unmount cleanup below a stable identity to compare
  // against without needing to depend on any other state.
  const [infoPanelOwner] = useState(() => Symbol('PresentViewInfoPanel'))

  // Do not mirror SidebarContext.content in local state. The presentation
  // panel is open only when this view owns it and the sidebar has content.
  const infoOpen = sidebarContent !== null && sidebarOwner === infoPanelOwner

  useEffect(
    () => () => {
      // Clear only the sidebar that PresentView opened. updateSidebar(null)
      // also resets the pinned state in SidebarProvider.
      updateSidebar(null, infoPanelOwner)
    },
    [infoPanelOwner, updateSidebar]
  )

  useEffect(() => {
    // Keep an already-open info panel in sync with the active image - it
    // was built from activeMedia at the moment the panel was opened, and
    // otherwise keeps showing that same image after navigating away.
    if (infoOpen) {
      updateSidebar(<MediaSidebar media={activeMedia} />, infoPanelOwner)
    }
  }, [activeMedia, infoOpen, infoPanelOwner, updateSidebar])

  useEffect(() => {
    const keyDownEvent = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.stopPropagation()
        dispatchMedia({ type: 'nextImage' })
      }

      if (e.key === 'ArrowLeft') {
        e.stopPropagation()
        dispatchMedia({ type: 'previousImage' })
      }

      if (e.key === 'Escape') {
        e.stopPropagation()

        if (disableSaveCloseInHistory === true) {
          dispatchMedia({ type: 'closePresentMode' })
        } else {
          closePresentModeAction({ dispatchMedia })
        }
      }
    }

    document.addEventListener('keydown', keyDownEvent)

    return function cleanup() {
      document.removeEventListener('keydown', keyDownEvent)
    }
  }, [dispatchMedia, disableSaveCloseInHistory])

  return (
    <StyledContainer
      className={className}
      $besidePanel={infoOpen && pinned && sidebarContent != null}
    >
      <PreventScroll />
      <PresentNavigationOverlay
        dispatchMedia={dispatchMedia}
        disableSaveCloseInHistory={disableSaveCloseInHistory}
        onInfoClick={() => {
          updateSidebar(<MediaSidebar media={activeMedia} />, infoPanelOwner)
          // Pinned, so a wide screen lays the panel out beside the photo.
          // Unpinning it drops back to the panel overlaying the photo, and on
          // a phone, where pinning has no layout of its own, it overlays
          // either way.
          setPinned(true)
        }}
      >
        <PresentMedia media={activeMedia} imageLoaded={imageLoaded} />
      </PresentNavigationOverlay>
    </StyledContainer>
  )
}

export default PresentView
