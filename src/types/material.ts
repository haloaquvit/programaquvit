export interface Material {
  id: string;
  name: string;
  unit: string; // satuan (meter, lembar, kg, etc)
  pricePerUnit: number;
  stock: number;
  minStock: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}