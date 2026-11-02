import React, { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  code: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const cleanCode = code.replace(/\n$/, '');
  const lines = cleanCode.split('\n');
  const displayLang = language.trim().toLowerCase() || 'text';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-[#27272a] bg-[#121215] shadow-lg shadow-black/40">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#18181b] border-b border-[#27272a] text-xs text-[#a1a1aa]">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-[#818cf8]" />
          <span className="font-mono uppercase tracking-wider font-semibold text-[#c7c4d7]">
            {displayLang}
          </span>
          <span className="text-[#71717a]">•</span>
          <span className="text-[#71717a] font-mono">{lines.length} {lines.length === 1 ? 'line' : 'lines'}</span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#27272a]/60 hover:bg-[#27272a] text-[#f4f4f5] transition-all duration-150 border border-transparent hover:border-[#3f3f46] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-[#a1a1aa]" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content with Line Numbers */}
      <div className="relative overflow-x-auto p-4 text-[13px] leading-6 font-mono selection:bg-[#6366f1]/30">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="group hover:bg-[#18181b]/50 transition-colors">
                <td className="w-8 pr-4 text-right select-none text-[#52525b] group-hover:text-[#a1a1aa] align-top text-xs font-mono">
                  {idx + 1}
                </td>
                <td className="pl-2 pr-4 text-[#f4f4f5] whitespace-pre break-normal font-mono">
                  {line || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
