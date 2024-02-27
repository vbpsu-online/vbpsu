const mongoose = require('mongoose');

const DB = "mongodb+srv://educationworkonline:bolradhabol@cluster0.fbroeyc.mongodb.net/results?retryWrites=true&w=majority&appName=Cluster0"

mongoose.connect(DB).then(()=>{
    console.log("DataBase Connection SuccessFull")
}).catch((err)=>console.log("No Connection Sonething Error"+err));

const db = mongoose.connection;

db.on("error",console.log.bind(console,"Error in Connecting Database"));

db.once("open",function(){
    console.log("SuccesFull Connected To the Database")
})


module.exports = db;