const User = require('../models/UserModel');
const bcrypt = require('bcryptjs');
const generateAuthToken = require('../config/generateAuthToken');

class UserService {
    async registerUser(name, email, password, dob) {
        if (!name || !email || !password || !dob) {
            throw new Error("Please fill all the fields");
        }

        const userExist = await User.findOne({ email });
        if (userExist) {
            throw new Error("User already exist");
        }

        const user = await User.create({
            name,
            email,
            password,
            dob
        });

        if (user) {
            return {
                _id: user._id,
                name: user.name,
                email: user.email,
                profilepic: user.profilepic,
                dob: user.dob,
                token: generateAuthToken(user._id)
            };
        } else {
            throw new Error("User not created");
        }
    }

    async authenticateUser(email, password) {
        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {
            return {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    profilepic: user.profilepic,
                    dob: user.dob
                },
                token: generateAuthToken(user._id)
            };
        } else {
            throw new Error("Invalid Email or Password");
        }
    }

    async searchUsers(keyword, currentUserId) {
        // Optimized search query
        const query = keyword
            ? {
                $and: [
                    {
                        $or: [
                            { name: { $regex: keyword, $options: 'i' } },
                            { email: { $regex: keyword, $options: 'i' } }
                        ]
                    },
                    { _id: { $ne: currentUserId } }
                ]
            }
            : { _id: { $ne: currentUserId } }; // If no search, just exclude self

        const users = await User.find(query).select('-password').lean();
        return users;
    }

    async getUserById(userId) {
        const user = await User.findById(userId).select('-password').lean();
        if (!user) throw new Error("User not found");
        return user;
    }

    async updateUserProfile(userId, updateData) {
        const user = await User.findById(userId);
        if (!user) throw new Error("User not found");

        if (updateData.name) user.name = updateData.name;
        if (updateData.about !== undefined) user.about = updateData.about;
        if (updateData.banner !== undefined) user.banner = updateData.banner;
        if (updateData.profilepic) user.profilepic = updateData.profilepic;

        const updatedUser = await user.save();
        const userObj = updatedUser.toObject();
        delete userObj.password;
        return userObj;
    }
}

module.exports = new UserService();
