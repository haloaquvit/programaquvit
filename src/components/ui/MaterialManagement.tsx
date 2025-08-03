"use client"
import { useState } from 'react'
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Material } from '@/types/material'
import { useMaterials } from '@/hooks/useMaterials'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions' // Import permission hook
import { AddStockDialog } from './AddStockDialog'
import { RequestPoDialog } from './RequestPoDialog'
import { Badge } from './ui/badge'
import { useToast } from './ui/use-toast'
import { Trash2 } from 'lucide-react'

const materialSchema = z.object({
  name: z.string().min(3, { message: "Nama bahan minimal 3 karakter." }),
  type: z.enum(['Stock', 'Beli'], { message: "Pilih jenis bahan." }),
  unit: z.string().min(1, { message: "Satuan harus diisi (cth: meter, lembar, kg)." }),
  pricePerUnit: z.coerce.number().min(0, { message: "Harga tidak boleh negatif." }),
  stock: z.coerce.number().min(0, { message: "Stok tidak boleh negatif." }),
  minStock: z.coerce.number().min(0, { message: "Stok minimal tidak boleh negatif." }),
  description: z.string().optional(),
})

type MaterialFormData = z.infer<typeof materialSchema>

const EMPTY_FORM_DATA: MaterialFormData = {
  name: '',
  type: 'Stock',
  unit: '',
  pricePerUnit: 0,
  stock: 0,
  minStock: 10,
  description: '',
};

