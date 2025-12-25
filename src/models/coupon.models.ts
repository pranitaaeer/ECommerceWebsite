import mongoose,{Schema} from "mongoose"

const CouponSchema = new Schema({
  code: {
    type: String,
    required: [true, "Please enter the Coupon Code"],
    unique: true,
  },
  amount: {
    type: Number,
    required: [true, "Please enter the Discount Amount"],
  },
});

export const Coupon = mongoose.model("Coupon", CouponSchema);
