import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { CodeBlock } from '@tiptap/extension-code-block';
import Mention from '@tiptap/extension-mention';
import { RichTextImageNode } from './RichTextImageNode';

let lowlightInstance = null;
try {
  const { common, createLowlight } = require('lowlight');
  if (common && createLowlight) {
    lowlightInstance = createLowlight(common);
  }
} catch (e) {
  // Graceful fallback for Jest environment
}

export function getTiptapExtensions({
  placeholder = 'Write details here...',
  enableImages = true,
  enableTables = true,
  enableCodeBlocks = true,
  enableMentions = false,
  onMentionSearch = null,
} = {}) {
  // Fulfills Rule 14: StarterKit with codeBlock disabled when CodeBlock/CodeBlockLowlight is used
  const extensions = [
    StarterKit.configure({
      codeBlock: false,
      // Tiptap v3 StarterKit now bundles Link and Underline;
      // disable them here to avoid "Duplicate extension names" warnings
      // since we add fully-configured versions below.
      link: false,
      underline: false,
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }),
    Placeholder.configure({
      placeholder,
    }),
    Highlight.configure({
      multicolor: true,
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    TextStyle,
    Color,
  ];

  if (enableImages) {
    extensions.push(RichTextImageNode);
  }

  if (enableTables) {
    extensions.push(
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell
    );
  }

  if (enableCodeBlocks) {
    if (lowlightInstance) {
      extensions.push(
        CodeBlockLowlight.configure({
          lowlight: lowlightInstance,
        })
      );
    } else {
      extensions.push(CodeBlock);
    }
  }

  if (enableMentions) {
    extensions.push(
      Mention.configure({
        HTMLAttributes: {
          class: 'mention-node',
        },
        suggestion: {
          items: ({ query }) => {
            if (onMentionSearch) {
              return onMentionSearch(query);
            }
            return [];
          },
        },
      })
    );
  }

  return extensions;
}
