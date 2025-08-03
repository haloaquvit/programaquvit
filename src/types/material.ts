export type MaterialType = 'Stock' | 'Beli';

export interface Material {
  id: string;
  name: string;
  type: MaterialType; // Jenis bahan: Stock (produksi kurangi stock), Beli (produksi tambah stock)
  unit: string; // satuan (meter, lembar, kg, etc)
  pricePerUnit: number;
  stock: number;
  minStock: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}