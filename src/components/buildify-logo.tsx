import { type SVGProps } from "react"

type LogoSize = "sm" | "md" | "lg" | "xl"

interface BuildifyLogoProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  size?: LogoSize
}

const sizeConfig = {
  sm: { width: 20, height: 18, paneW: 12, paneH: 10, stroke: 1.5, rx: 2, offsetX: 4, offsetY: 3 },
  md: { width: 28, height: 26, paneW: 17, paneH: 15, stroke: 2, rx: 3, offsetX: 5, offsetY: 5 },
  lg: { width: 38, height: 34, paneW: 22, paneH: 20, stroke: 2, rx: 4, offsetX: 7, offsetY: 6 },
  xl: { width: 52, height: 46, paneW: 30, paneH: 27, stroke: 2.5, rx: 5, offsetX: 10, offsetY: 8 },
} as const

/**
 * Buildify layered-panes logo icon.
 * Three stacked rectangular panes in progressive blue shades.
 */
export function BuildifyLogo({ size = "md", ...props }: BuildifyLogoProps) {
  const cfg = sizeConfig[size]

  const panes = [
    {
      x: 0,
      y: cfg.height - cfg.paneH,
      stroke: "#3B7EFF",
      fill: "rgba(59,126,255,0.1)",
    },
    {
      x: cfg.offsetX,
      y: cfg.height - cfg.paneH - cfg.offsetY,
      stroke: "#5B9AFF",
      fill: "rgba(91,154,255,0.07)",
    },
    {
      x: cfg.offsetX * 2,
      y: cfg.height - cfg.paneH - cfg.offsetY * 2,
      stroke: "#8BB8FF",
      fill: "rgba(139,184,255,0.04)",
    },
  ]

  return (
    <svg
      width={cfg.width}
      height={cfg.height}
      viewBox={`0 0 ${cfg.width} ${cfg.height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {panes.map((pane, i) => (
        <rect
          key={i}
          x={pane.x + cfg.stroke / 2}
          y={pane.y + cfg.stroke / 2}
          width={cfg.paneW - cfg.stroke}
          height={cfg.paneH - cfg.stroke}
          rx={cfg.rx}
          stroke={pane.stroke}
          strokeWidth={cfg.stroke}
          fill={pane.fill}
        />
      ))}
    </svg>
  )
}
