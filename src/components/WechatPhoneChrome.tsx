import {useState} from 'react'
import type { PhoneSettings } from '@/types'
import { WechatPhoneHeader, type WechatHeaderAction } from '@/components/WechatPhoneHeader'

interface WechatPhoneChromeProps {
  title?: string
  children: React.ReactNode
  className?: string
  rightAction?: WechatHeaderAction
  settings?: Partial<PhoneSettings>
  onBack?: () => void
  onRightAction?: () => void
  footer?: React.ReactNode
}

const compactHeaderSettings: PhoneSettings = { platform: 'ios', time: '12:02', signal: 4, secondarySignal: 4, simMode: 'single', wifiEnabled: true, battery: 87, contactName: '', unreadCount: 0, selfBubbleColor: '#95ec69', otherBubbleColor: '#ffffff', backgroundColor: '#ededed', backgroundImage: null }

export function WechatPhoneChrome({ title = '', children, className = '', rightAction = 'dots', settings, onBack, onRightAction, footer }: WechatPhoneChromeProps) {
  const [scrolled,setScrolled]=useState(false)
  return (
    <div className={`wechat-phone-chrome ${className} ${scrolled&&className.includes('album-phone')?'is-album-scrolled':''}`}>
      <div className="wechat-chrome-screen">
        <WechatPhoneHeader settings={{...compactHeaderSettings,...settings}} title={title} variant="compact" rightAction={rightAction} onBack={onBack} onRightAction={onRightAction} />
        <div className="wechat-chrome-content" onScroll={e=>setScrolled(e.currentTarget.scrollTop>245)}>{children}</div>
        {footer}
        <div className="wechat-chrome-home-indicator" />
      </div>
    </div>
  )
}
