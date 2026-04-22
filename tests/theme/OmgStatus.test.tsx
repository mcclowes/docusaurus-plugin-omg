import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import OmgStatus from '../../src/theme/OmgStatus'
import { __resetPluginData, __setPluginData } from '../mocks/useGlobalData'

afterEach(() => {
  __resetPluginData()
  cleanup()
})

describe('OmgStatus', () => {
  it('renders an empty-state when no status exists', () => {
    __setPluginData({ statuses: {}, weblogPosts: {}, pastes: {} })
    render(<OmgStatus address="ghost" />)
    expect(screen.getByText(/No status available/)).toBeInTheDocument()
  })

  it('renders status content, emoji, author, and time', () => {
    __setPluginData({
      statuses: {
        adam: {
          id: '1',
          address: 'adam',
          created: '2026-04-22',
          relative_time: '5 minutes ago',
          emoji: '🍵',
          content: 'Making tea',
          external_url: null,
        },
      },
      weblogPosts: {},
      pastes: {},
    })

    render(<OmgStatus address="adam" />)
    expect(screen.getByText('Making tea')).toBeInTheDocument()
    expect(screen.getByText('🍵')).toBeInTheDocument()
    expect(screen.getByText('@adam')).toBeInTheDocument()
    expect(screen.getByText('5 minutes ago')).toBeInTheDocument()
  })
})
