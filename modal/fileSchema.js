const mongoose = require('mongoose');
const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  s3ObjectName: {
    type: String,
    required: true,
  },
});


module.exports = mongoose.model('File', fileSchema);
