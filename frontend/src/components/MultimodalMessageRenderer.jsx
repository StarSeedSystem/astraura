import React, { useRef, useEffect } from 'react';
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

/**
 * Individual Word Item with Auto-Scroll Tracking, Karaoke Glow & Seek triggers
 */
function InteractiveWordItem({
  tok,
  start,
  isHighlighted,
  highlightColor,
  messageId,
  fullText,
  activePersonaId,
  onSpeakFromWord
}) {
  const spanRef = useRef(null);
  const pressTimerRef = useRef(null);

  useEffect(() => {
    if (isHighlighted && spanRef.current) {
      spanRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [isHighlighted]);

  const handleStartPress = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      if (onSpeakFromWord) {
        onSpeakFromWord(messageId, fullText, start, activePersonaId);
      }
    }, 450);
  };

  const handleEndPress = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  return (
    <span
      ref={spanRef}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (onSpeakFromWord) {
          onSpeakFromWord(messageId, fullText, start, activePersonaId);
        }
      }}
      onMouseDown={handleStartPress}
      onMouseUp={handleEndPress}
      onMouseLeave={handleEndPress}
      onTouchStart={handleStartPress}
      onTouchEnd={handleEndPress}
      onTouchCancel={handleEndPress}
      className={`inline-block transition-all duration-100 rounded px-0.5 cursor-pointer select-text ${
        isHighlighted
          ? 'font-bold text-white scale-105 ring-1 ring-white/80 shadow-md active-spoken-word'
          : 'hover:bg-cyan-500/15 hover:text-cyan-200'
      }`}
      style={
        isHighlighted
          ? {
              backgroundColor: `${highlightColor}50`,
              boxShadow: `0 0 12px ${highlightColor}95`,
              borderBottom: `2px solid ${highlightColor}`
            }
          : undefined
      }
      title="Doble clic o mantén presionado para reproducir voz desde aquí"
    >
      {tok}
    </span>
  );
}

/**
 * Interactive word-by-word token span with Real-Time Karaoke Selection Glow & Double-Click/Long-Press Seek
 */
function WordHighlightSpan({ 
  textSegment, 
  baseCharOffset = 0, 
  fullText = '', 
  messageId = '', 
  activeSpeechHighlight = null, 
  onSpeakFromWord = null, 
  activePersonaId = 'aurora' 
}) {
  if (typeof textSegment !== 'string' || !textSegment) {
    return textSegment;
  }

  const isMsgActive = activeSpeechHighlight?.msgId === messageId && activeSpeechHighlight?.isSpeaking;
  const activeChar = isMsgActive ? (activeSpeechHighlight?.charIndex ?? -1) : -1;
  const highlightColor = activeSpeechHighlight?.personaColor || '#00f0ff';

  const tokens = textSegment.split(/(\s+)/);
  let currentOffset = baseCharOffset;

  return (
    <>
      {tokens.map((tok, i) => {
        const start = currentOffset;
        const end = start + tok.length;
        currentOffset += tok.length;

        if (/^\s+$/.test(tok)) {
          return <span key={i}>{tok}</span>;
        }

        const isHighlighted = isMsgActive && (activeChar >= start - 2 && activeChar < end + 2);

        return (
          <InteractiveWordItem
            key={i}
            tok={tok}
            start={start}
            isHighlighted={isHighlighted}
            highlightColor={highlightColor}
            messageId={messageId}
            fullText={fullText}
            activePersonaId={activePersonaId}
            onSpeakFromWord={onSpeakFromWord}
          />
        );
      })}
    </>
  );
}

function renderInteractiveChildren(children, fullText, messageId, activeSpeechHighlight, onSpeakFromWord, activePersonaId) {
  let searchOffset = 0;

  const traverse = (node) => {
    if (typeof node === 'string') {
      const idx = fullText.indexOf(node, searchOffset);
      const base = idx !== -1 ? idx : searchOffset;
      if (idx !== -1) searchOffset = idx + node.length;
      return (
        <WordHighlightSpan
          textSegment={node}
          baseCharOffset={base}
          fullText={fullText}
          messageId={messageId}
          activeSpeechHighlight={activeSpeechHighlight}
          onSpeakFromWord={onSpeakFromWord}
          activePersonaId={activePersonaId}
        />
      );
    }
    if (Array.isArray(node)) {
      return node.map((child, index) => <React.Fragment key={index}>{traverse(child)}</React.Fragment>);
    }
    if (React.isValidElement(node) && node.props && node.props.children) {
      return React.cloneElement(node, {
        children: traverse(node.props.children)
      });
    }
    return node;
  };

  return traverse(children);
}

export default function MultimodalMessageRenderer({ 
  text, 
  messageId = '', 
  activeSpeechHighlight = null, 
  onSpeakFromWord = null, 
  activePersonaId = 'aurora' 
}) {
  if (!text) return null;

  const wrap = (children) => renderInteractiveChildren(children, text, messageId, activeSpeechHighlight, onSpeakFromWord, activePersonaId);

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
          {wrap(children)}
        </th>
      );
    },
    td({ children }) {
      return (
        <td className="px-3 py-2 text-slate-300 border-t border-white/5">
          {wrap(children)}
        </td>
      );
    },
    blockquote({ children }) {
      return (
        <blockquote className="border-l-2 border-cyan-400 pl-3 my-2 text-slate-400 italic text-xs bg-cyan-500/5 py-1 rounded-r-lg">
          {wrap(children)}
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
      return <li className="leading-relaxed">{wrap(children)}</li>;
    },
    p({ children }) {
      return <p className="my-1.5 leading-relaxed text-slate-200">{wrap(children)}</p>;
    },
    h1({ children }) {
      return <h1 className="text-base font-bold text-white mt-3 mb-1.5 font-display flex items-center gap-2">{wrap(children)}</h1>;
    },
    h2({ children }) {
      return <h2 className="text-sm font-bold text-cyan-300 mt-2.5 mb-1 font-display">{wrap(children)}</h2>;
    },
    h3({ children }) {
      return <h3 className="text-xs font-bold text-purple-300 mt-2 mb-1 uppercase tracking-wider">{wrap(children)}</h3>;
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
