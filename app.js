require('dotenv').config();

const express = require('express');
const PORT = process.env.PORT || 8000;
const path = require('path');
const multer = require('multer');
const AWS = require('aws-sdk');
const fs = require('fs');
const { mongoose } = require('./config/mongoose');
const File = require('./modal/fileSchema');
// const pdfjsLib = require('pdfjs-dist');


const app = express();

app.set('view engine', 'ejs');
// app.set('view engine', 'html');


app.use(express.static('./assets'));
app.use(express.urlencoded({ extended: true }));

// Configure the AWS SDK with your credentials
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Create an S3 instance
const s3 = new AWS.S3();

// Set up multer upload middleware
const upload = multer({
  dest: 'uploads/', // temporary storage for file uploads
  limits: {
    fileSize: 10 * 1024 * 1024, // Set the file size limit to 10MB
  },
  fileFilter: (req, file, cb) => {
    // Validate file type if needed
    // For example, to allow only PDF files:
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  },
});

// Render the index.html homepage
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Render the uploadpdf.html form
app.get('/uploadpdf', function (req, res) {
  res.sendFile(path.join(__dirname, 'views', 'uploadpdf.html'));
});

// Handle file upload
app.post('/upload-pdf', upload.single('pdf-file'), async function (req, res) {
  if (req.file) {
    const fileContent = fs.readFileSync(req.file.path);

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: req.file.filename,
      Body: fileContent,
    };

    // Upload the file to S3
    s3.upload(params, async function (err, data) {
      if (err) {
        console.error('Error uploading file to S3:', err);
        res.status(500).send('Error uploading file');
      } else {
        // File uploaded successfully
        const fileNameWithExtension = req.file.originalname;
        const fileName = path.parse(fileNameWithExtension).name;
        const s3ObjectName = req.file.filename;

        const newFile = new File({ filename: fileName, s3ObjectName: s3ObjectName });
        try {
          await newFile.save();
          console.log('Filename saved to MongoDB');
        } catch (error) {
          console.error('Failed to save filename to MongoDB', error);
        }
        res.send('File uploaded');
      }
    });
  } else {
    // Error uploading file
    console.error('Error uploading file:', req.fileValidationError);
    res.status(500).send('Error uploading file');
  }
});

//Render the PDF viewer page
// app.post('/result', async function (req, res) {
//   const searchFilename = req.body['search-result'];
//   try {
//     const file = await File.findOne({ filename: searchFilename });
//     if (!file) {
//       console.error('File not found in MongoDB:', searchFilename);
//       res.status(404).send('File not found');
//       return;
//     }

//     const params = {
//       Bucket: process.env.AWS_BUCKET_NAME, // Make sure AWS_BUCKET_NAME is set correctly
//       Key: file.s3ObjectName,
//     };

//     // Retrieve the file from S3
//     const fileStream = s3.getObject(params).createReadStream();
//     fileStream.on('error', (err) => {
//       console.error('Error streaming file from S3:', err);
//       res.status(500).send('Error streaming file');
//     });

//     res.setHeader('Content-Type', 'application/pdf');
//     fileStream.pipe(res);
//   } catch (error) {
//     console.error('Error retrieving file from MongoDB:', error);
//     res.status(500).send('Error retrieving file');
//   }
// });


app.post('/result', async function (req, res) {
  const searchFilename = req.body['search-result'];
  try {
    const file = await File.findOne({ filename: searchFilename });
    if (!file) {
      console.error('File not found in MongoDB:', searchFilename);
      res.status(404).send('File not found');
      return;
    }

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME, // Make sure AWS_BUCKET_NAME is set correctly
      Key: file.s3ObjectName,
    };

    // Retrieve the file from S3
    const s3 = new AWS.S3();
    const fileStream = s3.getObject(params).createReadStream();

    // Read the PDF data using PDF.js
    const pdfData = [];
    fileStream.on('data', (chunk) => pdfData.push(chunk));

    fileStream.on('end', async () => {
      const pdfDataBuffer = Buffer.concat(pdfData);
      const pdfDataUri = `data:application/pdf;base64,${pdfDataBuffer.toString('base64')}`;

      // Render the pdf-viewer.ejs page with the PDF data URI
      res.render('pdf-viewer', {
        pdfUrl: pdfDataUri,
      });
    });

    fileStream.on('error', (err) => {
      console.error('Error streaming file from S3:', err);
      res.status(500).send('Error streaming file');
    });
  } catch (error) {
    console.error('Error retrieving file from MongoDB:', error);
    res.status(500).send('Error retrieving file');
  }
});





// Start the server
app.listen(PORT, function () {
  console.log(`Server is running on port ${PORT} `);
});
