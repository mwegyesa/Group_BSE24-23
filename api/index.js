const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const User = require('./models/User');
const Post = require('./models/Post');
const bcrypt = require('bcryptjs');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');

const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const uploadMiddleware = multer({ dest: uploadsDir });

const salt = bcrypt.genSaltSync(10);
const secret = 'asdfe45we45w345wegw345werjktjwertkj';

const API_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

app.use(cors({
  credentials: true,
  origin: [API_URL, 'http://localhost:3000'] 
}));

app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, '../client/build')));

mongoose.set('strictQuery', true);

const connectToDatabase = () => {
  return mongoose.connect('mongodb+srv://emmakatwebaze2:mTDpCpi9Qf6KzOEL@cluster0.zxbzy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
};

app.post('/register', async (req,res) => {
  const {username,password} = req.body;
  try{
    const userDoc = await User.create({
      username,
      password:bcrypt.hashSync(password,salt),
    });
    res.json(userDoc);
  } catch(e) {
    console.log(e);
    res.status(400).json(e);
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const userDoc = await User.findOne({ username });

    // Check if the user exists
    if (!userDoc) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Compare passwords
    const passOk = bcrypt.compareSync(password, userDoc.password);

    if (passOk) {
      // Generate JWT token if password matches
      jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
        if (err) throw err;

        // Send the token in a cookie and response
        res.cookie('token', token).json({
          id: userDoc._id,
          username,
        });
      });
    } else {
      // If password is incorrect, return an error
      res.status(400).json({ error: 'Wrong credentials' });
    }
  } catch (error) {
    // Catch any other errors that might occur
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/profile', (req,res) => {
  const {token} = req.cookies;
  jwt.verify(token, secret, {}, (err,info) => {
    if (err) throw err;
    res.json(info);
  });
});

app.post('/logout', (req,res) => {
  res.cookie('token', '').json('ok');
});

app.post('/post', uploadMiddleware.single('file'), async (req,res) => {
  const {originalname,path} = req.file;
  const parts = originalname.split('.');
  const ext = parts[parts.length - 1];
  const newPath = path+'.'+ext;
  fs.renameSync(path, newPath);

  const {token} = req.cookies;
  jwt.verify(token, secret, {}, async (err,info) => {
    if (err) throw err;
    const {title,summary,content} = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover:newPath,
      author:info.id,
    });
    res.json(postDoc);
  });

});

app.put('/post', uploadMiddleware.single('file'), async (req, res) => {
  let newPath = null;
  if (req.file) {
      const { originalname, path } = req.file;
      const parts = originalname.split('.');
      const ext = parts[parts.length - 1];
      newPath = path + '.' + ext;
      fs.renameSync(path, newPath);
  }

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
      if (err) throw err;
      const { id, title, summary, content } = req.body;
      const postDoc = await Post.findById(id);
      const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
      if (!isAuthor) {
          return res.status(400).json('you are not the author');
      }

      // Update fields
      postDoc.title = title;
      postDoc.summary = summary;
      postDoc.content = content;
      if (newPath) {
          postDoc.cover = newPath; // Update cover only if there's a new file
      }

      // Save updated post
      await postDoc.save();

      // Return the updated post
      res.json(postDoc);
  });
});


app.get('/post', async (req,res) => {
  res.json(
    await Post.find()
      .populate('author', ['username'])
      .sort({createdAt: -1})
      .limit(20)
  );
});

app.get('/post/:id', async (req, res) => {
  const {id} = req.params;
  const postDoc = await Post.findById(id).populate('author', ['username']);
  console.log(postDoc)
  res.json(postDoc);
})

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

const PORT = process.env.PORT || 4000;

// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

if (require.main === module) {
  connectToDatabase()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
      });
    })
    .catch(err => {
      console.error('Failed to connect to MongoDB', err);
    });
}

module.exports = { app, connectToDatabase };