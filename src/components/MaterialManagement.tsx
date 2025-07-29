"use client"
import { useState } from 'react'
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Material } from '@/types/material'
import { useMaterials } from '@/hooks/useMaterials'
import { useAuth } from '@/hooks/useAuth'
import { AddStockDialog } from './AddStockDialog'
import { RequestPoDialog } from './RequestPoDialog'
import { Badge } from './ui/badge'
import { useToast } from './ui/use-toast'

const materialSchema = z.object({
  name: z.string().min(3, { message: "Nama bahan minimal 3 karakter." }),
  unit: z.string().min(1, { message: "Satuan harus diisi (cth: meter, lembar, kg)." }),
  pricePerUnit: z.coerce.number().min(0, { message: "Harga tidak boleh negatif." }),
  stock: z.coerce.number().min(0, { message: "Stok tidak boleh negatif." }),
  minStock: z.coerce.number().min(0, { message: "Stok minimal tidak boleh negatif." }),
  description: z.string().optional(),
})

type MaterialFormData = z.infer<typeof materialSchema>

const EMPTY_FORM_DATA: MaterialFormData = {
  name: '',
  unit: '',
  pricePerUnit: 0,
  stock: 0,
  minStock: 10,
  description: '',
};

export const MaterialManagement = () => {
  const { materials, isLoading, upsertMaterial } = useMaterials()
  const { user } = useAuth()
  const { toast } = useToast()
  const [isAddStockOpen, setIsAddStockOpen] = useState(false)
  const [isRequestPoOpen, setIsRequestPoOpen] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<MaterialFormData>({
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
    setEditingMaterial(material);
    reset(material);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingMaterial(null);
    reset(EMPTY_FORM_DATA);
  };

  const onFormSubmit = (data: MaterialFormData) => {
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
                <Label htmlFor="unit">Satuan</Label>
                <Input id="unit" {...register("unit")} placeholder="meter, lembar, kg" />
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
                <TableHead>Stok Saat Ini</TableHead>
                <TableHead>Stok Minimal</TableHead>
                <TableHead>Harga/Satuan</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Memuat data...</TableCell></TableRow>
              ) : materials?.map((material) => (
                <TableRow key={material.id}>
                  <TableCell className="font-medium">{material.name}</TableCell>
                  <TableCell>
                    <Badge variant={material.stock < material.minStock ? "destructive" : "secondary"}>
                      {material.stock} {material.unit}
                    </Badge>
                  </TableCell>
                  <TableCell>{material.minStock} {material.unit}</TableCell>
                  <TableCell>Rp{material.pricePerUnit.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditClick(material)}>Edit</Button>
                      {user?.role === 'admin' && (
                        <Button variant="outline" size="sm" onClick={() => handleOpenAddStock(material)}>
                          + Stok
                        </Button>
                      )}
                      <Button variant="secondary" size="sm" onClick={() => handleOpenRequestPo(material)}>
                        Request PO
                      </Button>
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