import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer, Mail, Edit } from "lucide-react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import type { Invoice, Customer, InvoiceItem, Product, Seller, CompanySettings, InvoiceDesignSettings, TaxSettings } from "@shared/schema";

export default function ViewInvoice() {
  const { id } = useParams<{ id: string }>();
  const [paperType, setPaperType] = useState("carta");

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${id}`);
      if (!response.ok) throw new Error("Failed to fetch invoice");
      return response.json() as Promise<Invoice>;
    },
    enabled: !!id,
  });

  const { data: customer } = useQuery({
    queryKey: ["customer", invoice?.customerId],
    queryFn: async () => {
      if (!invoice?.customerId) return null;
      const response = await fetch(`/api/customers/${invoice.customerId}`);
      if (!response.ok) throw new Error("Failed to fetch customer");
      return response.json() as Promise<Customer>;
    },
    enabled: !!invoice?.customerId,
  });

  const { data: invoiceItems = [] } = useQuery({
    queryKey: ["invoiceItems", id],
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${id}/items`);
      if (!response.ok) throw new Error("Failed to fetch invoice items");
      return response.json() as Promise<InvoiceItem[]>;
    },
    enabled: !!id,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  const { data: sellers = [] } = useQuery<Seller[]>({
    queryKey: ["sellers"],
    queryFn: async () => {
      const response = await fetch("/api/sellers");
      if (!response.ok) throw new Error("Failed to fetch sellers");
      return response.json();
    },
  });

  const { data: companySettings } = useQuery<CompanySettings>({
    queryKey: ["companySettings"],
    queryFn: async () => {
      const response = await fetch("/api/company-settings");
      if (!response.ok) throw new Error("Failed to fetch company settings");
      return response.json();
    },
  });

  const { data: designSettings } = useQuery<InvoiceDesignSettings>({
    queryKey: ["invoiceDesignSettings"],
    queryFn: async () => {
      const response = await fetch("/api/invoice-design-settings");
      if (!response.ok) throw new Error("Failed to fetch design settings");
      return response.json();
    },
  });

  const { data: taxSettings } = useQuery<TaxSettings>({
    queryKey: ["taxSettings"],
    queryFn: async () => {
      const response = await fetch("/api/tax-settings");
      if (!response.ok) throw new Error("Failed to fetch tax settings");
      return response.json();
    },
  });

  const { data: ncfSequences = [] } = useQuery({
    queryKey: ["ncfSequences"],
    queryFn: async () => {
      const response = await fetch("/api/ncf-sequences");
      if (!response.ok) throw new Error("Failed to fetch NCF sequences");
      return response.json();
    },
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const getProductName = (productId: number | null) => {
    if (!productId) return 'Producto';
    const product = products.find(p => p.id === productId);
    return product?.name || 'Producto';
  };

  const getSellerName = (sellerId: number | null) => {
    if (!sellerId) return null;
    const seller = sellers.find(s => s.id === sellerId);
    return seller?.name || null;
  };

  const handlePrint = () => {
    const printArea = document.getElementById('invoice-print-area');
    if (!printArea) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Factura ${invoice?.invoiceNumber || ''}</title>
          <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Atkinson Hyperlegible', sans-serif;
              background: #f8f9fa;
              padding: 20px;
            }
            .print-controls {
              position: fixed;
              top: 20px;
              right: 20px;
              z-index: 1000;
              display: flex;
              gap: 10px;
            }
            .print-controls button {
              padding: 10px 20px;
              font-size: 14px;
              cursor: pointer;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
            }
            .btn-print {
              background: #3b82f6;
              color: white;
              border: none;
            }
            .btn-close {
              background: white;
              color: #6b7280;
            }
            .invoice-container {
              max-width: 816px;
              margin: 0 auto;
              background: white;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            @media print {
              .print-controls { display: none !important; }
              body { background: white; padding: 0; }
              .invoice-container { box-shadow: none; }
            }
          </style>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body>
          <div class="print-controls">
            <button class="btn-print" onclick="window.print()">Imprimir</button>
            <button class="btn-close" onclick="window.close()">Cerrar</button>
          </div>
          <div class="invoice-container">
            ${printArea.outerHTML}
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  if (isLoading || !companySettings || !designSettings) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#E5E7EB] border-t-blue-500 mb-4"></div>
          <p className="text-[#6B7280]">Cargando factura...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#6B7280]">Factura no encontrada</p>
          <Link href="/invoices">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Facturas
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const primaryColor = designSettings?.primaryColor || '#111826';
  
  // Get NCF label from sequence (moved here to use for headerText)
  const ncfPrefix = invoice.ncf?.substring(0, 3);
  const selectedNcfSequence = ncfSequences.find((seq: any) => seq.prefix === ncfPrefix);
  const ncfLabel = selectedNcfSequence?.label || null;
  
  // Use NCF label as header if available
  const headerText = (invoice.ncf && ncfLabel) ? ncfLabel : (designSettings?.headerText || 'FACTURA');
  const footerText = designSettings?.footerText || 'Gracias por su preferencia';
  const showNotes = designSettings?.showNotes ?? true;
  const showSignature = designSettings?.showSignature ?? true;
  const showPaymentMethodSetting = designSettings?.showPaymentMethod ?? true;

  const logoSizeMap = {
    small: 'h-8',
    medium: 'h-12',
    large: 'h-16'
  };
  const logoSizeClass = logoSizeMap[designSettings?.logoSize as keyof typeof logoSizeMap] || 'h-12';
  
  const PPI = 96;
  const paperDimensions = paperType === "media_hoja" 
    ? { width: 8.5, height: 5.5, label: "Media Hoja" } 
    : { width: 8.5, height: 11, label: "Carta" };
  const paperWidthPx = paperDimensions.width * PPI;
  const paperHeightPx = paperDimensions.height * PPI;

  const subtotal = parseFloat(String(invoice.subtotal)) || 0;
  const totalTax = parseFloat(String(invoice.itbis)) || 0;
  const discount = parseFloat(String(invoice.discountValue)) || 0;
  const total = parseFloat(String(invoice.total)) || 0;

  const sellerName = getSellerName(invoice.sellerId);

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 print-hide">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="outline" size="sm" className="h-9 rounded-lg bg-white border-[#E5E7EB] text-[#6B7280]">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <Select value={paperType} onValueChange={setPaperType}>
            <SelectTrigger className="w-48 bg-blue-50 border-2 border-blue-300 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="carta">📄 Carta (8.5" x 11")</SelectItem>
              <SelectItem value="media_hoja">📄 Media Hoja (8.5" x 5.5")</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Link href={`/invoices/${id}/edit`}>
            <Button variant="outline" size="sm" className="h-9 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white border-0" data-testid="button-edit-invoice">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="h-9 rounded-lg bg-white border-[#E5E7EB] text-[#6B7280]">
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm" className="h-9 rounded-lg bg-white border-[#E5E7EB] text-[#6B7280]">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
          <Button onClick={handlePrint} variant="outline" size="sm" className="h-9 rounded-lg bg-white border-[#E5E7EB] text-[#6B7280]" data-testid="button-print">
            <Printer className="h-4 w-4 mr-2" />
            Vista Previa
          </Button>
        </div>
      </div>

      {/* Invoice Card with Paper Size - Real Size Preview */}
      <div className="flex justify-center print:block">
        <div 
          id="invoice-print-area"
          className="bg-white shadow-lg border border-[#D1D5DB] overflow-hidden print:shadow-none print:border-none"
          style={{ 
            width: `${paperWidthPx}px`,
            minHeight: `${paperHeightPx}px`,
            fontFamily: paperType === "media_hoja" ? "'Consolas', monospace" : (designSettings?.fontFamily || 'Manrope')
          }}
        >
          {/* Layout condicional según tipo de papel */}
          {paperType === "media_hoja" ? (
            /* Media Hoja Layout - Formato Conduce (optimizado para impresora de matriz) */
            <div className="h-full flex flex-col" style={{ fontSize: '12px', lineHeight: 1.3, fontFamily: "'Courier New', Courier, monospace", padding: '0.1in 0.5in 0.1in 0.1in', color: '#000' }}>
              <div className="flex-1">
                {/* Header - Empresa a la izquierda, documento a la derecha */}
                <div className="flex justify-between items-start mb-0">
                  <div className="max-w-[45%]">
                    <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '8px' }}>
                      {companySettings?.name || 'EMPRESA'}
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '2px' }}>
                      {companySettings?.rnc ? `RNC: ${companySettings.rnc}` : ''} 
                      {companySettings?.phone ? ` | Tel: ${companySettings.phone}` : ''}
                    </div>
                    {companySettings?.address && (
                      <div style={{ fontSize: '12px', marginTop: '2px' }}>{companySettings.address}</div>
                    )}
                  </div>
                  <div className="min-w-[55%] flex flex-col items-end">
                    <div style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'right', letterSpacing: '1px' }}>
                      {headerText}
                    </div>
                    {invoice.ncf && (
                      <div className="flex" style={{ fontSize: '12px', justifyContent: 'flex-end' }}>
                        <span style={{ fontWeight: 'bold', width: '90px', textAlign: 'right', marginRight: '4px' }}>NCF:</span>
                        <span style={{ width: '100px', textAlign: 'left' }}>{invoice.ncf}</span>
                      </div>
                    )}
                    <div className="flex" style={{ fontSize: '12px', justifyContent: 'flex-end' }}>
                      <span style={{ fontWeight: 'bold', width: '90px', textAlign: 'right', marginRight: '4px' }}>Fecha:</span>
                      <span style={{ width: '100px', textAlign: 'left' }}>{formatDate(invoice.date)}</span>
                    </div>
                    <div className="flex" style={{ fontSize: '12px', justifyContent: 'flex-end' }}>
                      <span style={{ fontWeight: 'bold', width: '90px', textAlign: 'right', marginRight: '4px' }}>Factura No:</span>
                      <span style={{ width: '100px', textAlign: 'left' }}>{invoice.invoiceNumber}</span>
                    </div>
                    <div className="flex" style={{ fontSize: '12px', justifyContent: 'flex-end' }}>
                      <span style={{ fontWeight: 'bold', width: '90px', textAlign: 'right', marginRight: '4px' }}>Condiciones:</span>
                      <span style={{ width: '100px', textAlign: 'left' }}>{invoice.paymentTermsDays > 0 ? `${invoice.paymentTermsDays} días` : 'Contado'}</span>
                    </div>
                    {sellerName && (
                      <div className="flex" style={{ fontSize: '12px', justifyContent: 'flex-end' }}>
                        <span style={{ fontWeight: 'bold', width: '90px', textAlign: 'right', marginRight: '4px' }}>Vendedor:</span>
                        <span style={{ width: '100px', textAlign: 'left' }}>{sellerName.length > 12 ? sellerName.split(' ')[0] : sellerName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cliente */}
                <div className="mb-1" style={{ marginTop: '4px' }}>
                  {customer ? (
                    <>
                      <div className="flex mb-0" style={{ fontSize: '12px' }}>
                        <span style={{ fontWeight: 'bold', width: '70px', textAlign: 'right', marginRight: '6px' }}>Cliente:</span>
                        <span>{customer.name}</span>
                        {customer.rnc && <span style={{ marginLeft: '10px' }}>RNC: {customer.rnc}</span>}
                        {customer.phone && <span style={{ marginLeft: '10px' }}>Tel: {customer.phone}</span>}
                      </div>
                      {customer.address && (
                        <div className="flex mb-0" style={{ fontSize: '12px' }}>
                          <span style={{ fontWeight: 'bold', width: '70px', textAlign: 'right', marginRight: '6px', flexShrink: 0 }}>Dirección:</span>
                          <span style={{ maxWidth: '396px', wordWrap: 'break-word' }}>{customer.address}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex mb-0" style={{ fontSize: '12px' }}>
                      <span style={{ fontWeight: 'bold', width: '70px', textAlign: 'right', marginRight: '6px' }}>Cliente:</span>
                      <span>-</span>
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <table className="w-full" style={{ borderCollapse: 'collapse', margin: '8px 0' }}>
                  <thead>
                    <tr>
                      <th style={{ borderTop: '2px dotted #000', borderBottom: '2px dotted #000', padding: '4px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', width: '60px' }}>CANT.</th>
                      <th style={{ borderTop: '2px dotted #000', borderBottom: '2px dotted #000', padding: '4px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold' }}>DESCRIPCION</th>
                      <th style={{ borderTop: '2px dotted #000', borderBottom: '2px dotted #000', padding: '4px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold', width: '100px' }}>PRECIO</th>
                      <th style={{ borderTop: '2px dotted #000', borderBottom: '2px dotted #000', padding: '4px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold', width: '100px' }}>MONTO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceItems.map((item, index) => {
                      const price = parseFloat(String(item.unitPrice)) || 0;
                      const quantity = item.quantity || 0;
                      const itemTotal = parseFloat(String(item.total)) || (quantity * price);
                      return (
                        <tr key={index}>
                          <td style={{ padding: '3px 4px', fontSize: '12px', textAlign: 'center', fontWeight: 'bold' }}>{quantity}</td>
                          <td style={{ padding: '3px 4px', fontSize: '12px' }}>
                            {getProductName(item.productId)}
                            {item.description && <span style={{ fontStyle: 'italic' }}> - {item.description}</span>}
                          </td>
                          <td style={{ padding: '3px 4px', fontSize: '12px', textAlign: 'right' }}>{price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                          <td style={{ padding: '3px 4px', fontSize: '12px', textAlign: 'right' }}>{itemTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2}></td>
                      <td style={{ borderTop: '2px dotted #000', padding: '4px', fontSize: '12px', fontWeight: 'bold', textAlign: 'right' }}>Subtotal:</td>
                      <td style={{ borderTop: '2px dotted #000', padding: '4px', fontSize: '12px', fontWeight: 'bold', textAlign: 'right' }}>{subtotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                    </tr>
                    <tr>
                      <td colSpan={2}></td>
                      <td style={{ padding: '4px', fontSize: '12px', fontWeight: 'bold', textAlign: 'right' }}>ITBIS:</td>
                      <td style={{ padding: '4px', fontSize: '12px', fontWeight: 'bold', textAlign: 'right' }}>{totalTax.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                    </tr>
                    {discount > 0 && (
                      <tr>
                        <td colSpan={2}></td>
                        <td style={{ padding: '4px', fontSize: '12px', fontWeight: 'bold', textAlign: 'right' }}>Descuento:</td>
                        <td style={{ padding: '4px', fontSize: '12px', fontWeight: 'bold', textAlign: 'right' }}>-{discount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan={2}></td>
                      <td style={{ borderTop: '2px solid #000', padding: '4px', fontSize: '14px', fontWeight: 'bold', textAlign: 'right' }}>TOTAL:</td>
                      <td style={{ borderTop: '2px solid #000', padding: '4px', fontSize: '14px', fontWeight: 'bold', textAlign: 'right' }}>{total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Notas */}
                {showNotes && invoice.notes && (
                  <div style={{ fontSize: '12px', marginTop: '8px' }}>
                    <span style={{ fontWeight: 'bold' }}>Notas: </span>
                    <span style={{ fontStyle: 'italic' }}>{invoice.notes}</span>
                  </div>
                )}
              </div>

              {/* Signatures - al final */}
              {showSignature && (
                <div className="flex justify-between" style={{ paddingTop: '10px' }}>
                  <div className="text-center" style={{ width: '45%' }}>
                    <div style={{ borderTop: '2px solid #000', marginTop: '25px', paddingTop: '4px', fontSize: '12px', fontWeight: 'bold' }}>Entregado por</div>
                  </div>
                  <div className="text-center" style={{ width: '45%' }}>
                    <div style={{ borderTop: '2px solid #000', marginTop: '25px', paddingTop: '4px', fontSize: '12px', fontWeight: 'bold' }}>Recibido por</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Carta (Letter) Layout - Original */
            <div className="overflow-hidden p-8 flex flex-col" style={{ fontSize: '12px', fontFamily: "'Atkinson Hyperlegible', sans-serif", minHeight: `${paperHeightPx}px`, height: `${paperHeightPx}px` }}>
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div className="text-left">
                  {companySettings?.logoUrl ? (
                    <img 
                      src={companySettings.logoUrl} 
                      alt="Company Logo"
                      className={`${logoSizeClass} mb-3 object-contain`}
                    />
                  ) : (
                    <div className="text-xl font-bold mb-3" style={{ color: primaryColor }}>Clorio</div>
                  )}
                  <div className="space-y-0.5">
                    <p className="text-base font-bold" style={{ color: primaryColor }}>{companySettings?.name || "Tu Empresa S.R.L."}</p>
                    <p className="text-sm text-[#6B7280]">RNC: {companySettings?.rnc || "---"}</p>
                    <p className="text-sm text-[#6B7280]">{companySettings?.address || "Calle Principal #123"}</p>
                    <p className="text-sm text-[#6B7280]">{companySettings?.phone || "(809) 555-0000"}</p>
                  </div>
                </div>
                <div>
                  <h1 className="font-bold mb-1 text-right" style={{ color: primaryColor, fontSize: '18px', fontFamily: "'Atkinson Hyperlegible', monospace" }}>{headerText}</h1>
                  {invoice.ncf && (
                    <div className="mb-2">
                      <p className="font-mono text-sm font-medium text-[#111826] text-right" style={{ fontFamily: "'Atkinson Hyperlegible', monospace" }}>NCF: {invoice.ncf}</p>
                    </div>
                  )}
                  <p className="text-sm font-medium text-right" style={{ color: primaryColor, fontFamily: "'Atkinson Hyperlegible', monospace" }}>Factura Numero : {invoice.invoiceNumber}</p>
                  <p className="text-sm font-medium text-right" style={{ color: primaryColor, fontFamily: "'Atkinson Hyperlegible', monospace" }}>Fecha: {formatDate(invoice.date)}</p>
                  {invoice.paymentTermsDays > 0 && (
                    <p className="text-sm font-medium text-right" style={{ color: primaryColor, fontFamily: "'Atkinson Hyperlegible', monospace" }}>Condiciones: {invoice.paymentTermsDays} días</p>
                  )}
                  {sellerName && (
                    <p className="text-sm font-medium text-right" style={{ color: primaryColor, fontFamily: "'Atkinson Hyperlegible', monospace" }}>Vendedor: {sellerName}</p>
                  )}
                </div>
              </div>

              {/* Cliente */}
              <div className="mb-6 pb-4 border-b border-[#E5E7EB]">
                <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Facturar A</h3>
                {customer ? (
                  <>
                    <p className="font-medium text-[#111826]" style={{ fontSize: '22px' }}>{customer.name}</p>
                    {customer.rnc && <p className="text-[#6B7280]" style={{ fontSize: '14px' }}>Cédula/RNC: {customer.rnc}</p>}
                    {customer.phone && <p className="text-[#6B7280]" style={{ fontSize: '14px' }}>Tel: {customer.phone}</p>}
                    {customer.address && <p className="text-[#6B7280]" style={{ fontSize: '14px' }}>{customer.address}</p>}
                    {customer.email && <p className="text-[#6B7280]" style={{ fontSize: '14px' }}>{customer.email}</p>}
                  </>
                ) : (
                  <p className="text-sm text-[#9CA3AF] italic">Cliente no encontrado</p>
                )}
              </div>

              {/* Items Table - flex-1 para ocupar espacio disponible */}
              <div className="flex-1 overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E5E7EB]">
                      <th className="text-center py-1 text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider w-12">Cant</th>
                      <th className="text-left py-1 text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Descripción</th>
                      <th className="text-center py-1 text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider w-28">Precio</th>
                      <th className="text-center py-1 text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider w-28">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceItems.map((item, index) => {
                      const price = parseFloat(String(item.unitPrice)) || 0;
                      const quantity = item.quantity || 0;
                      const itemTotal = parseFloat(String(item.total)) || (quantity * price);
                      
                      return (
                        <tr key={index} className="border-b border-[#F3F4F6]">
                          <td className="py-3 text-[#111826] text-center" style={{ fontSize: '14px' }}>{quantity}</td>
                          <td className="py-3 text-[#111826]">
                            <div>
                              <span style={{ fontSize: '14px', fontWeight: 500 }}>{getProductName(item.productId)}</span>
                              {item.description && (
                                <p className="text-[#6B7280] italic mt-0.5" style={{ fontSize: '12px' }}>{item.description}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-[#111826] text-right" style={{ fontSize: '14px' }}>RD$ {price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                          <td className="py-3 font-medium text-[#111826] text-right" style={{ fontSize: '14px' }}>RD$ {itemTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer fijo: Totales, Notas, Firmas */}
              <div className="mt-auto">
              {/* Totals */}
              <div className="flex justify-end mb-6">
                <div className="w-56 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">Subtotal</span>
                    <span className="text-[#111826]">RD$ {subtotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">ITBIS</span>
                    <span className="text-[#111826]">RD$ {totalTax.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6B7280]">Descuento</span>
                      <span className="text-red-500">-RD$ {discount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-[#E5E7EB]">
                    <span className="text-[#111826]">Total</span>
                    <span className="text-[#111826]">RD$ {total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {showNotes && invoice.notes && (
                <div className="mb-4 p-3 rounded-lg border" style={{ 
                  backgroundColor: `${primaryColor}08`,
                  borderColor: `${primaryColor}20`
                }}>
                  <p className="text-xs font-semibold uppercase mb-1" style={{ color: primaryColor }}>Notas</p>
                  <p className="text-xs text-[#6B7280] italic whitespace-pre-wrap break-words">{invoice.notes}</p>
                </div>
              )}

              {/* Signature Area */}
              {showSignature && (
                <div className="flex justify-center gap-16 pt-4 border-t border-[#E5E7EB]">
                  <div className="text-center">
                    <div className="w-48 h-12 border-b border-[#E5E7EB] mb-1"></div>
                    <p className="text-xs text-[#6B7280] font-semibold">RECIBIDO POR</p>
                  </div>
                  <div className="text-center">
                    <div className="w-48 h-12 border-b border-[#E5E7EB] mb-1"></div>
                    <p className="text-xs text-[#6B7280] font-semibold">DESPACHADO POR</p>
                  </div>
                </div>
              )}

              {/* Footer */}
              {footerText && (
                <div className="text-center mt-4 pt-3 border-t border-[#E5E7EB]">
                  <p className="text-xs" style={{ color: primaryColor }}>{footerText}</p>
                </div>
              )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
