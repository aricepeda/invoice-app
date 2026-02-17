import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowUpRight, 
  TrendingUp,
  Plus,
  ArrowDownRight,
  FileText,
  Wallet,
  ArrowRight,
  CreditCard,
  CalendarIcon
} from "lucide-react";
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { Link } from "wouter";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { es } from "date-fns/locale";

type DateFilterType = "today" | "week" | "month" | "year" | "custom";

interface DashboardStats {
  totalBalance: number;
  income: number;
  expenses: number;
  pendingSalesInvoices: number;
  pendingPurchaseInvoices: number;
  recentTransactions: {
    id: number;
    description: string;
    amount: number;
    type: string;
    date: string;
  }[];
  monthlyData: { name: string; income: number; expenses: number }[];
  weeklyData: { name: string; total: number }[];
}

export default function Dashboard() {
  const [dateFilter, setDateFilter] = useState<DateFilterType>("month");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (dateFilter) {
      case "today":
        return { startDate: format(startOfDay(now), "yyyy-MM-dd"), endDate: format(endOfDay(now), "yyyy-MM-dd") };
      case "week":
        return { startDate: format(startOfWeek(now, { locale: es }), "yyyy-MM-dd"), endDate: format(endOfWeek(now, { locale: es }), "yyyy-MM-dd") };
      case "month":
        return { startDate: format(startOfMonth(now), "yyyy-MM-dd"), endDate: format(endOfMonth(now), "yyyy-MM-dd") };
      case "year":
        return { startDate: format(startOfYear(now), "yyyy-MM-dd"), endDate: format(endOfYear(now), "yyyy-MM-dd") };
      case "custom":
        if (customDateRange.from && customDateRange.to) {
          return { startDate: format(customDateRange.from, "yyyy-MM-dd"), endDate: format(customDateRange.to, "yyyy-MM-dd") };
        }
        return { startDate: format(startOfMonth(now), "yyyy-MM-dd"), endDate: format(endOfMonth(now), "yyyy-MM-dd") };
      default:
        return { startDate: format(startOfMonth(now), "yyyy-MM-dd"), endDate: format(endOfMonth(now), "yyyy-MM-dd") };
    }
  }, [dateFilter, customDateRange]);

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats", dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getFilterLabel = () => {
    switch (dateFilter) {
      case "today": return "hoy";
      case "week": return "esta semana";
      case "month": return "este mes";
      case "year": return "este año";
      case "custom": return "período seleccionado";
    }
  };

  const getChartDescription = () => {
    switch (dateFilter) {
      case "today": return "Ingresos vs gastos de hoy";
      case "week": return "Ingresos vs gastos de esta semana";
      case "month": return "Ingresos vs gastos de este mes";
      case "year": return "Ingresos vs gastos de este año";
      case "custom": return "Ingresos vs gastos del período seleccionado";
    }
  };

  const getWeeklyChartDescription = () => {
    switch (dateFilter) {
      case "today": return "Ingresos de hoy";
      case "week": return "Ingresos de esta semana";
      case "month": return "Ingresos diarios del mes";
      case "year": return "Últimos 7 días del año";
      case "custom": return "Ingresos del período";
    }
  };

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Bienvenido de vuelta! Aquí está el resumen de tu negocio.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateFilter} onValueChange={(value: DateFilterType) => setDateFilter(value)}>
            <SelectTrigger className="w-[150px]" data-testid="select-date-filter">
              <CalendarIcon className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mes</SelectItem>
              <SelectItem value="year">Este Año</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {dateFilter === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px]" data-testid="button-custom-date">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {customDateRange.from && customDateRange.to 
                    ? `${format(customDateRange.from, "dd/MM/yy")} - ${format(customDateRange.to, "dd/MM/yy")}`
                    : "Seleccionar fechas"
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: customDateRange.from, to: customDateRange.to }}
                  onSelect={(range) => setCustomDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          )}

          <Link href="/invoices/create">
            <Button className="rounded-xl h-11 gradient-primary border-0 shadow-lg shadow-primary/25" data-testid="button-new-invoice">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Factura
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="card-shadow card-hover border-0 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Ingresos</p>
                <h3 className="text-2xl font-bold tracking-tight" data-testid="stat-income">
                  {isLoading ? "..." : formatCurrency(stats?.income || 0)}
                </h3>
                <p className="text-sm text-emerald-600 flex items-center mt-2 font-medium">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  {getFilterLabel()}
                </p>
              </div>
              <div className="stat-icon stat-icon-success">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow card-hover border-0 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Gastos</p>
                <h3 className="text-2xl font-bold tracking-tight" data-testid="stat-expenses">
                  {isLoading ? "..." : formatCurrency(stats?.expenses || 0)}
                </h3>
                <p className="text-sm text-rose-600 flex items-center mt-2 font-medium">
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                  {getFilterLabel()}
                </p>
              </div>
              <div className="stat-icon stat-icon-danger">
                <CreditCard className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow card-hover border-0 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Neto</p>
                <h3 className="text-2xl font-bold tracking-tight" data-testid="stat-net-total">
                  {isLoading ? "..." : formatCurrency((stats?.income || 0) - (stats?.expenses || 0))}
                </h3>
                <p className="text-sm text-primary flex items-center mt-2 font-medium">
                  <Wallet className="h-4 w-4 mr-1" />
                  {getFilterLabel()}
                </p>
              </div>
              <div className="stat-icon stat-icon-primary">
                <Wallet className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Revenue Chart */}
        <Card className="lg:col-span-4 card-shadow border-0">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Resumen Financiero</CardTitle>
                <CardDescription>{getChartDescription()}</CardDescription>
              </div>
              <Link href="/reports/sales">
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 rounded-lg">
                  Ver detalles
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.monthlyData || []}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(252 87% 54%)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="hsl(252 87% 54%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(152 69% 45%)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="hsl(152 69% 45%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(230 15% 50%)" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(230 15% 50%)" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: 'none', 
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    stroke="hsl(252 87% 54%)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorIncome)"
                    name="Ingresos"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="hsl(152 69% 45%)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorExpenses)"
                    name="Gastos"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Revenue Bar Chart */}
        <Card className="lg:col-span-3 card-shadow border-0">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Ingresos</CardTitle>
                <CardDescription>{getWeeklyChartDescription()}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.weeklyData || []}>
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(230 15% 50%)" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(230 15% 50%)" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: 'none', 
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Total']}
                  />
                  <Bar 
                    dataKey="total" 
                    fill="hsl(252 87% 54%)" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="card-shadow border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Transacciones Recientes</CardTitle>
              <CardDescription>Últimas actividades {getFilterLabel()}</CardDescription>
            </div>
            <Link href="/treasury/transactions">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 rounded-lg">
                Ver todas
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Cargando...</p>
            ) : stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
              stats.recentTransactions.map((transaction) => {
                const isIncome = transaction.type === 'entrada' || transaction.type === 'pago_cliente';
                return (
                  <div 
                    key={transaction.id} 
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    data-testid={`transaction-${transaction.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 border-2 border-primary/10">
                        <AvatarFallback className={`font-semibold ${isIncome ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {isIncome ? '+' : '-'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">{transaction.description || 'Transacción'}</p>
                        <p className="text-sm text-muted-foreground">
                          {(() => {
                            if (!transaction.date) return '';
                            const dateStr = String(transaction.date).split('T')[0];
                            const date = new Date(dateStr + 'T00:00:00');
                            return isNaN(date.getTime()) ? '' : format(date, "dd MMM yyyy", { locale: es });
                          })()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {transaction.type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-muted-foreground py-8">No hay transacciones en este período</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}
