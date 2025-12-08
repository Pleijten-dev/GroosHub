'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export interface MarkdownMessageProps {
  content: string;
  className?: string;
  variant?: 'user' | 'assistant';
}

/**
 * Component for rendering markdown content in chat messages
 * Supports:
 * - Standard markdown (headings, lists, links, images, etc.)
 * - GitHub Flavored Markdown (tables, task lists, strikethrough)
 * - Syntax highlighting for code blocks
 */
export function MarkdownMessage({ content, className = '', variant = 'assistant' }: MarkdownMessageProps) {
  const isUser = variant === 'user';

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks with syntax highlighting
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            return !inline && language ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={language}
                PreTag="div"
                className="rounded-md my-2"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code
                className={isUser
                  ? "bg-white/20 text-white px-1 py-0.5 rounded text-sm font-mono"
                  : "bg-gray-100 text-gray-900 px-1 py-0.5 rounded text-sm font-mono"
                }
                {...props}
              >
                {children}
              </code>
            );
          },
          // Headings
          h1: ({ children }) => (
            <h1 className={`text-2xl font-bold mt-4 mb-2 ${isUser ? 'text-white' : 'text-gray-900'}`}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className={`text-xl font-semibold mt-3 mb-2 ${isUser ? 'text-white' : 'text-gray-900'}`}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className={`text-lg font-semibold mt-3 mb-1 ${isUser ? 'text-white' : 'text-gray-900'}`}>{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className={`text-base font-semibold mt-2 mb-1 ${isUser ? 'text-white' : 'text-gray-900'}`}>{children}</h4>
          ),
          // Paragraphs
          p: ({ children }) => (
            <p className="mb-2 leading-relaxed">{children}</p>
          ),
          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="ml-2">{children}</li>
          ),
          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={isUser
                ? "text-white underline hover:text-blue-100"
                : "text-blue-600 hover:text-blue-800 underline"
              }
            >
              {children}
            </a>
          ),
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className={isUser
              ? "border-l-4 border-white/40 pl-4 py-1 my-2 italic text-white/90"
              : "border-l-4 border-gray-300 pl-4 py-1 my-2 italic text-gray-700"
            }>
              {children}
            </blockquote>
          ),
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className={`min-w-full divide-y border ${
                isUser
                  ? 'divide-white/20 border-white/20'
                  : 'divide-gray-200 border-gray-200'
              }`}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className={isUser ? 'bg-white/10' : 'bg-gray-50'}>{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className={`divide-y ${
              isUser
                ? 'bg-transparent divide-white/20'
                : 'bg-white divide-gray-200'
            }`}>{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr>{children}</tr>
          ),
          th: ({ children }) => (
            <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider ${
              isUser ? 'text-white/90' : 'text-gray-700'
            }`}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className={`px-4 py-2 text-sm ${isUser ? 'text-white' : 'text-gray-900'}`}>{children}</td>
          ),
          // Horizontal rule
          hr: () => (
            <hr className={`my-4 border-t ${isUser ? 'border-white/30' : 'border-gray-300'}`} />
          ),
          // Strikethrough (from GFM)
          del: ({ children }) => (
            <del className={`line-through ${isUser ? 'text-white/70' : 'text-gray-600'}`}>{children}</del>
          ),
          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          // Emphasis/Italic
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

MarkdownMessage.displayName = 'MarkdownMessage';

export default MarkdownMessage;
