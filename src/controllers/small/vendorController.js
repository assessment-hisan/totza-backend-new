// controllers/small/vendorController.js
import CompanyTransaction from "../../models/CompanyTransaction.js";
import Vendor from "../../models/Vendor.js"

// Create a new vendor
export const createVendor = async (req, res) => {
  try {
    const vendorData = req.body;
    vendorData.createdBy = req.user._id;
    
    const vendor = new Vendor(vendorData);
    await vendor.save();
    
    res.status(201).json(vendor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all vendors
export const getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find({ deleted: false }).sort({ createdAt: -1 })
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get vendor by ID
export const getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.json(vendor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update vendor
export const updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.json(vendor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete vendor
export const deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    vendor.deleted = true; 
    await vendor.save();   

    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getVendorTransactions = async (req, res) => {
  try {
    const { vendor } = req.query;
  console.log(vendor)
    if (!vendor) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }

    // Find transactions where the worker is included in the workers array
    const transactions = await CompanyTransaction.find({
      vendor: vendor
    })
      .populate('account', 'name')
      .populate('vendor', 'companyName')
      .populate('project', 'title')
      .sort({ date: -1 }) // Newest first
      .lean();

    console.log(transactions.length)
    // Transform the data for better client-side consumption
    const formattedTransactions = transactions.map(txn => ({
      _id: txn._id,
      type: txn.type,
      amount: txn.amount,
      discount: txn.discount || 0,
      netAmount: txn.amount - (txn.discount || 0),
      date: txn.date,
      dueDate: txn.dueDate,
      status: txn.status,
      account: txn.account?.name || 'N/A',
      vendor: txn.vendor?.companyName || 'N/A',
      project: txn.project?.title || 'N/A',
      purpose: txn.purpose,
      items: txn.items,
      files: txn.files,
      createdAt: txn.createdAt
    }));
   console.log("formateed tnx" , formattedTransactions)
    res.json({
      success: true,
      count: formattedTransactions.length,
      transactions: formattedTransactions
    });

  } catch (error) {
    console.error('Error fetching worker transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transactions'
    });
  }
} 
