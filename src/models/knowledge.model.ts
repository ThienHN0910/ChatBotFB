import mongoose, { Document, Schema } from 'mongoose';

export interface IKnowledge extends Document {
  topic: string;
  content: string;
  keywords: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const KnowledgeSchema: Schema = new Schema(
  {
    topic: { type: String, required: true },
    content: { type: String, required: true },
    keywords: { type: [String], default: [] }
  },
  { timestamps: true }
);

KnowledgeSchema.index({ topic: 'text', content: 'text', keywords: 'text' });

// Use explicit collection name `knowledge_base` per project requirement
const Knowledge = mongoose.models.Knowledge || mongoose.model<IKnowledge>('Knowledge', KnowledgeSchema, 'knowledge_base');

export default Knowledge;
