import { redis, redisTTL } from "../app.js";
import { AsyncHandler } from "../middlewares/error.js";
import { Product ,IProductImage} from "../models/product.models.js";
import { Review } from "../models/review.models.js";
import { User } from "../models/user.models.js";
import {BaseQuery,ProductRequestBody,SearchRequestQuery,} from "../types/types.js";
import {findAverageRatings,invalidateCache,} from "../utils/features.js";
import ErrorHandler from "../utils/utility-class.js";
import { deleteFromCloudinary,uploadToCloudinary } from "../middlewares/cloudinary.js";


// Revalidate on New,Update,Delete Product & on New Order
export const getlatestProducts = AsyncHandler(async (req, res, next) => {
  let products;

  products = await redis.get("latest-products");

  if (products) products = JSON.parse(products);
  else {
    products = await Product.find({}).sort({ createdAt: -1 }).limit(5);
    await redis.setex("latest-products", redisTTL, JSON.stringify(products));
  }

  return res.status(200).json({
    success: true,
    products,
  });
});

// Revalidate on New,Update,Delete Product & on New Order
export const getAllCategories = AsyncHandler(async (req, res, next) => {
  let categories;

  categories = await redis.get("categories");

  if (categories) categories = JSON.parse(categories);
  else {
    categories = await Product.distinct("category");
    await redis.setex("categories", redisTTL, JSON.stringify(categories));
  }

  return res.status(200).json({
    success: true,
    categories,
  });
});

// Revalidate on New,Update,Delete Product & on New Order
export const getAdminProducts = AsyncHandler(async (req, res, next) => {
  let products;

  products = await redis.get("all-products");

  if (products) products = JSON.parse(products);
  else {
    products = await Product.find({});
    await redis.setex("all-products", redisTTL, JSON.stringify(products));
  }

  return res.status(200).json({
    success: true,
    products,
  });
});

export const getSingleProduct = AsyncHandler(async (req, res, next) => {
  let product;
  const id = req.params.productId;
  const key = `product-${id}`;

  product = await redis.get(key);
  if (product) product = JSON.parse(product);
  else {
    product = await Product.findById(id);
    if (!product) return next(new ErrorHandler("Product Not Found", 404));

    await redis.setex(key, redisTTL, JSON.stringify(product));
  }

  return res.status(200).json({
    success: true,
    product,
  });
});

export const newProduct = AsyncHandler(async (req, res, next) => {

    const { ProductName, price, stock, category, description }:ProductRequestBody= req.body;
    console.log("body:",req.body)

    const ProductImage = req.files as Express.Multer.File[] | undefined;
    console.log("Image:",ProductImage)
    if (!ProductImage) return next(new ErrorHandler("Please add Photo", 400));

    if (ProductImage.length < 1)
      return next(new ErrorHandler("Please add atleast one Photo", 400));

    if (ProductImage.length > 5)
      return next(new ErrorHandler("You can only upload 5 Photos", 400));

    if ([ProductName, price, stock, category, description].some((elem) => !elem))
      return next(new ErrorHandler("Please enter All Fields", 400));

    // Upload Here

    const photosURL = await uploadToCloudinary(ProductImage);
    console.log("cloudinary response:",photosURL)

    await Product.create({
      ProductName,
      price,
      description,
      stock,
      category: category.toLowerCase(),
      ProductImage: photosURL,
    });

    await invalidateCache({ product: true, admin: true });

    return res.status(201).json({
      success: true,
      message: "Product Created Successfully",
    });
  }
);

export const updateProduct = AsyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const { ProductName, price, stock, category, description }:ProductRequestBody= req.body;
  const ProductImage = req.files as Express.Multer.File[] | undefined;

  const product = await Product.findById(productId);

  if (!product) return next(new ErrorHandler("Product Not Found", 404));

  if (ProductImage && ProductImage.length > 0) {
    const photosURL = await uploadToCloudinary(ProductImage);

    const ids = product.ProductImage.map((photo) => photo.public_id);
    console.log("photo ids:", ids)
    await deleteFromCloudinary(ids);

    product.ProductImage= photosURL as IProductImage[] ;
  }
  //TODO:
  if (ProductName) product.ProductName = ProductName;
  if (price) product.price = price;
  if (stock) product.stock = stock;
  if (category) product.category = category;
  if (description) product.description = description;

  await product.save();

  await invalidateCache({
    product: true,
    productId: String(product._id),
    admin: true,
     order: true,
  });

  return res.status(200).json({
    success: true,
    message: "Product Updated Successfully",
  });
});

