import mongoose from "mongoose";

const MongooseSchema = new mongoose.Schema({
    role: {
        type:String,
        enum:["user","assistant"],
        required: true,
    },
    content:{
        type:String,
        required:true,

    },
    timeStamp: {
        type: Date,
        default: Date.now,
    }
})


const ThreadSchema = new mongoose.Schema({
    
    threadId: {
        type : String ,
        required : true,
        unique : true,
    },
    title : {
        type : String ,
        default : "new chat",
    },
    messages: {
        type: [MongooseSchema],
        default: [],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    }


    
    
});

export default mongoose.model("thread" , ThreadSchema)
