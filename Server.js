require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bodyParser = require("body-parser");
const multer = require("multer");
const fs = require('fs');
const app = express();
const compression = require('compression');
app.use(compression()); 
// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/iinsilico";
mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log("MongoDB Connection Error:", err));

// Middleware
app.use(express.static(path.join(__dirname, "public"), { maxAge: '1d' } ));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session Config
app.use(session({
    secret: process.env.SESSION_SECRET || "Admin123",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// User Model
const User = mongoose.model("User", new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    affiliation: String,
    jobTitle: String,
    gender: String,
    company: String,
    research: String,
    phoneNumber: String,
    birthDate: Date,
    password: String,
    role: { type: String, default: "user" } // user or admin
}));

// Form Submission Model
const FormSubmission = mongoose.model("FormSubmission", new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    userName: String,
    userEmail: String,
    name: String,
    email: String,
    formType: String,
    fields: Object,
    file: String,  // Add this line
    status: { type: String, default: "pending" },
    createdAt: { type: Date, default: Date.now }
}));
// Updated Contact Request Model with file support
const ContactRequest = mongoose.model("ContactRequest", new mongoose.Schema({
    userName: String,
    userEmail: String,
    name: String,
    email: String,
    phone: String,
    subject: String,
    message: String,
    file: String,  // Add this line for file path storage
    status: { type: String, default: "pending" },
    createdAt: { type: Date, default: Date.now }
}));
// Add a new Result model
const Result = mongoose.model("Result", new mongoose.Schema({
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    files: [String], // Array of file paths
    notes: String,
    submittedAt: { type: Date, default: Date.now }
}));

// Update the Task model 3032025
const Task = mongoose.model("Task", new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    workOn: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Employee assigned to work on this
    userName: String,
    userEmail: String,
    phoneNumber: String,
    subject: String,
    message: String,
    title: String,
    description: String,
    file: String,
    status: { 
        type: String, 
        default: "pending",
        enum: ["pending", "in-progress", "completed", "rejected"] 
    },
    priority: { type: String, default: "medium" },
    dueDate: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,
    results: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Result' }]
}));
// In your server.js, update the error handling
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).send('File size too large. Maximum 300Mb allowed.');
      }
      return res.status(400).send('File upload error: ' + err.message);
    }
    else if (err.code === 'ENOSPC') {
        res.status(500).send('Disk full. Contact admin.');
      }
    next(err);
  });
