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
      <div style={{ width: '100%', maxWidth: `${1000 * scale}px`, textAlign: 'center' }}>
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
  const main = getElementsForSlots(elements, ['text', 'main', 'title']);

  return (
    <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ 
        width: '85%', 
        borderLeft: `${12 * scale}px solid white`, 
        paddingLeft: `${40 * scale}px`,
        textAlign: 'left'
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
  const titleEls = elements.filter(e => e.slot === 'title' || e.slot === 'heading');
  const subtitleEls = elements.filter(e => e.slot === 'subtitle' || e.slot === 'caption' || e.slot === 'text' || e.slot === 'main');

  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: `${40 * scale}px`, padding: `${80 * scale}px` }}>
      <div style={{ textAlign: 'center' }}>{renderSlot(titleEls.length > 0 ? titleEls : elements.slice(0, 1))}</div>
      <div style={{ textAlign: 'center' }}>{renderSlot(subtitleEls.length > 0 ? subtitleEls : elements.slice(1))}</div>
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
  // We classify elements as either "Visual-like" or "Text-like"
  const textEls = elements.filter(e => !['visual', 'image'].includes(e.slot || ''));
  const visualEls = elements.filter(e => ['visual', 'image'].includes(e.slot || ''));

  return (
    <AbsoluteFill style={{ 
      display: 'flex', 
      flexDirection: reverse ? 'row-reverse' : 'row', 
      alignItems: 'center', 
      padding: `${80 * scale}px`, 
      gap: `${60 * scale}px` 
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: `${20 * scale}px` }}>
        {renderSlot(textEls)}
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        {renderSlot(visualEls)}
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