import { useRef } from 'react';
import { FileUp, FileText, Trash2 } from 'lucide-react';


interface ImportPanelProps {
  text: string;
  onTextChange: (text: string) => void;
  onImport: () => void;
}

export function ImportPanel({ text, onTextChange, onImport }: ImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onTextChange(ev.target?.result as string);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="s-card">
      <div className="s-card-header">
        <h2><FileText size={20} /> 导入聊天记录</h2>
      </div>
      <div className="s-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="format-tip">
          <strong>支持的格式：</strong><br />
          文字消息：<code>**用户名**：消息内容</code><br />
          图片消息：<code>**用户名**：[图片]</code>（导入后从本机选择图片）<br />
          红包消息：<code>**用户名**：[红包]备注</code><br />
          转账消息：<code>**用户名**：[转账]金额:备注</code><br />
          语音消息：<code>**用户名**：[语音]秒数</code>，转文字：<code>**用户名**：[语音]秒数:内容</code><br />
          时间节点：<code>**【3月1日 14:32】**</code>
          <div className="tip-muted">标题行(#)、引用行(&gt;)、空行自动跳过。第一个出现的用户默认为"自己"。图片不带URL时可在预览中点击上传本地图片。</div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input ref={fileInputRef} type="file" accept=".md,.txt,.markdown" hidden onChange={handleFileLoad} />
          <button className="btn btn-outline btn-sm" onClick={() => fileInputRef.current?.click()}>
            <FileUp size={15} /> 导入文件
          </button>
        </div>

        <textarea
          className="s-textarea"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="在此粘贴聊天记录文本，或点击上方按钮导入文件..."
        />

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={onImport} disabled={!text.trim()}>
            解析并导入
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => onTextChange('')} disabled={!text}>
            <Trash2 size={15} /> 清空
          </button>
        </div>
      </div>
    </div>
  );
}
