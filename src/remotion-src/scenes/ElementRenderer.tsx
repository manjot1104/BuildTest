import React from 'react';
import { useVideoConfig } from 'remotion';
import type { SceneElement } from '../types';
import { TextElement } from '../elements/TextElement';
import { BulletListElement } from '../elements/BulletListElement';
import { ImageElement } from '../elements/ImageElement';
import { ShapeElement, DividerElement } from '../elements/ShapeElement';

// ============================================================
// ELEMENT RENDERER
// Dispatches each SceneElement to its component.
// Does NOT wrap in AbsoluteFill — layout components handle
// positioning. Elements render inline within their slot.
// ============================================================

type Props = {
  element: SceneElement;
};

export const ElementRenderer: React.FC<Props> = ({ element }) => {
  const { width } = useVideoConfig();
  const scale = width / 1280;

  const renderElement = () => {
    switch (element.type) {
      case 'text':        return <TextElement {...element} />;
      case 'bullet-list': return <BulletListElement {...element} />;
      case 'image':
        return (
          <div style={{
            width: '100%', height: '100%',
            borderRadius: element.borderRadius ? `${element.borderRadius * scale}px` : undefined,
            overflow: 'hidden',
          }}>
            <ImageElement {...element} />
          </div>
        );
      case 'shape':   return <ShapeElement {...element} />;
      case 'divider': return <DividerElement {...element} />;
      default:        return null;
    }
  };

  try {
    return renderElement();
  } catch (e) {
    console.error(`[ElementRenderer] Crash in element type="${element.type}" slot="${element.slot}":`, e);
    return null; // Fail silently so the rest of the scene renders
  }
};