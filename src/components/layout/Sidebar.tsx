"use client"

import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Home, ShoppingCart, Package, Box, DollarSign, Settings, Users, FileText, List, ChevronLeft, ChevronRight, ClipboardList, Landmark, HandCoins, ReceiptText, IdCard, Fingerprint, BookCheck, BarChart3, PackageOpen, Shield } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const menuItems = [
  {
    title: "Utama",
    items: [
      { href: "/", label: "Dashboard", icon: Home },
      { href: "/pos", label: "Kasir (POS)", icon: ShoppingCart },
      { href: "/transactions", label: "Data Transaksi", icon: List },
      { href: "/quotations", label: "Penawaran", icon: FileText },
      { href: "/attendance", label: "Absensi", icon: Fingerprint },
    ],
  },
  {
    title: "Manajemen Data",
    items: [
      { href: "/products", label: "Produk", icon: Package },
      { href: "/materials", label: "Bahan & Stok", icon: Box },
      { href: "/customers", label: "Pelanggan", icon: Users },
      { href: "/employees", label: "Karyawan", icon: IdCard },
      { href: "/purchase-orders", label: "Purchase Orders", icon: ClipboardList },
      { href: "/stock-report", label: "Laporan Stock", icon: BarChart3 },
      { href: "/transaction-items-report", label: "Laporan Item Keluar", icon: PackageOpen },
      { href: "/attendance/report", label: "Laporan Absensi", icon: BookCheck },
    ],
  },
  {
    title: "Keuangan",
    items: [
      { href: "/accounts", label: "Akun Keuangan", icon: Landmark },
      { href: "/receivables", label: "Piutang", icon: ReceiptText },
      { href: "/expenses", label: "Pengeluaran", icon: FileText },
      { href: "/advances", label: "Panjar Karyawan", icon: HandCoins },
      { href: "/financial-report", label: "Laporan Keuangan", icon: DollarSign },
    ],
  },
  {
    title: "Pengaturan",
    items: [
      { href: "/settings", label: "Info Perusahaan", icon: Settings },
      { href: "/role-permissions", label: "Kelola Role & Permission", icon: Shield },
    ],
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  setCollapsed: (isCollapsed: boolean) => void;
}

export function Sidebar({ isCollapsed, setCollapsed }: SidebarProps) {
  const location = useLocation();

  return (
    <div className="border-r bg-muted/40">
      <TooltipProvider delayDuration={0}>
        <div className="flex h-full max-h-screen flex-col">
          <div className={cn("flex h-14 items-center border-b lg:h-[60px]", isCollapsed ? "justify-center" : "px-4 lg:px-6")}>
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <Package className="h-6 w-6 text-primary" />
              <span className={cn(isCollapsed && "hidden")}>Matahari Digital Printing</span>
            </Link>
          </div>
          <nav className="flex-1 space-y-2 overflow-auto py-4 px-2">
            {menuItems.map((section) => (
              <div key={section.title}>
                {!isCollapsed && (
                  <h2 className="mb-2 px-2 text-sm font-semibold tracking-tight text-muted-foreground">
                    {section.title}
                  </h2>
                )}
                <div className={cn("space-y-1", isCollapsed && "flex flex-col items-center")}>
                  {section.items.map((item) =>
                    isCollapsed ? (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                          <Link
                            to={item.href}
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-primary",
                              location.pathname === item.href && "bg-primary text-primary-foreground"
                            )}
                          >
                            <item.icon className="h-5 w-5" />
                            <span className="sr-only">{item.label}</span>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                          location.pathname === item.href && "bg-primary text-primary-foreground hover:text-primary-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    )
                  )}
                </div>
              </div>
            ))}
          </nav>
          <div className="mt-auto border-t p-2">
            <div className={cn("flex", isCollapsed && "justify-center")}>
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setCollapsed(!isCollapsed)}>
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                <span className="sr-only">Toggle Sidebar</span>
              </Button>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}