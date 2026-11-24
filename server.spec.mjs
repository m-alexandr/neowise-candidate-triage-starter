import http from "node:http";

// Исходные тест-кейсы для сбоев
const testCasesFailures = [
  { input: "", expected: "invalid_input" },
  { input: "test [timeout]", expected: "manual_review" },
  { input: "test [error]", expected: "manual_review" },
  { input: "test [bad-json]", expected: "invalid_input" },
  { input: "test [bad-topic]", expected: "manual_review" },
  { input: "test [empty-draft]", expected: "manual_review" }
];

// Новые тест-кейсы для успешных случаев
const testCasesSuccess = [
  { input: "Доставка товара", expectedTopic: "delivery", expectedDraft: "Спасибо за обращение. Уточним детали заявки." },
  { input: "Цена услуги", expectedTopic: "pricing", expectedDraft: "Спасибо за обращение. Уточним детали заявки." },
  { input: "Другая тема", expectedTopic: "other", expectedDraft: "Спасибо за обращение. Уточним детали заявки." }
];

// Функция для выполнения одного теста
async function runTest(input, expectedOutcome) {
  const req = http.request({
    hostname: "127.0.0.1",
    port: 3000,
    path: "/api/triage",
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }, (res) => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => {
      const result = JSON.parse(data);
      
      if ("expected" in expectedOutcome) {
        console.log(`Test input: ${input}`);
        console.log(`Expected status: ${expectedOutcome.expected}, Actual status: ${result.status}`);
        const testResult = result.status === expectedOutcome.expected;
        console.assert(testResult, `Test failed: ${input}`);
      }
      
      if ("expectedTopic" in expectedOutcome) {
        console.log(`Test input: ${input}`);
        console.log(`Expected topic: ${expectedOutcome.expectedTopic}, Actual topic: ${result.topic}`);
        console.log(`Expected draft: ${expectedOutcome.expectedDraft}, Actual draft: ${result.draft}`);
        
        const testResult = result.topic === expectedOutcome.expectedTopic &&
                         result.draft === expectedOutcome.expectedDraft;
        console.assert(testResult, `Test failed: ${input}`);
      }
    });
  });
  req.write(JSON.stringify({ text: input }));
  req.end();
}

testCasesFailures.forEach(test => runTest(test.input, test));

testCasesSuccess.forEach(test => runTest(test.input, test));

console.log("All tests executed!");