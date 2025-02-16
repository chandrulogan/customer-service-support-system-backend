// const mongoose = require('mongoose');

// const connectDatabase = async (dbName = "2cs") => {
//     try {
//         // let baseUri = process.env.MONGO_URI;
//         // live db
//         let baseUri = "mongodb+srv://chandrufsdtesting:vPvnQQrVyMMMKH1O@cluster0.2syaxg8.mongodb.net/";
//         // LOCAL DB
//         // let baseUri = "mongodb://localhost:27017/2cs";

//         console.log("baseUri", baseUri);
        
//         // Ensure the base URI doesn't have a trailing '/

//         const updatedUri = `${baseUri}${dbName}`;

//         console.log("updatedUri", updatedUri);
        
//         await mongoose.connect(updatedUri);
//         console.log(`Connecting to MongoDB using URI: ${updatedUri}`);

//         console.log(`Connected to MongoDB database: ${dbName}`);
//     } catch (error) {
//         console.error(`This is MongoDB error: ${error}`);
//         process.exit(1);
//     }
// };


// module.exports = connectDatabase;

const mongoose = require('mongoose');

const connectDatabase = async (dbName = "2cs") => {
    try {
        // let baseUri = process.env.MONGO_URI;
        // live db
        let baseUri = "mongodb+srv://chandrufsdtesting:vPvnQQrVyMMMKH1O@cluster0.2syaxg8.mongodb.net/";
        // LOCAL DB
        // let baseUri = "mongodb://localhost:27017/2cs";

        console.log("baseUri", baseUri);

        // Ensure the base URI doesn't have a trailing '/

        const updatedUri = `${baseUri}${dbName}`;

        console.log("updatedUri", updatedUri);

        await mongoose.connect(updatedUri, {
            maxPoolSize: 50 // Increased connection pool size
        });
        console.log(`Connecting to MongoDB using URI: ${updatedUri}`);

        console.log(`Connected to MongoDB database: ${dbName}`);
    } catch (error) {
        console.error(`This is MongoDB error: ${error}`);
        process.exit(1);
    }
};

module.exports = connectDatabase;

