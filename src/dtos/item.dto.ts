export interface CreateItemDto {
  categoryId: number;
  title: string;
  description?: string | null;
  price?: number | null;
  active?: boolean;
  // ❌ Sin imágenes → se suben con /images/items/:itemId
}

export interface UpdateItemDto {
  categoryId?: number;
  title?: string;
  description?: string | null;
  price?: number | null;
  active?: boolean;
  newPosition?: number;
  // ❌ Sin imágenes → se suben con /images/items/:itemId
}
