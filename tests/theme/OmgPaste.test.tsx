import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import OmgPaste from '../../src/theme/OmgPaste'
import { __resetPluginData, __setPluginData } from '../mocks/useGlobalData'

afterEach(() => {
  __resetPluginData()
  cleanup()
})

describe('OmgPaste', () => {
  it('renders empty state when paste is missing', () => {
    __setPluginData({ statuses: {}, weblogPosts: {}, pastes: {} })
    render(<OmgPaste address="adam" paste="missing" />)
    expect(screen.getByText(/No paste available/)).toBeInTheDocument()
  })

  it('renders paste title and content', () => {
    __setPluginData({
      statuses: {},
      weblogPosts: {},
      pastes: {
        'adam/snippet': {
          title: 'My snippet',
          content: 'echo "hello"',
          modified_on: 1,
        },
      },
    })

    render(<OmgPaste address="adam" paste="snippet" />)
    expect(screen.getByText('My snippet')).toBeInTheDocument()
    expect(screen.getByText('echo "hello"')).toBeInTheDocument()
    expect(screen.getByText('adam/snippet')).toBeInTheDocument()
  })

  it('applies a language class when provided', () => {
    __setPluginData({
      statuses: {},
      weblogPosts: {},
      pastes: { 'adam/snippet': { title: '', content: 'console.log(1)', modified_on: 1 } },
    })

    const { container } = render(<OmgPaste address="adam" paste="snippet" language="js" />)
    expect(container.querySelector('code.language-js')).not.toBeNull()
  })
})
