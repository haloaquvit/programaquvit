"use client"
import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { MoreHorizontal, PlusCircle, FileDown, Trash2 } from "lucide-react"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { useNavigate } from "react-router-dom"

import { Badge, badgeVariants } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Link } from "react-router-dom"
import { Transaction, TransactionStatus } from "@/types/transaction"
import { format } from "date-fns"
import { id } from "date-fns/locale/id"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { useToast } from "./ui/use-toast"
import { cn } from "@/lib/utils"
import { useTransactions } from "@/hooks/useTransactions"
import { Skeleton } from "./ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import { UserRole } from "@/types/user"

const statusOptions: TransactionStatus[] = ['Pesanan Masuk', 'Proses Design', 'ACC Costumer', 'Proses Produksi', 'Pesanan Selesai', 'Dibatalkan'];

const getStatusVariant = (status: TransactionStatus) => {
  switch (status) {
    case 'Pesanan Masuk': return 'secondary';
    case 'Proses Design': return 'default';
    case 'ACC Costumer': return 'info';
    case 'Proses Produksi': return 'warning';
    case 'Pesanan Selesai': return 'success';
    case 'Dibatalkan': return 'destructive';
    default: return 'outline';
  }
}

const getAvailableStatusOptions = (currentStatus: TransactionStatus, userRole: UserRole): TransactionStatus[] => {
  const powerRoles: UserRole[] = ['admin', 'owner', 'supervisor', 'ceo', 'me', 'designer', 'cashier'];

  if (powerRoles.includes(userRole)) {
    return statusOptions;
  }

  switch (currentStatus) {
    case 'Proses Produksi':
      if (userRole === 'operator') return ['Proses Produksi', 'Pesanan Selesai'];
      return [currentStatus];
    default:
      return [currentStatus];
  }
};

export function TransactionTable() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { transactions, isLoading, updateTransactionStatus, deductMaterials, deleteTransaction } = useTransactions();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null);

  const handleStatusChange = (transactionId: string, newStatus: TransactionStatus) => {
    updateTransactionStatus.mutate({ transactionId, status: newStatus }, {
      onSuccess: () => {
        toast({
          title: "Status Diperbarui",
          description: `Status untuk pesanan ${transactionId} diubah menjadi "${newStatus}".`,
        });
        if (newStatus === 'Proses Produksi') {
          deductMaterials.mutate(transactionId, {
            onSuccess: () => {
              toast({
                title: "Stok Berkurang",
                description: "Stok bahan baku telah dikurangi sesuai BOM.",
              });
            },
            onError: (error) => {
              toast({ variant: "destructive", title: "Gagal Kurangi Stok", description: error.message });
            }
          });
        }
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Gagal", description: error.message });
      }
    });
  };

  const handleDeleteClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedTransaction) {
      deleteTransaction.mutate(selectedTransaction.id, {
        onSuccess: () => {
          toast({ title: "Transaksi Dihapus", description: `Transaksi ${selectedTransaction.id} berhasil dihapus.` });
          setIsDeleteDialogOpen(false);
        },
        onError: (error) => {
          toast({ variant: "destructive", title: "Gagal Hapus", description: error.message });
        }
      });
    }
  };

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: "id",
      header: "No. Order",
      cell: ({ row }) => <Badge variant="outline">{row.getValue("id")}</Badge>,
    },
    {
      accessorKey: "customerName",
      header: "Pelanggan",
    },
    {
      accessorKey: "orderDate",
      header: "Tgl Order",
      cell: ({ row }) => {
        const dateValue = row.getValue("orderDate");
        if (!dateValue) return "N/A";
        const date = new Date(dateValue as string | number | Date);
        return format(date, "d MMM yyyy, HH:mm", { locale: id });
      },
    },
    {
      accessorKey: "total",
      header: () => <div className="text-right">Total</div>,
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("total"))
        const formatted = new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          minimumFractionDigits: 0,
        }).format(amount)
        return <div className="text-right font-medium">{formatted}</div>
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const transaction = row.original;
        const availableOptions = user ? getAvailableStatusOptions(transaction.status, user.role) : [transaction.status];
        
        return (
          <Select
            value={transaction.status}
            onValueChange={(value: TransactionStatus) => handleStatusChange(transaction.id, value)}
            disabled={availableOptions.length <= 1 || updateTransactionStatus.isPending}
          >
            <SelectTrigger className={cn("w-[180px] border-0 focus:ring-0 focus:ring-offset-0", badgeVariants({ variant: getStatusVariant(transaction.status) }))}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableOptions.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const transaction = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuLabel>Aksi</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate(`/transactions/${transaction.id}`)}>Lihat Detail</DropdownMenuItem>
              {user && user.role === 'owner' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-500 focus:text-red-500"
                    onClick={() => handleDeleteClick(transaction)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Hapus Transaksi
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: transactions || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(transactions || []);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transaksi");
    XLSX.writeFile(workbook, "data-transaksi.xlsx");
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['No. Order', 'Pelanggan', 'Tgl Order', 'Kasir', 'Total', 'Status']],
      body: (transactions || []).map(t => [
        t.id,
        t.customerName,
        t.orderDate ? format(new Date(t.orderDate), "d MMM yyyy, HH:mm", { locale: id }) : 'N/A',
        t.cashierName,
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(t.total),
        t.status
      ]),
    });
    doc.save('data-transaksi.pdf');
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Cari berdasarkan nama pelanggan..."
          value={(table.getColumn("customerName")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("customerName")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportExcel}><FileDown className="mr-2 h-4 w-4" /> Ekspor Excel</Button>
          <Button variant="outline" onClick={handleExportPdf}><FileDown className="mr-2 h-4 w-4" /> Ekspor PDF</Button>
          <Button asChild><Link to="/pos"><PlusCircle className="mr-2 h-4 w-4" /> Tambah Transaksi</Link></Button>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>{headerGroup.headers.map((header) => (<TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>))}</TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (<TableRow key={i}><TableCell colSpan={columns.length}><Skeleton className="h-8 w-full" /></TableCell></TableRow>))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => navigate(`/transactions/${row.original.id}`)}
                  className="cursor-pointer hover:bg-muted"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No results.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
      </div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data transaksi dengan nomor order <strong>{selectedTransaction?.id}</strong> secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className={cn(badgeVariants({ variant: "destructive" }))}
              onClick={confirmDelete}
              disabled={deleteTransaction.isPending}
            >
              {deleteTransaction.isPending ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}