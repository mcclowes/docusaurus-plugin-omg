import { usePluginData } from '@docusaurus/useGlobalData'
import { pasteKey, type OmgPluginContent, type OmgPasteProps } from '../../types'
import { PLUGIN_NAME } from '../../types'
import styles from './styles.module.css'

export default function OmgPaste({ address, paste, language }: OmgPasteProps) {
  const data = usePluginData(PLUGIN_NAME) as OmgPluginContent | undefined
  const entry = data?.pastes?.[pasteKey(address, paste)] ?? null

  if (!entry) {
    return (
      <div className={styles.empty} data-omg-paste={`${address}/${paste}`}>
        No paste available at{' '}
        <code>
          {address}/{paste}
        </code>
        .
      </div>
    )
  }

  const url = `https://${address}.paste.lol/${paste}`
  const codeClass = language ? `language-${language}` : undefined

  return (
    <figure className={styles.figure} data-omg-paste={`${address}/${paste}`}>
      <figcaption className={styles.caption}>
        <span className={styles.title}>{entry.title || paste}</span>
        <a className={styles.source} href={url}>
          {address}/{paste}
        </a>
      </figcaption>
      <pre className={styles.pre}>
        <code className={codeClass}>{entry.content}</code>
      </pre>
    </figure>
  )
}
