import * as dynamodb from "@aws-sdk/client-dynamodb";
import { ITranslateDBObject } from "@ohana/shared_types";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

export class TranslationTable {
    tableName: string;
    partitionKey: string;
    dynamoClient: dynamodb.DynamoDBClient;

    constructor({ tableName, partitionKey }: {
        tableName: string,
        partitionKey: string
    }) {
        this.tableName = tableName;
        this.partitionKey = partitionKey;
        this.dynamoClient = new dynamodb.DynamoDBClient({});
    }

    async insert(item: ITranslateDBObject) {
        const insertCmd: dynamodb.PutItemCommandInput = {
            TableName: this.tableName,
            Item: marshall(item)
        }
        await this.dynamoClient.send(new dynamodb.PutItemCommand(insertCmd));
    }

    async getAll() {
        const scanCmd: dynamodb.ScanCommandInput = {
            TableName: this.tableName,
        };

        const { Items } = await this.dynamoClient.send(
            new dynamodb.ScanCommand(scanCmd)
        );

        if (!Items) {
            return [];
        }

        const res = Items.map((item) => unmarshall(item) as ITranslateDBObject);
        return res;
    }
}