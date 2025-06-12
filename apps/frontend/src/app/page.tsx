"use client"

import { useState } from "react";
import { ITranslateRequest, ITranslateDBObject, ITranslateResponse } from "@ohana/shared_types";

const URL = process.env.NEXT_PUBLIC_BASE_URL;

async function translateText({ sourceLang, targetLang, sourceText }: ITranslateRequest) {
  try {
    const response = await fetch(URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sourceLang,
        targetLang,
        sourceText
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data; // Giả sử API trả về kết quả dịch
  } catch (error) {
    console.error("Translation Error:", error);
    throw error;
  }
}

const getTranslations = async () => {
  try {
    const result = await fetch(URL!, {
      method: "GET",
    });

    const response = (await result.json()) as Array<ITranslateDBObject>;
    return response;
  } catch (error) {
    console.error("Get All Translations Error:", error);
    throw error;
  }
};

export default function Home() {
  const [inputText, setInputText] = useState<string>("")
  const [inputLang, setInputLang] = useState<string>("")
  const [outputLang, setOutputLang] = useState<string>("")
  const [outputText, setOutputText] = useState<ITranslateResponse>({timestamp: "", targetText: ""})
  const [translations, setTranslations] = useState<Array<ITranslateDBObject>>(
    []
  );

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <form onSubmit={async (event) => {
          event.preventDefault();
          const input: ITranslateRequest = {
            sourceLang: inputLang,
            targetLang: outputLang,
            sourceText: inputText
          };
          const result = await translateText(input);
          setOutputText(result);
          console.log(result);
        }}>
          <div>
            <label>Input Text</label>
            <textarea id="inputText" value={inputText} onChange={(e) => setInputText(e.target.value)} />
          </div>
          <div>
            <label>Input Language</label>
            <textarea id="inputLang" value={inputLang} onChange={(e) => setInputLang(e.target.value)} />
          </div>
          <div>
            <label>Output Language</label>
            <textarea id="outputLang" value={outputLang} onChange={(e) => setOutputLang(e.target.value)} />
          </div>

          <button className="btn bg-blue-500">Translate</button>
        </form>
        <div>
          <p>Result:</p>
          <pre style={{ whiteSpace: "pre-wrap" }} className="w-full">
            {JSON.stringify(outputText, null, 2)}
          </pre>
        </div>
        <button
          className="btn bg-blue-500"
          type="button"
          onClick={async () => {
            const rtnValue = await getTranslations();
            setTranslations(rtnValue);
          }}
        >
          getTranslations
        </button>
        <div>
          <p>Result:</p>
          <pre>
            {translations.map((item) => (
              <div key={item.requestId}>
                <p>
                  {item.sourceLang}/{item.sourceText}
                </p>
                <p>
                  {item.targetLang}/{item.targetText}
                </p>
              </div>
            ))}
          </pre>
        </div>
      </main>
    </div>
  );
}
