import express from "express";
import { adminOnly } from "../middlewares/auth.js";
import {
  allOrders,
  deleteOrder,
  getSingleOrder,
  myOrders,
  newOrder,
  processOrder,
} from "../controllers/order.controllers.js";

const app = express.Router();

// route - /api/v1/order/new
app.post("/new", newOrder);

// route - /api/v1/order/my
app.get("/my", myOrders);

// route - /api/v1/order/all
app.get("/all", adminOnly, allOrders);

app.get("/:orderId",getSingleOrder)
app.put("/:orderId",adminOnly, processOrder)
app.delete("/:orderId",adminOnly, deleteOrder);

export default app;
