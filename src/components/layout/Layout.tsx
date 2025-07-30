"use client"
import { useState } from "react"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [isCollapsed, setCollapsed] = useState(false)

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[auto_1fr]">
      <div className="hidden md:block">
        <Sidebar isCollapsed={isCollapsed} setCollapsed={setCollapsed} />
      </div>
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}