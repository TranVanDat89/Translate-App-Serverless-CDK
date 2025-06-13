import * as lambda from "aws-lambda";

const createResponse = ({statusCode, body}:{statusCode:number, body:string}): lambda.APIGatewayProxyResult => {
    return {
        statusCode,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true,
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "*",
        },
        body
    }
}

export const createSuccessJSONRespone = (body:object) => createResponse({
    statusCode: 200,
    body: JSON.stringify(body)
});

export const createErrorJSONResponse = (body:object) => createResponse({
    statusCode: 500,
    body: JSON.stringify(body)
});

export const createNotFoundJSONResponse = (body: object) => createResponse({
    statusCode: 404,
    body: JSON.stringify(body)
})