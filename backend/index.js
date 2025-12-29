const express = require("express");
require("dotenv").config();
const connectDB = require("./config/db");
const userRouter = require("./routes/user.Route");
const cookieParser = require("cookie-parser");

const app=express();
const PORT=process.env.PORT;

app.use(express.json());
app.use(cookieParser());

app.use("/user",userRouter);

app.get("/",(req,res)=>{
    res.send("chatApp is running ....");
});


app.listen(PORT,()=>{
    try {
        console.log("Database is connecting...");
        connectDB();
        console.log("Database is connected")
        console.log(`Server is running on  http://localhost:${PORT}`);
    } catch (error) {
        console.error("Error connecting to the database:", error.message);
    }

});