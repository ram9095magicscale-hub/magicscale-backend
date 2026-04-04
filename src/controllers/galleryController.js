import Gallery from '@/models/Gallery.js';

export const getGalleryItems = async (req, res) => {
  try {
    const items = await Gallery.find().sort({ order: 1, createdAt: -1 });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching gallery items' });
  }
};

export const createGalleryItem = async (req, res) => {
  try {
    const itemData = { ...req.body };
    if (req.file) {
      itemData.image = `/uploads/${req.file.filename}`;
    }
    const item = await Gallery.create(itemData);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error creating gallery item' });
  }
};

export const updateGalleryItem = async (req, res) => {
  try {
    const itemData = { ...req.body };
    if (req.file) {
      itemData.image = `/uploads/${req.file.filename}`;
    }
    const item = await Gallery.findByIdAndUpdate(req.params.id, itemData, { new: true });
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error updating gallery item' });
  }
};

export const deleteGalleryItem = async (req, res) => {
  try {
    await Gallery.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Gallery item deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting gallery item' });
  }
};
