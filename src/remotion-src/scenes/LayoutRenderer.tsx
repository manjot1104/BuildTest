import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import type { SceneElement, LayoutType, SlotName } from '../types';
import { ElementRenderer } from './ElementRenderer';

// ============================================================
// LAYOUT SYSTEM — v2.1 (Unique Visual Identities)
// ============================================================

type LayoutProps = {
  layout: LayoutType;
  elements: SceneElement[];
};

// ── Utilities ──────────────────────────────────────────────

function useScaleFactor(): number {
  const { width } = useVideoConfig();
  return width / 1280;
}

function getElementsForSlots(elements: SceneElement[], preferredSlots: SlotName[]): SceneElement[] {
  const matches = elements.filter((el) => el.slot && preferredSlots.includes(el.slot));
  if (matches.length > 0) return matches;
  return elements.filter((el) => !el.slot || el.slot === 'main');
}

function renderSlot(elements: SceneElement[]) {
  return elements.map((el, i) => <ElementRenderer key={i} element={el} />);
}

// ── Layout: TITLE (Centered & Balanced) ──────────────────────

function TitleLayout({ elements }: { elements: SceneElement[] }) {
  const scale = useScaleFactor();
  const main = getElementsForSlots(elements, ['title', 'heading', 'main']);

  return (
    <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `${80 * scale}px` }}>
      <div style={{ 
        width: '100%', 
        maxWidth: `${1000 * scale}px`, 
        textAlign: 'center',
        // This shadow creates a "boundary" around all text elements inside
        filter: 'drop-shadow(0px 4px 12px rgba(0,0,0,0.8))' 
      }}>
        {renderSlot(main)}
      </div>
    </AbsoluteFill>
  );
}

// ── Layout: STATEMENT (High Impact / Quote Style) ────────────
// Different from Title: Uses a left-aligned or heavy-border style 
// to look like a pull-quote or a "key fact".

function StatementLayout({ elements }: { elements: SceneElement[] }) {
  const scale = useScaleFactor();
  // Add 'heading' and 'bullet' to the allowed slots
  const main = getElementsForSlots(elements, ['text', 'main', 'title', 'heading', 'bullet']);

  return (
    <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ 
        width: '85%', 
        borderLeft: `${12 * scale}px solid white`, 
        paddingLeft: `${40 * scale}px`,
        textAlign: 'left',
        filter: 'drop-shadow(0px 4px 12px rgba(0,0,0,0.8))' // Add shadow for legibility
      }}>
        {renderSlot(main)}
      </div>
    </AbsoluteFill>
  );
}

// ── Layout: FULLSCREEN (Edge-to-Edge Content) ────────────────
// No padding. Best for big hero text or specific visuals.

function FullscreenLayout({ elements }: { elements: SceneElement[] }) {
  const main = getElementsForSlots(elements, ['main', 'visual', 'title']);

  return (
    <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {renderSlot(main)}
      </div>
    </AbsoluteFill>
  );
}

// ── Layout: TITLE_SUBTITLE ─────────────────────────────────

function TitleSubtitleLayout({ elements }: { elements: SceneElement[] }) {
  const scale = useScaleFactor();
  
  // 1. Identify explicit assignments
  const titleEls = elements.filter(e => e.slot === 'title' || e.slot === 'heading');
  const subtitleEls = elements.filter(e => e.slot === 'subtitle' || e.slot === 'caption' || e.slot === 'text' || e.slot === 'main');

  // 2. Intelligent Fallback Logic
  let finalTitle: SceneElement[] = [];
  let finalSubtitle: SceneElement[] = [];

  if (titleEls.length > 0) {
    // If LLM gave us explicit titles, use them.
    finalTitle = titleEls;
    // Only use explicit subtitles if they exist, otherwise don't guess (prevents duplicates)
    finalSubtitle = subtitleEls;
  } else {
    // Total fallback: First element is title, the rest are subtitles
    finalTitle = elements.slice(0, 1);
    finalSubtitle = elements.slice(1);
  }

  return (
    <AbsoluteFill style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      gap: `${40 * scale}px`, 
      padding: `${80 * scale}px` 
    }}>
      <div style={{ textAlign: 'center', width: '100%' }}>
        {renderSlot(finalTitle)}
      </div>
      
      {/* Only render the subtitle container if there is actually content to show */}
      {finalSubtitle.length > 0 && (
        <div style={{ textAlign: 'center', width: '100%' }}>
          {renderSlot(finalSubtitle)}
        </div>
      )}
    </AbsoluteFill>
  );
}

