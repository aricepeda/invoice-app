import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { getLocalDateString } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Landmark, CreditCard, Wallet, Trash2, Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessagePopup, useMessagePopup } from "@/components/ui/message-popup";
import { useLocation, useParams } from "wouter";
import type { PaymentAccount, AccountTransaction } from "@shared/schema";

const transactionTypeLabels: Record<string, string> = {
  entrada: "Entrada",
  salida: "Salida",
  transferencia_entrada: "Transferencia Recibida",
  transferencia_salida: "Transferencia Enviada",
};

const transactionTypeColors: Record<string, string> = {
  entrada: "bg-green-100 text-green-800",
  salida: "bg-red-100 text-red-800",
  transferencia_entrada: "bg-blue-100 text-blue-800",
  transferencia_salida: "bg-orange-100 text-orange-800",
};

const accountTypeIcons: Record<string, React.ReactNode> = {
  banco: <Landmark className="h-5 w-5" />,
  tarjeta_credito: <CreditCard className="h-5 w-5" />,
  caja_chica: <Wallet className="h-5 w-5" />,
};

const initialFormData = {
  type: "entrada" as "entrada" | "salida",
  amount: "",
  date: getLocalDateString(),
  description: "",
  notes: "",
};

const toDisplayDate = (isoDate: string) => {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
};

const toISODate = (displayDate: string) => {
  const parts = displayDate.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) return null;
  const d = parseInt(day), m = parseInt(month), y = parseInt(year);
  if (isNaN(d) || isNaN(m) || isNaN(y) || d < 1 || d > 31 || m < 1 || m > 12) return null;
  return `${year}-${month}-${day}`;
};

const formatDateInput = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  let result = "";
  for (let i = 0; i < digits.length && i < 8; i++) {
    if (i === 2 || i === 4) result += "/";
    result += digits[i];
  }
  return result;
};

