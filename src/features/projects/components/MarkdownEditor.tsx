'use client';

import React, { useRef, useState } from 'react';
import { cn } from '@/shared/utils/cn';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  locale: 'nl' | 'en';
  minHeight?: string;
}

const translations = {
  nl: {
    bold: 'Vet',
    italic: 'Cursief',
    strikethrough: 'Doorhalen',
    heading1: 'Kop 1',
    heading2: 'Kop 2',
    heading3: 'Kop 3',
    bulletList: 'Opsomming',
    numberedList: 'Genummerde lijst',
    quote: 'Citaat',
    code: 'Code',
    link: 'Link',
    preview: 'Voorbeeld',
    edit: 'Bewerken'
  },
  en: {
    bold: 'Bold',
    italic: 'Italic',
    strikethrough: 'Strikethrough',
    heading1: 'Heading 1',
    heading2: 'Heading 2',
    heading3: 'Heading 3',
    bulletList: 'Bullet List',
    numberedList: 'Numbered List',
    quote: 'Quote',
    code: 'Code',
    link: 'Link',
    preview: 'Preview',
    edit: 'Edit'
  }
};

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  locale,
  minHeight = '300px'
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const t = translations[locale];

  // Insert markdown syntax at cursor position
  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);

    onChange(newText);

    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertLineMarkdown = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lines = value.split('\n');
    let currentLineStart = 0;
    let lineIndex = 0;

    // Find which line the cursor is on
    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1; // +1 for newline
      if (currentLineStart + lineLength > start || i === lines.length - 1) {
        lineIndex = i;
        break;
      }
      currentLineStart += lineLength;
    }

    // Add prefix to the line
    lines[lineIndex] = prefix + lines[lineIndex];
    const newText = lines.join('\n');
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  // Basic markdown to HTML conversion for preview
  const renderMarkdown = (text: string): string => {
    let html = text;

    // Headings
    html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-base mb-xs">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-base mb-sm">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-base mb-sm">$1</h1>');

    // Bold, Italic, Strikethrough
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Links
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

    // Bullet lists
    html = html.replace(/^\* (.+)$/gm, '<li class="ml-lg">$1</li>');
    html = html.replace(/(<li class="ml-lg">.*<\/li>\n?)+/g, '<ul class="list-disc list-inside space-y-xs my-sm">$&</ul>');

    // Numbered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-lg">$1</li>');
    html = html.replace(/(<li class="ml-lg">.*<\/li>\n?)+/g, '<ol class="list-decimal list-inside space-y-xs my-sm">$&</ol>');

    // Blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-gray-300 pl-base italic text-gray-600 my-sm">$1</blockquote>');

    // Code blocks
    html = html.replace(/```(.+?)```/gs, '<pre class="bg-gray-100 p-sm rounded-lg overflow-x-auto my-sm"><code>$1</code></pre>');
    html = html.replace(/`(.+?)`/g, '<code class="bg-gray-100 px-xs py-xs rounded text-sm">$1</code>');

    // Line breaks
    html = html.replace(/\n/g, '<br />');

    return html;
  };

  const toolbarButtons = [
    {
      icon: 'B',
      title: t.bold,
      className: 'font-bold',
      action: () => insertMarkdown('**', '**')
    },
    {
      icon: 'I',
      title: t.italic,
      className: 'italic',
      action: () => insertMarkdown('*', '*')
    },
    {
      icon: 'S',
      title: t.strikethrough,
      className: 'line-through',
      action: () => insertMarkdown('~~', '~~')
    },
    {
      icon: 'H1',
      title: t.heading1,
      className: 'text-lg font-bold',
      action: () => insertLineMarkdown('# ')
    },
    {
      icon: 'H2',
      title: t.heading2,
      className: 'text-base font-bold',
      action: () => insertLineMarkdown('## ')
    },
    {
      icon: 'H3',
      title: t.heading3,
      className: 'text-sm font-bold',
      action: () => insertLineMarkdown('### ')
    },
    {
      icon: '•',
      title: t.bulletList,
      className: 'text-lg',
      action: () => insertLineMarkdown('* ')
    },
    {
      icon: '1.',
      title: t.numberedList,
      className: 'text-sm',
      action: () => insertLineMarkdown('1. ')
    },
    {
      icon: '"',
      title: t.quote,
      className: 'text-lg',
      action: () => insertLineMarkdown('> ')
    },
    {
      icon: '<>',
      title: t.code,
      className: 'font-mono text-xs',
      action: () => insertMarkdown('`', '`')
    }
  ];

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-xs p-xs bg-gray-50 border-b border-gray-300">
        {/* Formatting Buttons */}
        {toolbarButtons.map((button, index) => (
          <button
            key={index}
            type="button"
            onClick={button.action}
            title={button.title}
            className={cn(
              'px-sm py-xs rounded hover:bg-gray-200 transition-colors',
              button.className
            )}
          >
            {button.icon}
          </button>
        ))}

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300 mx-xs" />

        {/* Preview Toggle */}
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={cn(
            'px-sm py-xs rounded transition-colors text-sm',
            showPreview ? 'bg-primary text-white' : 'hover:bg-gray-200'
          )}
        >
          {showPreview ? t.edit : t.preview}
        </button>
      </div>

      {/* Editor/Preview */}
      {showPreview ? (
        <div
          className="p-base overflow-y-auto prose prose-sm max-w-none"
          style={{ minHeight }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-base font-mono text-sm resize-none focus:outline-none"
          style={{ minHeight }}
        />
      )}
    </div>
  );
}

export default MarkdownEditor;
