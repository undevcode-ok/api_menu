export interface CreateCategoryDto { menuId: number; title: string; }
export interface UpdateCategoryDto {
  title?: string;
  active?: boolean;
  newPosition?: number;
}
