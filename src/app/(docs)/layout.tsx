"use client"

import { usePathname } from "next/navigation"
import { Fragment } from "react"
import { DocsSidebar } from "@/components/layout/docs-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const segments = pathname.split("/").filter(Boolean)

  const buildHref = (idx: number) => {
    return "/" + segments.slice(0, idx + 1).join("/")
  }

  return (
    <SidebarProvider>
      <DocsSidebar />
      <SidebarInset>
        <header className="flex flex-col h-16 shrink-0 justify-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                {segments.map((segment, idx) => {
                  const isLast = idx === segments.length - 1
                  const title =
                    segment.charAt(0).toUpperCase() +
                    segment.slice(1).replace(/-/g, " ")
                  return (
                    <Fragment key={buildHref(idx)}>
                      {idx !== 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage>{title}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink href={buildHref(idx)}>
                            {title}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </Fragment>
                  )
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
