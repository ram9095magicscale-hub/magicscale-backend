import mongoose from 'mongoose';

const gallerySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  size: {
    type: String,
    enum: ['small', 'medium', 'large', 'wide', 'tall'],
    default: 'small',
  },
  order: {
    type: Number,
    default: 0,
  },
  description: {
    type: String,
    default: "",
  }
}, { timestamps: true });

if (mongoose.models.Gallery) {
  delete mongoose.models.Gallery;
}

export default mongoose.model('Gallery', gallerySchema);