// Update your file upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, 'public', 'uploads'));
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });
  
  const upload = multer({ 
    storage: storage,
    limits: { fileSize: 300 * 1024 * 1024 } // 300Mb limit
  });
  
  // Make sure the uploads directory exists
  const uploadsDir = path.join(__dirname, 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
   // Add this to serve uploaded files
   app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
  

// Auto-create Admin Account
const createAdminIfNotExists = async () => {
    const adminExists = await User.findOne({ email: "admin@iinsilico.com" });
    if (!adminExists) {
        const hashedPassword = await bcrypt.hash("admin123", 10);
        await User.create({
            name: "Admin",
            email: "admin@iinsilico.com",
            password: hashedPassword,
            role: "admin"
        });
        console.log("Admin account created");
    }
};
createAdminIfNotExists();

// Routes
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "public", "register.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "public", "Login.html")));



// Protected Routes
app.get("/dashboard", (req, res) => {
    if (!req.session.userId) return res.redirect("/login");
    if (req.session.role === "admin") return res.redirect("/admin");
    if (req.session.role === "employee") return res.redirect("/employee");
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/admin", (req, res) => {
    if (!req.session.userId || req.session.role !== "admin") return res.redirect("/login");
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});
// Employee dashboard route
app.get("/employee", (req, res) => {
    if (!req.session.userId || req.session.role !== "employee") return res.redirect("/login");
    res.sendFile(path.join(__dirname, "public", "employee.html"));
});
// Middleware for Admin Authentication
const requireAdmin = (req, res, next) => {
    if (!req.session.userId || req.session.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
    }
    next();
};
//-----------------------------------------------------------------
// Contact Form Submission Endpoint
//-----------------------------------------------------------------
// Get user data
app.get("/api/user-data", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    
    try {
        const user = await User.findById(req.session.userId);
        res.json({
            name: user.name,
            email: user.email,
            affiliation: user.affiliation,
            phoneNumber: user.phoneNumber
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching user data" });
    }
});

// Update profile
app.post("/api/update-profile", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    
    try {
        const { name, email, affiliation, phoneNumber } = req.body;
        await User.findByIdAndUpdate(req.session.userId, {
            name,
            email,
            affiliation,
            phoneNumber
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Error updating profile" });
    }
});
// security Update
app.post("/api/update-security", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    
    try {
        const { currentPassword, newPassword } = req.body;
        
        // Get the user
        const user = await User.findById(req.session.userId);
        if (!user) return res.status(404).json({ error: "User not found" });
        
        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ error: "Current password is incorrect" });
        
        // Prepare updates
        const updates = {};
        if (newPassword) updates.password = await bcrypt.hash(newPassword, 10);
        
        // Update user
        await User.findByIdAndUpdate(req.session.userId, updates);
        
        
        
        res.json({ success: true });
    } catch (err) {
        console.error("Error updating security settings:", err);
        res.status(500).json({ error: "Error updating security settings" });
    }
});
// Get Logged in? True : false;
app.get("/api/check-auth", (req, res) => {
    res.json({ isAuthenticated: !!req.session.userId });
});
// Get user metrics
app.get("/api/user-metrics", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    
    try {
        const user = await User.findById(req.session.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        // Count pending form submissions
        const pendingForms = await FormSubmission.countDocuments({
            userId: req.session.userId,
            status: "pending" // Add this field to your FormSubmission model if not exists
        });

        // Count pending contact requests
        const pendingContacts = await ContactRequest.countDocuments({
            $or: [
                { email: user.email },
                { name: user.name }
            ],
            status: "pending" // Add this field to your ContactRequest model if not exists
        });

        // Count tasks in different states
        const pendingTasks = await Task.countDocuments({ 
            userId: req.session.userId, 
            status: "pending" 
        });

        res.json({
            pendingRequests: pendingForms + pendingContacts, // Total pending requests
            pendingTasks, // Pending tasks (separate count)
            active: await Task.countDocuments({ 
                userId: req.session.userId, 
                status: "in-progress" 
            }),
            completed: await Task.countDocuments({ 
                userId: req.session.userId, 
                status: "completed" 
            }),
            upcomingDeadlines: await Task.countDocuments({ 
                userId: req.session.userId,
                dueDate: { $gte: new Date(), $lte: new Date(Date.now() + 7*24*60*60*1000) }
            }),
            statusDistribution: {
                pending: pendingTasks,
                inProgress: await Task.countDocuments({ 
                    userId: req.session.userId, 
                    status: "in-progress" 
                }),
                completed: await Task.countDocuments({ 
                    userId: req.session.userId, 
                    status: "completed" 
                }),
                rejected: await Task.countDocuments({ 
                    userId: req.session.userId, 
                    status: "rejected" 
                })
            }
        });
    } catch (err) {
        console.error("Error fetching metrics:", err);
        res.status(500).json({ error: "Error fetching metrics" });
    }
});


// Get tasks assigned to employee
app.get("/api/employee-tasks", async (req, res) => {
    if (!req.session.userId || req.session.role !== "employee") {
        return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
        const tasks = await Task.find({ workOn: req.session.userId })
            .populate('userId', 'name email')
            .populate('assignedBy', 'name email')
            .sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: "Error fetching tasks" });
    }
});

// Submit results for a task
app.post("/api/submit-results/:taskId", upload.array('files'), async (req, res) => {
    if (!req.session.userId || req.session.role !== "employee") {
        return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
        const { notes } = req.body;
        const files = req.files ? req.files.map(file => path.relative(path.join(__dirname, 'public'), file.path)) : [];
        
        const result = new Result({
            taskId: req.params.taskId,
            employeeId: req.session.userId,
            files,
            notes
        });
        
        await result.save();
        
        // Add result to task
        await Task.findByIdAndUpdate(req.params.taskId, {
            $push: { results: result._id },
            status: "completed"
        });
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Error submitting results" });
    }
});

