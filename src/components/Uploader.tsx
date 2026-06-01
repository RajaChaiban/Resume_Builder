// Drag-and-drop / click upload. Accepts resume + cover letter (multiple files).
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export default function Uploader({ onFiles, disabled }: Props) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    onFiles(Array.from(list));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.6 }}
      className={`uploader ${drag ? 'drag' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (!disabled) handle(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md,.rtf"
        multiple
        hidden
        onChange={(e) => handle(e.target.files)}
      />
      <div className="uploader-icon">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="uploader-title">Drop your resume or cover letter</div>
      <div className="uploader-sub">
        or <span>browse files</span> — PDF, DOCX, TXT. Add both for a richer story.
      </div>
      <div className="uploader-note">Everything is parsed locally in your browser.</div>
    </motion.div>
  );
}
