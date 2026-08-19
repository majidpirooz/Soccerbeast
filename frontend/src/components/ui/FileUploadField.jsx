import { useRef, useState } from 'react';

/**
 * FileUploadField — spec §6.11 crest uploads (PNG/JPG/JPEG or link) and the
 * Top-Tier arena bulk-import (Excel workbook). `accept` follows the native
 * <input accept> format. When `allowLink` is true, a text field for pasting
 * a URL is shown as an alternative to uploading.
 */
export default function FileUploadField({ label, accept, allowLink = false, onFile, onLink, hint }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [linkValue, setLinkValue] = useState('');

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFile?.(file);
    }
  };

  return (
    <div>
      {label && <span className="block text-[11.5px] font-bold text-textDim mb-1.5">{label}</span>}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full border border-dashed border-line rounded-[10px] px-3 py-4 text-center text-[12px] text-textMute
          hover:border-textMute transition-colors"
      >
        {fileName ? <span className="text-textDim font-semibold">{fileName}</span> : 'Click to choose a file, or drag it here'}
      </button>
      <input ref={inputRef} type="file" accept={accept} onChange={handleFile} className="hidden" />

      {allowLink && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[11px] text-textMute flex-shrink-0">or paste a link</span>
          <input
            value={linkValue}
            onChange={(e) => {
              setLinkValue(e.target.value);
              onLink?.(e.target.value);
            }}
            placeholder="https://…"
            className="flex-1 bg-surface2 border border-line rounded-lg px-2.5 py-1.5 text-[12px]
              placeholder:text-textMute focus:outline-none focus:border-gold"
          />
        </div>
      )}
      {hint && <span className="block text-[10.5px] text-textMute mt-1.5">{hint}</span>}
    </div>
  );
}
