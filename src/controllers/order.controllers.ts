import { redis, redisTTL } from "../app.js";
import { AsyncHandler } from "../middlewares/error.js";
import { Order } from "../models/order.models.js";
import { NewOrderRequestBody } from "../types/types.js";
import { invalidateCache, reduceStock } from "../utils/features.js";
import ErrorHandler from "../utils/utility-class.js";

export const myOrders = AsyncHandler(async (req, res, next) => {
  const { id: user } = req.query;

  const key = `my-orders-${user}`;

  let orders;

  orders = await redis.get(key);
  console.log("JSON Parse:",orders && JSON.parse(orders))
  if (orders) orders = JSON.parse(orders);
 
  else {
    orders = await Order.find({ user });
    await redis.setex(key, redisTTL, JSON.stringify(orders));
  }
  return res.status(200).json({
    success: true,
    orders,
  });
});

export const allOrders = AsyncHandler(async (req, res, next) => {
  const key = `all-orders`;

  let orders;

  orders = await redis.get(key);

  if (orders) orders = JSON.parse(orders);
  else {
    orders = await Order.find().populate("user", "username"); //TODO
    await redis.setex(key, redisTTL, JSON.stringify(orders));
  }
  return res.status(200).json({
    success: true,
    orders,
  });
});

export const getSingleOrder = AsyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const key = `order-${orderId}`;

  let order;
  order = await redis.get(key);

  if (order) order = JSON.parse(order);
  else {
    order = await Order.findById(orderId).populate("user", "username");

    if (!order) return next(new ErrorHandler("Order Not Found", 404));

    await redis.setex(key, redisTTL, JSON.stringify(order));
  }
  return res.status(200).json({
    success: true,
    order,
  });
});

export const newOrder = AsyncHandler(async (req, res, next) => {
    const {
      shippingInfo,
      orderItems,
      user,
      subtotal,
      tax,
      shippingCharges,
      discount,
      total,
    }:NewOrderRequestBody= req.body;

    if ([shippingInfo, orderItems, user, subtotal, tax, total].some((elem) => !elem)) {
      return next(new ErrorHandler("All Fields are required", 400));

    }


    const order = await Order.create({
      shippingInfo,
      orderItems,
      user,
      subtotal,
      tax,
      shippingCharges,
      discount,
      total,
    });

    await reduceStock(orderItems);

    await invalidateCache({
      product: true,
      order: true,
      admin: true,
      userId: user,
      productId: order.orderItems.map((i) => String(i.productId)),
    });

    return res.status(201).json({
      success: true,
      message: "Order Placed Successfully",
    });
  }
);

export const processOrder = AsyncHandler(async (req, res, next) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId);

  if (!order) return next(new ErrorHandler("Order Not Found", 404));
 
  //TODO
  switch (order.status) {
    case "Processing":
      order.status = "Shipped";
      break;
    case "Shipped":
      order.status = "Delivered";
      break;
    default:
      order.status = "Delivered";
      break;
  }

  await order.save();

  await invalidateCache({
    product: false,
    order: true,
    admin: true,
    userId: order.user,
    orderId: String(order._id),
  });

  return res.status(200).json({
    success: true,
    message: "Order Processed Successfully",
  });
});

export const deleteOrder = AsyncHandler(async (req, res, next) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId);
  if (!order) return next(new ErrorHandler("Order Not Found", 404));

  await order.deleteOne();

  await invalidateCache({
    product: false,
    order: true,
    admin: true,
    userId: order.user,
    orderId: String(order._id),
  });

  return res.status(200).json({
    success: true,
    message: "Order Deleted Successfully",
  });
});
