const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
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
    bio: {
        type: String,
        default: '',
        maxlength: 160,
        trim: true,
    },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;