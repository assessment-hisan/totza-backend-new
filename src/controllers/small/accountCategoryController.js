import AccountCategory from "../../models/AccountCategory.js"

export const createCategory = async (req, res) => {
  try {
    const category = await AccountCategory.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create category' });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await AccountCategory.find({deleted : false});
    res.json(categories);
  } catch {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const updated = await AccountCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Update failed' });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const account = await AccountCategory.findById(req.params.id);
    if(!account){
      return res.status(404).json({ error: 'Account not found' });
    }

    account.deleted =true
    await account.save()

    res.json({ message: 'Deleted successfully' });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
};
