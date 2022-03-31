import URLSearchParams from "url-search-params"
import { createResponse } from 'create-response';
import { EdgeKV } from './edgekv.js'

const edgeKv = new EdgeKV({ namespace: "ewcc28", group: "file-part-upload" });
const cdnEKV = new EdgeKV({ namespace: "ewcc28", group: "file-cdn" });

export async function responseProvider(request) {

    let params = new URLSearchParams(request.query);

    const fileName = params.get("fileName");
    const filePartCount = params.get("filePartCount");
    const fileMD5 = params.get("fileMD5");
    const filePartIndex = params.get("filePartIndex");
    const filePartContent = params.get("filePartContent");

    if(Number(filePartCount) <= Number(filePartIndex)){
        return createResponse(200,
            { 'Content-Type': ['application/json; charset=utf-8'] },
            JSON.stringify(
                {
                    status: 500,
                    errMsg: "File part index must lt file part count!"
                }
            )
        )
    }

    let errMsg = "";
    let content = "";
    let success = false;
    let partJson = {};
    let partJsonStr = "";
    let partCount = -1;
    let fileMD = {};
    try {
        // get uploaded file part info
        partJsonStr = await edgeKv.getText({ item: fileMD5 });
        if (partJsonStr != null && partJsonStr != "") {
            partJson = JSON.parse(partJsonStr);
        }

        // add request file part to the part info
        partJson[filePartIndex] = {
            filePartContent: filePartContent
        }

        // compare file part is all uplaod
        partCount = Object.keys(partJson).length;
        if (Number(filePartCount) !== Number(partCount)) {
            await edgeKv.putText({ item: fileMD5, value: JSON.stringify(partJson) });
            content = filePartContent;
        } else {
            // combine file part content
            for (let i = 0; i < Number(filePartCount); i++) {
                let part = partJson[i.toString()];
                content = content + part["filePartContent"];
            }

            // compare file Md5 and content Md5
            if (fileMD5 === content) {
                success = true;
                await cdnEKV.putText({item:fileMD5, value: JSON.stringify(
                    {
                        fileName:fileName,
                        fileMD5:fileMD5,
                        fileContent:content
                    }
                )});

                let fileMDStr = await cdnEKV.getText({item:fileMD5});
                fileMD = JSON.parse(fileMDStr);
            }
        }
    } catch (error) {
        errMsg = error.toString();
    }

    return Promise.resolve(
        // Send Response
        createResponse(200,
            { 'Content-Type': ['application/json; charset=utf-8'] },
            JSON.stringify(
                {
                    fileName: fileName,
                    filePartCount: filePartCount,
                    filePartIndex: filePartIndex,
                    partJson: partJson,
                    partJsonStr: partJsonStr,
                    partCount: partCount,
                    errMsg: errMsg,
                    content: content,
                    success: success,
                    fileMD:fileMD
                }
            )
        )
    );
}
