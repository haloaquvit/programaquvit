"use client"

import { useEffect, useState } from 'react'
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUser } from '@/hooks/useUser'
import { useMaterials } from '@/hooks/useMaterials'
import { usePermissions } from '@/hooks/usePermissions'
import { Trash2, Plus, Save } from "lucide-react"

const schema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nama wajib diisi"),
  unit: z.string().min(1, "Satuan wajib diisi"),
  stock: z.coerce.number().min(0),
})

type MaterialForm = z.infer<typeof schema>

export default function MaterialManagement() {
  const { user } = useUser()
  const { canCreateMaterials, canEditMaterials, canDeleteMaterials } = usePermissions()
  const { materials, fetchMaterials, saveMaterial, deleteMaterial } = useMaterials()
  const [editing, setEditing] = useState(false)

  const form = useForm<MaterialForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", unit: "", stock: 0 }
  })

  useEffect(() => {
    fetchMaterials()
  }, [])

  const handleSave = async (data: MaterialForm) => {
    if (!canEditMaterials) {
      toast({ title: "Akses ditolak", description: "Anda tidak memiliki izin untuk menyimpan bahan", variant: "destructive" })
      return
    }
    await saveMaterial(data)
    toast({ title: "Berhasil", description: "Data bahan disimpan" })
    setEditing(false)
    fetchMaterials()
    form.reset({ name: "", unit: "", stock: 0 })
  }

  const handleEdit = (material: any) => {
    if (!canEditMaterials) return
    form.reset(material)
    setEditing(true)
  }

  const handleDelete = async (id: string) => {
    if (!canDeleteMaterials) {
      toast({ title: "Akses ditolak", description: "Anda tidak memiliki izin untuk menghapus bahan", variant: "destructive" })
      return
    }
    if (confirm("Yakin ingin menghapus bahan ini?")) {
      await deleteMaterial(id)
      toast({ title: "Dihapus", description: "Data bahan berhasil dihapus" })
      fetchMaterials()
    }
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-semibold">Manajemen Bahan</h1>

      {canCreateMaterials && (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Edit Bahan" : "Tambah Bahan Baru"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSave)} className="grid gap-4">
              <div>
                <Label>Nama Bahan</Label>
                <Input {...form.register("name")} />
              </div>
              <div>
                <Label>Satuan</Label>
                <Input {...form.register("unit")} />
              </div>
              <div>
                <Label>Stok</Label>
                <Input type="number" {...form.register("stock")} />
              </div>
              <Button type="submit"><Save className="w-4 h-4 mr-2" /> Simpan</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {materials.map((material) => (
          <Card key={material.id}>
            <CardHeader>
              <CardTitle>{material.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Satuan: {material.unit}</p>
              <p>Stok: {material.stock}</p>
              <div className="flex gap-2 mt-4">
                {canEditMaterials && (
                  <Button size="sm" onClick={() => handleEdit(material)}>Edit</Button>
                )}
                {canDeleteMaterials && (
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(material.id)}>
                    <Trash2 className="w-4 h-4 mr-1" /> Hapus
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!canEditMaterials && !canCreateMaterials && (
        <p className="text-sm text-muted-foreground italic">Anda tidak memiliki akses untuk membuat atau mengedit bahan.</p>
      )}
    </div>
  )
}