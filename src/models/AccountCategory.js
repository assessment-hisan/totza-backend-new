import mongoose from 'mongoose';

const accountCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  linkedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deleted : {
    type : Boolean,
    default : false
  } // ✅ New field
}, { timestamps: true });

export default mongoose.model('AccountCategory', accountCategorySchema);
