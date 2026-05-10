import mongoose, { Document, Schema } from 'mongoose';

export interface IAuthorizedUser extends Document {
  email: string;
  role?: string;
  createdAt?: Date;
}

const AuthorizedUserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    role: { type: String, default: 'admin' }
  },
  { timestamps: true }
);

const AuthorizedUser = mongoose.models.AuthorizedUser || mongoose.model<IAuthorizedUser>('AuthorizedUser', AuthorizedUserSchema, 'authorized_users');

export default AuthorizedUser;