// Update task due date
app.put("/api/update-due-date/:taskId", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    
    try {
        const { dueDate } = req.body;
        const updatedTask = await Task.findByIdAndUpdate(
            req.params.taskId,
            { dueDate: new Date(dueDate) },
            { new: true }
        );
        
        if (!updatedTask) {
            return res.status(404).json({ error: "Task not found" });
        }
        
        res.json({ success: true, task: updatedTask });
    } catch (err) {
        res.status(500).json({ error: "Error updating due date" });
    }
});


// Get user requests
// Get user requests (both form submissions and contact requests)
app.get("/api/user-requests", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    
    try {
        // Get current user's info
        const user = await User.findById(req.session.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        // Get form submissions by this user
        const formSubmissions = await FormSubmission.find({ userId: req.session.userId })
            .sort({ createdAt: -1 });

        // Get contact requests from this user (by email or name)
        const contactRequests = await ContactRequest.find({
            $or: [
                { email: user.email },
                { name: user.name }
            ]
        }).sort({ createdAt: -1 });

        // Combine and format the results
        const requests = [
            ...formSubmissions.map(sub => ({
                _id: sub._id,
                type: sub.formType,
                createdAt: sub.createdAt,
                status: 'submitted', // or whatever status you want
                source: 'form',
                title: sub.fields?.title || sub.formType,
                description: sub.fields?.description || ''
            })),
            ...contactRequests.map(req => ({
                _id: req._id,
                type: req.subject,
                createdAt: req.createdAt,
                status: 'submitted',
                source: 'contact',
                title: req.subject,
                description: req.message
            }))
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(requests);
    } catch (err) {
        console.error("Error fetching requests:", err);
        res.status(500).json({ error: "Error fetching requests" });
    }
});
// Get results for user's tasks
app.get("/api/user-results", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });

    try {
        // Find tasks assigned to the user that have results
        const tasksWithResults = await Task.find({ 
            userId: req.session.userId,
            results: { $exists: true, $not: { $size: 0 } } // Tasks with non-empty results array
        })
        .populate({
            path: 'results',
            populate: { path: 'employeeId', select: 'name email' } // Include employee details
        })
        .sort({ createdAt: -1 });

        res.json(tasksWithResults);
    } catch (err) {
        res.status(500).json({ error: "Error fetching results" });
    }
});
// Get user projects
app.get("/api/user-projects", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    
    try {
        const projects = await Task.find({ userId: req.session.userId })
            .sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: "Error fetching projects" });
    }
});

// Submit new request
app.post("/api/submit-request", upload.single('file'), async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    
    try {
        const { requestType, title, description } = req.body;
        const filePath = req.file ? path.relative(path.join(__dirname, 'public'), req.file.path) : null;
        
        const submission = new FormSubmission({
            userId: req.session.userId,
            userName: req.session.userName,
            userEmail: req.session.userEmail,
            formType: requestType,
            fields: {
                title,
                description
            },
            file: filePath
        });
        
        await submission.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Error submitting request" });
    }
});
//-----------------------------------------------------------------------------------------

