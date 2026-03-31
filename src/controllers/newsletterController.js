import NewsletterSubscriber from '@/models/NewsletterSubscriber.js';

export const subscribe = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if already exists
    const existing = await NewsletterSubscriber.findOne({ email });
    if (existing) {
      if (existing.active) {
        return res.status(400).json({ message: 'You are already subscribed!' });
      } else {
        existing.active = true;
        await existing.save();
        return res.status(200).json({ message: 'Subscription reactivated!' });
      }
    }

    await NewsletterSubscriber.create({ email });
    res.status(201).json({ message: 'Successfully subscribed to newsletter!' });
  } catch (error) {
    console.error("Newsletter Error:", error);
    res.status(500).json({ message: 'Error subscribing to newsletter' });
  }
};

export const unsubscribe = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const subscriber = await NewsletterSubscriber.findOne({ email });
    if (subscriber) {
      subscriber.active = false;
      await subscriber.save();
    }
    
    res.status(200).json({ message: 'You have been unsubscribed.' });
  } catch (error) {
    res.status(500).json({ message: 'Error unsubscribing' });
  }
};
