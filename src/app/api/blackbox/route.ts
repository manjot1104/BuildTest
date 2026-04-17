import { NextResponse } from "next/server";
import { getSession } from '@/server/better-auth/server'
import { deductCredits } from '@/server/services/credits.service'
import { CREDIT_COSTS } from '@/config/credits.config'
import { getUserTotalCredits } from '@/server/services/credits.service'
// ─── Elite Three.js r128 System Prompt ────────────────────────────────────────
const THREEJS_EXPERT_SYSTEM_PROMPT = `
You are an elite 3D creative director and Three.js r128 engineer.
You build cinematic, premium 3D websites — Bruno Simon, Active Theory, Resn level.
DO NOT output markdown code blocks (no \`\`\` or \`\`\`html). Output raw HTML only.
Output ONLY a complete self-contained HTML file. NO markdown. NO explanation. Just HTML.

MANDATORY INTERACTIONS — BOTH MUST ALWAYS WORK:

1. MOUSE PARALLAX — register BOTH:
   (a) document.addEventListener('mousemove', function(e) {
         mouseX = (e.clientX / window.innerWidth) * 2 - 1;
         mouseY = -((e.clientY / window.innerHeight) * 2 - 1);
       });
   (b) window.addEventListener('message', function(e) {
         if (e.data && e.data.type === 'MOUSEMOVE') { mouseX = e.data.nx; mouseY = e.data.ny; }
       });
   In animate loop: camera.rotation.y += (mouseX * 0.08 - camera.rotation.y) * 0.05;
                    camera.rotation.x += (mouseY * 0.05 - camera.rotation.x) * 0.05;

2. SCROLL ZOOM — register BOTH:
   (a) var scrollProgress = 0;
       document.addEventListener('wheel', function(e) {
         scrollProgress = Math.max(0, Math.min(1, scrollProgress + e.deltaY * 0.001));
       });
   (b) window.addEventListener('message', function(e) {
         if (e.data && e.data.type === 'SCROLL') { scrollProgress = e.data.progress; }
       });
   In animate loop: camera.position.z = baseCameraZ - scrollProgress * 3;

MULTI-SCENE SPA — 4 to 5 scenes with fixed top navbar:
Each nav click transitions to a completely different scene (different geometry, palette, fog, mood).

EXACT switchScene pattern:
  var currentAnimId = null, currentObjects = [];
  function cleanupScene() {
    cancelAnimationFrame(currentAnimId);
    currentObjects.forEach(function(o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(function(m){ m.dispose(); }); }
      scene.remove(o);
    });
    currentObjects = [];
  }
  function switchScene(name) {
    overlay.style.opacity = '1';
    setTimeout(function() {
      cleanupScene(); sceneBuilders[name](); overlay.style.opacity = '0'; updateActiveNav(name);
    }, 350);
  }
Overlay: position fixed, inset 0, background #000, transition opacity 0.35s, pointer-events none, z-index 10.
Re-register mousemove + message listeners inside EACH scene builder.

VISUAL QUALITY:
- Geometry: IcosahedronGeometry, TorusKnotGeometry, OctahedronGeometry, or custom — NOT plain boxes/spheres alone
- Material: MeshPhysicalMaterial or MeshStandardMaterial, metalness 0.8, roughness 0.2
- Wireframe clone overlay at opacity 0.06
- Particle field: 1200–2000 BufferGeometry points, PointsMaterial size 0.015, sin/cos drift per frame
- Lights: AmbientLight 0.2 max + DirectionalLight key (warm/cool) intensity 2.0 castShadow + PointLight rim contrasting hue
- FogExp2 matching scene palette density 0.02–0.035
- Entry scale: mesh scales from 0.001 to 1 over ~1s via lerp in animate loop

TYPOGRAPHY (premium — not default):
- Google Fonts: @import 'Space Grotesk' or 'Syne' or 'DM Sans' in <style>
- Hero: font-size clamp(2.8rem,6vw,5.5rem), font-weight 200, letter-spacing -0.03em, line-height 1.05
- Subtext: 0.78rem, opacity 0.38, letter-spacing 0.05em, line-height 1.85
- Nav: 0.63rem, letter-spacing 0.16em, text-transform uppercase, font-weight 500
- Buttons: 1px solid rgba(255,255,255,0.15), padding 9px 26px, border-radius 2px, no fill, hover rgba(255,255,255,0.07)
- NO pill buttons. NO system fonts. NO flat color backgrounds. All text white.

HARD RULES:
- Three.js CDN: <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
- renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)); shadowMap on; PCFSoftShadowMap
- Resize handler on window
- canvas: position fixed, 0 0, 100vw 100vh, z-index -1
- UI above canvas: position fixed/absolute
- NO import/export/ES modules — inline script only
- renderer.forceContextLoss() MUST be called in window.beforeunload and visibilitychange=hidden events
- Add: window.addEventListener('beforeunload', function() { renderer.forceContextLoss(); renderer.dispose(); });
- document.addEventListener('visibilitychange', function() { if(document.hidden) renderer.forceContextLoss(); });
- BEFORE calling new THREE.WebGLRenderer(), ALWAYS check: if (document.querySelector('canvas')) { document.querySelector('canvas').remove(); }
- Only ONE renderer instance allowed. Store as var renderer at top scope. Never re-initialize.
- renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); — cap at 1.5, NOT 2
- NEVER make any external API calls, fetch requests, or XMLHttpRequests inside the HTML
- NEVER use ip-api.com, ipapi.co, geolocation APIs, or any third-party data services
- NEVER use navigator.geolocation
- The HTML must be 100% self-contained with zero network requests after page load
- All data must be hardcoded — no runtime fetching of any kind


INTERACTIONS ON CLICK (MANDATORY):
- All navbar links and buttons must have click feedback animation (scale down to 0.92 then back to 1)
- On click, trigger a subtle scene-wide animation (slight scale pulse or lighting change)
- Navigation clicks must feel interactive, not static

TEXT SAFETY (MANDATORY):
- No text should ever be cropped or overflow outside screen
- All headings must wrap properly using max-width and responsive layout
- Use padding from left/right edges (minimum 5vw)
- Ensure full visibility in fullscreen mode

`;

