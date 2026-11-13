"use client";

export async function uploadProfileImage(file) {
  const cloudName=process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset=process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if(!cloudName||!uploadPreset)throw new Error("Cloudinary environment variables are missing.");
  if(!file||!file.type.startsWith("image/"))throw new Error("Choose a valid image file.");
  if(file.size>5*1024*1024)throw new Error("Please choose an image smaller than 5 MB.");
  const body=new FormData();body.append("file",file);body.append("upload_preset",uploadPreset);
  const response=await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,{method:"POST",body});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error?.message||"Image upload failed.");
  return data.secure_url;
}
