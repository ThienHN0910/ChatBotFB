import mongoose, { Document, Schema } from 'mongoose';

export interface IKnowledge extends Document {
  title: string;
  content: string;
  tags: string[];
  source?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const KnowledgeSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    tags: { type: [String], default: [] },
    source: { type: String, default: 'manual' }
  },
  { timestamps: true }
);

KnowledgeSchema.index({ title: 'text', content: 'text', tags: 'text' });

// Use explicit collection name `knowledge_base` per project requirement
const Knowledge = mongoose.model<IKnowledge>('Knowledge', KnowledgeSchema, 'knowledge_base');

export default Knowledge;
