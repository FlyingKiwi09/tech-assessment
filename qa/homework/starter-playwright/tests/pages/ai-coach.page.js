class AiCoachPage {
  constructor(page, app) {
    this.page = page;
    this.app = app;
    this.chatLog = page.getByTestId("chat-log");
    this.chatInput = page.getByTestId("chat-input");
    this.sendButton = page.getByTestId("chat-send");
    this.typingIndicator = page.getByTestId("typing");
  }

  async goto() {
    await this.app.goto("/chat.html");
  }
}

module.exports = { AiCoachPage };
