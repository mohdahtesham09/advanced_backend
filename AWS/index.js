import express from "express";
import dotenv from "dotenv";
dotenv.config();

const app = express();
express.json();

const PORT = process.env.PORT || 3000;

app.get("/health", (req, res)=>{
    return res.status(200).json({message: "Server is healthy"});
})

app.get("/", (req, res0=>{
    return res.status(200).json({message: "Welcome to the AWS server"})
}))

app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
})