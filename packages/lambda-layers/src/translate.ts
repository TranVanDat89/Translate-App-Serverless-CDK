import * as clientTranslate from "@aws-sdk/client-translate";
import { ITranslateRequest } from "@ohana/shared_types";

export class TranslateService {
    private translateClient: clientTranslate.TranslateClient;
  
    constructor() {
      this.translateClient = new clientTranslate.TranslateClient({});
    }
  
    async getTranslation({ sourceLang, targetLang, sourceText }: ITranslateRequest) {
      const command = new clientTranslate.TranslateTextCommand({
        SourceLanguageCode: sourceLang,
        TargetLanguageCode: targetLang,
        Text: sourceText,
      });
  
      const result = await this.translateClient.send(command);
      return result;
    }
  }