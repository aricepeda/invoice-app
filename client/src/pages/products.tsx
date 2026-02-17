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
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Package, Edit, Trash2, Lock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { MessagePopup, useMessagePopup } from "@/components/ui/message-popup";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Product } from "@shared/schema";
import { NewProductSheet } from "@/components/sheets/new-product-sheet";

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isProductSheetOpen, setIsProductSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<number | null>(null);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json() as Promise<Product[]>;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "No se pudo eliminar el producto.");
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setShowDeleteSuccess(true);
      setShowDeleteConfirm(false);
      setProductToDelete(null);
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "No se pudo eliminar el producto.";
      showError("No se puede eliminar", errorMessage);
      setShowDeleteConfirm(false);
    },
  });

  const handleDeleteProduct = (id: number) => {
    setProductToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteMutation.mutate(productToDelete);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsProductSheetOpen(true);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
            <p className="text-muted-foreground mt-1">Control de productos y servicios.</p>
          </div>
          <div className="flex items-center gap-2">
            <NewProductSheet 
              open={isProductSheetOpen}
              onOpenChange={(open) => {
                setIsProductSheetOpen(open);
                if (!open) setEditingProduct(null);
              }}
              onProductCreated={() => {
                setIsProductSheetOpen(false);
                setEditingProduct(null);
              }}
              productId={editingProduct?.id}
              product={editingProduct || undefined}
              trigger={
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Producto
                </Button>
              }
            />
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border shadow-sm">
          <div className="p-4 border-b border-border flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                className="pl-9 bg-background"
                placeholder="Buscar producto o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[300px]">Producto</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <TableRow key={product.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center text-muted-foreground">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{product.name}</div>
                          <div className="text-xs text-muted-foreground">{product.description || "Sin descripción"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{product.code}</TableCell>
                    <TableCell className="font-medium">
                      RD$ {parseFloat(product.price).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                          title="Editar producto"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                          title="Bloquear/Desbloquear producto"
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-600 hover:bg-red-50"
                          title="Eliminar producto"
                          onClick={() => handleDeleteProduct(product.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No hay productos disponibles
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El producto será eliminado permanentemente del sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Success Dialog */}
        <Dialog open={showDeleteSuccess} onOpenChange={setShowDeleteSuccess}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Producto eliminado</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              El producto ha sido eliminado exitosamente del sistema.
            </p>
            <DialogFooter>
              <Button onClick={() => setShowDeleteSuccess(false)} className="bg-primary hover:bg-primary/90">
                Entendido
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <MessagePopup
          open={message.open}
          onClose={closeMessage}
          title={message.title}
          description={message.description}
          type={message.type}
        />
      </div>
    </Layout>
  );
}
