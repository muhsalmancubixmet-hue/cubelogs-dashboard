import Image from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';
import { apiFetch } from '../../lib/api/apiClient';
import { isCubeLogsAttachmentUrl } from './richTextMedia';

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

    return ['img', mergeAttributes(this.options?.HTMLAttributes || {}, HTMLAttributes, { style })];
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const dom = document.createElement('img');

      // Copy standard attributes onto dom
      Object.entries(HTMLAttributes).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          dom.setAttribute(key, val);
        }
      });

      const align = node.attrs.alignment || 'center';
      const width = node.attrs.width || '480px';
      const maxWidth = width === '100%' ? '100%' : (width.endsWith('px') || width.endsWith('%') ? width : `${width}px`);

      let style = `max-width: ${maxWidth}; width: auto; max-height: 280px; object-fit: contain; border-radius: 10px; margin: 10px 0; display: block; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08); border: 1px solid #cbd5e1; cursor: pointer;`;
      if (align === 'left') {
        style += ' margin-right: auto; margin-left: 0;';
      } else if (align === 'right') {
        style += ' margin-left: auto; margin-right: 0;';
      } else {
        style += ' margin-left: auto; margin-right: auto;';
      }
      dom.style.cssText = style;

      let currentBlobUrl = null;
      let isDestroyed = false;

      const canonicalSrc = node.attrs.src;
      const hasAttachmentId = Boolean(node.attrs.dataAttachmentId || node.attrs['data-attachment-id']);

      if (canonicalSrc && (hasAttachmentId || isCubeLogsAttachmentUrl(canonicalSrc))) {
        apiFetch(canonicalSrc, { responseType: 'blob' })
          .then((blob) => {
            if (isDestroyed) return;
            currentBlobUrl = URL.createObjectURL(blob);
            dom.src = currentBlobUrl;
          })
          .catch((err) => {
            if (isDestroyed) return;
            console.error('Failed to load authenticated editor image:', err);
          });
      } else if (canonicalSrc) {
        dom.src = canonicalSrc;
      }

      return {
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== 'image') return false;
          return true;
        },
        destroy() {
          isDestroyed = true;
          if (currentBlobUrl) {
            try {
              URL.revokeObjectURL(currentBlobUrl);
            } catch (e) {}
            currentBlobUrl = null;
          }
        },
      };
    };
  },
});
