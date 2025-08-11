const News = require('../models/NewsModel');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

async function publishScheduledNews() {
    try {
        const now = new Date();

        await News.updateMany(
            {
                scheduleNews: { $lte: now },
                status: 2
            },
            {
                $set: {
                    scheduleNews: null,
                    status: 1,
                }
            }
        );

    } catch (error) {
        console.error('Error publishing scheduled news:', error);
        throw error;
    }
}

const NewsController = {
    GetNews: async (req, res) => {
        const { isSelf, post_id, type, user_id, page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        try {
            // await publishScheduledNews();

            if (post_id) {
                const news = await News.find({ _id: post_id });

                res.status(200).json({
                    success: true,
                    data: news,
                    message: 'News fetched successfully'
                });
            } else if (req?.role === 'admin' && type) {
                let condition = {};
                if (type === 'draft') {
                    condition = { status: 0 };
                } else if (type === 'scheduled') {
                    condition = { status: 2 };
                } else if (type === 'premium') {
                    condition = { isPremiumUser: true };
                } else if (type === 'all') {
                    condition = {};
                }

                const news = await News.find(condition)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(parseInt(limit));

                const total = await News.countDocuments(condition);

                res.status(200).json({
                    success: true,
                    data: news,
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit),
                    message: 'News fetched successfully'
                });
            } else if (user_id || isSelf) {
                let condition = {};
                if (type === 'draft') {
                    condition = { status: 0 };
                } else if (type === 'scheduled') {
                    condition = { status: 2 };
                } else if (type === 'premium') {
                    condition = { isPremiumUser: true };
                }

                const news = await News.find({ user_id: isSelf ? req?.userId : user_id, ...condition })
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(parseInt(limit));

                const total = await News.countDocuments({ user_id, ...condition });

                res.status(200).json({
                    success: true,
                    data: news,
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit),
                    message: 'News fetched successfully'
                });
            } else {
                const news = await News.find({ status: 1 })
                    .populate({
                        path: 'user_id',
                        select: '-password',
                    })
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(parseInt(limit));

                const total = await News.countDocuments({ status: 1 });

                res.status(200).json({
                    success: true,
                    data: news,
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit),
                    message: 'News fetched successfully'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch news',
                error: error.message
            });
        }
    },

    CreateNews: async (req, res) => {
        const session = await mongoose.startSession();

        try {
            const { news_id, type, title, newsText, category, scheduleNews, isPremiumUser, premiumcredits } = req.body;
            console.dir(req.body, { depth: null });
            if (news_id) {
                // Start transaction for update
                session.startTransaction();

                // First get the existing news to handle image cleanup
                const existingNews = await News.findById(news_id).session(session);
                if (!existingNews) {
                    throw new Error('News not found');
                }

                let updateData = {
                    title,
                    newsText,
                    category,
                    scheduleNews: scheduleNews || null,
                    isPremiumUser,
                    premiumcredits: isPremiumUser ? premiumcredits : null,
                    status: type === 'draft' ? 0 : scheduleNews ? 2 : 1,
                    updated_by: req?.userId
                };

                // Delete old images from filesystem
                if (existingNews.images && existingNews.images.length > 0) {
                    existingNews.images.forEach(image => {
                        try {
                            if (image.url) {
                                const filename = image.url.replace('/uploads/news/', '');
                                const filePath = path.join(__dirname, '../uploads/news/', filename);
                                if (fs.existsSync(filePath)) {
                                    fs.unlinkSync(filePath);
                                }
                            }
                        } catch (fileError) {
                            console.error('Error deleting old image:', fileError);
                        }
                    });
                }

                // Handle image updates if files are present
                if (req.files && req.files.length > 0) {
                    // Add new images
                    const images = req.files.map(file => ({
                        url: file.filename ? '/uploads/news/' + file.filename : null
                    }));
                    updateData.images = images;
                }

                // Find and update the news
                const updatedNews = await News.findByIdAndUpdate(
                    news_id,
                    { $set: updateData },
                    { new: true, session }
                );

                // Commit transaction if all operations succeed
                await session.commitTransaction();
                session.endSession();

                res.status(200).json({
                    success: true,
                    data: updatedNews,
                    message: 'News updated successfully'
                });
            } else {
                if (!newsText) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please fill required fields'
                    });
                }

                // Start transaction
                session.startTransaction();

                let images = [];

                if (req.files && req.files.length > 0) {
                    images = req.files.map(file => ({
                        url: file.filename ? '/uploads/news/' + file.filename : null
                    }));
                }

                // Create news document
                const newNews = new News({
                    title,
                    newsText,
                    category,
                    scheduleNews: scheduleNews || null,
                    isPremiumUser: isPremiumUser || false,
                    user_id: req.user?.id,
                    premiumcredits: isPremiumUser ? premiumcredits : null,
                    status: 1,
                    // status: type === 'draft' ? 0 : scheduleNews ? 2 : 1,
                    created_by: req.user?.id,
                    images: images
                });

                await newNews.save({ session });

                // Commit transaction if all operations succeed
                await session.commitTransaction();
                session.endSession();

                res.status(201).json({
                    success: true,
                    data: newNews,
                    message: 'News created successfully'
                });
            }
        } catch (error) {
            // Rollback transaction on error
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            session.endSession();

            if (req.files && req.files.length > 0) {
                req.files.forEach(file => {
                    try {
                        const filePath = path.join(__dirname, '../uploads/news/', file.filename);
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    } catch (fileError) {
                        console.error('Error cleaning up file:', fileError);
                    }
                });
            }

            console.error('Error creating news:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create news',
                error: error.message
            });
        }
    },


    DeleteNews: async (req, res) => {
        const session = await mongoose.startSession();

        try {
            const { id } = req.query;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'News ID is required'
                });
            }

            // Start transaction
            session.startTransaction();

            // Find the news first to get image paths before deletion
            const newsToDelete = await News.findOne({ _id: id }).session(session);

            if (!newsToDelete) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({
                    success: false,
                    message: 'News not found'
                });
            }

            // Delete associated images from filesystem
            if (newsToDelete.images && newsToDelete.images.length > 0) {
                await Promise.all(newsToDelete.images.map(async (image) => {
                    try {
                        if (image.url) {
                            const filename = image.url.split('/uploads/news/')[1];
                            if (filename) {
                                const filePath = path.join(__dirname, '../uploads/news/', filename);
                                if (fs.existsSync(filePath)) {
                                    fs.unlinkSync(filePath);
                                }
                            }
                        }
                    } catch (fileError) {
                        console.error('Error deleting news image:', fileError);
                        // Continue with deletion even if image deletion fails
                    }
                }));
            }

            // Delete the news document
            await News.findOneAndDelete({ _id: id }).session(session);

            // Commit transaction
            await session.commitTransaction();
            session.endSession();

            res.status(200).json({
                success: true,
                message: 'News deleted successfully'
            });

        } catch (error) {
            // Rollback transaction on error
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            session.endSession();

            console.error('Error deleting news:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete news',
                error: error.message
            });
        }
    },
};

module.exports = NewsController;