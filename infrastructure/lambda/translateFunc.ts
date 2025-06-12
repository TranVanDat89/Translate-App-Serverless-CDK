import * as lambda from "aws-lambda";
import * as clientTranslate from "@aws-sdk/client-translate";
import * as dynamodb from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb"
import { ITranslateDBObject, ITranslateRequest, ITranslateResponse } from "@ohana/shared_types";
import {response} from "@ohana/lambda-layers";

const translateClient = new clientTranslate.TranslateClient({});
const dynamodbClient = new dynamodb.DynamoDBClient({});
const { TRANSLATION_PARTITION_KEY, TRANSLATION_TABLE_NAME } = process.env;
console.log("{PARTITION_KEY, TABLE_NAM}: ", TRANSLATION_PARTITION_KEY, TRANSLATION_TABLE_NAME);

if (!TRANSLATION_PARTITION_KEY || !TRANSLATION_TABLE_NAME) {
    throw new Error("MISSING KEY ENVIRONMENT!!!");
}

export const translationLambda: lambda.APIGatewayProxyHandler = async function (
    event: lambda.APIGatewayProxyEvent,
    context: lambda.Context
) {
    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ error: "Request body is missing" })
            }
        }
        const body = JSON.parse(event.body) as ITranslateRequest;
        const { sourceLang, targetLang, sourceText } = body;
        if (!sourceLang || !targetLang || !sourceText) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ error: "sourceLang, targetLang, and text are required" }),
            };
        }
        const now = new Date().toISOString();
        const translateCommand = new clientTranslate.TranslateTextCommand({
            SourceLanguageCode: sourceLang,
            TargetLanguageCode: targetLang,
            Text: sourceText,
        });
        const result = await translateClient.send(translateCommand);
        if (!result.TranslatedText) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ error: "Translated text not found!" }),
            };
        }
        const res: ITranslateResponse = {
            timestamp: now,
            targetText: result.TranslatedText,
        };
        // Save to DB
        const dbObject: ITranslateDBObject = {
            requestId: context.awsRequestId,
            ...body,
            ...res
        }
        const insertedCmd: dynamodb.PutItemCommandInput = {
            TableName: TRANSLATION_TABLE_NAME,
            Item: marshall(dbObject)
        }
        await dynamodbClient.send(new dynamodb.PutItemCommand(insertedCmd));
        return response.createSuccessJSONRespone(res);
    } catch (error: any) {
        console.error("Translation Error: ", error);
        return response.createErrorJSONResponse(error);
    }
}

export const getAllTranslations: lambda.APIGatewayProxyHandler = async function (
    event: lambda.APIGatewayProxyEvent,
    context: lambda.Context
) {
    try {
        const scanCmd: dynamodb.ScanCommandInput = {
            TableName: TRANSLATION_TABLE_NAME,
        };
        console.log("scanCmd", scanCmd);
        const { Items } = await dynamodbClient.send(
            new dynamodb.ScanCommand(scanCmd)
        );

        if (!Items) {
            return {
                statusCode: 404,
                headers: {
                    // "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Credentials": true
                },
                body: JSON.stringify({
                    error: "404 Not Found",
                    message: "Not Found Data",
                }),
            };
        }

        console.log("Items", Items);

        const res = Items.map((item) => unmarshall(item) as ITranslateDBObject);
        console.log(response);

        return response.createSuccessJSONRespone(res);
    } catch (error: any) {
        console.error("Get All Translations Error: ", error);
        return response.createErrorJSONResponse(error);
    }
}