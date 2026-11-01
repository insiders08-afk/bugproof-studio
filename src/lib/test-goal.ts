export function testGoal(url: string, prompt: string) {
  return [
      `Navigate to ${url} and perform this QA test:`,
      `User goal: ${prompt}`,
      "Use the visible website interface and interact with elements using their actual visible labels.",
      "Open requested pages, modals and panels. Only inspect the requested workflow; stop before submitting forms, confirming transactions, payments or other irreversible changes.",
      "Observe the page before and after each interaction. Record the actual action, target visibility, before text, after text and whether it succeeded.",
      "Wait for relevant content and images to load before capturing screenshots. Report actual image counts; do not estimate them.",
      "Capture screenshots at meaningful stages of the workflow.",
      "Report the final page's actual visible text, not a summary of previously visited pages.",
      "Include network response information only when it was actually observed.",
      "If the available evidence is insufficient, report incomplete rather than success.",
      "A successfully verified negative condition (such as intentionally unavailable booking) is success when that is the user goal. Include verbatim final-page text and expected visible quotes.",
      "Return the structured result using the supplied output schema. Leave unavailable optional measurements empty. Do not invent observations or evidence."
    ].join("\n");
}

export function repeatInput(test: { url: string; prompt: string }) {
  return { url: test.url, prompt: test.prompt };
}
