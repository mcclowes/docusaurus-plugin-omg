import { usePluginData } from '@docusaurus/useGlobalData'
import type { OmgPluginContent, OmgWeblogLatestProps } from '../../types'
import { PLUGIN_NAME } from '../../types'
import styles from './styles.module.css'

function formatDate(unixSeconds: number): string {
  if (!Number.isFinite(unixSeconds)) return ''
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function OmgWeblogLatest({ address, showContent = false }: OmgWeblogLatestProps) {
  const data = usePluginData(PLUGIN_NAME) as OmgPluginContent | undefined
  const post = data?.weblogPosts?.[address] ?? null

  if (!post) {
    return (
      <div className={styles.empty} data-omg-weblog={address}>
        No weblog post available for <code>{address}</code>.
      </div>
    )
  }

  const profileUrl = `https://${address}.omg.lol/`
  const postUrl = `https://${address}.weblog.lol/${post.entry}`

  return (
    <article className={styles.post} data-omg-weblog={address}>
      <header className={styles.header}>
        <h3 className={styles.title}>
          <a href={postUrl}>{post.title}</a>
        </h3>
        <p className={styles.byline}>
          <a href={profileUrl}>@{address}</a>
          <span className={styles.dot}>·</span>
          <time dateTime={new Date(post.date * 1000).toISOString()}>{formatDate(post.date)}</time>
        </p>
      </header>
      {post.description && <p className={styles.description}>{post.description}</p>}
      {showContent && post.content && (
        <div className={styles.content}>
          <pre>{post.content}</pre>
        </div>
      )}
    </article>
  )
}
