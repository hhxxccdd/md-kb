import prisma from "../../utils/prisma";

export const checkDocumentCollaborator = async (docId:number,userId:number) => {

    const collaborator = await prisma.documentCollaborator.findUnique({
        where:{
            document_id_user_id:{
                document_id:docId,
                user_id:userId
            }
        }
    })

   return Boolean(collaborator)

}