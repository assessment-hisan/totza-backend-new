import Item from '../../models/Items.js';

export const addItem = async (req, res) => {
  try {
    const { name, rate, unit, description, vendor } = req.body;
    const newItem = await Item.create({
      name,
      // rate,
      // unit,
      // description,
      // vendor,
      // addedBy: req.user.id
    });
    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add item' });
  }
};

export const getItems = async (req, res) => {
  try {
    const { vendorId } = req.query;
    const items = await Item.find({deleted : false});
    res.json(items);
  } catch {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
};

export const updateItem = async (req, res) => {
  try {
    const updated = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Update failed' });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if(!item){
      return res.status(404).json({ error: 'item not found' });
    }
    item.deleted = true
    await item.save()
    
    res.json({ message: 'Item deleted' });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
};
