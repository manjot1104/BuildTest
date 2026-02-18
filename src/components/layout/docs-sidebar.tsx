"use client"

import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import Link from "next/link"
import {
  BookOpen,
  Zap,
  GraduationCap,
  History,
  Moon,
  Sun,
  ArrowRight,
} from "lucide-react"
import { BuildifyLogo } from "@/components/buildify-logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const docPages = [
  { title: "Introduction", href: "/docs", icon: BookOpen },
  { title: "Get Started", href: "/docs/get-started", icon: Zap },
  { title: "Tutorials", href: "/docs/tutorials", icon: GraduationCap },
  { title: "Changelog", href: "/docs/changelog", icon: History },
]

export function DocsSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  function handleToggle() {
    setTheme(theme === "dark" ? "light" : theme === "light" ? "dark" : "light")
  }

  let themeIcon, themeLabel
  if (theme === "dark") {
    themeIcon = <Moon className="h-4 w-4" />
    themeLabel = "Dark theme"
  } else if (theme === "light") {
    themeIcon = <Sun className="h-4 w-4" />
    themeLabel = "Light theme"
  } else {
    themeIcon = (
      <span className="flex items-center">
        <Sun className="h-4 w-4" />
        <Moon className="ml-[-0.4rem] h-3 w-3 opacity-70" />
      </span>
    )
    themeLabel = "System theme"
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/docs">
                <div className="flex aspect-square size-8 items-center justify-center">
                  <BuildifyLogo size="sm" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Buildify</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Documentation
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Pages</SidebarGroupLabel>
          <SidebarMenu>
            {docPages.map((page) => (
              <SidebarMenuItem key={page.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === page.href}
                  tooltip={page.title}
                >
                  <Link href={page.href}>
                    <page.icon />
                    <span>{page.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleToggle} tooltip={themeLabel}>
              {themeIcon}
              <span>{themeLabel}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Go to App">
              <Link href="/chat">
                <ArrowRight />
                <span>Go to App</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
