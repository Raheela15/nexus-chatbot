import React from 'react';
import { CodeBlock } from './CodeBlock';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Split content by code blocks ```lang ... ```
  // Regex preserves code blocks and markdown prose
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;

    // Push prose before this code block
    if (matchStart > lastIndex) {
      const prose = content.substring(lastIndex, matchStart);
      parts.push(renderProse(prose, `prose-${lastIndex}`));
    }

    const language = match[1] || 'text';
    const code = match[2];
    parts.push(
      <CodeBlock key={`code-${matchStart}`} language={language} code={code} />
    );

    lastIndex = matchEnd;
  }

  // Push remaining prose
  if (lastIndex < content.length) {
    const remainingProse = content.substring(lastIndex);
    parts.push(renderProse(remainingProse, `prose-${lastIndex}`));
  }

  return <div className="space-y-3 leading-relaxed text-[#f4f4f5]">{parts}</div>;
};

/**
 * Render standard markdown prose paragraphs, lists, headers, quotes, and inline styles
 */
function renderProse(rawText: string, keyPrefix: string): React.ReactNode {
  const blocks = rawText.split(/\n{2,}/);

  return (
    <div key={keyPrefix} className="space-y-3">
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Headers
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={`${keyPrefix}-h1-${bIdx}`} className="text-2xl font-bold text-[#f4f4f5] tracking-tight mt-4 mb-2">
              {formatInline(trimmed.replace(/^#\s+/, ''))}
            </h1>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={`${keyPrefix}-h2-${bIdx}`} className="text-xl font-semibold text-[#f4f4f5] tracking-tight mt-3 mb-2">
              {formatInline(trimmed.replace(/^##\s+/, ''))}
            </h2>
          );
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={`${keyPrefix}-h3-${bIdx}`} className="text-lg font-semibold text-[#c7c4d7] mt-3 mb-1">
              {formatInline(trimmed.replace(/^###\s+/, ''))}
            </h3>
          );
        }
        if (trimmed.startsWith('#### ')) {
          return (
            <h4 key={`${keyPrefix}-h4-${bIdx}`} className="text-base font-semibold text-[#c7c4d7] mt-2 mb-1">
              {formatInline(trimmed.replace(/^####\s+/, ''))}
            </h4>
          );
        }

        // Blockquotes
        if (trimmed.startsWith('>')) {
          const quoteLines = trimmed
            .split('\n')
            .map((l) => l.replace(/^>\s?/, ''))
            .join(' ');
          return (
            <blockquote
              key={`${keyPrefix}-quote-${bIdx}`}
              className="border-l-2 border-[#6366f1] pl-4 py-1 italic text-[#a1a1aa] bg-[#18181b]/40 rounded-r-lg my-2"
            >
              {formatInline(quoteLines)}
            </blockquote>
          );
        }

        // Unordered lists (lines starting with - or * )
        const lines = trimmed.split('\n');
        const isBulletList = lines.every((l) => /^\s*[-*]\s+/.test(l));
        if (isBulletList) {
          return (
            <ul key={`${keyPrefix}-ul-${bIdx}`} className="list-disc list-inside space-y-1.5 my-2 pl-2">
              {lines.map((l, lIdx) => (
                <li key={lIdx} className="text-[#f4f4f5] marker:text-[#818cf8]">
                  {formatInline(l.replace(/^\s*[-*]\s+/, ''))}
                </li>
              ))}
            </ul>
          );
        }

        // Numbered lists (lines starting with 1. 2. etc)
        const isNumberedList = lines.every((l) => /^\s*\d+\.\s+/.test(l));
        if (isNumberedList) {
          return (
            <ol key={`${keyPrefix}-ol-${bIdx}`} className="list-decimal list-inside space-y-1.5 my-2 pl-2">
              {lines.map((l, lIdx) => (
                <li key={lIdx} className="text-[#f4f4f5] marker:text-[#818cf8] marker:font-semibold">
                  {formatInline(l.replace(/^\s*\d+\.\s+/, ''))}
                </li>
              ))}
            </ol>
          );
        }

        // Check for Markdown table
        if (lines.length >= 2 && lines[0].includes('|') && lines[1].includes('|') && lines[1].includes('-')) {
          const headerCols = lines[0]
            .split('|')
            .map((c) => c.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - (lines[0].endsWith('|') ? 1 : 0));
          const rowLines = lines.slice(2);

          return (
            <div key={`${keyPrefix}-table-${bIdx}`} className="my-3 overflow-x-auto rounded-lg border border-[#27272a]">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#18181b] border-b border-[#27272a] text-[#c7c4d7]">
                  <tr>
                    {headerCols.map((col, cIdx) => (
                      <th key={cIdx} className="px-4 py-2.5 font-semibold text-xs tracking-wider uppercase font-mono">
                        {formatInline(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]/60 bg-[#121215]">
                  {rowLines.map((row, rIdx) => {
                    const cells = row
                      .split('|')
                      .map((c) => c.trim())
                      .filter((_, idx, arr) => idx > 0 && idx < arr.length - (row.endsWith('|') ? 1 : 0));
                    return (
                      <tr key={rIdx} className="hover:bg-[#18181b]/50 transition-colors">
                        {cells.map((cell, cellIdx) => (
                          <td key={cellIdx} className="px-4 py-2.5 text-[#f4f4f5]">
                            {formatInline(cell)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }

        // Regular paragraph with soft breaks preserved
        return (
          <p key={`${keyPrefix}-p-${bIdx}`} className="leading-relaxed">
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {formatInline(line)}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Format inline elements: bold (**), italic (*), inline code (`), and links ([text](url))
 */
function formatInline(text: string): React.ReactNode[] {
  // Regex for inline code, links, bold, and italic
  const inlineRegex = /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      const code = token.slice(1, -1);
      elements.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded-md bg-[#27272a] text-[#c0c1ff] font-mono text-[13px] border border-[#3f3f46]/40"
        >
          {code}
        </code>
      );
    } else if (token.startsWith('[') && token.includes('](')) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        elements.push(
          <a
            key={match.index}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#818cf8] underline underline-offset-2 hover:text-[#c0c1ff] transition-colors"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        elements.push(token);
      }
    } else if (token.startsWith('**') && token.endsWith('**')) {
      elements.push(
        <strong key={match.index} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      elements.push(
        <em key={match.index} className="italic text-[#e4e1e6]">
          {token.slice(1, -1)}
        </em>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return elements.length > 0 ? elements : [text];
}
