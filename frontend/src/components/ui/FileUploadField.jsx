import { useRef, useState } from 'react';

/**
 * FileUploadField — spec §6.11 crest uploads (PNG/JPG/JPEG or link) and the
 * Top-Tier arena bulk-import (Excel workbook). `accept` follows the native
 * <input accept> format. When `allowLink` is true, a text field for pasting
 * a URL is shown as an alternative to uploading.
 *
 * `multiple` — when true, accepts more than one file (needed for
 * MatchesStatisticsPanel's offline-mode HTML batch, since scraping multiple
 * teams offline needs one saved page per team). `onFile` receives a plain
 * `File` when `multiple` is false/omitted (every other call site's existing
 * behavior, unchanged), or a `File[]` array when `multiple` is true.
 */
export default function FileUploadField({ label, accept, allowLink = false, multiple = false, onFile, onLink, hint }) {
  const inputRef = useRef(null);
  const [fileLabel, setFileLabel] = useState('');
  const [linkValue, setLinkValue] = useState('');

  const handleFile = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (multiple) {
      setFileLabel(files.length === 1 ? files[0].name : `${files.length} files selected`);
      onFile?.(files);
    } else {
      setFileLabel(files[0].name);
      onFile?.(files[0]);
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
        {fileLabel ? (
          <span className="text-textDim font-semibold">{fileLabel}</span>
        ) : (
          `Click to choose ${multiple ? 'file(s)' : 'a file'}, or drag ${multiple ? 'them' : 'it'} here`
        )}
      </button>
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} onChange={handleFile} className="hidden" />

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
