import { User } from "../models/user.models.js";
import { SignupRequestBody } from "../types/types.js";
import { AsyncHandler } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility-class.js";

export const newUser = AsyncHandler(async (req,res,next) => {
    const { username, email, Avatar, gender, _id, dob }:SignupRequestBody = req.body;
    console.log("req.body:", req.body);
    let user = await User.findById(_id);

    if (user)
      return res.status(200).json({
        success: true,
        message: `Welcome, ${user.username}`,
      });

   if ([_id, username, email, gender].some((elem) => elem === "  ")) {
     return next(new ErrorHandler("All fields are required", 400));
}

    if (!dob) return next(new ErrorHandler("Date of Birth is required", 400));


    user = await User.create({
      username,
      email,
      Avatar,
      gender,
      _id,
      dob: new Date(dob),
    });

    return res.status(201).json({
      success: true,
      message: `Welcome, ${user.username}`,
    });
  }
);

export const getAllUsers = AsyncHandler(async (req, res, next) => {
  const users = await User.find({});

  return res.status(200).json({
    success: true,
    users,
  });
});

export const getUser = AsyncHandler(async (req, res, next) => {
  const {userId} = req.params;
  const user = await User.findById(userId);

  if (!user) return next(new ErrorHandler("User not found", 400));

  return res.status(200).json({
    success: true,
    user,
  });
});

export const deleteUser = AsyncHandler(async (req, res, next) => {
  const {userId} = req.params;
  const user = await User.findById(userId);

  if (!user) return next(new ErrorHandler("Invalid Id", 400));

  await user.deleteOne();

  return res.status(200).json({
    success: true,
    message: "User Deleted Successfully",
  });
});
