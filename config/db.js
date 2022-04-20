const mongoose = require("mongoose");
const connectToMongoDB = async()=>{
    try{
       const conn = await mongoose.connect(process.env.MONGO_URI,{
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`Connected to MongoDB: ${conn.connection.host}`);
    }catch(err){
        console.log(err);
        process.exit();
    }
}

module.exports = connectToMongoDB;  