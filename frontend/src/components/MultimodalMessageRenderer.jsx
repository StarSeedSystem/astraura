import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import InteractiveCodeRuntime from './InteractiveCodeRuntime';

const KNOWN_CODE_LANGS = [
  'html', 'htm', 'javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx',
  'python', 'py', 'python3', 'cpp', 'c++', 'c', 'h', 'hpp', 'rust', 'rs',
  'bash', 'sh', 'zsh', 'shell', 'css', 'scss', 'sql', 'json', 'webaudio',
  'xml', 'svg', 'glsl', 'hlsl', 'shader', 'go', 'golang', 'php', 'ruby', 'java'
];

function isRealCodeBlock(codeString, rawLang) {
  const lang = (rawLang || '').toLowerCase().trim();
  if (KNOWN_CODE_LANGS.includes(lang)) return true;

  const trimmed = (codeString || '').trim();
  // If it starts with standard markdown list or header symbols, it is prose
  if (
    trimmed.startsWith('- **') || 
    trimmed.startsWith('* **') || 
    trimmed.startsWith('- ') || 
    trimmed.startsWith('* ') || 
    trimmed.startsWith('1. ') || 
    trimmed.startsWith('2. ') || 
    trimmed.startsWith('### ') || 
    trimmed.startsWith('## ') || 
    trimmed.startsWith('# ') || 
    trimmed.startsWith('> ')
  ) {
    return false;
  }

  // Check for distinct code signatures
  const codePatterns = [
    /<(!DOCTYPE|html|div|canvas|script|style|svg|body)/i,
    /^(import |export |const |let |var |function |def |class |#include |fn |pub |use |select |insert |curl |pip |npm |cargo )/m,
    /(console\.log|printf|std::cout|document\.getElementById|requestAnimationFrame|THREE\.|Chart\()/
  ];

  return codePatterns.some(pat => pat.test(trimmed));
}

export default function MultimodalMessageRenderer({ text }) {
  if (!text) return null;

  // Custom Components for ReactMarkdown
  const components = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const rawLang = match ? match[1] : '';
      const codeString = String(children).replace(/\n$/, '');

      // Check if this should render as an InteractiveCodeRuntime
      if (!inline && isRealCodeBlock(codeString, rawLang)) {
        const detectedLang = rawLang || (
          codeString.includes('<html') || codeString.includes('<!DOCTYPE') ? 'html' : 
          codeString.includes('def ') || codeString.includes('import ') ? 'python' : 
          'javascript'
        );

        return (
          <InteractiveCodeRuntime
            code={codeString}
            language={detectedLang}
          />
        );
      }

      // If it's a multi-line preformatted block that isn't runnable code
      if (!inline && codeString.includes('\n')) {
        return (
          <pre className="p-3.5 my-2 rounded-xl bg-black/50 border border-white/10 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed">
            <code>{children}</code>
          </pre>
        );
      }

      // Inline code
      return (
        <code className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-mono text-[11px] font-medium" {...props}>
          {children}
        </code>
      );
    },
    table({ children }) {
      return (
        <div className="overflow-x-auto my-3 rounded-xl border border-white/10 bg-black/40">
          <table className="min-w-full divide-y divide-white/10 text-xs text-left">
            {children}
          </table>
        </div>
      );
    },
    th({ children }) {
      return (
        <th className="px-3 py-2 bg-white/5 font-mono text-[11px] font-bold text-cyan-300 uppercase tracking-wider">
          {children}
        </th>
      );
    },
    td({ children }) {
      return (
        <td className="px-3 py-2 text-slate-300 border-t border-white/5">
          {children}
        </td>
      );
    },
    blockquote({ children }) {
      return (
        <blockquote className="border-l-2 border-cyan-400 pl-3 my-2 text-slate-400 italic text-xs bg-cyan-500/5 py-1 rounded-r-lg">
          {children}
        </blockquote>
      );
    },
    a({ href, children }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors font-medium"
        >
          {children}
        </a>
      );
    },
    ul({ children }) {
      return <ul className="list-disc list-inside my-2 space-y-1 text-slate-300">{children}</ul>;
    },
    ol({ children }) {
      return <ol className="list-decimal list-inside my-2 space-y-1 text-slate-300">{children}</ol>;
    },
    li({ children }) {
      return <li className="leading-relaxed">{children}</li>;
    },
    p({ children }) {
      return <p className="my-1.5 leading-relaxed text-slate-200">{children}</p>;
    },
    h1({ children }) {
      return <h1 className="text-base font-bold text-white mt-3 mb-1.5 font-display flex items-center gap-2">{children}</h1>;
    },
    h2({ children }) {
      return <h2 className="text-sm font-bold text-cyan-300 mt-2.5 mb-1 font-display">{children}</h2>;
    },
    h3({ children }) {
      return <h3 className="text-xs font-bold text-purple-300 mt-2 mb-1 uppercase tracking-wider">{children}</h3>;
    }
  };

  return (
    <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-1">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
