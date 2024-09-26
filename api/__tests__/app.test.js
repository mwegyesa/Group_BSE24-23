const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const Post = require('../models/Post');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
mongoose.set('strictQuery', true);

let mongoServer;
let app;

jest.setTimeout(10000); // Increase Jest's default timeout

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Disconnect from any existing connection
  await mongoose.disconnect();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Only require the app after connecting to the in-memory database
  const appModule = require('../index');
  app = appModule.app; 
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
}, 10000); 

beforeEach(async () => {
  await User.deleteMany({});
  await Post.deleteMany({});
});


describe('Authentication', () => {
  test('POST /register - should register a new user', async () => {
    const response = await request(app)
      .post('/register')
      .send({
        username: 'testuser',
        password: 'testpassword'
      });
    
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('username', 'testuser');
    expect(response.body).toHaveProperty('password'); 
    expect(response.body.password).toMatch(/^\$2a\$10\$.+/)
  });

  test('POST /login - should login a user', async () => {
    const salt = bcrypt.genSaltSync(10);
    await User.create({
      username: 'testuser',
      password: bcrypt.hashSync('testpassword', salt)
    });

    const response = await request(app)
      .post('/login')
      .send({
        username: 'testuser',
        password: 'testpassword'
      });
    
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('username', 'testuser');
    expect(response.headers['set-cookie']).toBeDefined();
  });

  test('GET /profile - should return user profile', async () => {
    const user = await User.create({
      username: 'testuser',
      password: bcrypt.hashSync('testpassword', 10)
    });

    const token = jwt.sign({ username: user.username, id: user._id }, 'asdfe45we45w345wegw345werjktjwertkj');

    const response = await request(app)
      .get('/profile')
      .set('Cookie', [`token=${token}`]);
    
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('username', 'testuser');
  });
});

describe('Posts', () => {
    let token;
    let userId;
  
    beforeEach(async () => {
      await User.deleteMany({});
      await Post.deleteMany({});
  
      const user = await User.create({
        username: 'testuser',
        password: bcrypt.hashSync('testpassword', 10)
      });
      userId = user._id;
      token = jwt.sign({ username: user.username, id: user._id }, 'asdfe45we45w345wegw345werjktjwertkj');
    });

  test('POST /post - should create a new post', async () => {
    const response = await request(app)
      .post('/post')
      .set('Cookie', [`token=${token}`])
      .field('title', 'Test Post')
      .field('summary', 'Test Summary')
      .field('content', 'Test Content')
      .attach('file', Buffer.from('test image'), 'test.jpg');
    
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('title', 'Test Post');
    expect(response.body).toHaveProperty('author', userId.toString());
  });

  test('GET /post - should return list of posts', async () => {
    await Post.create({
      title: 'Test Post',
      summary: 'Test Summary',
      content: 'Test Content',
      author: userId
    });

    const response = await request(app).get('/post');
    
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toHaveProperty('title', 'Test Post');
  });

  test('GET /post/:id - should return a specific post', async () => {
    const post = await Post.create({
      title: 'Test Post',
      summary: 'Test Summary',
      content: 'Test Content',
      author: userId
    });

    const response = await request(app).get(`/post/${post._id}`);
    
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('title', 'Test Post');
    expect(response.body.author).toHaveProperty('username', 'testuser');
  });

  test('PUT /post - should update a post', async () => {
    // Create an initial post to update
    const post = await Post.create({
        title: 'Original Title',
        summary: 'Original Summary',
        content: 'Original Content',
        author: userId
    });

    // Attempt to update the post
    const response = await request(app)
        .put('/post')
        .set('Cookie', [`token=${token}`])
        .send({
            id: post._id.toString(),
            title: 'Updated Title',
            summary: 'Updated Summary',
            content: 'Updated Content'
        });

    // Check response status
    expect(response.statusCode).toBe(200);

    // Check if the response contains the updated title
    if (response.body.title !== 'Updated Title') {
        console.log('Response body:', response.body); 
    }
    expect(response.body).toHaveProperty('title', 'Updated Title');

    // Additional checks
    expect(response.body).toHaveProperty('summary', 'Updated Summary');
    expect(response.body).toHaveProperty('content', 'Updated Content');

    // Fetch the post again to verify the update
    const updatedPostResponse = await request(app).get(`/post/${post._id}`);
    expect(updatedPostResponse.body).toHaveProperty('title', 'Updated Title');
});

});