// Update your contact submission endpoint 32922025 1
app.post("/submit-contact", upload.single('file'), async (req, res) => {
    try {
        const userName = req.session.userName ? null : await User.findById(req.session.userId);
       
        const { formType, ...fields } = req.body;
        const filePath = req.file ? `/uploads/${req.file.filename}` : null;

        const submission = new FormSubmission({
            userId: req.session.userId,
            userName: req.session.userName,
            userEmail: req.session.userEmail,
            formType: formType.trim(), // Fix: Trim whitespace
            fields,
            file: filePath,
            status: "pending"
        });

        await submission.save();
      
        res.send("Request submitted successfully!");
    } catch (error) {
        console.error("Error saving submission:", error); // Detailed error
        res.status(500).send("Error submitting request.");
    }
});
  
 
app.post("/submit-form", async (req, res) => {
    if (!req.session.userId) {
        return res.status(403).json({ error: "You must be logged in to submit this form." });
    }
    try {
        const { formType, ...fields } = req.body;
        if (!formType) return res.status(400).json({ error: "Form type is required" });

        const user = await User.findById(req.session.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const submission = new FormSubmission({
            userId: user._id,
            userName: user.name,
            userEmail: user.email,
            formType,
            fields
        });
        await submission.save();
        res.json({ message: "Form submitted successfully!" });
    } catch (error) {
        console.error("Error submitting form:", error);
        res.status(500).json({ error: "Submission failed" });
    }
});

// Task Management Routes
app.post("/api/submit-task", upload.single("file"), async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    try {
        const { title, description } = req.body;
        const filePath = req.file ? path.relative(path.join(__dirname, 'public'), req.file.path) : "";
        
        const user = await User.findById(req.session.userId);
        
        await Task.create({
            userId: req.session.userId,
            userName: user.name,
            userEmail: user.email,
            title,
            description,
            file: filePath,
            status: "pending",
            createdAt: new Date()
        });
        res.status(201).json({ message: "Task submitted successfully" });
    } catch (error) {
        console.error("Error submitting task:", error);
        res.status(500).json({ error: "Error submitting task" });
    }
});

// Get user's tasks/projects
app.get("/api/user-tasks", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    
    try {
        const user = await User.findById(req.session.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const tasks = await Task.find({
            $or: [
                { userId: req.session.userId },
                { userEmail: user.email },
                { userName: user.name }
            ]
        })
        .sort({ createdAt: -1 })
        .populate('assignedBy', 'name email'); // If you need assigner info

       
        res.json(tasks);
    } catch (err) {
        console.error("SERVER ERROR:", err); // Detailed error logging
        res.status(500).json({ 
            error: "Error fetching tasks",
            details: err.message 
        });
    }
});
// app.get("/api/user-tasks", async (req, res) => {
//     if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
//     try {
//         const tasks = await Task.find({ userId: req.session.userId });
//         res.json(tasks);
//     } catch (error) {
//         res.status(500).json({ error: "Error fetching tasks" });
//     }
// });

app.get("/api/admin-tasks", requireAdmin, async (req, res) => {
    try {
        const tasks = await Task.find().populate('userId', 'name email');
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: "Error fetching tasks" });
    }
});

// In server.js, update or add these endpoints:
// Update form submission
app.put("/api/form-request/:id", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    
    try {
        const { formType, fields } = req.body;
        const filePath = req.file ? req.file.path : null;  // Get uploaded file path
        const updatedRequest = await FormSubmission.findByIdAndUpdate(
            req.params.id,
            { formType, fields },
            { new: true }
        );
        
        if (!updatedRequest) {
            return res.status(404).json({ error: "Request not found" });
        }
        
        res.json({ success: true, request: updatedRequest });
    } catch (err) {
        console.error("Error updating form request:", err);
        res.status(500).json({ error: "Error updating request" });
    }
});
// Update contact request
app.put("/api/contact-request/:id", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    
    try {
        const { name, email, phone, subject, message } = req.body;
        const updatedRequest = await ContactRequest.findByIdAndUpdate(
            req.params.id,
            { name, email, phone, subject, message },
            { new: true }
        );
        
        if (!updatedRequest) {
            return res.status(404).json({ error: "Request not found" });
        }
        
        res.json({ success: true, request: updatedRequest });
    } catch (err) {
        console.error("Error updating contact request:", err);
        res.status(500).json({ error: "Error updating request" });
    }
});
// Update Task endpoint
app.put("/api/update-task/:id", requireAdmin, async (req, res) => {
  try {
    const { title, description, status, priority } = req.body;
    
    // Validate priority
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: "Invalid priority value" });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { 
        title, 
        description, 
        status,
        priority: priority || 'normal', // Default to normal if not provided
        updatedAt: new Date() 
      },
      { new: true }
    );
    
    res.json({ 
      message: "Task updated successfully",
      task: updatedTask 
    });
  } catch (error) {
    res.status(500).json({ error: "Error updating task" });
  }
});

