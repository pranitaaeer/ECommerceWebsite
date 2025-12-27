import mongoose,{Document,Schema} from "mongoose"
interface  ICoupon extends Document{
 code:string;
 amount:number;
} 
const CouponSchema = new Schema<ICoupon>({
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

export const Coupon = mongoose.model<ICoupon>("Coupon", CouponSchema);
