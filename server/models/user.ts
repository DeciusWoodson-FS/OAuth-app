import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  email: String,
  accessToken: String,
  refreshToken: String,
  expiryDate: Number,
});

export const User = mongoose.model("User", UserSchema);
