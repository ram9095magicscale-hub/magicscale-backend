import Blog from '@/models/Blog.js';
import NewsletterSubscriber from '@/models/NewsletterSubscriber.js';
import { sendNewsletterEmail } from '@/utils/email.js';

export const getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching blogs' });
  }
};

export const createBlog = async (req, res) => {
  try {
    const blogData = { ...req.body };
    if (req.file) {
      blogData.coverImage = `/uploads/${req.file.filename}`;
    }
    const blog = await Blog.create(blogData);
    
    // ✅ Trigger Newsletter
    const subscribers = await NewsletterSubscriber.find({ active: true });
    if (subscribers.length > 0) {
      sendNewsletterEmail(subscribers, blog).catch(err => console.error("❌ Newsletter failed:", err));
    }

    res.status(201).json(blog);
  } catch (error) {
    res.status(500).json({ message: 'Error creating blog' });
  }
};

export const updateBlog = async (req, res) => {
  try {
    const blogData = { ...req.body };
    if (req.file) {
      blogData.coverImage = `/uploads/${req.file.filename}`;
    }
    const blog = await Blog.findByIdAndUpdate(req.params.id, blogData, { new: true });
    
    // ✅ Trigger Newsletter on Update as well
    const subscribers = await NewsletterSubscriber.find({ active: true });
    if (subscribers.length > 0) {
      sendNewsletterEmail(subscribers, blog).catch(err => console.error("❌ Newsletter update failed:", err));
    }

    res.status(200).json(blog);
  } catch (error) {
    res.status(500).json({ message: 'Error updating blog' });
  }
};

export const deleteBlog = async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Blog deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting blog' });
  }
};
