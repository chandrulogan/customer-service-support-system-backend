const mongoose = require('mongoose');

const connectDatabase = async (dbName = "CS3") => {
    try {
        let baseUri = process.env.MONGO_URI;
        const updatedUri = `${baseUri}${dbName}`;

        await mongoose.connect(updatedUri, {
            maxPoolSize: 50 // Increased connection pool size
        });

        console.log(`DB CONNECTED`);

    } catch (error) {
        console.error(`This is MongoDB error: ${error}`);
        process.exit(1);
    }
};

module.exports = connectDatabase;

