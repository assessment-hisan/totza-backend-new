import Project from "../../models/Projects.js"
import CompanyTransaction from "../../models/CompanyTransaction.js";
// Create a new project
export const createProject = async (req, res) => {
  try {
    const { title, description, startDate, endDate, status, estimatedBudget } = req.body;
    const createdBy = req.user._id; // Assuming authMiddleware attaches user

    const project = new Project({
      title,
      description,
      startDate,
      endDate,
      status,
      estimatedBudget,
      createdBy,
    });

    await project.save();
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all projects
export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ deleted: false }).sort({ createdAt: -1 });
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const project = await Project.find({
      _id: req.params.id,
    })
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project)
  } catch (error) {
    
  }
}
// Update vendor
export const updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
export const getProjectTransactions = async (req, res) => {
  try {
    const { project } = req.query;
  console.log(project)
    if (!project) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }

    // Find transactions where the worker is included in the workers array
    const transactions = await CompanyTransaction.find({
      project: project
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
// Delete a project
export const deleteProject = async (req, res) => {
  const {id} = req.params
  console.log(id)
  try {
    const project = await Project.findOne({
      _id: req.params.id,
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    project.deleted = true; // Corrected assignment operator
    await project.save();   // Await the save operation

     
    res.status(200).json({ message: 'Project deleted successfully', project });
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log(error)
  }
};