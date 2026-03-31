import Plan from "@/models/Plan";

export const getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find();
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ message: "Error fetching plans", error: error.message });
  }
};

export const getPlan = async (req, res) => {
  console.log("getPlan controller called with params:", req.params);
  try {
    const { slug } = req.params;
    const planId = Array.isArray(slug) ? slug[0] : (slug || "");
    console.log("Searching for plan with slug:", planId);
    
    let plan = await Plan.findOne({ slug: planId });
    console.log("Database lookup result:", plan ? "Plan Found" : "Plan Not Found");
    
    if (!plan) {
      console.log("Returning default plans for:", planId);
      const defaultPlans = {
        "zomato-pro": {
          name: "Zomato Pro Onboarding",
          slug: "zomato-pro",
          price: 1999,
          features: [
            "Premium Zomato Listing",
            "Menu Optimization",
            "FSSAI Assistance",
            "Branding Kit",
            "24/7 Priority Support"
          ]
        },
        "zomato-basic": {
          name: "Zomato Basic Onboarding",
          slug: "zomato-basic",
          price: 1999,
          features: [
            "Standard Zomato Listing",
            "Menu Setup",
            "Basic Optimization",
            "Email Support"
          ]
        },
        "swiggy-pro": {
          name: "Swiggy Pro Onboarding",
          slug: "swiggy-pro",
          price: 1999,
          features: [
            "Premium Swiggy Listing",
            "Smart Menu Setup",
            "GST Documentation",
            "Growth Consultation",
            "Priority Activation"
          ]
        },
        "swiggy-basic": {
          name: "Swiggy Basic Onboarding",
          slug: "swiggy-basic",
          price: 1999,
          features: [
            "Standard Swiggy Listing",
            "Menu Setup",
            "Basic Optimization",
            "Email Support"
          ]
        },
        "fssai-onboarding": {
          name: "FSSAI Onboarding",
          slug: "fssai-onboarding",
          price: 2999,
          features: [
            "Full FSSAI Documentation",
            "Legal Compliance Check",
            "Application Filing",
            "License Renewal Alerts",
            "Compliance Advisory"
          ]
        },
        "gst-registration": {
          name: "GST Registration",
          slug: "gst-registration",
          price: 1499,
          features: [
            "New GST Registration",
            "HSN/SAC Code Finder",
            "Document Verification",
            "Digital Signature Help",
            "Priority Processing"
          ]
        },
        "growth": {
          name: "Growth Master Plan",
          slug: "growth",
          price: 14999,
          features: [
            "All-in-One Dashboard",
            "Marketing Automation",
            "Customer Analytics",
            "Competitor Insights",
            "Revenue Optimization"
          ]
        },
        "basic-growth": {
          name: "Basic Growth Plan",
          slug: "basic-growth",
          price: 7999,
          features: [
            "Menu Score Analytics",
            "Review Management",
            "Weekly Performance Calls",
            "Marketing Strategy"
          ]
        },
        "premium-growth": {
          name: "Premium Growth Plan",
          slug: "premium-growth",
          price: 9999,
          features: [
            "Dedicated Account Manager",
            "Ad Campaign Management",
            "Competitor Analysis",
            "Advanced Growth Hacks"
          ]
        }
      };

      if (defaultPlans[planId]) {
        console.log("Found default plan for:", planId);
        return res.status(200).json(defaultPlans[planId]);
      }
      
      console.warn("No plan found in database or defaults for:", planId);
      return res.status(404).json({ message: "Plan not found" });
    }

    res.status(200).json(plan);
  } catch (error) {
    console.error("Error in getPlan controller:", error);
    res.status(500).json({ message: "Error fetching plan", error: error.message });
  }
};

export const getPlans = getPlan;

export const createPlan = async (req, res) => {
  try {
    const plan = await Plan.create(req.body);
    res.status(201).json(plan);
  } catch (error) {
    res.status(400).json({ message: "Error creating plan", error: error.message });
  }
};
