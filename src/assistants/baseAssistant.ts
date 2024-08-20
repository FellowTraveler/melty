import { Conversation, GitRepo, ClaudeMessage } from "../types";
import * as prompts from "../backend/prompts";
import * as joules from "../backend/joules";
import fs from "fs";
import path from "path";

export abstract class BaseAssistant {
  abstract respond(
    conversation: Conversation,
    gitRepo: GitRepo,
    contextPaths: string[],
    processPartial: (partialConversation: Conversation) => void
  ): Promise<Conversation>;

  protected encodeMessages(conversation: Conversation): ClaudeMessage[] {
    return conversation.joules.map((joule) => ({
      role: joule.author === "human" ? "user" : "assistant",
      content: joules.formatMessageForClaude(joule),
    }));
  }

  /**
   * Encodes files for Claude. Note that we're being loose with the newlines.
   * @returns string encoding the files
   */
  protected encodeFile(gitRepo: GitRepo, filePath: string) {
    const fileContents = fs.readFileSync(
      path.join(gitRepo.rootPath, filePath),
      "utf8"
    );

    // TODO should we use | indentation here?
    return `<file_contents file=${filePath}>
${fileContents.endsWith("\n") ? fileContents : fileContents + "\n"}
</file_contents>`;
  }

  protected codebaseView(
    gitRepo: GitRepo,
    contextPaths: string[],
    repoMapString: string
  ): ClaudeMessage[] {
    const codebaseSummary = `<codebase_summary>
${repoMapString ? repoMapString : "[No summary provided.]"}
</codebase_summary>`;

    const fileContents = contextPaths
      .map((path) => this.encodeFile(gitRepo, path))
      .join("\n");

    return [
      {
        role: "user",
        content: `<codebase_view>
${codebaseSummary}
${fileContents}
</codebase_view>`,
      },
      { role: "assistant", content: "Thanks, I'll review this carefully." },
    ];
  }
}