// ─── Route Handler ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  let body: any = {}

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { prompt, systemPrompt, isFollowUp = false } = body

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
  }

  const messages: { role: string; content: string }[] = []

  const is3D = true
  let finalSystemPrompt: string

  if (is3D) {
    finalSystemPrompt = THREEJS_EXPERT_SYSTEM_PROMPT
  } else {
    finalSystemPrompt =
      systemPrompt ||
      "You are an expert web developer specializing in premium, production-ready websites. Output ONLY raw HTML. No markdown, no backticks, no explanation."
  }

  messages.push({ role: "system", content: finalSystemPrompt })


  const session = await getSession()

   let cost = 0
  if (session?.user?.id) {
    cost = isFollowUp
      ? CREDIT_COSTS.FOLLOW_UP_PROMPT * 3
      : CREDIT_COSTS.NEW_PROMPT * 3
  }


  if (session?.user?.id) {
    const availableCredits = await getUserTotalCredits(session.user.id)

    if (availableCredits < cost) {
      return NextResponse.json(
        { error: "credits_exhausted" },
        { status: 402 }
      )
    }
  }



   const optimizedPrompt = `
Create a premium multi-scene 3D website for: "${prompt}"

- Maximum 3 scenes
- fixed navbar
- smooth transitions
- click animations
- responsive layout
`

 messages.push({ role: "user", content: optimizedPrompt.trim() })

  let data
  let deducted = false

  try {
    const response = await fetch("https://api.blackbox.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.BLACKBOX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "blackboxai/anthropic/claude-opus-4.6",
        max_tokens: 12000,
        messages,
      }),
    })

    data = await response.json()

   
    if (!data?.choices?.[0]?.message?.content) {
      return NextResponse.json(
        { error: "service_unavailable" },
        { status: 503 }
      )
    }

  
    if (data.error) {
      const errMsg =
        typeof data.error === "string"
          ? data.error
          : JSON.stringify(data.error)

      if (
        errMsg.toLowerCase().includes("credit") ||
        errMsg.toLowerCase().includes("budget") ||
        errMsg.toLowerCase().includes("exceeded") ||
        errMsg.toLowerCase().includes("suspended")
      ) {
        return NextResponse.json(
          { error: "credits_exhausted" },
          { status: 402 }
        )
      }

      return NextResponse.json(
        { error: "service_unavailable" },
        { status: 503 }
      )
    }

  } catch (err) {
    console.error("3D generation failed:", err)

    return NextResponse.json(
      { error: "service_unavailable" },
      { status: 503 }
    )
  }


  if (session?.user?.id && !deducted) {
    try {
      await deductCredits(
        session.user.id,
        cost,
        '3d_builder',
        undefined
      )
      deducted = true
    } catch (e) {
      console.error('Credit deduction failed:', e)
    }
  }

  return NextResponse.json(data)
}

