import { NextFunction, Request, Response } from "express";

export interface SignupRequestBody {
  username: string;
  email: string;
  Avatar: string;
  gender: string;
  _id: string;
  dob: Date;
}


 //TODO
export type ControllerType = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response<any, Record<string, any>>>;


export type OrderItemType = {
  ProductName: string;
  ProductImage: string;
  price: number;
  quantity: number;
  productId: string;
};

export type ShippingInfoType = {
  address: string;
  city: string;
  state: string;
  country: string;
  pinCode: number;
};

export interface NewOrderRequestBody {
  shippingInfo: ShippingInfoType;
  user: string;
  subtotal: number;
  tax: number;
  shippingCharges: number;
  discount: number;
  total: number;
  orderItems: OrderItemType[];
}

export type InvalidateCacheProps = {
  product?: boolean;
  order?: boolean;
  admin?: boolean;
  review?: boolean;
  userId?: string;
  orderId?: string;
  productId?: string | string[];
};
export type SearchRequestQuery = {
  search?: string;
  price?: string;
  category?: string;
  sort?: string;
  page?: string;
};

export interface BaseQuery {
  ProductName?: {
    $regex: string;
    $options: string;
  };
  price?: { $lte: number };
  category?: string;
}

export interface NewPaymentRequestBody{
  items: OrderItemType[];
  shippingInfo: ShippingInfoType | undefined;
  coupon: string | undefined;
}
export interface ProductRequestBody {
  ProductName: string;
  category: string;
  price: number;
  stock: number;
  description: string;
}
export interface CouponRequestBody {
  code: string;
  amount: number;
}

