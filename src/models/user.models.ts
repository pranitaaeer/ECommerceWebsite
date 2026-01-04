import mongoose,{Document, Schema} from "mongoose";
import validator from "validator";

interface IUser extends Document {
  _id: string;
  username: string;
  email: string;
  Avatar: string;
  role: "admin" | "user";
  gender: "male" | "female";
  dob: Date;
  createdAt: Date;
  updatedAt: Date;
  //   Virtual Attribute
  age: number;
}
//TODO

const UserSchema= new Schema(
  {
    _id: {
      type: String,
      required: [true, "Please enter ID"],
    },
    username: {
      type: String,
      required: [true, "Please enter Name"],
    },
     email:{
      type: String,
      unique: [true, "Email already Exist"],
      required: [true, "Please enter email"],
      validate: validator.default.isEmail,
    },
    Avatar: {
      type: String,
      required: [true, "Please add Avatar"],
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      required: [true, "Please enter Gender"],
    },
    dob: {
      type: Date,
      required: [true, "Please enter Date of birth"],
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.virtual("age").get(function () {

  const today = new Date();
  const dob = this.dob;
  if(!dob) return null;
  let age = today.getFullYear() - dob.getFullYear();

  if (
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())
    // if current month and date is less than dob month and date than reduce age by 1
  ) {
    age--;
  }

  return age;
});

export const User = mongoose.model<IUser>("User", UserSchema);
