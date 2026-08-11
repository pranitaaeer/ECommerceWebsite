
import { UploadApiResponse, v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});
const getBase64 = (file: Express.Multer.File) =>{
  const filePath = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  return filePath;
}

export const uploadToCloudinary=async(files:Express.Multer.File[])=>{
  if(!files || files.length===0) return null
 
   let response=[]
   for(const file of files){
    const filePath= getBase64(file) 
    const result:UploadApiResponse= await cloudinary.uploader.upload(filePath,{
      folder:"uploads",
      resource_type:"auto"
    })
     
    if(result){
     response.push({
     public_id:result.public_id,
     url:result.secure_url
    })
    }
    else{
      throw new Error("error to upload image to cloudinary")
    }
   }
   
   return response.map((i) => ({
    public_id: i.public_id,
    url: i.url,
  }));
}




export const deleteFromCloudinary=async(publicIds:string[])=>{
  if(!publicIds) return null
   for(const id of publicIds){
   await cloudinary.uploader.destroy(id,(err,result)=>{
    if(err) {
      throw new Error("error to delete image from cloudinary")
    }
   })
   }
}
