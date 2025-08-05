"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Product } from '@/types/product'
import { Material } from '@/types/material'
import { PlusCircle, Trash2 } from 'lucide-react'
import { Textarea } from './ui/textarea'
import { useToast } from './ui/use-toast'
import { useProducts } from '@/hooks/useProducts'
import { Skeleton } from './ui/skeleton'
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
import { useAuth } from '@/hooks/useAuth'

interface ProductManagementProps {
  materials?: Material[]
}

const EMPTY_FORM_DATA: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  category: 'indoor',
  type: 'Stock',
  basePrice: 0,
  unit: 'pcs',
  currentStock: 0,
  minStock: 0,
  minOrder: 1,
  description: '',
  specifications: [],
  materials: []
};

export const ProductManagement = ({ materials = [] }: ProductManagementProps) => {
  const { toast } = useToast()
  const { products, isLoading, upsertProduct, deleteProduct } = useProducts()
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM_DATA)
  const { user } = useAuth()

  const canManageProducts = user && ['admin', 'owner', 'supervisor', 'cashier', 'designer'].includes(user.role)
  const canDeleteProducts = user && ['admin', 'owner'].includes(user.role)
  const canEditAllProducts = user && ['admin', 'owner', 'supervisor', 'cashier'].includes(user.role)
  const isDesigner = user?.role === 'designer'

  const handleEditClick = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      category: product.category,
      type: product.type || 'Stock',
      basePrice: product.basePrice,
      unit: product.unit || 'pcs',
      currentStock: product.currentStock || 0,
      minStock: product.minStock || 0,
      minOrder: product.minOrder,
      description: product.description || '',
      specifications: product.specifications || [],
      materials: product.materials || []
    })
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const handleCancelEdit = () => {
    setEditingProduct(null)
    setFormData(EMPTY_FORM_DATA)
  }

  const handleDeleteClick = (productId: string) => {
    deleteProduct.mutate(productId, {
      onSuccess: () => {
        toast({ title: "Sukses!", description: "Produk berhasil dihapus." })
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Gagal!", description: error.message })
      }
    })
  }

  const handleSpecChange = (index: number, field: 'key' | 'value', value: string) => {
    const newSpecs = formData.specifications.map((spec, i) => i === index ? { ...spec, [field]: value } : spec)
    setFormData({ ...formData, specifications: newSpecs })
  }

  const addSpec = () => setFormData({ ...formData, specifications: [...formData.specifications, { key: '', value: '' }] })
  const removeSpec = (index: number) => setFormData({ ...formData, specifications: formData.specifications.filter((_, i) => i !== index) })

  const handleBomChange = (index: number, field: 'materialId' | 'quantity' | 'notes', value: string | number) => {
    const newBom = formData.materials.map((item, i) => i === index ? { ...item, [field]: value } : item)
    setFormData({ ...formData, materials: newBom })
  }

  const addBomItem = () => setFormData({ ...formData, materials: [...formData.materials, { materialId: '', quantity: 0, notes: '' }] })
  const removeBomItem = (index: number) => setFormData({ ...formData, materials: formData.materials.filter((_, i) => i !== index) })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation: BOM required for Stock type products if user is designer
    if (isDesigner && formData.type === 'Stock' && (!formData.materials || formData.materials.length === 0)) {
      toast({ 
        variant: "destructive", 
        title: "BOM Wajib!", 
        description: "Produk jenis 'Stock' wajib memiliki Bill of Materials (BOM). Silakan tambahkan minimal 1 bahan." 
      })
      return
    }

    // Validation: BOM items must have materialId and quantity > 0
    if (formData.materials && formData.materials.length > 0) {
      const invalidBomItems = formData.materials.some(item => !item.materialId || item.quantity <= 0)
      if (invalidBomItems) {
        toast({ 
          variant: "destructive", 
          title: "BOM Tidak Valid!", 
          description: "Semua item BOM harus memiliki bahan dan jumlah yang valid." 
        })
        return
      }
    }
    
    const productData: Partial<Product> = {
      ...formData,
      id: editingProduct?.id,
    }
    upsertProduct.mutate(productData, {
      onSuccess: (savedProduct) => {
        toast({ title: "Sukses!", description: `Produk "${savedProduct.name}" berhasil ${editingProduct ? 'diperbarui' : 'ditambahkan'}.` })
        handleCancelEdit()
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Gagal!", description: error.message })
      }
    })
  }

  return (
    <div className="space-y-8">
      {canManageProducts && (
        <form onSubmit={handleSubmit} className="space-y-6 p-6 border rounded-lg">
          <h2 className="text-xl font-bold">{editingProduct ? `Edit Produk: ${editingProduct.name}` : 'Tambah Produk Baru'}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label htmlFor="name">Nama Produk</Label><Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required /></div>
            <div className="space-y-2"><Label htmlFor="category">Kategori</Label><Select value={formData.category} onValueChange={(v: 'indoor' | 'outdoor') => setFormData({...formData, category: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="indoor">Indoor</SelectItem><SelectItem value="outdoor">Outdoor</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="type">Jenis Barang</Label><Select value={formData.type} onValueChange={(v: 'Stock' | 'Beli') => setFormData({...formData, type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Stock">Stock (Produksi menurunkan stock)</SelectItem><SelectItem value="Beli">Beli (Produksi menambah stock)</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="basePrice">Harga Dasar (Rp)</Label><Input id="basePrice" type="number" value={formData.basePrice} onChange={(e) => setFormData({...formData, basePrice: Number(e.target.value)})} required /></div>
            <div className="space-y-2"><Label htmlFor="unit">Satuan</Label><Input id="unit" value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} placeholder="pcs, lembar, m²" required /></div>
            <div className="space-y-2"><Label htmlFor="minOrder">Min. Order</Label><Input id="minOrder" type="number" value={formData.minOrder} onChange={(e) => setFormData({...formData, minOrder: Number(e.target.value)})} required /></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2"><Label htmlFor="currentStock">Stock Saat Ini</Label><Input id="currentStock" type="number" value={formData.currentStock} onChange={(e) => setFormData({...formData, currentStock: Number(e.target.value)})} min="0" /></div>
            <div className="space-y-2"><Label htmlFor="minStock">Stock Minimum</Label><Input id="minStock" type="number" value={formData.minStock} onChange={(e) => setFormData({...formData, minStock: Number(e.target.value)})} min="0" /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="description">Deskripsi</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} /></div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold">Spesifikasi Tambahan</h3>
            {formData.specifications.map((spec, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input placeholder="Nama Spesifikasi (cth: Resolusi)" value={spec.key} onChange={(e) => handleSpecChange(index, 'key', e.target.value)} />
                <Input placeholder="Nilai Spesifikasi (cth: 720 dpi)" value={spec.value} onChange={(e) => handleSpecChange(index, 'value', e.target.value)} />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeSpec(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addSpec}><PlusCircle className="mr-2 h-4 w-4" /> Tambah Spesifikasi</Button>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Bill of Materials (BOM)</h3>
              {isDesigner && formData.type === 'Stock' && (
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Wajib diisi untuk produk Stock</span>
              )}
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader><TableRow><TableHead>Bahan/Material</TableHead><TableHead>Kebutuhan</TableHead><TableHead>Catatan</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
                <TableBody>
                  {formData.materials.map((bom, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select value={bom.materialId} onValueChange={(v) => handleBomChange(index, 'materialId', v)}>
                          <SelectTrigger><SelectValue placeholder="Pilih Bahan" /></SelectTrigger>
                          <SelectContent>{materials.map(m => <SelectItem key={m.id} value={m.id}>{m.name} ({m.unit})</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input type="number" step="any" placeholder="Jumlah" value={bom.quantity} onChange={(e) => handleBomChange(index, 'quantity', Number(e.target.value))} /></TableCell>
                      <TableCell><Input placeholder="Opsional" value={bom.notes || ''} onChange={(e) => handleBomChange(index, 'notes', e.target.value)} /></TableCell>
                      <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeBomItem(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addBomItem}><PlusCircle className="mr-2 h-4 w-4" /> Tambah Bahan</Button>
          </div>

          <div className="flex justify-end gap-2">
            {editingProduct && <Button type="button" variant="outline" onClick={handleCancelEdit}>Batal</Button>}
            <Button type="submit" disabled={upsertProduct.isPending}>
              {upsertProduct.isPending ? 'Menyimpan...' : (editingProduct ? 'Simpan Perubahan' : 'Simpan Produk')}
            </Button>
          </div>
        </form>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Daftar Produk</h2>
        {isDesigner && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Info Designer:</strong> Anda dapat membuat produk baru dan melihat semua produk. 
              Untuk produk jenis "Stock", wajib mengisi Bill of Materials (BOM).
            </p>
          </div>
        )}
        <div className="border rounded-lg">
          <Table>
            <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Kategori</TableHead><TableHead>Jenis</TableHead><TableHead>Harga Dasar</TableHead><TableHead>Stock</TableHead><TableHead>Satuan</TableHead>{canManageProducts && <TableHead>Aksi</TableHead>}</TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={canManageProducts ? 7 : 6}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ))
              ) : products?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${product.category === 'indoor' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {product.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      product.type === 'Stock' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {product.type || 'Stock'}
                    </span>
                  </TableCell>
                  <TableCell>Rp{product.basePrice.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={`font-medium ${
                      (product.currentStock || 0) <= (product.minStock || 0) ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {product.currentStock || 0}
                      {(product.currentStock || 0) <= (product.minStock || 0) && (
                        <span className="text-xs text-red-500 ml-1">(Min: {product.minStock || 0})</span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>{product.unit}</TableCell>
                  {canManageProducts && (
                    <TableCell>
                      {canEditAllProducts && (
                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(product)}>Edit</Button>
                      )}
                      {isDesigner && (
                        <Button variant="ghost" size="sm" disabled className="text-gray-400">View Only</Button>
                      )}
                      {canDeleteProducts && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-red-500">Hapus</Button>
                          </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Anda yakin ingin menghapus produk ini?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tindakan ini tidak dapat dibatalkan. Produk "{product.name}" akan dihapus secara permanen.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteClick(product.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Ya, Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}