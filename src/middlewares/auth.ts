import { User } from "../models/user.models.js";
import ErrorHandler from "../utils/utility-class.js";
import { AsyncHandler } from "./error.js";

// Middleware to make sure only admin is allowed
export const adminOnly = AsyncHandler(async (req, res, next) => {
  const { id } = req.query;

  if (!id) return next(new ErrorHandler("Please Login", 401));

  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("Invalid User Id", 401));
  if (user.role !== "admin")
    return next(new ErrorHandler("Unauthorized User because you are not admin", 403));

  next();
});
