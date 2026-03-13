export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
  slug: string;
}

export interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}
