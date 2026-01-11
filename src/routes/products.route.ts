import express from "express";
import {
  allReviewsOfProduct,
  deleteProduct,
  deleteReview,
  getAdminProducts,
  getAllCategories,
  getAllProducts,
  getSingleProduct,
  getlatestProducts,
  newProduct,
  newReview,
  updateProduct,
} from "../controllers/product.controllers.js";
import { adminOnly } from "../middlewares/auth.js";
import { mutliUpload } from "../middlewares/multer.js";

const app = express.Router();

//To Create New Product  - /api/v1/product/new
app.post("/new", adminOnly, mutliUpload, newProduct);

//To get all Products with filters  - /api/v1/product/all
app.get("/all", getAllProducts);

//To get last 10 Products  - /api/v1/product/latest
app.get("/latest", getlatestProducts);

//To get all unique Categories  - /api/v1/product/categories
app.get("/categories", getAllCategories);

//To get all Products   - /api/v1/product/admin-products
app.get("/admin-products", adminOnly, getAdminProducts);

// To get, update, delete Product
app.get("/:productId",getSingleProduct)
app.put("/:productId",adminOnly, mutliUpload, updateProduct)
app.delete("/:productId",adminOnly, deleteProduct);

app.get("/reviews/:productId", allReviewsOfProduct);
app.post("/review/new/:productId", newReview);
app.delete("/review/:reviewId", deleteReview);

export default app;
