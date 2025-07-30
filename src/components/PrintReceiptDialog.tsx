"use client"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Transaction } from "@/types/transaction"
import { format } from "date-fns"
import { id } from "date-fns/locale/id"
import { Printer, X } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { useCompanySettings, CompanyInfo } from "@/hooks/useCompanySettings"

interface PrintReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction | null
  template: 'receipt' | 'invoice'
}

const ReceiptTemplate = ({ transaction, companyInfo }: { transaction: Transaction, companyInfo?: CompanyInfo | null }) => {
  const orderDate = transaction.orderDate ? new Date(transaction.orderDate) : null;
  return (
    <div className="font-mono">
      <header className="text-center mb-2">
        {companyInfo?.logo && <img src={companyInfo.logo} alt="Logo" className="mx-auto max-h-12 mb-1" />}
        <h1 className="text-sm font-bold">{companyInfo?.name || 'Nota Transaksi'}</h1>
        <p className="text-xs">{companyInfo?.address}</p>
        <p className="text-xs">{companyInfo?.phone}</p>
      </header>
      <div className="text-xs space-y-0.5 my-2 border-y border-dashed border-black py-1">
        <div className="flex justify-between"><span>No:</span> <strong>{transaction.id}</strong></div>
        <div className="flex justify-between"><span>Tgl:</span> <span>{orderDate ? format(orderDate, "dd/MM/yy HH:mm", { locale: id }) : 'N/A'}</span></div>
        <div className="flex justify-between"><span>Plgn:</span> <span>{transaction.customerName}</span></div>
        <div className="flex justify-between"><span>Kasir:</span> <span>{transaction.cashierName}</span></div>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-dashed border-black">
            <th className="text-left font-normal pb-1">Item</th>
            <th className="text-right font-normal pb-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {transaction.items.map((item, index) => (
            <tr key={index}>
              <td className="pt-1 align-top">
                {item.product.name}<br />
                {`${item.quantity}x @${new Intl.NumberFormat("id-ID").format(item.price)}`}
              </td>
              <td className="pt-1 text-right align-top">{new Intl.NumberFormat("id-ID").format(item.price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 pt-1 border-t border-dashed border-black text-xs space-y-1">
        <div className="flex justify-between font-semibold">
          <span>Total:</span>
          <span>{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(transaction.total)}</span>
        </div>
      </div>
      <div className="text-center mt-3 text-xs">
        Terima kasih!
      </div>
    </div>
  )
};

const InvoiceTemplate = ({ transaction, companyInfo }: { transaction: Transaction, companyInfo?: CompanyInfo | null }) => {
  const orderDate = transaction.orderDate ? new Date(transaction.orderDate) : null;
  return (
    <div className="p-8 bg-white text-black">
      <header className="flex justify-between items-start mb-8 pb-4 border-b-2 border-gray-200">
        <div>
          {companyInfo?.logo && <img src={companyInfo.logo} alt="Logo" className="max-h-20 mb-4" />}
          <h1 className="text-2xl font-bold text-gray-800">{companyInfo?.name}</h1>
          <p className="text-sm text-gray-500">{companyInfo?.address}</p>
          <p className="text-sm text-gray-500">{companyInfo?.phone}</p>
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-bold uppercase text-gray-300">INVOICE</h2>
          <p className="text-sm text-gray-600"><strong className="text-gray-800">No:</strong> {transaction.id}</p>
          <p className="text-sm text-gray-600"><strong className="text-gray-800">Tanggal:</strong> {orderDate ? format(orderDate, "d MMMM yyyy", { locale: id }) : 'N/A'}</p>
        </div>
      </header>
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-500 mb-1">DITAGIHKAN KEPADA:</h3>
        <p className="text-lg font-bold text-gray-800">{transaction.customerName}</p>
      </div>
      <Table>
        <TableHeader><TableRow className="bg-gray-100 hover:bg-gray-100"><TableHead className="text-gray-600 font-bold">Deskripsi</TableHead><TableHead className="text-gray-600 font-bold text-center">Jumlah</TableHead><TableHead className="text-gray-600 font-bold text-right">Harga Satuan</TableHead><TableHead className="text-gray-600 font-bold text-right">Total</TableHead></TableRow></TableHeader>
        <TableBody>
          {transaction.items.map((item, index) => (
            <TableRow key={index} className="border-b-gray-200">
              <TableCell className="font-medium text-gray-800">{item.product.name}</TableCell>
              <TableCell className="text-center text-gray-600">{item.quantity}</TableCell>
              <TableCell className="text-right text-gray-600">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(item.price)}</TableCell>
              <TableCell className="text-right font-medium text-gray-800">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(item.price * item.quantity)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end mt-8">
        <div className="w-full max-w-xs text-gray-700 space-y-2">
          <div className="flex justify-between"><span>Subtotal:</span><span>{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(transaction.total)}</span></div>
          <div className="flex justify-between font-bold text-lg border-t-2 border-gray-200 pt-2 text-gray-900"><span>TOTAL:</span><span>{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(transaction.total)}</span></div>
        </div>
      </div>
      <footer className="text-center text-xs text-gray-400 mt-16 pt-4 border-t border-gray-200"><p>Terima kasih atas kepercayaan Anda.</p></footer>
    </div>
  )
}

export function PrintReceiptDialog({ open, onOpenChange, transaction, template }: PrintReceiptDialogProps) {
  const { settings: companyInfo } = useCompanySettings();

  const generateInvoicePdf = () => {
    if (!transaction) return;
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;

    if (companyInfo?.logo) {
      try { doc.addImage(companyInfo.logo, 'PNG', margin, 12, 30, 12); } catch (e) { console.error(e); }
    }
    doc.setFontSize(16).setFont("helvetica", "bold").text(companyInfo?.name || '', margin, 30);
    doc.setFontSize(9).setFont("helvetica", "normal").text(companyInfo?.address || '', margin, 35).text(companyInfo?.phone || '', margin, 40);
    doc.setDrawColor(200).line(margin, 45, pageWidth - margin, 45);
    doc.setFontSize(20).setFont("helvetica", "bold").setTextColor(150).text("INVOICE", pageWidth - margin, 25, { align: 'right' });
    const orderDate = transaction.orderDate ? new Date(transaction.orderDate) : new Date();
    doc.setFontSize(10).setTextColor(0).text(`No: ${transaction.id}`, pageWidth - margin, 32, { align: 'right' }).text(`Tanggal: ${format(orderDate, "d MMMM yyyy", { locale: id })}`, pageWidth - margin, 37, { align: 'right' });
    let y = 60;
    doc.setFontSize(9).setTextColor(100).text("DITAGIHKAN KEPADA:", margin, y);
    doc.setFontSize(11).setFont("helvetica", "bold").setTextColor(0).text(transaction.customerName, margin, y + 5);
    y += 15;
    const tableData = transaction.items.map(item => [item.product.name, item.quantity, new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(item.price), new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(item.price * item.quantity)]);
    autoTable(doc, {
      startY: y,
      head: [['Deskripsi', 'Jumlah', 'Harga Satuan', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [50, 50, 50], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 80 }, 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      didDrawPage: (data) => { doc.setFontSize(8).setTextColor(150).text(`Halaman ${data.pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' }); }
    });
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(12).setFont("helvetica", "bold").text("TOTAL:", 140, finalY + 17).text(new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(transaction.total), pageWidth - margin, finalY + 17, { align: 'right' });
    
    const filename = `MDIInvoice-${transaction.id}-${format(new Date(), 'yyyyMMdd-HHmmss')}.pdf`;
    doc.save(filename);
  };

  const handlePrint = () => {
    if (template === 'invoice') {
      generateInvoicePdf();
    } else {
      const printWindow = window.open('', '_blank');
      const printableArea = document.getElementById('printable-area')?.innerHTML;
      printWindow?.document.write(`<html><head><title>Cetak Nota</title><style>body{font-family:monospace;font-size:10pt;margin:0;padding:3mm;width:78mm;} table{width:100%;border-collapse:collapse;} td,th{padding:1px;} .text-center{text-align:center;} .text-right{text-align:right;} .font-bold{font-weight:bold;} .border-y{border-top:1px dashed;border-bottom:1px dashed;} .border-b{border-bottom:1px dashed;} .py-1{padding-top:4px;padding-bottom:4px;} .mb-1{margin-bottom:4px;} .mb-2{margin-bottom:8px;} .mt-2{margin-top:8px;} .mt-3{margin-top:12px;} .mx-auto{margin-left:auto;margin-right:auto;} .max-h-12{max-height:48px;} .flex{display:flex;} .justify-between{justify-content:space-between;}</style></head><body>${printableArea}</body></html>`);
      printWindow?.document.close();
      printWindow?.focus();
      printWindow?.print();
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <div id="printable-area" className={template === 'receipt' ? 'p-1 bg-white text-black' : ''}>
          {template === 'receipt' ? (<div style={{ width: '80mm' }}><ReceiptTemplate transaction={transaction} companyInfo={companyInfo} /></div>) : (<InvoiceTemplate transaction={transaction} companyInfo={companyInfo} />)}
        </div>
        <DialogFooter className="p-4 border-t bg-muted/40 no-print">
          <Button variant="outline" onClick={() => onOpenChange(false)}><X className="mr-2 h-4 w-4" /> Tutup</Button>
          <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> {template === 'invoice' ? 'Simpan PDF' : 'Cetak Nota'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}