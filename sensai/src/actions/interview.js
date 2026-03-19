"use server"
import {auth} from "@clerk/nextjs/server";
export async function generateQuiz(){
const {userId} =await auth();
 if (!userId) throw new Error ("Unauthorized");
 const user =await db.user.findUnique({
    where:{
        clerkUserId:userId,

    },

 });
 if(!user) throw new Error("User not found");
const prompt=`Generate 10 technical interview questions for a ${
    user.industry
} professional ${
    user.skills?.length ? with expertise in ${user.skills.join (" ,")} : ""
}`
Ecah questions should be multiple choice with 4 options 
Return the responsev in this JSON format only ,no additional text:
{
"questions":{
"questions":"string",
"optiions":["string","string","string","string"],
"correctAnswer":"string",
"explanation":"string"

}

}

;
}
}