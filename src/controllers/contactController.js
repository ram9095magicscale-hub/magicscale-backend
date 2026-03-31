import Contact from '@/models/Contact.js';

export const submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, service, message, source } = req.body;

    if (!name || !phone || !service) {
      return res.status(400).json({ message: 'Name, Phone, and Service are required' });
    }

    // Basic email validation if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Please provide a valid email address' });
      }
    }

    const newContact = await Contact.create({
      name,
      email,
      phone,
      service,
      message,
      source: source || 'contact_form',
    });

    res.status(201).json({
      message: 'Your inquiry has been submitted successfully!',
      contact: newContact,
    });
  } catch (error) {
    console.error("Contact Form Error:", error);
    res.status(500).json({ message: 'Error sending message. Please try again later.' });
  }
};

export const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json(contacts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching contacts' });
  }
};
