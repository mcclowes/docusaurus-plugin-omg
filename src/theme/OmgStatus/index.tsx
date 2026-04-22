import { usePluginData } from '@docusaurus/useGlobalData'
import type { OmgPluginContent, OmgStatusProps } from '../../types'
import { PLUGIN_NAME } from '../../types'
import styles from './styles.module.css'

export default function OmgStatus({ address }: OmgStatusProps) {
  const data = usePluginData(PLUGIN_NAME) as OmgPluginContent | undefined
  const status = data?.statuses?.[address] ?? null

  if (!status) {
    return (
      <div className={styles.empty} data-omg-status={address}>
        No status available for <code>{address}</code>.
      </div>
    )
  }

  const profileUrl = `https://${address}.omg.lol/`
  const statusUrl = status.external_url ?? `https://${address}.status.lol/${status.id}`

  return (
    <article className={styles.status} data-omg-status={address}>
      {status.emoji && (
        <span className={styles.emoji} aria-hidden="true">
          {status.emoji}
        </span>
      )}
      <div className={styles.body}>
        <p className={styles.content}>{status.content}</p>
        <footer className={styles.meta}>
          <a className={styles.author} href={profileUrl}>
            @{address}
          </a>
          <span className={styles.dot}>·</span>
          <a className={styles.time} href={statusUrl} title={status.created}>
            {status.relative_time}
          </a>
        </footer>
      </div>
    </article>
  )
}
