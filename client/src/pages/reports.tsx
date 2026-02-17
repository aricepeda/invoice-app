import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, Download, Calendar } from "lucide-react";

export default function Reports() {
  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes DGII</h1>
          <p className="text-muted-foreground mt-1">Generación de archivos 606, 607 y 608 para declaración de impuestos.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="card-shadow border-none">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 mb-4">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <CardTitle>Formato 606</CardTitle>
              <CardDescription>Compras de Bienes y Servicios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Periodo</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select defaultValue="2024">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="05">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="04">Abril</SelectItem>
                      <SelectItem value="05">Mayo</SelectItem>
                      <SelectItem value="06">Junio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <Download className="w-4 h-4 mr-2" />
                Generar TXT
              </Button>
            </CardContent>
          </Card>

          <Card className="card-shadow border-none">
            <CardHeader>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700 mb-4">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <CardTitle>Formato 607</CardTitle>
              <CardDescription>Ventas de Bienes y Servicios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Periodo</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select defaultValue="2024">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="05">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="04">Abril</SelectItem>
                      <SelectItem value="05">Mayo</SelectItem>
                      <SelectItem value="06">Junio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                <Download className="w-4 h-4 mr-2" />
                Generar TXT
              </Button>
            </CardContent>
          </Card>

          <Card className="card-shadow border-none">
            <CardHeader>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700 mb-4">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <CardTitle>Formato 608</CardTitle>
              <CardDescription>Comprobantes Anulados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Periodo</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select defaultValue="2024">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="05">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="04">Abril</SelectItem>
                      <SelectItem value="05">Mayo</SelectItem>
                      <SelectItem value="06">Junio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full bg-amber-600 hover:bg-amber-700">
                <Download className="w-4 h-4 mr-2" />
                Generar TXT
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
