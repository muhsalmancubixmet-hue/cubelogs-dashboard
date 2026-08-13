import Image from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';

export const RichTextImageNode = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
        parseHTML: element => element.getAttribute('width') || element.style.width || '100%',
      },
      alignment: {
        default: 'center',
        renderHTML: attributes => {
          if (!attributes.alignment) return {};
          return { 'data-alignment': attributes.alignment };
        },
        parseHTML: element => element.getAttribute('data-alignment') || 'center',
      },
      dataAttachmentId: {
        default: null,
        renderHTML: attributes => {
          if (!attributes.dataAttachmentId) return {};
          return { 'data-attachment-id': attributes.dataAttachmentId };
        },
        parseHTML: element => element.getAttribute('data-attachment-id'),
      },
      dataInlineImageId: {
        default: null,
        renderHTML: attributes => {
          if (!attributes.dataInlineImageId) return {};
          return { 'data-inline-image-id': attributes.dataInlineImageId };
        },
        parseHTML: element => element.getAttribute('data-inline-image-id'),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const align = HTMLAttributes['data-alignment'] || 'center';
    const width = HTMLAttributes.width || '480px';
    const maxWidth = width === '100%' ? '100%' : (width.endsWith('px') || width.endsWith('%') ? width : `${width}px`);

    let style = `max-width: ${maxWidth}; width: auto; max-height: 280px; object-fit: contain; border-radius: 10px; margin: 10px 0; display: block; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08); border: 1px solid #cbd5e1; cursor: pointer;`;
    if (align === 'left') {
      style += ' margin-right: auto; margin-left: 0;';
    } else if (align === 'right') {
      style += ' margin-left: auto; margin-right: 0;';
    } else {
      style += ' margin-left: auto; margin-right: auto;';
    }

    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { style })];
  },
});
