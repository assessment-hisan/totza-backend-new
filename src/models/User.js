import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String },
    createdAt: { type: Date, default: Date.now },
    deleted : {
        type : Boolean,
        default : false
      }
});

const User = mongoose.model('User', userSchema);
export default User;
