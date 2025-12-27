import mongoose,{Document, Schema} from "mongoose";

export interface IProductImage extends Document{
  public_id:string;
  url:string;
}
interface IProduct extends Document{
  ProductName:string;
  ProductImage:IProductImage[];
  price:number;
  stock:number;
  category:string;
  description:string;
  ratings:number;
  numOfReviews:number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    ProductName: {
      type: String,
      required: [true, "Please enter Name"],
    },
    ProductImage: [
      {
        public_id: {
          type: String,
          required: [true, "Please enter Public ID"],
        },
        url: {
          type: String,
          required: [true, "Please enter URL"],
        },
      },
    ],
    price: {
      type: Number,
      required: [true, "Please enter Price"],
    },
    stock: {
      type: Number,
      required: [true, "Please enter Stock"],
    },
    category: {
      type: String,
      required: [true, "Please enter Category"],
      trim: true,
    },

    description: {
      type: String,
      required: [true, "Please enter Description"],
    },

    ratings: {
      type: Number,
      default: 0,
    },

    numOfReviews: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Product = mongoose.model<IProduct>("Product", ProductSchema);
