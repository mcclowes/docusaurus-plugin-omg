import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import OmgWeblogLatest from '../../src/theme/OmgWeblogLatest'
import { __resetPluginData, __setPluginData } from '../mocks/useGlobalData'

afterEach(() => {
  __resetPluginData()
  cleanup()
})

describe('OmgWeblogLatest', () => {
  it('renders empty state when no post exists', () => {
    __setPluginData({ statuses: {}, weblogPosts: {}, pastes: {} })
    render(<OmgWeblogLatest address="ghost" />)
    expect(screen.getByText(/No weblog post/)).toBeInTheDocument()
  })

  it('renders title, byline, and description', () => {
    __setPluginData({
      statuses: {},
      weblogPosts: {
        adam: {
          address: 'adam',
          date: 1700000000,
          type: 'post',
          status: 'public',
          source: '',
          title: 'Hello world',
          content: 'Body',
          description: 'My first post',
          location: null,
          metadata: null,
          output: '',
          entry: 'hello-world',
        },
      },
      pastes: {},
    })

    render(<OmgWeblogLatest address="adam" />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
    expect(screen.getByText('@adam')).toBeInTheDocument()
    expect(screen.getByText('My first post')).toBeInTheDocument()
  })

  it('renders content body when showContent is true', () => {
    __setPluginData({
      statuses: {},
      weblogPosts: {
        adam: {
          address: 'adam',
          date: 1700000000,
          type: 'post',
          status: 'public',
          source: '',
          title: 'Hello',
          content: 'The full body of the post.',
          description: '',
          location: null,
          metadata: null,
          output: '',
          entry: 'hello',
        },
      },
      pastes: {},
    })

    render(<OmgWeblogLatest address="adam" showContent />)
    expect(screen.getByText('The full body of the post.')).toBeInTheDocument()
  })
})
