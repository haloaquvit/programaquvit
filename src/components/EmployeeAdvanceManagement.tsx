"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { useToast } from "./ui/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { useEmployeeAdvances } from "@/hooks/useEmployeeAdvances"
import { EmployeeAdvance } from "@/types/employeeAdvance"
import { RepayAdvanceDialog } from "./RepayAdvanceDialog"
import { AddAdvanceDialog } from "./AddAdvanceDialog"
import { format } from "date-fns"
import { id } from "date-fns/locale/id"
import { Badge } from "./ui/badge"
import { Trash2, Plus, ChevronDown, ChevronRight } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


export function EmployeeAdvanceManagement() {
  const { toast } = useToast()
  const { user } = useAuth()
  const { advances, advancesByEmployee, isLoading: loadingAdvances, deleteAdvance, isError, error: advancesError } = useEmployeeAdvances()
  const [isRepayDialogOpen, setIsRepayDialogOpen] = useState(false)
  const [isAddAdvanceDialogOpen, setIsAddAdvanceDialogOpen] = useState(false)
  const [selectedAdvance, setSelectedAdvance] = useState<EmployeeAdvance | null>(null)
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set())

  const handleOpenRepayDialog = (advance: EmployeeAdvance) => {
    setSelectedAdvance(advance)
    setIsRepayDialogOpen(true)
  }

  const toggleEmployeeExpansion = (employeeId: string) => {
    const newExpanded = new Set(expandedEmployees)
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId)
    } else {
      newExpanded.add(employeeId)
    }
    setExpandedEmployees(newExpanded)
  }


  const handleDeleteAdvance = (advance: EmployeeAdvance) => {
    deleteAdvance.mutate(advance, {
      onSuccess: () => {
        toast({ title: "Sukses", description: "Data panjar berhasil dihapus." });
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Gagal", description: error.message });
      }
    });
  };

  const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner';
  const isOwner = user?.role === 'owner';

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Gagal Memuat Data</CardTitle>
          <CardDescription>
            Terjadi kesalahan saat mengambil data panjar karyawan. Silakan coba muat ulang halaman.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Detail Error: {advancesError?.message}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <RepayAdvanceDialog open={isRepayDialogOpen} onOpenChange={setIsRepayDialogOpen} advance={selectedAdvance} />
      <AddAdvanceDialog open={isAddAdvanceDialogOpen} onOpenChange={setIsAddAdvanceDialogOpen} />


      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Riwayat Panjar Karyawan</CardTitle>
            <CardDescription>Data panjar dikelompokkan berdasarkan karyawan</CardDescription>
          </div>
          {isAdminOrOwner && (
            <Button onClick={() => setIsAddAdvanceDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Panjar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loadingAdvances ? (
              <div className="text-center py-8">Memuat data panjar...</div>
            ) : advancesByEmployee.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada data panjar karyawan.
              </div>
            ) : (
              advancesByEmployee.map((employeeGroup) => (
                <Collapsible
                  key={employeeGroup.employeeId}
                  open={expandedEmployees.has(employeeGroup.employeeId)}
                  onOpenChange={() => toggleEmployeeExpansion(employeeGroup.employeeId)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        {expandedEmployees.has(employeeGroup.employeeId) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <div>
                          <h3 className="font-semibold">{employeeGroup.employeeName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {employeeGroup.advances.length} panjar • Total: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(employeeGroup.totalAmount)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-destructive">
                          Sisa: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(employeeGroup.totalRemaining)}
                        </div>
                        <Badge variant={employeeGroup.totalRemaining <= 0 ? "success" : "destructive"}>
                          {employeeGroup.totalRemaining <= 0 ? 'Lunas' : 'Belum Lunas'}
                        </Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Jumlah</TableHead>
                            <TableHead>Sisa</TableHead>
                            <TableHead>Catatan</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {employeeGroup.advances.map((advance) => (
                            <TableRow key={advance.id}>
                              <TableCell>
                                {format(new Date(advance.date), "d MMM yyyy", { locale: id })}
                              </TableCell>
                              <TableCell>
                                {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(advance.amount)}
                              </TableCell>
                              <TableCell className="font-medium">
                                {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(advance.remainingAmount)}
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {advance.notes || '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={advance.remainingAmount <= 0 ? "success" : "destructive"}>
                                  {advance.remainingAmount <= 0 ? 'Lunas' : 'Belum Lunas'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleOpenRepayDialog(advance)} 
                                    disabled={advance.remainingAmount <= 0}
                                  >
                                    Bayar
                                  </Button>
                                  {isOwner && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Tindakan ini akan menghapus data panjar untuk {advance.employeeName} dan mengembalikan saldo ke akun asal. Tindakan ini tidak dapat dibatalkan.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Batal</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteAdvance(advance)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Ya, Hapus
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}