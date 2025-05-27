import mongoose from 'mongoose';
import CompanyTransaction from '../models/CompanyTransaction.js';


// @desc    Get all dues with filters
// @route   GET /api/dues
// @access  Private
// export const getDues = async (req, res) => {
//   try {
//     const { status, fromDate, toDate, page = 1, limit = 10 } = req.query;
    
//     const filter = { type: 'Due' };
//     if (status) filter.status = status;
//     if (fromDate || toDate) {
//       filter.dueDate = {};
//       if (fromDate) filter.dueDate.$gte = new Date(fromDate);
//       if (toDate) filter.dueDate.$lte = new Date(toDate);
//     }
    
//     const options = {
//       page: parseInt(page, 10),
//       limit: parseInt(limit, 10),
//       sort: { dueDate: 1 },
//       lean: true
//     };
    
//     const dues = await CompanyTransaction.paginate(filter, options);
    
//     res.json({
//       success: true,
//       data: dues.docs,
//       total: dues.totalDocs,
//       totalPages: dues.totalPages,
//       currentPage: dues.page
//     });
//   } catch (err) {
//     console.error('Error fetching dues:', err);
//     res.status(500).json({ 
//       success: false,
//       error: 'Server error fetching dues' 
//     });
//   }
// };
export const getDues = async (req, res) =>{
  try {
    const due = await CompanyTransaction.find({ type: 'Due' }).populate("addedBy")
    res.json({
      data : due
    })
  } catch (error) {
    console.log(error)
  }
}
// @desc    Get single due transaction
// @route   GET /api/dues/:id
// @access  Private
export const getDueById = async (req, res) => {

  try {
    const due = await CompanyTransaction.findById(req.params.id);
    if (!due || due.type !== 'Due') {
      return res.status(404).json({ 
        success: false,
        error: 'Due not found' 
      });
    }
    
    res.json({
      success: true,
      data: due
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid due ID format' 
      });
    }
    console.error('Error fetching due:', err);
    res.status(500).json({ 
      success: false,
      error: 'Server error fetching due' 
    });
  }
};

// @desc    Get payments for a due
// @route   GET /api/dues/:id/payments
// @access  Private
export const getPayments = async (req, res) => {
  try {
    const dueId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(dueId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid due ID format' 
      });
    }
    
    const payments = await CompanyTransaction.find({
     
      linkedDue: dueId
    })
    .sort({ date: -1 }) // Sort by date descending (newest first)
    
    .lean(); // Convert to plain JavaScript objects
    
    res.json({
      success: true,
      data: payments
    });
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ 
      success: false,
      error: 'Server error fetching payments' 
    });
  }
};

// @desc    Create payment for a due
// @route   POST /api/dues/:id/payments
// @access  Private
export const createPayment = async (req, res) => {
  console.log(req.body)
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, paymentDate, purpose, files = [], discount = 0 } = req.body;
    const dueId = req.params.id;
    const userId = req.user.id;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Payment amount must be positive' 
      });
    }

    if (discount < 0) {
      return res.status(400).json({
        success: false,
        error: 'Discount cannot be negative'
      });
    }

    // Get the due within transaction
    const due = await CompanyTransaction.findById(dueId).session(session);
   
    if (!due || due.type !== 'Due') {
      return res.status(404).json({ 
        success: false,
        error: 'Due not found' 
      });
    }

    // Check payment doesn't exceed due (including discount)
    const paidAmount = due.payments.reduce((sum, p) => sum + (p.amount + (p.discount || 0)), 0);
    const remainingAmount = due.amount - paidAmount;
    const totalPayment = amount + discount;
    
    if (totalPayment > remainingAmount) {
      return res.status(400).json({ 
        success: false,
        error: `Payment amount (including discount) exceeds remaining due balance of ${remainingAmount}` 
      });
    }

    // Create payment
    const payment = new CompanyTransaction({
      type: 'Debit',
      amount,
      discount,
      date: paymentDate || new Date(),
      purpose: purpose || `Payment for due ${due.amount} - ${due.vendor || due._id}`,
      linkedDue: dueId,
      files: Array.isArray(files) ? files : [],
      addedBy: userId
    });

    await payment.save({ session });
    
    // Update due status
    const newPaidAmount = paidAmount + amount + discount;
    if (newPaidAmount >= due.amount) {
      due.status = 'Fully Paid';
    } else if (newPaidAmount > 0) {
      due.status = 'Partially Paid';
    }

    due.payments.push({
      payment: payment._id,
      amount: payment.amount,
      discount: payment.discount,
      date: payment.date
    });
    
    await due.save({ session });
    await session.commitTransaction();
    
    res.status(201).json({
      success: true,
      data: {
        payment,
        updatedDue: {
          _id: due._id,
          status: due.status,
          amountPaid: newPaidAmount,
          amountRemaining: due.amount - newPaidAmount
        }
      }
    });

  } catch (err) {
    await session.abortTransaction();
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid ID format' 
      });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        error: err.message 
      });
    }
    
    console.error('Payment error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Server error processing payment' 
    });
  } finally {
    session.endSession();
  }
};
// @desc    Update due status
// @route   PATCH /api/dues/:id/status
// @access  Private (Admin)
export const updateDueStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Partially Paid', 'Fully Paid', 'Overdue', 'Cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid status value' 
      });
    }

    const due = await CompanyTransaction.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!due || due.type !== 'Due') {
      return res.status(404).json({ 
        success: false,
        error: 'Due not found' 
      });
    }

    res.json({
      success: true,
      data: due
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid due ID format' 
      });
    }
    console.error('Error updating due status:', err);
    res.status(500).json({ 
      success: false,
      error: 'Server error updating due status' 
    });
  }
};

// @desc    Delete a payment from a due
// @route   DELETE /api/dues/:dueId/payments/:paymentId
// @access  Private
export const deletePayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { dueId, paymentId } = req.params;

    // Validate ObjectIDs
    if (!mongoose.Types.ObjectId.isValid(dueId) || !mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format'
      });
    }

    // Fetch due with relaxed validation for vendor
    const due = await CompanyTransaction.findById(dueId)
      .session(session)
      .setOptions({ strict: false }); // This bypasses validation temporarily

    if (!due || due.type !== 'Due') {
      return res.status(404).json({
        success: false,
        error: 'Due not found'
      });
    }

    // Remove the payment document
    const deletedPayment = await CompanyTransaction.findOneAndDelete({
      _id: paymentId,
      linkedDue: dueId
    }).session(session);

    if (!deletedPayment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    // Safely remove from due.payments array
    due.payments = due.payments.filter(p => {
      return p && p.payment && p.payment.toString() === paymentId;
    });

    // Recalculate payment status
    const totalPaid = due.payments.reduce((sum, p) => sum + (p?.amount || 0), 0);

    if (totalPaid === 0) {
      due.status = 'Pending';
    } else if (totalPaid < due.amount) {
      due.status = 'Partially Paid';
    } else {
      due.status = 'Fully Paid';
    }

    // Save with validation disabled for vendor field
    await due.save({ 
      session,
      validateBeforeSave: false // Skip validation
    });

    await session.commitTransaction();
    res.json({
      success: true,
      message: 'Payment deleted successfully',
      updatedDue: {
        _id: due._id,
        status: due.status,
        amountPaid: totalPaid,
        amountRemaining: due.amount - totalPaid
      }
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('Error deleting payment:', err);
    res.status(500).json({
      success: false,
      error: 'Server error deleting payment'
    });
  } finally {
    session.endSession();
  }
};