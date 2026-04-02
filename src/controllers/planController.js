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
        },
        "fssai-registration-1yr": {
          name: "FSSAI Registration (1 Year)",
          slug: "fssai-registration-1yr",
          price: 1500,
          features: ["Basic Application Prep", "Dedicated Filing Support", "1 Year License Validity"]
        },
        "fssai-registration-3yrs": {
          name: "FSSAI Registration (3 Years)",
          slug: "fssai-registration-3yrs",
          price: 2000,
          features: ["Basic Application Prep", "Priority Filing Support", "3 Year License Validity"]
        },
        "fssai-registration-5yrs": {
          name: "FSSAI Registration (5 Years)",
          slug: "fssai-registration-5yrs",
          price: 3000,
          features: ["Basic Application Prep", "Dedicated Filing Agent", "5 Year License Validity"]
        },
        "fssai-state-license": {
          name: "FSSAI State License",
          slug: "fssai-state-license",
          price: 4999,
          features: ["Complete Application Prep", "State License Processing", "Priority Govt Liaison"]
        },
        "fssai-tatkal-license": {
          name: "FSSAI Tatkal Fast-Track",
          slug: "fssai-tatkal-license",
          price: 999,
          features: ["Express Application Prep", "1 Year License Validity", "24h Priority Filing"]
        },
        "fssai-renewal-1yr": {
          name: "FSSAI Renewal (1 Year)",
          slug: "fssai-renewal-1yr",
          price: 1, // 👈 Kept at 1 for user testing as seen in FssaiCoursePage.jsx
          features: ["FSSAI Renewal Filing", "1 Year License Validity", "Cloud Documentation"]
        },
        "fssai-renewal-3yrs": {
          name: "FSSAI Renewal (3 Years)",
          slug: "fssai-renewal-3yrs",
          price: 1200,
          features: ["FSSAI Renewal Filing", "3 Year License Validity", "Priority Support"]
        },
        "fssai-renewal-5yrs": {
          name: "FSSAI Renewal (5 Years)",
          slug: "fssai-renewal-5yrs",
          price: 2000,
          features: ["FSSAI Renewal Filing", "5 Year License Validity", "Compliance Management"]
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
