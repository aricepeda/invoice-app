import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Package, 
  FileSpreadsheet, 
  Settings,
  LogOut,
  Bell,
  Search,
  UserCheck,
  Menu,
  ChevronLeft,
  ChevronDown,
  Wallet,
  Building2,
  Receipt,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Boxes,
  Cog,
  HandCoins,
  Landmark,
  ArrowRightLeft,
  CreditCard,
  FolderTree,
  Truck,
  DollarSign,
  type LucideIcon
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import type { CompanySettings } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavCategory {
  name: string;
  icon: LucideIcon;
  items: NavItem[];
}

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const { user, logout } = useAuth();

  const { data: companySettings } = useQuery<CompanySettings>({
    queryKey: ["companySettings"],
    queryFn: async () => {
      const res = await fetch("/api/company-settings");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const dashboardItem: NavItem = { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard };
  const configuracionItem: NavItem = { name: "Configuración", href: "/settings", icon: Settings };

  const reportesCategory: NavCategory = {
    name: "Reportes",
    icon: FileSpreadsheet,
    items: [
      { name: "Reporte Financiero", href: "/finance-reports", icon: DollarSign },
      { name: "Reportes de Ventas", href: "/sales-reports", icon: TrendingUp },
      { name: "Reportes de Compras", href: "/purchase-reports", icon: TrendingDown },
      { name: "Cuentas por Cobrar/Pagar", href: "/receivables-payables", icon: Wallet },
      { name: "Reportes de Inventario", href: "/inventory-reports", icon: Boxes },
      { name: "Reportes DGII", href: "/dgii-reports", icon: FileSpreadsheet },
    ]
  };

  const cuentasPorPagarCategory: NavCategory = {
    name: "Compras",
    icon: ShoppingCart,
    items: [
      { name: "Facturas de Compra", href: "/purchase-invoices", icon: Receipt },
      { name: "Recibos de Pago", href: "/supplier-payments", icon: Wallet },
      { name: "Suplidores", href: "/suppliers", icon: Building2 },
      { name: "Categorías de Gasto", href: "/expense-categories", icon: FolderTree },
    ]
  };

  const navigationCategories: NavCategory[] = [
    {
      name: "Ventas",
      icon: TrendingUp,
      items: [
        { name: "Facturas", href: "/invoices", icon: FileText },
        { name: "Recibo de Ingresos", href: "/customer-payments", icon: HandCoins },
        { name: "Anticipos", href: "/advances", icon: Wallet },
        { name: "Conduces", href: "/conduces", icon: Truck },
        { name: "Clientes", href: "/customers", icon: Users },
        { name: "Productos", href: "/products", icon: Package },
        { name: "Vendedores", href: "/sellers", icon: UserCheck },
      ]
    },
  ];

  const isVendedor = user?.role === 'vendedor';
  
  const allCategories = isVendedor 
    ? [...navigationCategories, cuentasPorPagarCategory]
    : [...navigationCategories, cuentasPorPagarCategory, reportesCategory];

  const findCategoryForLocation = () => {
    for (const category of allCategories) {
      if (category.items.some(item => location === item.href)) {
        return category.name;
      }
    }
    return null;
  };

  useEffect(() => {
    const categoryName = findCategoryForLocation();
    if (categoryName) {
      setOpenCategories([categoryName]);
    } else {
      setOpenCategories([]);
    }
  }, [location]);

  const toggleCategory = (categoryName: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryName) 
        ? prev.filter(c => c !== categoryName)
        : [categoryName]
    );
  };

  const ensureCategoryOpen = (categoryName: string) => {
    setOpenCategories([categoryName]);
  };

  const isCategoryActive = (category: NavCategory) => {
    return category.items.some(item => location === item.href);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Maglo Style */}
      <aside className={`bg-sidebar text-sidebar-foreground flex flex-col fixed h-full z-10 hidden md:flex transition-all duration-300 ${sidebarOpen ? 'w-72' : 'w-20'}`}>
        {/* Logo Area */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-sidebar-border/30">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'hidden'}`}>
            {companySettings?.logoUrl ? (
              <img 
                src={companySettings.logoUrl} 
                alt={companySettings.name || "Logo"} 
                className="w-10 h-10 rounded-xl object-contain bg-white/10"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                <Wallet className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <span className="font-bold text-white text-lg tracking-tight">
                {companySettings?.name || "Sistema"}
              </span>
              <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">Sistema de Ventas</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent h-9 w-9 rounded-lg"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            data-testid="button-toggle-sidebar"
          >
            {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <div className={`text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 mb-4 px-3 ${!sidebarOpen && 'hidden'}`}>
            Menu
          </div>
          <nav className="space-y-2">
            <TooltipProvider delayDuration={0}>
              {/* Dashboard Item */}
              <Link href={dashboardItem.href}>
                <div 
                  className={`
                    flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer justify-between
                    ${location === dashboardItem.href 
                      ? "text-primary bg-primary/10" 
                      : "text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent"}
                  `}
                  title={dashboardItem.name}
                  data-testid={`nav-dashboard`}
                >
                  <div className="flex items-center gap-3">
                    <dashboardItem.icon className={`w-5 h-5 flex-shrink-0 ${location === dashboardItem.href ? "text-primary" : ""}`} />
                    {sidebarOpen && <span>{dashboardItem.name}</span>}
                  </div>
                </div>
              </Link>

              {navigationCategories.map((category) => {
                const isOpen = openCategories.includes(category.name);
                const hasActiveItem = isCategoryActive(category);
                
                if (!sidebarOpen) {
                  return (
                    <DropdownMenu key={category.name}>
                      <DropdownMenuTrigger asChild>
                        <div 
                          className={`
                            flex items-center justify-center px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer
                            ${hasActiveItem 
                              ? "text-primary bg-primary/10" 
                              : "text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent"}
                          `}
                          title={category.name}
                          data-testid={`nav-category-${category.name.toLowerCase()}`}
                        >
                          <category.icon className={`w-5 h-5 flex-shrink-0 ${hasActiveItem ? "text-primary" : ""}`} />
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start" className="w-56 ml-2">
                        <DropdownMenuLabel>{category.name}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {category.items.map((item) => {
                          const isActive = location === item.href;
                          return (
                            <DropdownMenuItem 
                              key={item.name}
                              className={`cursor-pointer ${isActive ? "bg-primary/10 text-primary" : ""}`}
                              onClick={() => setLocation(item.href)}
                              data-testid={`nav-${item.href.replace('/', '') || 'dashboard'}`}
                            >
                              <item.icon className="w-4 h-4 mr-2" />
                              {item.name}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                }

                return (
                  <Collapsible 
                    key={category.name} 
                    open={isOpen}
                    onOpenChange={() => toggleCategory(category.name)}
                  >
                    <CollapsibleTrigger asChild>
                      <div 
                        className={`
                          flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer justify-between
                          ${hasActiveItem 
                            ? "text-primary bg-primary/10" 
                            : "text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent"}
                        `}
                        title={category.name}
                        data-testid={`nav-category-${category.name.toLowerCase()}`}
                      >
                        <div className="flex items-center gap-3">
                          <category.icon className={`w-5 h-5 flex-shrink-0 ${hasActiveItem ? "text-primary" : ""}`} />
                          <span>{category.name}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 space-y-1">
                      {category.items.map((item) => {
                        const isActive = location === item.href;
                        return (
                          <Link key={item.name} href={item.href} onClick={() => ensureCategoryOpen(category.name)}>
                            <div 
                              className={`
                                flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer ml-4
                                ${isActive 
                                  ? "bg-primary text-white shadow-lg shadow-primary/25" 
                                  : "text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent"}
                              `}
                              title={item.name}
                              data-testid={`nav-${item.href.replace('/', '') || 'dashboard'}`}
                            >
                              <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : ""}`} />
                              <span>{item.name}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}

              {/* Cuentas por Pagar Category */}
              {sidebarOpen ? (
                <Collapsible 
                  open={openCategories.includes(cuentasPorPagarCategory.name)}
                  onOpenChange={() => toggleCategory(cuentasPorPagarCategory.name)}
                >
                  <CollapsibleTrigger asChild>
                    <div 
                      className={`
                        flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer justify-between
                        ${isCategoryActive(cuentasPorPagarCategory) 
                          ? "text-primary bg-primary/10" 
                          : "text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent"}
                      `}
                      title={cuentasPorPagarCategory.name}
                      data-testid={`nav-category-${cuentasPorPagarCategory.name.toLowerCase()}`}
                    >
                      <div className="flex items-center gap-3">
                        <cuentasPorPagarCategory.icon className={`w-5 h-5 flex-shrink-0 ${isCategoryActive(cuentasPorPagarCategory) ? "text-primary" : ""}`} />
                        <span>{cuentasPorPagarCategory.name}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openCategories.includes(cuentasPorPagarCategory.name) ? 'rotate-180' : ''}`} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1 space-y-1">
                    {cuentasPorPagarCategory.items.map((item) => {
                      const isActive = location === item.href;
                      return (
                        <Link key={item.name} href={item.href} onClick={() => ensureCategoryOpen(cuentasPorPagarCategory.name)}>
                          <div 
                            className={`
                              flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer ml-4
                              ${isActive 
                                ? "bg-primary text-white shadow-lg shadow-primary/25" 
                                : "text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent"}
                            `}
                            title={item.name}
                            data-testid={`nav-${item.href.replace('/', '') || 'dashboard'}`}
                          >
                            <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : ""}`} />
                            <span>{item.name}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div 
                      className={`
                        flex items-center justify-center px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer
                        ${isCategoryActive(cuentasPorPagarCategory) 
                          ? "text-primary bg-primary/10" 
                          : "text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent"}
                      `}
                      title={cuentasPorPagarCategory.name}
                      data-testid={`nav-category-${cuentasPorPagarCategory.name.toLowerCase()}`}
                    >
                      <cuentasPorPagarCategory.icon className={`w-5 h-5 flex-shrink-0 ${isCategoryActive(cuentasPorPagarCategory) ? "text-primary" : ""}`} />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start" className="w-56 ml-2">
                    <DropdownMenuLabel>{cuentasPorPagarCategory.name}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {cuentasPorPagarCategory.items.map((item) => {
                      const isActive = location === item.href;
                      return (
                        <DropdownMenuItem 
                          key={item.name}
                          className={`cursor-pointer ${isActive ? "bg-primary/10 text-primary" : ""}`}
                          onClick={() => setLocation(item.href)}
                          data-testid={`nav-${item.href.replace('/', '') || 'dashboard'}`}
                        >
                          <item.icon className="w-4 h-4 mr-2" />
                          {item.name}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}


              {/* Reportes Category - Hidden for vendedor */}
              {!isVendedor && (sidebarOpen ? (
                <Collapsible
                  open={openCategories.includes(reportesCategory.name)}
                  onOpenChange={() => toggleCategory(reportesCategory.name)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div 
                      className={`
                        flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer justify-between
                        ${isCategoryActive(reportesCategory) 
                          ? "text-primary bg-primary/10" 
                          : "text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent"}
                      `}
                      title={reportesCategory.name}
                      data-testid={`nav-category-reportes`}
                    >
                      <div className="flex items-center gap-3">
                        <reportesCategory.icon className={`w-5 h-5 flex-shrink-0 ${isCategoryActive(reportesCategory) ? "text-primary" : ""}`} />
                        <span>{reportesCategory.name}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openCategories.includes(reportesCategory.name) ? "rotate-180" : ""}`} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="ml-4 mt-1 space-y-1">
                    {reportesCategory.items.map((item) => {
                      const isActive = location === item.href;
                      return (
                        <Link key={item.name} href={item.href} onClick={() => ensureCategoryOpen(reportesCategory.name)}>
                          <div 
                            className={`
                              flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-200 cursor-pointer
                              ${isActive 
                                ? "text-primary bg-primary/10 font-medium" 
                                : "text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent/50"}
                            `}
                            data-testid={`nav-${item.href.replace(/\//g, '-').substring(1)}`}
                          >
                            <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                            <span>{item.name}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div 
                      className={`
                        flex items-center justify-center px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer
                        ${isCategoryActive(reportesCategory) 
                          ? "text-primary bg-primary/10" 
                          : "text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent"}
                      `}
                      title={reportesCategory.name}
                      data-testid={`nav-category-reportes-collapsed`}
                    >
                      <reportesCategory.icon className={`w-5 h-5 flex-shrink-0 ${isCategoryActive(reportesCategory) ? "text-primary" : ""}`} />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start" className="w-56 ml-2">
                    <DropdownMenuLabel>{reportesCategory.name}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {reportesCategory.items.map((item) => {
                      const isActive = location === item.href;
                      return (
                        <DropdownMenuItem 
                          key={item.name}
                          className={`cursor-pointer ${isActive ? "bg-primary/10 text-primary" : ""}`}
                          onClick={() => setLocation(item.href)}
                          data-testid={`nav-${item.href.replace(/\//g, '-').substring(1)}`}
                        >
                          <item.icon className="w-4 h-4 mr-2" />
                          {item.name}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              ))}

              {/* Configuración Item - Hidden for vendedor */}
              {!isVendedor && (
                <Link href={configuracionItem.href}>
                  <div 
                    className={`
                      flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer justify-between
                      ${location === configuracionItem.href 
                        ? "text-primary bg-primary/10" 
                        : "text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent"}
                    `}
                    title={configuracionItem.name}
                    data-testid={`nav-configuracion`}
                  >
                    <div className="flex items-center gap-3">
                      <configuracionItem.icon className={`w-5 h-5 flex-shrink-0 ${location === configuracionItem.href ? "text-primary" : ""}`} />
                      {sidebarOpen && <span>{configuracionItem.name}</span>}
                    </div>
                  </div>
                </Link>
              )}
            </TooltipProvider>
          </nav>
        </div>

        {/* User Profile */}
        <div className={`p-4 mx-4 mb-4 rounded-xl bg-sidebar-accent/50 ${!sidebarOpen && 'mx-2 p-2'}`}>
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
            <Avatar className="w-10 h-10 border-2 border-primary/30 flex-shrink-0">
              <AvatarFallback className="bg-primary text-white">
                {user?.name?.slice(0, 2).toUpperCase() || "US"}
              </AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.name || "Usuario"}</p>
                <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email || user?.username}</p>
              </div>
            )}
            {sidebarOpen && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent"
                onClick={logout}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
          {!sidebarOpen && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-full mt-2 text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent"
              onClick={logout}
              data-testid="button-logout-collapsed"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 min-h-screen flex flex-col transition-all duration-300 ${sidebarOpen ? 'md:ml-72' : 'md:ml-20'}`}>
        {/* Page Content */}
        <div className="flex-1 p-8 pt-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
