import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
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
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreHorizontal, FolderTree, Tag, ChevronRight, Trash2, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessagePopup, useMessagePopup } from "@/components/ui/message-popup";
import type { ExpenseCategory, ExpenseSubcategory } from "@shared/schema";

const initialCategoryForm = {
  code: "",
  name: "",
  description: "",
  status: "active",
};

const initialSubcategoryForm = {
  categoryId: 0,
  name: "",
  description: "",
  status: "active",
};

export default function ExpenseCategories() {
  const queryClient = useQueryClient();
  const { message, showSuccess, showError, closeMessage } = useMessagePopup();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Category dialog state
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm);
  
  // Subcategory dialog state
  const [isSubcategoryDialogOpen, setIsSubcategoryDialogOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<ExpenseSubcategory | null>(null);
  const [subcategoryForm, setSubcategoryForm] = useState(initialSubcategoryForm);
  const [selectedCategoryForSub, setSelectedCategoryForSub] = useState<ExpenseCategory | null>(null);

  // Fetch categories
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const response = await fetch("/api/expense-categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json() as Promise<ExpenseCategory[]>;
    },
  });

  // Fetch subcategories
  const { data: subcategories = [], isLoading: loadingSubcategories } = useQuery({
    queryKey: ["expense-subcategories"],
    queryFn: async () => {
      const response = await fetch("/api/expense-subcategories");
      if (!response.ok) throw new Error("Failed to fetch subcategories");
      return response.json() as Promise<ExpenseSubcategory[]>;
    },
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: typeof categoryForm) => {
      const response = await fetch("/api/expense-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create category");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      setIsCategoryDialogOpen(false);
      resetCategoryForm();
      showSuccess("Categoría creada", "La categoría ha sido creada exitosamente.");
    },
    onError: () => {
      showError("Error", "No se pudo crear la categoría.");
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (data: typeof categoryForm & { id: number }) => {
      const response = await fetch(`/api/expense-categories/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update category");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      setIsCategoryDialogOpen(false);
      resetCategoryForm();
      showSuccess("Categoría actualizada", "La categoría ha sido actualizada exitosamente.");
    },
    onError: () => {
      showError("Error", "No se pudo actualizar la categoría.");
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/expense-categories/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error al eliminar categoría" }));
        throw new Error(errorData.error || "Failed to delete category");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      showSuccess("Categoría eliminada", "La categoría ha sido eliminada.");
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  // Subcategory mutations
  const createSubcategoryMutation = useMutation({
    mutationFn: async (data: typeof subcategoryForm) => {
      const response = await fetch("/api/expense-subcategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create subcategory");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-subcategories"] });
      setIsSubcategoryDialogOpen(false);
      resetSubcategoryForm();
      showSuccess("Subcategoría creada", "La subcategoría ha sido creada exitosamente.");
    },
    onError: () => {
      showError("Error", "No se pudo crear la subcategoría.");
    },
  });

  const updateSubcategoryMutation = useMutation({
    mutationFn: async (data: typeof subcategoryForm & { id: number }) => {
      const response = await fetch(`/api/expense-subcategories/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update subcategory");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-subcategories"] });
      setIsSubcategoryDialogOpen(false);
      resetSubcategoryForm();
      showSuccess("Subcategoría actualizada", "La subcategoría ha sido actualizada exitosamente.");
    },
    onError: () => {
      showError("Error", "No se pudo actualizar la subcategoría.");
    },
  });

  const deleteSubcategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/expense-subcategories/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error al eliminar subcategoría" }));
        throw new Error(errorData.error || "Failed to delete subcategory");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-subcategories"] });
      showSuccess("Subcategoría eliminada", "La subcategoría ha sido eliminada.");
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const resetCategoryForm = () => {
    setCategoryForm(initialCategoryForm);
    setEditingCategory(null);
  };

  const resetSubcategoryForm = () => {
    setSubcategoryForm(initialSubcategoryForm);
    setEditingSubcategory(null);
    setSelectedCategoryForSub(null);
  };

  const handleEditCategory = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      code: category.code,
      name: category.name,
      description: category.description || "",
      status: category.status,
    });
    setIsCategoryDialogOpen(true);
  };

  const handleDeleteCategory = (id: number) => {
    deleteCategoryMutation.mutate(id);
  };

  const handleAddSubcategory = (category: ExpenseCategory) => {
    setSelectedCategoryForSub(category);
    setSubcategoryForm({
      ...initialSubcategoryForm,
      categoryId: category.id,
    });
    setIsSubcategoryDialogOpen(true);
  };

  const handleEditSubcategory = (subcategory: ExpenseSubcategory) => {
    setEditingSubcategory(subcategory);
    const category = categories.find(c => c.id === subcategory.categoryId);
    setSelectedCategoryForSub(category || null);
    setSubcategoryForm({
      categoryId: subcategory.categoryId,
      name: subcategory.name,
      description: subcategory.description || "",
      status: subcategory.status,
    });
    setIsSubcategoryDialogOpen(true);
  };

  const handleDeleteSubcategory = (id: number) => {
    deleteSubcategoryMutation.mutate(id);
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.code.trim()) {
      showError("Error", "El código es requerido.");
      return;
    }
    if (!categoryForm.name.trim()) {
      showError("Error", "El nombre es requerido.");
      return;
    }
    if (editingCategory) {
      updateCategoryMutation.mutate({ ...categoryForm, id: editingCategory.id });
    } else {
      createCategoryMutation.mutate(categoryForm);
    }
  };

  const handleSubcategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subcategoryForm.name.trim()) {
      showError("Error", "El nombre es requerido.");
      return;
    }
    if (!subcategoryForm.categoryId) {
      showError("Error", "Debe seleccionar una categoría.");
      return;
    }
    if (editingSubcategory) {
      updateSubcategoryMutation.mutate({ ...subcategoryForm, id: editingSubcategory.id });
    } else {
      createSubcategoryMutation.mutate(subcategoryForm);
    }
  };

  // Group subcategories by category
  const getSubcategoriesByCategory = (categoryId: number) => {
    return subcategories.filter(sub => sub.categoryId === categoryId);
  };

  // Filter categories by search term
  const filteredCategories = categories.filter(category => 
    category.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const isLoading = loadingCategories || loadingSubcategories;

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Categorías de Gasto</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gestiona las categorías y subcategorías para clasificar tus compras
            </p>
          </div>
          <Button 
            onClick={() => {
              resetCategoryForm();
              setIsCategoryDialogOpen(true);
            }}
            data-testid="button-add-category"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Categoría
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar categorías..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-categories"
            />
          </div>
        </div>

        {/* Categories List */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <FolderTree className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Sin categorías</h3>
              <p className="mt-1 text-sm text-gray-500">
                Comienza creando una categoría de gasto.
              </p>
              <div className="mt-6">
                <Button onClick={() => {
                  resetCategoryForm();
                  setIsCategoryDialogOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Categoría
                </Button>
              </div>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {filteredCategories.map((category) => {
                const subs = getSubcategoriesByCategory(category.id);
                return (
                  <AccordionItem 
                    key={category.id} 
                    value={String(category.id)}
                    className="border rounded-lg bg-white shadow-sm"
                    data-testid={`category-item-${category.id}`}
                  >
                    <div className="flex items-center px-4">
                      <AccordionTrigger className="flex-1 hover:no-underline py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                            <FolderTree className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-gray-900">{category.name}</div>
                            {category.description && (
                              <div className="text-sm text-gray-500">{category.description}</div>
                            )}
                          </div>
                          <Badge variant={category.status === "active" ? "default" : "secondary"} className="ml-2">
                            {subs.length} subcategoría{subs.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddSubcategory(category);
                          }}
                          data-testid={`button-add-subcategory-${category.id}`}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Subcategoría
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" data-testid={`button-menu-category-${category.id}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEditCategory(category)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteCategory(category.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <AccordionContent className="px-4 pb-4">
                      {subs.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 rounded-lg">
                          <Tag className="mx-auto h-8 w-8 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-500">
                            Sin subcategorías. Agrega una para más detalle.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {subs.map((sub) => (
                            <div 
                              key={sub.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                              data-testid={`subcategory-item-${sub.id}`}
                            >
                              <div className="flex items-center gap-3">
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                                <div>
                                  <div className="font-medium text-gray-800">{sub.name}</div>
                                  {sub.description && (
                                    <div className="text-sm text-gray-500">{sub.description}</div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditSubcategory(sub)}
                                  data-testid={`button-edit-subcategory-${sub.id}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteSubcategory(sub.id)}
                                  className="text-red-600 hover:text-red-700"
                                  data-testid={`button-delete-subcategory-${sub.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      </div>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => {
        setIsCategoryDialogOpen(open);
        if (!open) resetCategoryForm();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory 
                ? "Modifica los datos de la categoría de gasto."
                : "Crea una nueva categoría para clasificar tus compras."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="category-code">Código *</Label>
                <Input
                  id="category-code"
                  value={categoryForm.code}
                  onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })}
                  placeholder="Ej: COMB, ELEC, MP"
                  data-testid="input-category-code"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category-name">Nombre *</Label>
                <Input
                  id="category-name"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="Ej: Combustible, Electricidad, Materia Prima"
                  data-testid="input-category-name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category-description">Descripción</Label>
                <Textarea
                  id="category-description"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Descripción opcional de la categoría"
                  data-testid="input-category-description"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category-status">Estado</Label>
                <Select
                  value={categoryForm.status}
                  onValueChange={(value) => setCategoryForm({ ...categoryForm, status: value })}
                >
                  <SelectTrigger data-testid="select-category-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                data-testid="button-save-category"
              >
                {editingCategory ? "Guardar Cambios" : "Crear Categoría"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Subcategory Dialog */}
      <Dialog open={isSubcategoryDialogOpen} onOpenChange={(open) => {
        setIsSubcategoryDialogOpen(open);
        if (!open) resetSubcategoryForm();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSubcategory ? "Editar Subcategoría" : "Nueva Subcategoría"}
            </DialogTitle>
            <DialogDescription>
              {selectedCategoryForSub && (
                <span>Categoría: <strong>{selectedCategoryForSub.name}</strong></span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubcategorySubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="subcategory-name">Nombre *</Label>
                <Input
                  id="subcategory-name"
                  value={subcategoryForm.name}
                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
                  placeholder="Ej: Gasoil para Camión, Luz Tienda"
                  data-testid="input-subcategory-name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subcategory-description">Descripción</Label>
                <Textarea
                  id="subcategory-description"
                  value={subcategoryForm.description}
                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, description: e.target.value })}
                  placeholder="Descripción opcional"
                  data-testid="input-subcategory-description"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subcategory-status">Estado</Label>
                <Select
                  value={subcategoryForm.status}
                  onValueChange={(value) => setSubcategoryForm({ ...subcategoryForm, status: value })}
                >
                  <SelectTrigger data-testid="select-subcategory-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsSubcategoryDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createSubcategoryMutation.isPending || updateSubcategoryMutation.isPending}
                data-testid="button-save-subcategory"
              >
                {editingSubcategory ? "Guardar Cambios" : "Crear Subcategoría"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <MessagePopup
        open={message.open}
        onClose={closeMessage}
        title={message.title}
        description={message.description}
        type={message.type}
      />
    </Layout>
  );
}
