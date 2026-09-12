import { Check } from 'lucide-react';
import { getDefaultAvatar } from '../lib/parser';
import type { ChatUser } from '../types';

interface SenderPickerProps {
  users: ChatUser[];
  selfId: number | null;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function SenderPicker({ users, selfId, selectedId, onSelect }: SenderPickerProps) {
  return <div className="me-sender-picker">
    <div className="me-sender-label">选择发言人 <span>点击头像切换</span></div>
    <div className="me-sender-list" role="group" aria-label="选择发言人">
      {users.map((user, index) => <button
        type="button" key={user.id} className="me-sender-card"
        aria-label={`选择${user.name}${user.id === selfId ? '（自己）' : ''}发言`}
        aria-pressed={user.id === selectedId} title={user.name}
        onClick={() => onSelect(user.id)}
      >
        <span className="me-sender-avatar">
          <img src={user.avatar || getDefaultAvatar(index)} alt="" draggable={false}/>
          {user.id === selectedId && <span className="me-sender-check"><Check size={12}/></span>}
        </span>
        <span className="me-sender-name">{user.name}</span>
        <small>{user.id === selfId ? '自己' : '参与者'}</small>
      </button>)}
    </div>
  </div>;
}
