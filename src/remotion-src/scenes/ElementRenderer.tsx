import React from 'react';
import type { SceneElement } from '../types';
import { TextElement } from '../elements/TextElement';
import { ImageElement } from '../elements/ImageElement';
import { ShapeElement, DividerElement } from '../elements/ShapeElement';

// ============================================================
// ELEMENT RENDERER
// Dispatches each element from the JSON to its component.
// To add a new element type: add a case here + build the component.
// ============================================================

type Props = {
  element: SceneElement;
};

export const ElementRenderer: React.FC<Props> = ({ element }) => {
  switch (element.type) {
    case 'text':
      return <TextElement {...element} />;

    case 'image':
      return <ImageElement {...element} />;

    case 'shape':
      return <ShapeElement {...element} />;

    case 'divider':
      return <DividerElement {...element} />;

    case 'group':
      return (
        <div
          style={{
            position: 'absolute',
            left: element.x ?? 0,
            top: element.y ?? 0,
            width: element.width ?? '100%',
            height: element.height ?? '100%',
          }}
        >
          {element.elements.map((el, i) => (
            <ElementRenderer key={i} element={el} />
          ))}
        </div>
      );

    default:
      // Unknown element type — silently skip rather than crash
      return null;
  }
};