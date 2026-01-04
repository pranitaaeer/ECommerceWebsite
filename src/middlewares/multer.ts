import multer from "multer";

export const singleUpload = multer().single("ProductImage");
export const mutliUpload = multer().array("ProductImage", 5);