export const deleteProduct = AsyncHandler(async (req, res, next) => {

  const product = await Product.findById(req.params.productId);
  if (!product) return next(new ErrorHandler("Product Not Found", 404));

  const ids = product.ProductImage.map((photo) => photo.public_id);

  await deleteFromCloudinary(ids);

  await product.deleteOne();

  await invalidateCache({
    order:true,
    product: true,
    productId: String(product._id),
    admin: true,
  });

  return res.status(200).json({
    success: true,
    message: "Product Deleted Successfully",
  });
});

export const getAllProducts = AsyncHandler(async (req, res, next) => {
    const { search, sort, category, price }:SearchRequestQuery = req.query;
   console.log("search:",search)
    const page = Number(req.query.page) || 1;

    const key = `products-${search}-${sort}-${category}-${price}-${page}`;

    let products;
    let totalPage;

    const cachedData = await redis.get(key);
    if (cachedData) {
      const data = JSON.parse(cachedData);
      console.log("data:", data)
      totalPage = data.totalPage;
      products = data.products;
    } else {

      const limit = Number(process.env.PRODUCT_PER_PAGE) || 8;
      const skip = (page - 1) * limit;

      const baseQuery: BaseQuery = {};

      if (search)
        baseQuery.ProductName = {
          $regex: search,
          $options: "i",
        };

      if (price)
        baseQuery.price = {
          $lte: Number(price),
        };

      if (category) baseQuery.category = category;

      const productsPromise = Product.find(baseQuery)
        .sort(sort && { price: sort === "asc" ? 1 : -1 })
        .limit(limit)
        .skip(skip);

      const [productsFetched, filteredOnlyProduct] = await Promise.all([
        productsPromise,
        Product.find(baseQuery),
      ]);

      products = productsFetched;
      totalPage = Math.ceil(filteredOnlyProduct.length / limit);

      await redis.setex(key, 30, JSON.stringify({ products, totalPage }));
    }

    return res.status(200).json({
      success: true,
      products,
      totalPage,
    });
  }
);

export const allReviewsOfProduct = AsyncHandler(async (req, res, next) => {
  let reviews;
  const key = `reviews-${req.params.productId}`;

  reviews = await redis.get(key);

  if (reviews) reviews = JSON.parse(reviews);
  else {
    reviews = await Review.find({
      product: req.params.productId,
    })
      .populate("user", "name Avatar")
      .sort({ updatedAt: -1 });

    await redis.setex(key, redisTTL, JSON.stringify(reviews));
  }

  return res.status(200).json({
    success: true,
    reviews,
  });
});

export const newReview = AsyncHandler(async (req, res, next) => {
  const {id} = req.query;
  const user = await User.findById(id);

  if (!user) return next(new ErrorHandler("Not Logged In", 404));
 
  if(user.role !== "user") return next(new ErrorHandler("Only User can add review", 401))

  const product = await Product.findById(req.params.productId);
  if (!product) return next(new ErrorHandler("Product Not Found", 404));

  const { comment, rating } = req.body;

  const alreadyReviewed = await Review.findOne({
    user: user._id,
    product: product._id,
  });
  let review;
  if (alreadyReviewed) {
    alreadyReviewed.comment = comment;
    alreadyReviewed.rating = rating;

    await alreadyReviewed.save();
  } else {
   review= await Review.create({
      comment,
      rating,
      user: user._id,
      product: product._id,
    });
  }

  const { ratings, numOfReviews } = await findAverageRatings(product._id);

  product.ratings = ratings;
  product.numOfReviews = numOfReviews;

  await product.save();

  await invalidateCache({
    product: true,
    productId: String(product._id),
    admin: true,
    review: true,
  });

  return res.status(alreadyReviewed ? 200 : 201).json({
    success: true,
    message: alreadyReviewed ? "Review Update" : "Review Added",
    review: alreadyReviewed? alreadyReviewed :review,
    
  });
});

export const deleteReview = AsyncHandler(async (req, res, next) => {
  const {id}= req.query;
  const user = await User.findById(id);

  if (!user) return next(new ErrorHandler("Not Logged In", 404));
  if(user.role !== "user") return next(new ErrorHandler("Only User can delete review", 401))

  const review = await Review.findById(req.params.reviewId);
  if (!review) return next(new ErrorHandler("Review Not Found", 404));

  console.log("user:", review.user, "userId:", user._id)
  const isAuthenticateUser = review.user.toString() === user._id.toString();

  if (!isAuthenticateUser) return next(new ErrorHandler("Not Authorized", 401));

  const product = await Product.findById(review.product);

  if (!product) return next(new ErrorHandler("Product Not Found", 404));

  await review.deleteOne();


  const { ratings, numOfReviews } = await findAverageRatings(product._id);

  product.ratings = ratings;
  product.numOfReviews = numOfReviews;

  await product.save();

  await invalidateCache({
    product: true,
    productId: String(product._id),
    admin: true,
    review: true,
  });

  return res.status(200).json({
    success: true,
    message: "Review Deleted",
  });
});





