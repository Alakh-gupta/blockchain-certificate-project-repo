const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema({
    certificateId: {
        type: String,
         required: true,
        unique: true
    },

    studentName: {
        type: String,
        required: true
    },

    course: {
        type: String,
        required: true
    },

    issueDate: {
        type: Date,
        default: Date.now
    },

    certificateHash: {
        type: String,
      
    },
    ipfsCID: {
    type: String
    },

    blockchainTransactionHash: {
        type: String
    }
});

module.exports = mongoose.model("Certificate", certificateSchema);