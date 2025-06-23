import { supabase } from "./supabase";

export const storage = {
  async uploadImage(file: File, bucket: string = "listings"): Promise<string> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (error) {
      throw error;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return publicUrl;
  },

  async uploadMultipleImages(
    files: File[],
    bucket: string = "listings",
  ): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadImage(file, bucket));
    return Promise.all(uploadPromises);
  },

  async deleteImage(url: string, bucket: string = "listings"): Promise<void> {
    const fileName = url.split("/").pop();
    if (!fileName) return;

    const { error } = await supabase.storage.from(bucket).remove([fileName]);

    if (error) {
      throw error;
    }
  },
};