// Assign Task endpoint
// Updated assign task endpoint in server.js 3302025 
// Update the assign task endpoint
app.put("/api/assign-task/:id", requireAdmin, async (req, res) => {
    try {
        const { userId, workOn } = req.body;
        
        // Prepare update data
        const updateData = { 
            status: "in-progress",
            updatedAt: new Date()
        };
        
        // Add user assignment if provided
        if (userId) {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }
            updateData.userId = user._id;
            updateData.userName = user.name;
            updateData.userEmail = user.email;
        }
        
        // Add employee assignment if provided
        if (workOn) {
            const employee = await User.findById(workOn);
            if (!employee || employee.role !== 'employee') {
                return res.status(400).json({ error: "Invalid employee selected" });
            }
            updateData.workOn = employee._id;
        }
        
        // Update the task
        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        
        if (!updatedTask) {
            return res.status(404).json({ error: "Task not found" });
        }

        res.json({ 
            message: "Task assigned successfully",
            task: updatedTask 
        });
    } catch (error) {
        console.error("Error assigning task:", error);
        res.status(500).json({ error: "Error assigning task" });
    }
});

// Delete Task endpoint
app.delete("/api/delete-task/:id", requireAdmin, async (req, res) => {
    try {
        await Task.findByIdAndDelete(req.params.id);
        res.json({ message: "Task deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Error deleting task" });
    }
});

// Admin Management Routes
// Updated task fetching endpoint 3292025 1
app.get("/api/admin-data", async (req, res) => {
    if (!req.session.userId || req.session.role !== "admin") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const users = await User.find();
      const tasks = await Task.find()
      .populate('userId', 'name email')
       .populate('workOn', 'name email'); // This populates user and employee data
      
      res.json({ users, tasks });
    } catch (error) {
      res.status(500).json({ error: "Error fetching admin data" });
    }
  });

app.post("/api/add-user", requireAdmin, async (req, res) => {
    try {
        const { name, email, affiliation, jobTitle, gender, company, research, phoneNumber, birthDate, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({
            name,
            email,
            affiliation,
            jobTitle,
            gender,
            company,
            research,
            phoneNumber,
            birthDate: new Date(birthDate),
            password: hashedPassword,
            role: role || "user"
        });
        res.status(201).json({ message: "User added successfully" });
    } catch (error) {
        res.status(500).json({ error: "Error adding user" });
    }
});

app.put("/api/update-user/:id", requireAdmin, async (req, res) => {
    try {
        const { 
            name, 
            email, 
            affiliation, 
            jobTitle, 
            gender, 
            company, 
            research, 
            phoneNumber, 
            birthDate, 
            role,
            password  // New password field
        } = req.body;

        // Prepare update data
        const updateData = {
            name,
            email,
            affiliation,
            jobTitle,
            gender,
            company,
            research,
            phoneNumber,
            birthDate: birthDate ? new Date(birthDate) : undefined,
            role: role || "user"
        };

        // Check if email is being changed and if it's unique
        if (email) {
            const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
            if (existingUser) {
                return res.status(400).json({ error: "Email already in use" });
            }
        }

        // Handle password update if provided
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        // Update the user
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true } // Return the updated document
        );

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json({ 
            message: "User updated successfully",
            user: updatedUser 
        });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ 
            error: "Error updating user",
            details: error.message 
        });
    }
});
app.put("/api/update-request-status/:id", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    
    try {
        const { status, type } = req.body; // type can be 'form' or 'contact'
        
        let updatedRequest;
        if (type === 'form') {
            updatedRequest = await FormSubmission.findByIdAndUpdate(
                req.params.id,
                { status },
                { new: true }
            );
        } else {
            updatedRequest = await ContactRequest.findByIdAndUpdate(
                req.params.id,
                { status },
                { new: true }
            );
        }
        
        if (!updatedRequest) {
            return res.status(404).json({ error: "Request not found" });
        }
        
        res.json({ success: true, request: updatedRequest });
    } catch (err) {
        console.error("Error updating request status:", err);
        res.status(500).json({ error: "Error updating request status" });
    }
});

