const mongoose = require('mongoose');

const connectDatabase = async (dbName = "2cs") => {
    try {
        // live db
        let baseUri = process.env.MONGO_URI;        
        // Ensure the base URI doesn't have a trailing '/

        const updatedUri = `${baseUri}${dbName}`;

        console.log("updatedUri", updatedUri);
        
        await mongoose.connect(updatedUri);
        console.log(`Connecting to MongoDB using URI: ${updatedUri}`);

        console.log(`Connected to MongoDB database: ${dbName}`);
    } catch (error) {
        console.error(`This is MongoDB error: ${error}`);
        process.exit(1);
    }
};


module.exports = connectDatabase;
