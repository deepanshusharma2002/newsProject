const mongoose = require('mongoose');

const BaseSchemaFields = {
    status: { type: Number, default: 1 }, // Status as a number (e.g., 1 for active, 0 for inactive)
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
};

const BaseSchemaOptions = {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
};

module.exports = {
    BaseSchemaFields,
    BaseSchemaOptions
};