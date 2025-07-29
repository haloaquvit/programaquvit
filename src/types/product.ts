export interface ProductSpecification {
  key: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  category: 'indoor' | 'outdoor';
  basePrice: number;
  unit: string; // BARU: Satuan produk
  minOrder: number;
  description?: string;
  specifications: ProductSpecification[];
  materials: ProductMaterial[]; // Ini adalah BOM (Bill of Materials)
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductMaterial {
  materialId: string;
  quantity: number;
  notes?: string;
}