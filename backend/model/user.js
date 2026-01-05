const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        unique: true,
        sparse: true,
    },
    email: {    
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    profilePicture: {
        type: String,
        default: 'https://imgs.search.brave.com/ScZF8lrUpjcfLhhBT6LlpD2xOKaVRZghSogb39pUfjg/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pbWcu/ZnJlZXBpay5jb20v/cHJlbWl1bS12ZWN0/b3IvZGVmYXVsdC1h/dmF0YXItcHJvZmls/ZS1pY29uLXNvY2lh/bC1tZWRpYS11c2Vy/LWltYWdlLWdyYXkt/YXZhdGFyLWljb24t/YmxhbmstcHJvZmls/ZS1zaWxob3VldHRl/LXZlY3Rvci1pbGx1/c3RyYXRpb25fNTYx/MTU4LTM0MDcuanBn/P3NlbXQ9YWlzX2h5/YnJpZCZ3PTc0MCZx/PTgw',
    },
    banner: {
        type: String,
        default: '',
    },
    bio: {
        type: String,
        default: '',
        maxlength: 160,
        trim: true,
    },
    aboutMe: {
        type: String,
        default: '',
        maxlength: 500,
        trim: true,
    },
    location: {
        type: String,
        default: '',
        trim: true,
    },
    website: {
        type: String,
        default: '',
        trim: true,
    },
    portfolio: {
        type: String,
        default: '',
        trim: true,
    },
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
}, { timestamps: true });

// Generate unique username from name before saving
userSchema.pre('save', async function() {
    if (this.isNew || this.isModified('name')) {
        if (!this.username) {
            // Generate base username from name (lowercase, remove spaces, keep alphanumeric)
            let baseUsername = this.name
                .toLowerCase()
                .replace(/\s+/g, '')
                .replace(/[^a-z0-9]/g, '');
            
            // Ensure minimum length
            if (baseUsername.length < 3) {
                baseUsername = baseUsername + 'user';
            }
            
            // Check if username exists and add random suffix if needed
            let username = baseUsername;
            let counter = 1;
            const UserModel = mongoose.model('User');
            
            while (await UserModel.findOne({ username, _id: { $ne: this._id } })) {
                username = `${baseUsername}${Math.floor(Math.random() * 9000) + 1000}`;
                counter++;
                if (counter > 10) {
                    username = `${baseUsername}${Date.now()}`;
                    break;
                }
            }
            
            this.username = username;
        }
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;