export default function AccountTransactions() {
  const { id } = useParams<{ id: string }>();
  const accountId = parseInt(id || "0");
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [dateDisplay, setDateDisplay] = useState(toDisplayDate(initialFormData.date));

  const { data: account } = useQuery({
    queryKey: ["payment-account", accountId],
    queryFn: async () => {
      const response = await fetch(`/api/payment-accounts/${accountId}`);
      if (!response.ok) throw new Error("Failed to fetch account");
      return response.json() as Promise<PaymentAccount>;
    },
    enabled: accountId > 0,
  });

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["account-transactions", accountId],
    queryFn: async () => {
      const response = await fetch(`/api/payment-accounts/${accountId}/transactions`);
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json() as Promise<AccountTransaction[]>;
    },
    enabled: accountId > 0,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/account-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          paymentAccountId: accountId,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create transaction");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-transactions", accountId] });
      queryClient.invalidateQueries({ queryKey: ["payment-account", accountId] });
      queryClient.invalidateQueries({ queryKey: ["payment-accounts"] });
      setIsDialogOpen(false);
      setFormData(initialFormData);
      setDateDisplay(toDisplayDate(initialFormData.date));
      showSuccess("Movimiento registrado", "El movimiento ha sido registrado exitosamente.");
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      const response = await fetch(`/api/account-transactions/${transactionId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete transaction");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-transactions", accountId] });
      queryClient.invalidateQueries({ queryKey: ["payment-account", accountId] });
      queryClient.invalidateQueries({ queryKey: ["payment-accounts"] });
      showSuccess("Movimiento eliminado", "El movimiento ha sido eliminado y los balances han sido actualizados.");
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const handleDelete = (transactionId: number, isTransfer: boolean) => {
    const message = isTransfer 
      ? "¿Está seguro de eliminar esta transferencia? Se actualizarán los balances de ambas cuentas."
      : "¿Está seguro de eliminar este movimiento? Se actualizará el balance de la cuenta.";
    if (confirm(message)) {
      deleteMutation.mutate(transactionId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showError("Error", "El monto debe ser mayor a cero.");
      return;
    }
    if (!formData.description.trim()) {
      showError("Error", "La descripción es requerida.");
      return;
    }
    createMutation.mutate(formData);
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (!account) {
    return (
      <Layout>
        <div className="flex-1 p-8">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <MessagePopup 
        open={message.open}
        type={message.type}
        title={message.title}
        description={message.description}
        onClose={closeMessage}
      />
      
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/treasury/accounts")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              {accountTypeIcons[account.type]}
              <div>
                <h2 className="text-3xl font-bold tracking-tight">{account.name}</h2>
                <p className="text-muted-foreground">
                  {account.bankName && `${account.bankName} `}
                  {account.accountNumber && `· ${account.accountNumber}`}
                </p>
              </div>
            </div>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-new-transaction">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Movimiento
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card className="py-3">
            <CardContent className="py-0 px-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Balance Actual</span>
                <span className="text-lg font-bold" data-testid="text-current-balance">
                  {formatCurrency(account.currentBalance)}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="py-3">
            <CardContent className="py-0 px-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowUpCircle className="h-3 w-3 text-green-500" />
                  Entradas
                </span>
                <span className="text-lg font-bold text-green-600" data-testid="text-total-entries">
                  {formatCurrency(
                    transactions
                      .filter((t) => t.type === "entrada" || t.type === "transferencia_entrada")
                      .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0)
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="py-3">
            <CardContent className="py-0 px-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowDownCircle className="h-3 w-3 text-red-500" />
                  Salidas
                </span>
                <span className="text-lg font-bold text-red-600" data-testid="text-total-exits">
                  {formatCurrency(
                    transactions
                      .filter((t) => t.type === "salida" || t.type === "transferencia_salida")
                      .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0)
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Cargando movimientos...
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No hay movimientos registrados
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                    <TableCell>{formatDate(transaction.date)}</TableCell>
                    <TableCell>
                      <div>{transaction.description}</div>
                      {transaction.notes && (
                        <div className="text-sm text-muted-foreground">{transaction.notes}</div>
                      )}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      transaction.type === "entrada" || transaction.type === "transferencia_entrada" 
                        ? "text-green-600" 
                        : "text-red-600"
                    }`}>
                      {transaction.type === "entrada" || transaction.type === "transferencia_entrada" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(transaction.balanceAfter)}
                    </TableCell>
                    <TableCell>
                      {transaction.referenceType === 'supplier_payment' || transaction.referenceType === 'customer_payment' ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground cursor-not-allowed"
                          disabled
                          title="Este movimiento está vinculado a un pago y no puede eliminarse desde aquí"
                          data-testid={`button-delete-transaction-${transaction.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(transaction.id, transaction.referenceType === 'transfer')}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-transaction-${transaction.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Nuevo Movimiento</DialogTitle>
            <DialogDescription>
              Registra una entrada o salida de dinero en esta cuenta.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Tipo de Movimiento *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "entrada" | "salida") => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="type" data-testid="select-transaction-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">
                      <span className="flex items-center gap-2">
                        <ArrowUpCircle className="h-4 w-4 text-green-500" />
                        Entrada
                      </span>
                    </SelectItem>
                    <SelectItem value="salida">
                      <span className="flex items-center gap-2">
                        <ArrowDownCircle className="h-4 w-4 text-red-500" />
                        Salida
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Monto *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    data-testid="input-transaction-amount"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Fecha *</Label>
                  <div className="flex items-center">
                    <Input
                      id="date"
                      type="text"
                      value={dateDisplay}
                      onChange={(e) => {
                        const formatted = formatDateInput(e.target.value);
                        setDateDisplay(formatted);
                        const iso = toISODate(formatted);
                        if (iso) setFormData({ ...formData, date: iso });
                      }}
                      placeholder="dd/mm/yyyy"
                      className="flex-1 rounded-r-none border-r-0"
                      data-testid="input-transaction-date"
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="rounded-l-none">
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={formData.date ? new Date(formData.date + 'T00:00:00') : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const localDate = getLocalDateString(date);
                              setFormData({ ...formData, date: localDate });
                              setDateDisplay(toDisplayDate(localDate));
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descripción *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del movimiento"
                  data-testid="input-transaction-description"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={2}
                  data-testid="input-transaction-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                data-testid="button-save-transaction"
              >
                Registrar Movimiento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
