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

