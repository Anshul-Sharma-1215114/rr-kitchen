import type { AddressLabel, OrderStatus, OrderType, PaymentMethod, PaymentStatus } from "@rr-kitchen/shared";

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isVeg: boolean;
  available: boolean;
  categoryId: string;
  category?: Category;
}

export interface ComboItem {
  id: string;
  comboId: string;
  menuItemId: string;
  quantity: number;
  swappable: boolean;
  menuItem: MenuItem;
}

export interface Combo {
  id: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  available: boolean;
  items: ComboItem[];
}

export interface Address {
  id: string;
  label: AddressLabel;
  line1: string;
  landmark: string | null;
  area: string;
  city: string;
  pincode: string;
  isDefault: boolean;
}

export interface OrderItemDTO {
  id: string;
  menuItemId: string | null;
  comboId: string | null;
  name: string;
  quantity: number;
  priceAtOrder: string;
  comboSelections: {
    swaps: { fromMenuItemId: string; toMenuItemId: string; fromName: string; toName: string }[];
  } | null;
}

export interface OrderReview {
  id: string;
  rating: number;
  comment: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  itemsTotal: string;
  deliveryFee: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  specialInstructions: string | null;
  placedAt: string;
  confirmedAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  outForDeliveryAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  items: OrderItemDTO[];
  address: Address | null;
  review?: OrderReview | null;
  deliveryAgentId?: string | null;
  deliveryAgent?: { id: string; name: string; phone: string | null } | null;
}

export interface ShopConfigPublic {
  name: string;
  deliveryFee: string;
  minOrderValue: string;
  taxPercent: string;
  openTime: string;
  closeTime: string;
  address: string | null;
  upiId: string | null;
  whatsappNumber: string | null;
  isOpenNow: boolean;
}

export interface AdminOrder extends Order {
  customer: { id: string; name: string; phone: string | null };
}

export interface DeliveryOrder extends Order {
  customer: { id: string; name: string; phone: string | null };
}

export interface DeliveryAgentProfile {
  userId: string;
  vehicleNumber: string | null;
  isAvailable: boolean;
  isActive: boolean;
}

export interface Agent {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  deliveryAgentProfile: DeliveryAgentProfile | null;
  assignedOrders: { id: string; orderNumber: string; status: OrderStatus }[];
}

export interface Coupon {
  id: string;
  code: string;
  type: "FLAT" | "PERCENT";
  value: string;
  minOrderValue: string;
  maxDiscount: string | null;
  validFrom: string;
  validTo: string;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
}

export interface CustomerSummary {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  isBlocked: boolean;
  createdAt: string;
  _count: { orders: number };
}

export interface CustomerDetail {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  isBlocked: boolean;
  orders: Order[];
  addresses: Address[];
}

export interface FeaturedReview {
  id: string;
  rating: number;
  comment: string | null;
  customerName: string;
  createdAt: string;
}

export interface Analytics {
  rangeDays: number;
  totalSales: number;
  orderVolume: number;
  completedOrders: number;
  averageOrderValue: number;
  salesByDay: { date: string; total: number }[];
  bestSellingItems: { name: string; quantity: number }[];
}
