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
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { NewSellerSheet, SellerFormValues } from "@/components/sheets/new-seller-sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreHorizontal, TrendingUp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Seller } from "@shared/schema";

async function fetchSellers(): Promise<Seller[]> {
  const response = await fetch("/api/sellers");
  if (!response.ok) throw new Error("Failed to fetch sellers");
  return response.json();
}

async function deleteSeller(id: number): Promise<void> {
  const response = await fetch(`/api/sellers/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete seller");
}

export default function Sellers() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  const { data: sellers = [], isLoading } = useQuery({
    queryKey: ["sellers"],
    queryFn: fetchSellers,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSeller,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sellers"] });
    },
  });

  const handleEditClick = (seller: Seller) => {
    setEditingSeller(seller);
    setIsEditSheetOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Está seguro de que desea eliminar este vendedor?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredSellers = sellers.filter(seller => 
    seller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (seller.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (seller.phone?.includes(searchTerm) ?? false)
  );

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vendedores</h1>
            <p className="text-muted-foreground mt-1">Gestiona tu equipo de ventas y comisiones.</p>
          </div>
          <div className="flex items-center gap-2">
            <NewSellerSheet />
            
            {/* Edit Seller Sheet - Controlled */}
            {editingSeller && (
              <NewSellerSheet 
                seller={editingSeller} 
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
                data-testid="input-search-sellers"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[300px]">Vendedor</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Comisión</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    Cargando vendedores...
                  </TableCell>
                </TableRow>
              ) : filteredSellers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No se encontraron vendedores
                  </TableCell>
                </TableRow>
              ) : (
                filteredSellers.map((seller) => (
                  <TableRow key={seller.id} className="group" data-testid={`row-seller-${seller.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border bg-secondary">
                          <AvatarFallback className="text-primary font-medium">
                            {seller.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm text-foreground" data-testid={`text-seller-name-${seller.id}`}>{seller.name}</div>
                          <div className="text-sm text-muted-foreground">{seller.email || "—"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{seller.phone || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        <span className="font-medium text-emerald-600" data-testid={`text-commission-${seller.id}`}>
                          {parseFloat(String(seller.commissionRate)).toFixed(2)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`
                        ${seller.status === 'active' 
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' 
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-100'} 
                        font-normal border-none text-sm`
                      }>
                        {seller.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-seller-menu-${seller.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(seller)} data-testid={`button-edit-seller-${seller.id}`}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem>Ver Estadísticas</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive" 
                            onClick={() => handleDelete(seller.id)}
                            data-testid={`button-delete-seller-${seller.id}`}
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
            <div>Mostrando {filteredSellers.length} de {sellers.length} vendedores</div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