export const MaterialManagement = () => {
  const { materials, isLoading, upsertMaterial, deleteMaterial } = useMaterials()
  const { user } = useAuth()
  const { canCreateMaterials, canEditMaterials, canDeleteMaterials } = usePermissions() // Destructure permission checks
  const { toast } = useToast()
  const [isAddStockOpen, setIsAddStockOpen] = useState(false)
  const [isRequestPoOpen, setIsRequestPoOpen] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: EMPTY_FORM_DATA,
  })

  const handleOpenAddStock = (material: Material) => {
    setSelectedMaterial(material)
    setIsAddStockOpen(true)
  }

  const handleOpenRequestPo = (material: Material) => {
    setSelectedMaterial(material)
    setIsRequestPoOpen(true)
  }

  const handleEditClick = (material: Material) => {
    // Prevent editing if user lacks edit permission
    if (!canEditMaterials()) return
    setEditingMaterial(material);
    reset(material);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingMaterial(null);
    reset(EMPTY_FORM_DATA);
  };

  const handleDeleteClick = (material: Material) => {
    if (!canDeleteMaterials()) return
    if (window.confirm(`Apakah Anda yakin ingin menghapus bahan "${material.name}"?`)) {
      deleteMaterial.mutate(material.id, {
        onSuccess: () => {
          toast({
            title: "Sukses!",
            description: `Bahan "${material.name}" berhasil dihapus.`,
          })
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Gagal!",
            description: `Terjadi kesalahan: ${error.message}`,
          })
        },
      })
    }
  }

  const onFormSubmit = (data: MaterialFormData) => {
    if (editingMaterial && !canEditMaterials()) {
      // Deny editing if user lacks permission
      toast({
        variant: "destructive",
        title: "Akses Ditolak",
        description: "Anda tidak memiliki izin untuk mengedit bahan.",
      })
      return
    }
    if (!editingMaterial && !canCreateMaterials()) {
      // Deny creation if user lacks permission
      toast({
        variant: "destructive",
        title: "Akses Ditolak",
        description: "Anda tidak memiliki izin untuk menambah bahan.",
      })
      return
    }
    const materialToSave: Partial<Material> = {
      ...data,
      id: editingMaterial?.id, // Include ID if editing
    };

    upsertMaterial.mutate(materialToSave, {
      onSuccess: (savedMaterial) => {
        toast({
          title: "Sukses!",
          description: `Bahan "${savedMaterial.name}" berhasil ${editingMaterial ? 'diperbarui' : 'ditambahkan'}.`,
        })
        handleCancelEdit();
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Gagal!",
          description: `Terjadi kesalahan: ${error.message}`,
        })
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Dialogs for stock and PO requests */}
      <AddStockDialog
        open={isAddStockOpen}
        onOpenChange={setIsAddStockOpen}
        material={selectedMaterial}
      />
      <RequestPoDialog
        open={isRequestPoOpen}
        onOpenChange={setIsRequestPoOpen}
        material={selectedMaterial}
      />

      {/* Form for adding/editing materials */}
      {(canCreateMaterials() || (editingMaterial && canEditMaterials())) ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingMaterial ? `Edit Bahan: ${editingMaterial.name}` : 'Tambah Bahan Baru'}</CardTitle>
            <CardDescription>
              {editingMaterial ? 'Perbarui detail bahan di bawah ini.' : 'Tambahkan material baru yang akan digunakan dalam produksi.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="name">Nama Bahan</Label>
                  <Input id="name" {...register("name")} />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Jenis Bahan</Label>
                  <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih jenis bahan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Stock">Stock</SelectItem>
                          <SelectItem value="Beli">Beli</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Satuan</Label>
                  <Input id="unit" {...register("unit")} />
                  {errors.unit && <p className="text-sm text-destructive">{errors.unit.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricePerUnit">Harga per Satuan</Label>
                  <Input id="pricePerUnit" type="number" step="any" {...register("pricePerUnit")} />
                  {errors.pricePerUnit && <p className="text-sm text-destructive">{errors.pricePerUnit.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stok Saat Ini</Label>
                  <Input id="stock" type="number" step="any" {...register("stock")} />
                  {errors.stock && <p className="text-sm text-destructive">{errors.stock.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minStock">Stok Minimal</Label>
                  <Input id="minStock" type="number" step="any" {...register("minStock")} />
                  {errors.minStock && <p className="text-sm text-destructive">{errors.minStock.message}</p>}
                </div>
                <div className="space-y-2 lg:col-span-4">
                  <Label htmlFor="description">Deskripsi (Opsional)</Label>
                  <Textarea id="description" {...register("description")} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={upsertMaterial.isPending}>
                  {upsertMaterial.isPending ? "Menyimpan..." : (editingMaterial ? 'Simpan Perubahan' : 'Simpan Bahan Baru')}
                </Button>
                {editingMaterial && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>Batal</Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Akses Terbatas</CardTitle>
            <CardDescription>Anda tidak memiliki izin untuk menambah atau mengedit bahan.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Table of materials */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Bahan & Stok</CardTitle>
          <CardDescription>Kelola semua bahan baku dan stok yang tersedia.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Stok Saat Ini</TableHead>
                <TableHead>Stok Minimal</TableHead>
                <TableHead>Harga/Satuan</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center">Memuat data...</TableCell></TableRow>
              ) : materials?.map((material) => (
                <TableRow key={material.id}>
                  <TableCell className="font-medium">{material.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      material.type === 'Stock' ? 'bg-purple-100 text-purple-800' :
                      'bg-orange-100 text-orange-800'
                    }>
                      {material.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={material.stock < material.minStock ? "destructive" : "secondary"}>
                      {material.stock} {material.unit}
                    </Badge>
                  </TableCell>
                  <TableCell>{material.minStock} {material.unit}</TableCell>
                  <TableCell>Rp{material.pricePerUnit.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {/* Edit button visible only if user has edit permission */}
                      {canEditMaterials() && (
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(material)}>Edit</Button>
                      )}
                      {/* Add stock button requires edit permission */}
                      {canEditMaterials() && (
                        <Button variant="outline" size="sm" onClick={() => handleOpenAddStock(material)}>
                          + Stok
                        </Button>
                      )}
                      {/* Request PO is allowed for all authenticated users */}
                      <Button variant="secondary" size="sm" onClick={() => handleOpenRequestPo(material)}>
                        Request PO
                      </Button>
                      {/* Delete button visible only if user has delete permission */}
                      {canDeleteMaterials() && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(material)}
                          disabled={deleteMaterial.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}