app.delete("/admin/deleteUser/:id", requireAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.sendStatus(200);
    } catch (error) {
        res.status(500).send("Error deleting user");
    }
});

// Get single task details
app.get("/api/task/:id", async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('userId', 'name email')
            .populate('assignedBy', 'name email');
        
        if (!task) return res.status(404).json({ error: "Task not found" });
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: "Error fetching task" });
    }
});
//for form submission
// Update this endpoint in server.js
app.get("/admin/forms", async (req, res) => {
    try {
        const submissions = await FormSubmission.find().sort({ createdAt: -1 });
        const contactRequests = await ContactRequest.find().sort({ createdAt: -1 });

        const allRequests = [
            ...submissions.map(sub => ({
                _id: sub._id,
                type: 'form',
                formType: sub.formType,
                userName: sub.userName,
                userEmail: sub.userEmail,
                createdAt: sub.createdAt,
                status: sub.status
            })),
            ...contactRequests.map(req => ({
                _id: req._id,
                type: 'contact',
                formType: req.subject || 'Contact Request',
                userName: req.name,
                userEmail: req.email,
                createdAt: req.createdAt,
                status: req.status
            }))
        ];

        res.json(allRequests);
    } catch (error) {
        console.error("Error fetching requests:", error);
        res.status(500).json({ error: "Failed to fetch requests." });
    }
});


// Add these endpoints to server.js

// Accept contact/form request and create task
// Updated accept request endpoint
app.post("/api/accept-contact/:id", requireAdmin, async (req, res) => {
    try {
        const { requestType } = req.body; // 'form' or 'contact'
        
        // Find the request based on type
        let request;
        if (requestType === 'contact') {
            request = await ContactRequest.findById(req.params.id);
        } else {
            request = await FormSubmission.findById(req.params.id);
        }

        if (!request) {
            return res.status(404).json({ error: "Request not found" });
        }

        // Create task from request
        const newTask = new Task({
            userId: request.userId || null,
            userName: request.userName || request.name,
            userEmail: request.userEmail || request.email,
            phoneNumber: request.phoneNumber || request.phone,
            subject: request.subject || request.formType,
            message: request.message || JSON.stringify(request.fields),
            file: request.file || "",
            status: "pending",
            createdAt: new Date(),
            assignedBy: req.session.userId
        });

        await newTask.save();

        // Delete the original request
        if (requestType === 'contact') {
            await ContactRequest.findByIdAndDelete(req.params.id);
        } else {
            await FormSubmission.findByIdAndDelete(req.params.id);
        }

        res.json({ 
            message: "Request accepted and task created successfully", 
            task: newTask 
        });
    } catch (error) {
        console.error("Error accepting request:", error);
        res.status(500).json({ 
            error: "Error accepting request",
            details: error.message 
        });
    }
});

// Delete form submission
app.delete("/api/form-requests/:id", requireAdmin, async (req, res) => {
    try {
        await FormSubmission.findByIdAndDelete(req.params.id);
        res.json({ message: "Form submission deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Error deleting form submission" });
    }
});

// Add these endpoints to your existing server.js file

// Get all contact requests (for admin)
// Update this endpoint to return both FormSubmissions and ContactRequests
app.get("/api/contact-requests", requireAdmin, async (req, res) => {
    try {
        const formSubmissions = await FormSubmission.find().sort({ createdAt: -1 });
        const contactRequests = await ContactRequest.find().sort({ createdAt: -1 });
        
        const allRequests = [
            ...formSubmissions.map(sub => ({
                _id: sub._id,
                type: 'form',
                name: sub.userName,
                email: sub.userEmail,
                subject: sub.formType,
                createdAt: sub.createdAt,
                status: sub.status,
                originalData: sub // Keep original data for details view
            })),
            ...contactRequests.map(req => ({
                _id: req._id,
                type: 'contact',
                name: req.name,
                email: req.email,
                subject: req.subject,
                createdAt: req.createdAt,
                status: req.status,
                originalData: req // Keep original data for details view
            }))
        ];
        
        res.json(allRequests);
    } catch (error) {
        res.status(500).json({ error: "Error fetching contact requests" });
    }
});