// ── Layout: BULLET_POINTS ──────────────────────────────────

function BulletPointsLayout({ elements }: { elements: SceneElement[] }) {
  const scale = useScaleFactor();
  const heading = getElementsForSlots(elements, ['heading', 'title']);
  const bullets = elements.filter(e => e.slot === 'bullet' || e.type === 'bullet-list' || e.slot === 'main');

  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: `${100 * scale}px`, gap: `${32 * scale}px` }}>
      <div style={{ borderBottom: `2px solid rgba(255,255,255,0.2)`, paddingBottom: `${20 * scale}px` }}>
        {renderSlot(heading)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: `${20 * scale}px` }}>
        {renderSlot(bullets)}
      </div>
    </AbsoluteFill>
  );
}

// ── Layout: SPLIT_LEFT & SPLIT_RIGHT (Greedy Content) ────────

function SplitLayout({ elements, reverse }: { elements: SceneElement[], reverse?: boolean }) {
  const scale = useScaleFactor();
  const textEls = elements.filter(e => !['visual', 'image'].includes(e.slot || ''));
  const visualEls = elements.filter(e => ['visual', 'image', 'shape'].includes(e.slot || ''));

  return (
    <AbsoluteFill style={{ 
      display: 'flex', 
      flexDirection: reverse ? 'row-reverse' : 'row', 
      alignItems: 'center', 
      padding: `${100 * scale}px`, 
      gap: `${80 * scale}px` 
    }}>
      {/* TEXT SIDE: Added a subtle glass effect for readability */}
      <div style={{ 
        flex: 1.2, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: `${30 * scale}px`,
        padding: `${40 * scale}px`,
        backgroundColor: 'rgba(0,0,0,0.25)', // Scrim for contrast
        backdropFilter: 'blur(8px)',        // Blurs the bg image behind text
        borderRadius: `${24 * scale}px`,
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        {renderSlot(textEls)}
      </div>
      
      {/* VISUAL SIDE: Strictly contained to prevent overflow */}
      <div style={{ 
        flex: 0.8, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        maxHeight: '80%', 
        width: '100%' 
      }}>
        <div style={{ width: '100%', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.4))' }}>
           {renderSlot(visualEls)}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Layout: LOWER_THIRD ────────────────────────────────────

function LowerThirdLayout({ elements }: { elements: SceneElement[] }) {
  const scale = useScaleFactor();
  const main = elements.filter(e => e.slot !== 'lower');
  const lower = elements.filter(e => e.slot === 'lower');

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: `${200 * scale}px` }}>
        {renderSlot(main)}
      </AbsoluteFill>
      <div style={{ 
        position: 'absolute', bottom: 0, width: '100%', 
        padding: `${40 * scale}px ${80 * scale}px`, 
        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' 
      }}>
        {renderSlot(lower)}
      </div>
    </AbsoluteFill>
  );
}

// ── Dispatcher ─────────────────────────────────────────────

export const LayoutRenderer: React.FC<LayoutProps> = ({ layout, elements }) => {
  if (!elements?.length) return null;

  switch (layout) {
    case 'TITLE':           return <TitleLayout elements={elements} />;
    case 'TITLE_SUBTITLE': return <TitleSubtitleLayout elements={elements} />;
    case 'STATEMENT':      return <StatementLayout elements={elements} />;
    case 'FULLSCREEN':     return <FullscreenLayout elements={elements} />;
    case 'BULLET_POINTS':  return <BulletPointsLayout elements={elements} />;
    case 'SPLIT_LEFT':     return <SplitLayout elements={elements} reverse={false} />;
    case 'SPLIT_RIGHT':    return <SplitLayout elements={elements} reverse={true} />;
    case 'LOWER_THIRD':    return <LowerThirdLayout elements={elements} />;
    default:               return <TitleLayout elements={elements} />;
  }
};