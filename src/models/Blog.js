import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    required: true,
  },
  category: {
    type: String,
  },
  coverImage: {
    type: String,
  },
}, { timestamps: true });

export default mongoose.models.Blog || mongoose.model('Blog', blogSchema);
