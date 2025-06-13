import * as lambda from "aws-lambda";
import { ITranslateDBObject, ITranslateRequest, ITranslateResponse } from "@ohana/shared_types";
import { response, exception, translate, translationTable } from "@ohana/lambda-layers";

const { TRANSLATION_PARTITION_KEY, TRANSLATION_TABLE_NAME } = process.env;
console.log("{PARTITION_KEY, TABLE_NAM}: ", TRANSLATION_PARTITION_KEY, TRANSLATION_TABLE_NAME);

if (!TRANSLATION_PARTITION_KEY || !TRANSLATION_TABLE_NAME) {
    throw new exception.MissingEnvironmentVariable("MISSING KEY ENVIRONMENT!!!");
}

const transTable = new translationTable.TranslationTable({
    tableName: TRANSLATION_TABLE_NAME,
    partitionKey: TRANSLATION_PARTITION_KEY
})

export const translationLambda: lambda.APIGatewayProxyHandler = async function (
    event: lambda.APIGatewayProxyEvent,
    context: lambda.Context
) {
    try {
        if (!event.body) {
            return response.createNotFoundJSONResponse({ error: "Request body is missing" });
        }
        const body = JSON.parse(event.body) as ITranslateRequest;
        const { sourceLang, targetLang, sourceText } = body;
        if (!sourceLang || !targetLang || !sourceText) {
            return response.createNotFoundJSONResponse({ error: "sourceLang, targetLang, and text are required" });
        }
        const now = new Date().toISOString();
        const result = await new translate.TranslateService().getTranslation({ sourceLang, targetLang, sourceText });
        if (!result.TranslatedText) {
            return response.createNotFoundJSONResponse({ error: "Translated text not found!" });
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
        await transTable.insert(dbObject);
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
        const res = transTable.getAll();
        console.log(res);
        return response.createSuccessJSONRespone(res);
    } catch (error: any) {
        console.error("Get All Translations Error: ", error);
        return response.createErrorJSONResponse(error);
    }
}