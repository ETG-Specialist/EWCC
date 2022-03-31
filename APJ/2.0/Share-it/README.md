
# EW-FilePartUpload

# Project Name
  
  Uppload file part and combine file store to EKV

# Description

  File upload is a common topic. In the case of relatively small files, you can directly convert the file into a byte stream and upload it to the 
server. 
    
  However, when the file is relatively large, uploading in an ordinary way is not a good method. After all, few people will endure it. When the file is uploaded halfway, it is interrupted. Continuing to upload only to start from scratch is an unpleasant experience. 
    
  Is there a better upload experience? The answer is yes, this example is to solve the problem of uploading large files through multi-part upload.

  1. What is multipart upload

    Partial upload is to divide the file to be uploaded into multiple data blocks (we call it Part) according to a certain size for uploading separately. After uploading, EdgeWorker aggregates and integrates all uploaded files into original files.

  2. Scenario of multi-part upload
        
    a. Large file upload

    b. The network environment is not good and there is a risk of retransmission

  During the multipart upload process, if the upload is interrupted due to abnormal factors such as system crash or network interruption, the client needs to record the upload progress. When re-uploading is supported in the future, you can continue uploading from the place where the fragment was interrupted in the last upload.
    
  In order to avoid the problem of restarting the upload from the beginning due to the deletion of the progress data of the client after uploading, in the example, the client is queried for the uploaded fragmented data through the return value of the upload.
In this way, the client knows the fragmented data that has been uploaded, so that the uploading continues from the next fragmented data.

    The front-end page (client) needs to shard the file according to a fixed size, and the shard serial number and shard content should be included when requesting EdgeWorker
    
    EdgeWorker creates and uses EKV to store each shard number and shard content.
    
    EdgeWorker calculates the starting position according to the fragment sequence number given in the request data, and the read file fragment data. When all fragments are uploaded, the composite file information is written to the CDN.


# Test request and response

  1、uplaod any file part without file part order.
  
  2、when the file part count is completed、
  
  3、check the file content and md5

  Example:
  
  1、request: 
  
  https://ewcc28.ewcc.in//filePartUpload?fileName=ewcc28&filePartCount=4&fileMD5=APJEdgeWorkersCodingChallenge&filePartIndex=0&filePartContent=APJ

  response:
  ```
    {
        "fileName": "ewcc28",
        "filePartCount": "4",
        "filePartIndex": "0",
        "partJson": {
            "0": {
                "filePartContent": "APJ"
            }
        },
        "partJsonStr": "{\"0\":{\"filePartContent\":\"APJ\"}}",
        "partCount": 1,
        "errMsg": "",
        "content": "APJ",
        "success": false,
        "fileMD": {}
    }
  ```
  2、request: 
  
  https://ewcc28.ewcc.in//filePartUpload?fileName=ewcc28&filePartCount=4&fileMD5=APJEdgeWorkersCodingChallenge&filePartIndex=3&filePartContent=Challenge
  
  response:
  ```
    {
        "fileName": "ewcc28",
        "filePartCount": "4",
        "filePartIndex": "3",
        "partJson": {
            "0": {
                "filePartContent": "APJ"
            },
            "1": {
                "filePartContent": "EdgeWorkers"
            },
            "2": {
                "filePartContent": "Coding"
            },
            "3": {
                "filePartContent": "Challenge"
            }
        },
        "partJsonStr": "{\"0\":{\"filePartContent\":\"APJ\"},\"1\":{\"filePartContent\":\"EdgeWorkers\"},\"2\":{\"filePartContent\":\"Coding\"}}",
        "partCount": 4,
        "errMsg": "",
        "content": "APJEdgeWorkersCodingChallenge",
        "success": true,
        "fileMD": {
            "fileName": "ewcc28",
            "fileMD5": "APJEdgeWorkersCodingChallenge",
            "fileContent": "APJEdgeWorkersCodingChallenge"
        }
    }
  ```

  Request Param:
  Name|Description
  ---|---
  fileName| file name
  filePartCount| the count of filepart 
  fileMD5| this param to check file combine completed 
  filePartIndex| file part index, it to use combine file order
  filePartContent| file part content

  Respine Param:
  Name|Description
  ---|---
  fileName| this is from the request.query, to test get the params 
  filePartCount| this is from the request.query, to test get the params 
  filePartIndex| this is from the request.query, to test get the params 
  partJsonStr | Number of existing data in EKV 
  partJson | EKV data to JSON, use JSON.parse(partJsonStr)
  partCount | Number of existing part data in EKV
  errMsg | Program running error log
  success| Successfully identified the composition file
  fileMD| Metadata of final file
