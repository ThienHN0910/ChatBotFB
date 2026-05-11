import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  senderId: string;
  senderName?: string;
  text: string;
  createdAt?: Date;
}

const MessageSchema: Schema = new Schema(
  {
    senderId: { type: String, required: true },
    senderName: { type: String },
    text: { type: String, required: true }
  },
  { timestamps: true }
);

const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema, 'messages');

export default Message;
