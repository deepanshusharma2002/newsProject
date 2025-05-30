const mongoose = require('mongoose');
const { BaseSchemaFields, BaseSchemaOptions } = require('./BaseSchema');

const NewsModelSchema = new mongoose.Schema({
    title: { type: String },
    newsText: { type: String },
    category: { type: String },
    scheduleNews: { type: Date, default: null },
    isPremiumUser: { type: Boolean, default: false },
    premiumcredits: { type: String },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    images: [{
        url: { type: String },
    }],
    ...BaseSchemaFields
},
    BaseSchemaOptions);

module.exports = mongoose.model('news', NewsModelSchema);