// Update the single request endpoint
app.get("/api/contact-request/:id", requireAdmin, async (req, res) => {
    try {
        // Check both collections
        let request = await FormSubmission.findById(req.params.id);
        let type = 'form';
        
        if (!request) {
            request = await ContactRequest.findById(req.params.id);
            type = 'contact';
        }
        
        if (!request) {
            return res.status(404).json({ error: "Request not found" });
        }
        
        res.json({
            ...request.toObject(),
            type
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching request" });
    }
});

// Delete contact request
app.delete("/api/contact-requests/:id", requireAdmin, async (req, res) => {
    try {
        await FormSubmission.findByIdAndDelete(req.params.id);
        res.json({ message: "Request deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Error deleting request" });
    }
});
// Get single contact request
app.get("/api/contact-request/:id", async (req, res) => {
    try {
        const request = await ContactRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ error: "Request not found" });
        res.json(request);
    } catch (err) {
        res.status(500).json({ error: "Error fetching contact request" });
    }
});

// Get single form submission
app.get("/api/form-request/:id", async (req, res) => {
    try {
        const request = await FormSubmission.findById(req.params.id);
        if (!request) return res.status(404).json({ error: "Request not found" });
        res.json(request);
    } catch (err) {
        res.status(500).json({ error: "Error fetching form submission" });
    }
});
// // Add this endpoint to server.js
// app.get("/api/contact-request/:id", async (req, res) => {
//     try {
//       // Check both collections
//       let request = await FormSubmission.findById(req.params.id);
//       if (!request) {
//         request = await ContactRequest.findById(req.params.id);
//       }
      
//       if (!request) {
//         return res.status(404).json({ error: "Request not found" });
//       }
      
//       res.json(request);
//     } catch (error) {
//       res.status(500).json({ error: "Error fetching request" });
//     }
//   });



// Auth Routes
app.post("/register", async (req, res) => {
    const { Name, email, Affiliation, jobTitle, Gender, Company, Research, PhoneNumber, Birth, Password, RePassword } = req.body;
    if (Password !== RePassword) return res.send("Passwords do not match!");
    try {
        const hashedPassword = await bcrypt.hash(Password, 10);
        await User.create({
            name: Name,
            email,
            affiliation: Affiliation,
            jobTitle,
            gender: Gender,
            company: Company,
            research: Research,
            phoneNumber: PhoneNumber,
            birthDate: new Date(Birth),
            password: hashedPassword,
            role: "user"
        });
        res.redirect("/login");
    } catch (error) {
        res.send("Error: User already exists or invalid input!");
    }
});

app.post("/login", async (req, res) => {
    const { UserName, Password } = req.body;
    const user = await User.findOne({
        $or: [
            { email: UserName },
            { phoneNumber: UserName }
        ]
    });
    if (!user) return res.send("User not found!");
    const isMatch = await bcrypt.compare(Password, user.password);
    if (!isMatch) return res.send("Invalid password!");
    req.session.regenerate(err => {
        if (err) return res.send("Session error");
        req.session.userId = user._id;
        req.session.role = user.role;
        req.session.userName = user.name;  // Add this line
        req.session.userEmail = user.email;  // Add this line
        return res.redirect(user.role === "admin" ? "/admin" : "/dashboard");
    });
});

app.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) return res.send("Logout failed!");
        res.redirect("/");
    });
});

// Start Server
// const PORT = process.env.PORT ||  5000 ;
// const PORT = 5000 ;
// app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
// Server Configuration
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces
// Start Server
app.listen(PORT, HOST, () => {
    console.log(` Server running on http://${HOST}:${PORT}`);
    console.log(`- Local access: http://localhost:${PORT}`);
    console.log(`- Network access: http://${getNetworkIp()}:${PORT}`);
});
// Helper function to get network IP
function getNetworkIp() {
    const interfaces = require('os').networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}