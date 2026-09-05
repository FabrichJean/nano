import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const uploadRoute = `${process.env.EPTA_SERVER || ""}/projects/_/upload`;
export const uploadHeader = {
  key: process.env.EPTA_API_KEY,
};

export async function uploadToEpta(zipPath: string): Promise<void> {
  try {
    const form = new FormData();
    form.append("file", fs.createReadStream(zipPath));
    form.append("path", path.basename(zipPath));

    const headers = {
      ...uploadHeader,
    };

    const {data: response} = await axios.post(uploadRoute, form, {
      headers,
    });

    return response;
  } catch (error) {
    // console.log(error);
    throw error;
  }
}
