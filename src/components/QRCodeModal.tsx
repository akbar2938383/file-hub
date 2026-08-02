import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FileRecord } from '../types';
import { formatBytes } from '../utils/formatters';
import { QrCode, X, Copy, Check, Download, ExternalLink, Smartphone } from 'lucide-react';

interface Props {
  file: FileRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<Props> = ({ file, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !file) return null;

  const downloadUrl = `${window.location.origin}/api/files/${file.id}/download`;

  const copyLink = () => {
    navigator.clipboard.writeText(downloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQrCode = () => {
    if (!qrRef.current) return;
    const svgElement = qrRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `QR-${file.originalName.replace(/\.[^/.]+$/, '')}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-2xl">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Quick Mobile Access
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Scan QR code for direct download
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col items-center text-center space-y-5">
          
          {/* File Name & Details */}
          <div className="w-full bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-left">
            <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
              {file.originalName}
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
              <span>{formatBytes(file.size)}</span>
              <span className="uppercase font-medium text-blue-600 dark:text-blue-400">{file.category}</span>
            </div>
          </div>

          {/* QR Code Frame */}
          <div
            ref={qrRef}
            className="p-5 bg-white rounded-2xl shadow-md border border-slate-200 flex items-center justify-center relative group"
          >
            <QRCodeSVG
              value={downloadUrl}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-blue-500/5 dark:bg-blue-500/10 px-3.5 py-2 rounded-xl border border-blue-500/10">
            <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Scan with your phone camera or QR app to open link</span>
          </div>

          {/* Link Box */}
          <div className="w-full flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2 pl-3.5 rounded-xl text-xs">
            <span className="truncate text-slate-600 dark:text-slate-300 font-mono text-[11px] flex-1 text-left">
              {downloadUrl}
            </span>
            <button
              onClick={copyLink}
              className="p-2 bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors shrink-0 shadow-sm font-medium flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={downloadQrCode}
            className="flex-1 py-2.5 px-4 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Save QR Image</span>
          </button>

          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Test Download</span>
          </a>
        </div>

      </div>
    </div>
  );
};
