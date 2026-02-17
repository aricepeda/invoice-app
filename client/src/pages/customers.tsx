import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { NewCustomerSheet, CustomerFormValues } from "@/components/sheets/new-customer-sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreHorizontal, Filter, Download } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Customer } from "@shared/schema";

async function fetchCustomers(): Promise<Customer[]> {
  const response = await fetch("/api/customers");
  if (!response.ok) throw new Error("Failed to fetch customers");
  return response.json();
}

async function deleteCustomer(id: number): Promise<void> {
  const response = await fetch(`/api/customers/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete customer");
}

export default function Customers() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsEditSheetOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Está seguro de que desea eliminar este cliente?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.rnc?.includes(searchTerm) ?? false) ||
    (customer.phone?.includes(searchTerm) ?? false) ||
    (customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground mt-1">Gestiona tu base de datos de clientes y sus balances.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" data-testid="button-export">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <NewCustomerSheet />
            
            {/* Edit Customer Sheet - Controlled */}
            {editingCustomer && (
              <NewCustomerSheet 
                customer={editingCustomer} 
                open={isEditSheetOpen}
                onOpenChange={setIsEditSheetOpen}
                trigger={<span className="hidden"></span>}
              />
            )}
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border shadow-sm">
          <div className="p-4 border-b border-border flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                className="pl-9 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-customers"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[300px]">Cliente</TableHead>
                <TableHead>RNC/Cédula</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    Cargando clientes...
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No se encontraron clientes
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id} className="group" data-testid={`row-customer-${customer.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border bg-secondary">
                          <AvatarFallback className="text-primary font-medium">
                            {customer.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm text-foreground" data-testid={`text-customer-name-${customer.id}`}>{customer.name}</div>
                          <div className="text-sm text-muted-foreground">{customer.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm" data-testid={`text-rnc-${customer.id}`}>{customer.rnc || "—"}</TableCell>
                    <TableCell className="text-sm">{customer.phone}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`
                        ${customer.status === 'active' 
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' 
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-100'} 
                        font-normal border-none text-sm`
                      }>
                        {customer.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-customer-menu-${customer.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Ver Detalles</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditClick(customer)} data-testid={`button-edit-customer-${customer.id}`}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem>Crear Factura</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive" 
                            onClick={() => handleDelete(customer.id)}
                            data-testid={`button-delete-customer-${customer.id}`}
                          >
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <div>Mostrando {filteredCustomers.length} de {customers.length} clientes</div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
