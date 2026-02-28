import TelegramBot from "node-telegram-bot-api";
import { storage } from "./storage";
import { nanoid } from "nanoid";
import {
  runVerification,
  parseVerificationId,
  generateRandomName,
  generateEmail,
  generateBirthDate,
  TOOL_CONFIGS,
  checkVerificationStatus,
} from "./sheerid-engine";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_USERNAME = (process.env.TELEGRAM_ADMIN_USERNAME || "Aamoviesadmin").replace("@", "").toLowerCase();
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || "@aamoviesofficial";
const VERIFICATION_COST = 50;
const JOIN_REWARD = 20;
const DAILY_REWARD = 5;
const REFERRAL_REWARD = 10;

let bot: TelegramBot | null = null;

function isAdmin(username: string | undefined): boolean {
  if (!username) return false;
  return username.toLowerCase() === ADMIN_USERNAME;
}

async function ensureUser(msg: TelegramBot.Message): Promise<{ telegramId: string; user: Awaited<ReturnType<typeof storage.getTelegramUser>> }> {
  const telegramId = msg.from!.id.toString();
  let user = await storage.getTelegramUser(telegramId);
  return { telegramId, user };
}

async function createNewUser(telegramId: string, username: string | undefined, firstName: string | undefined, referralCode?: string): Promise<Awaited<ReturnType<typeof storage.createTelegramUser>>> {
  const code = nanoid(8);
  let validReferral: string | null = null;
  if (referralCode) {
    const referrer = await storage.getTelegramUserByReferralCode(referralCode);
    if (referrer && referrer.telegramId !== telegramId) {
      validReferral = referralCode;
    }
  }
  const user = await storage.createTelegramUser({
    telegramId,
    username: username || null,
    firstName: firstName || null,
    tokens: 0,
    referralCode: code,
    referredBy: validReferral,
    hasJoinedChannel: false,
    lastDaily: null,
  });
  return user;
}

export function startTelegramBot() {
  if (!BOT_TOKEN) {
    console.log("[Telegram] No bot token configured, skipping bot startup");
    return;
  }

  bot = new TelegramBot(BOT_TOKEN, { polling: true });
  console.log("[Telegram] Bot started with polling");

  bot.onText(/\/start(.*)/, async (msg, match) => {
    try {
    const chatId = msg.chat.id;
    const telegramId = msg.from!.id.toString();
    const param = (match?.[1] || "").trim();

    let { user } = await ensureUser(msg);

    if (!user) {
      let referredByCode: string | undefined;
      if (param.startsWith("ref_")) {
        referredByCode = param.replace("ref_", "");
      }
      user = await createNewUser(telegramId, msg.from?.username, msg.from?.first_name, referredByCode);
    }

    if (user.hasJoinedChannel) {
      await bot!.sendMessage(chatId,
        `Welcome back, ${user.firstName || "User"}!\n\n` +
        `Your balance: ${user.tokens} tokens\n\n` +
        `Use /verify {link} to run a verification (costs ${VERIFICATION_COST} tokens)\n` +
        `Use /daily to claim daily bonus\n` +
        `Use /balance to check your tokens\n` +
        `Use /referral to get your referral link`,
        { parse_mode: "HTML" }
      );
      return;
    }

    await bot!.sendMessage(chatId,
      `Welcome to SheerID Verification Bot!\n\n` +
      `To get started, please join our channel first:\n` +
      `https://t.me/aamoviesofficial\n\n` +
      `After joining, click the button below to verify.`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: "I'm Joined", callback_data: "verify_join" }
          ]]
        }
      }
    );
    } catch (err: any) {
      console.error("[Telegram] /start error:", err.message);
    }
  });

  bot.on("callback_query", async (query) => {
    if (!query.message || !query.from) return;
    const chatId = query.message.chat.id;
    const telegramId = query.from.id.toString();

    try {
    if (query.data === "verify_join") {
      let user = await storage.getTelegramUser(telegramId);
      if (!user) {
        user = await createNewUser(telegramId, query.from.username, query.from.first_name);
      }

      if (user.hasJoinedChannel) {
        await bot!.answerCallbackQuery(query.id, { text: "You're already verified!" });
        return;
      }

      try {
        const member = await bot!.getChatMember(CHANNEL_ID, parseInt(telegramId));
        const isMember = ["member", "administrator", "creator"].includes(member.status);

        if (isMember) {
          await storage.updateTelegramUser(telegramId, { hasJoinedChannel: true });
          await storage.addTokens(telegramId, JOIN_REWARD);

          if (user.referredBy) {
            const referrer = await storage.getTelegramUserByReferralCode(user.referredBy);
            if (referrer && referrer.telegramId !== telegramId) {
              await storage.addTokens(referrer.telegramId, REFERRAL_REWARD);
              try {
                await bot!.sendMessage(parseInt(referrer.telegramId),
                  `Someone joined using your referral link! You earned ${REFERRAL_REWARD} tokens.`
                );
              } catch {}
            }
          }

          const updatedUser = await storage.getTelegramUser(telegramId);
          await bot!.answerCallbackQuery(query.id, { text: `Verified! You earned ${JOIN_REWARD} tokens!` });
          await bot!.sendMessage(chatId,
            `Channel membership verified! You earned ${JOIN_REWARD} tokens.\n\n` +
            `Your balance: ${updatedUser?.tokens || JOIN_REWARD} tokens\n\n` +
            `Available commands:\n` +
            `/verify {link} - Run verification (${VERIFICATION_COST} tokens)\n` +
            `/daily - Claim daily bonus (${DAILY_REWARD} tokens)\n` +
            `/balance - Check your token balance\n` +
            `/referral - Get your referral link`
          );
        } else {
          await bot!.answerCallbackQuery(query.id, {
            text: "You haven't joined the channel yet. Please join first!",
            show_alert: true
          });
        }
      } catch (err: any) {
        console.error("[Telegram] Channel check error:", err.message);
        await bot!.answerCallbackQuery(query.id, {
          text: "Could not verify membership. Make sure you joined the channel and try again.",
          show_alert: true
        });
      }
    }
    } catch (err: any) {
      console.error("[Telegram] Callback query error:", err.message);
    }
  });

  bot.onText(/\/daily/, async (msg) => {
    const chatId = msg.chat.id;
    const { telegramId, user } = await ensureUser(msg);

    if (!user) {
      await bot!.sendMessage(chatId, "Please use /start first to register.");
      return;
    }
    if (!user.hasJoinedChannel) {
      await bot!.sendMessage(chatId, "Please join the channel and verify first using /start.");
      return;
    }

    const now = new Date();
    if (user.lastDaily) {
      const diff = now.getTime() - new Date(user.lastDaily).getTime();
      const hoursLeft = 24 - (diff / (1000 * 60 * 60));
      if (hoursLeft > 0) {
        const h = Math.floor(hoursLeft);
        const m = Math.floor((hoursLeft - h) * 60);
        await bot!.sendMessage(chatId, `You already claimed your daily bonus. Come back in ${h}h ${m}m.`);
        return;
      }
    }

    await storage.updateTelegramUser(telegramId, { lastDaily: now });
    const updated = await storage.addTokens(telegramId, DAILY_REWARD);

    await bot!.sendMessage(chatId,
      `Daily bonus claimed! +${DAILY_REWARD} tokens\n` +
      `Your balance: ${updated?.tokens || 0} tokens`
    );
  });

  bot.onText(/\/balance/, async (msg) => {
    const chatId = msg.chat.id;
    const { user } = await ensureUser(msg);

    if (!user) {
      await bot!.sendMessage(chatId, "Please use /start first to register.");
      return;
    }

    await bot!.sendMessage(chatId,
      `Your token balance: ${user.tokens} tokens\n\n` +
      `Earn tokens:\n` +
      `- /daily — ${DAILY_REWARD} tokens (once per day)\n` +
      `- /referral — ${REFERRAL_REWARD} tokens per referral\n\n` +
      `Spend tokens:\n` +
      `- /verify {link} — ${VERIFICATION_COST} tokens per verification`
    );
  });

  bot.onText(/\/referral/, async (msg) => {
    const chatId = msg.chat.id;
    const { user } = await ensureUser(msg);

    if (!user) {
      await bot!.sendMessage(chatId, "Please use /start first to register.");
      return;
    }

    const botInfo = await bot!.getMe();
    const referralLink = `https://t.me/${botInfo.username}?start=ref_${user.referralCode}`;

    await bot!.sendMessage(chatId,
      `Your referral link:\n${referralLink}\n\n` +
      `Share this link with friends. You'll earn ${REFERRAL_REWARD} tokens for each person who joins!`
    );
  });

  bot.onText(/\/verify(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const { telegramId, user } = await ensureUser(msg);

    if (!user) {
      await bot!.sendMessage(chatId, "Please use /start first to register.");
      return;
    }
    if (!user.hasJoinedChannel) {
      await bot!.sendMessage(chatId, "Please join the channel and verify first using /start.");
      return;
    }

    const link = match?.[1]?.trim();
    if (!link) {
      await bot!.sendMessage(chatId, "Usage: /verify {link}\n\nExample: /verify https://offers.spotify.com/verify?verificationId=abc123");
      return;
    }

    if (user.tokens < VERIFICATION_COST) {
      await bot!.sendMessage(chatId,
        `Insufficient tokens. You need ${VERIFICATION_COST} tokens but have ${user.tokens}.\n\n` +
        `Earn tokens with /daily or /referral.`
      );
      return;
    }

    const verificationId = parseVerificationId(link);
    if (!verificationId) {
      await bot!.sendMessage(chatId, "Invalid link. URL must contain a verificationId parameter.");
      return;
    }

    let detectedToolId: string | null = null;
    const linkLower = link.toLowerCase();
    if (linkLower.includes("spotify")) detectedToolId = "spotify-verify";
    else if (linkLower.includes("youtube")) detectedToolId = "youtube-verify";
    else if (linkLower.includes("google") || linkLower.includes("one.google")) detectedToolId = "one-verify";
    else if (linkLower.includes("bolt")) detectedToolId = "boltnew-verify";
    else if (linkLower.includes("canva")) detectedToolId = "canva-teacher";
    else if (linkLower.includes("chatgpt") || linkLower.includes("openai")) detectedToolId = "k12-verify";
    else detectedToolId = "spotify-verify";

    const config = TOOL_CONFIGS[detectedToolId];
    if (!config) {
      await bot!.sendMessage(chatId, "Could not determine the verification tool for this link.");
      return;
    }

    const tool = await storage.getToolById(detectedToolId);
    if (!tool || !tool.isActive) {
      await bot!.sendMessage(chatId, "This verification tool is currently disabled.");
      return;
    }

    const deducted = await storage.deductTokens(telegramId, VERIFICATION_COST);
    if (!deducted) {
      await bot!.sendMessage(chatId, "Failed to deduct tokens. Please try again.");
      return;
    }

    const statusMsg = await bot!.sendMessage(chatId,
      `Verification started for ${tool.name}...\n` +
      `Tokens deducted: ${VERIFICATION_COST}\n` +
      `Please wait, this may take a few minutes.`
    );

    let tokensRefunded = false;
    try {
      const { firstName, lastName } = generateRandomName();
      const email = generateEmail(firstName, lastName, "psu.edu");
      const birthDate = generateBirthDate(config.verifyType);

      const verification = await storage.createVerification({
        toolId: detectedToolId,
        status: "processing",
        email,
        university: "Pennsylvania State University",
        name: `${firstName} ${lastName}`,
        country: "US",
        url: link,
        proxy: null,
        firstName,
        lastName,
        birthDate,
        organizationId: 0,
        sheeridVerificationId: verificationId,
        errorMessage: null,
      });

      const result = await runVerification({
        toolId: detectedToolId,
        verificationId,
        firstName,
        lastName,
        email,
        birthDate,
        organizationId: 0,
        organizationName: "",
        url: link,
      });

      let finalStatus = "failed";
      let errorMsg: string | null = null;
      let finalRedirectUrl = result.redirectUrl;

      if (result.success && !result.pending) {
        finalStatus = "success";
      } else if (result.success && result.pending) {
        await storage.updateVerification(verification.id, { status: "pending", errorMessage: null });

        try {
          await bot!.editMessageText(
            `Verification in progress for ${tool.name}...\n` +
            `Document submitted, waiting for SheerID review.\n` +
            `This can take up to 5 minutes.`,
            { chat_id: chatId, message_id: statusMsg.message_id }
          );
        } catch {}

        const maxPolls = 30;
        const pollInterval = 10000;
        let resolved = false;

        for (let i = 0; i < maxPolls; i++) {
          await new Promise(r => setTimeout(r, pollInterval));
          try {
            const pollResult = await checkVerificationStatus(verificationId);
            if (pollResult.currentStep === "success") {
              finalStatus = "success";
              finalRedirectUrl = pollResult.redirectUrl || finalRedirectUrl;
              resolved = true;
              break;
            } else if (pollResult.currentStep === "error" || (pollResult.errorIds && pollResult.errorIds.length > 0)) {
              finalStatus = "failed";
              errorMsg = `Verification rejected: ${(pollResult.errorIds || []).join(", ") || "document review failed"}`;
              resolved = true;
              break;
            }
          } catch {}
        }

        if (!resolved) {
          finalStatus = "failed";
          errorMsg = "Verification timed out waiting for SheerID review";
        }
      } else {
        finalStatus = "failed";
        errorMsg = result.message;
      }

      await storage.updateVerification(verification.id, {
        status: finalStatus,
        errorMessage: errorMsg,
      });
      await storage.incrementStats(detectedToolId, finalStatus === "success");

      if (finalStatus === "success") {
        const updatedBalance = await storage.getTelegramUser(telegramId);
        let successText = `Verification successful!\n\n` +
          `Tool: ${tool.name}\n` +
          `Name: ${firstName} ${lastName}\n` +
          `Email: ${email}\n` +
          `University: ${resolvedOrgName}\n` +
          `Balance: ${updatedBalance?.tokens || 0} tokens`;
        if (finalRedirectUrl) {
          successText += `\n\nClaim your offer: ${finalRedirectUrl}`;
        }
        await bot!.sendMessage(chatId, successText);
      } else {
        if (!tokensRefunded) {
          await storage.addTokens(telegramId, VERIFICATION_COST);
          tokensRefunded = true;
        }
        const updatedBalance = await storage.getTelegramUser(telegramId);
        await bot!.sendMessage(chatId,
          `Verification failed. Your ${VERIFICATION_COST} tokens have been refunded.\n\n` +
          `Reason: ${errorMsg || "Unknown error"}\n\n` +
          `Your balance: ${updatedBalance?.tokens || 0} tokens`
        );
      }

    } catch (err: any) {
      if (!tokensRefunded) {
        await storage.addTokens(telegramId, VERIFICATION_COST);
        tokensRefunded = true;
      }
      const updatedBalance = await storage.getTelegramUser(telegramId);
      await bot!.sendMessage(chatId,
        `An error occurred during verification. Your ${VERIFICATION_COST} tokens have been refunded.\n\n` +
        `Error: ${err.message || "Unknown error"}\n\n` +
        `Your balance: ${updatedBalance?.tokens || 0} tokens`
      );
    }
  });

  bot.onText(/\/admin(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;

    if (!isAdmin(msg.from?.username)) {
      await bot!.sendMessage(chatId, "You don't have admin permissions.");
      return;
    }

    const args = (match?.[1] || "").trim();

    if (!args) {
      await bot!.sendMessage(chatId,
        `Admin Commands:\n\n` +
        `/admin addtokens {telegram_id} {amount}\n` +
        `/admin removetokens {telegram_id} {amount}\n` +
        `/admin setbalance {telegram_id} {amount}\n` +
        `/admin userinfo {telegram_id}\n` +
        `/admin users — List all users\n` +
        `/admin stats — System stats\n` +
        `/admin giveaway {amount} — Give tokens to all users`
      );
      return;
    }

    const parts = args.split(/\s+/);
    const subCmd = parts[0].toLowerCase();

    if (subCmd === "addtokens" && parts.length >= 3) {
      const targetId = parts[1];
      const amount = parseInt(parts[2]);
      if (isNaN(amount) || amount <= 0) {
        await bot!.sendMessage(chatId, "Invalid amount. Must be a positive number.");
        return;
      }
      const updated = await storage.addTokens(targetId, amount);
      if (updated) {
        await bot!.sendMessage(chatId, `Added ${amount} tokens to user ${targetId}. New balance: ${updated.tokens}`);
        try {
          await bot!.sendMessage(parseInt(targetId), `Admin added ${amount} tokens to your account. New balance: ${updated.tokens}`);
        } catch {}
      } else {
        await bot!.sendMessage(chatId, `User ${targetId} not found.`);
      }
    } else if (subCmd === "removetokens" && parts.length >= 3) {
      const targetId = parts[1];
      const amount = parseInt(parts[2]);
      if (isNaN(amount) || amount <= 0) {
        await bot!.sendMessage(chatId, "Invalid amount. Must be a positive number.");
        return;
      }
      const user = await storage.getTelegramUser(targetId);
      if (!user) {
        await bot!.sendMessage(chatId, `User ${targetId} not found.`);
        return;
      }
      const newBalance = Math.max(0, user.tokens - amount);
      await storage.updateTelegramUser(targetId, { tokens: newBalance });
      await bot!.sendMessage(chatId, `Removed ${amount} tokens from user ${targetId}. New balance: ${newBalance}`);
    } else if (subCmd === "setbalance" && parts.length >= 3) {
      const targetId = parts[1];
      const amount = parseInt(parts[2]);
      if (isNaN(amount) || amount < 0) {
        await bot!.sendMessage(chatId, "Invalid amount. Must be non-negative.");
        return;
      }
      const updated = await storage.updateTelegramUser(targetId, { tokens: amount });
      if (updated) {
        await bot!.sendMessage(chatId, `Set balance for user ${targetId} to ${amount} tokens.`);
      } else {
        await bot!.sendMessage(chatId, `User ${targetId} not found.`);
      }
    } else if (subCmd === "userinfo" && parts.length >= 2) {
      const targetId = parts[1];
      const user = await storage.getTelegramUser(targetId);
      if (!user) {
        await bot!.sendMessage(chatId, `User ${targetId} not found.`);
        return;
      }
      await bot!.sendMessage(chatId,
        `User Info:\n` +
        `ID: ${user.telegramId}\n` +
        `Username: ${user.username || "N/A"}\n` +
        `Name: ${user.firstName || "N/A"}\n` +
        `Tokens: ${user.tokens}\n` +
        `Referral Code: ${user.referralCode}\n` +
        `Referred By: ${user.referredBy || "None"}\n` +
        `Channel Joined: ${user.hasJoinedChannel ? "Yes" : "No"}\n` +
        `Last Daily: ${user.lastDaily ? new Date(user.lastDaily).toISOString() : "Never"}\n` +
        `Joined: ${new Date(user.createdAt).toISOString()}`
      );
    } else if (subCmd === "users") {
      const users = await storage.getAllTelegramUsers();
      if (users.length === 0) {
        await bot!.sendMessage(chatId, "No users registered yet.");
        return;
      }
      const totalTokens = users.reduce((sum, u) => sum + u.tokens, 0);
      let text = `Total Users: ${users.length}\nTotal Tokens in circulation: ${totalTokens}\n\n`;
      const displayUsers = users.slice(0, 20);
      for (const u of displayUsers) {
        text += `${u.telegramId} | @${u.username || "N/A"} | ${u.tokens} tokens\n`;
      }
      if (users.length > 20) {
        text += `\n... and ${users.length - 20} more users`;
      }
      await bot!.sendMessage(chatId, text);
    } else if (subCmd === "stats") {
      const allStats = await storage.getAllStats();
      const allTools = await storage.getAllTools();
      const users = await storage.getAllTelegramUsers();
      const totalAttempts = allStats.reduce((sum, s) => sum + s.totalAttempts, 0);
      const totalSuccess = allStats.reduce((sum, s) => sum + s.successCount, 0);
      const totalFailed = allStats.reduce((sum, s) => sum + s.failedCount, 0);

      await bot!.sendMessage(chatId,
        `System Stats:\n\n` +
        `Total Users: ${users.length}\n` +
        `Active Tools: ${allTools.filter(t => t.isActive).length}/${allTools.length}\n` +
        `Total Verifications: ${totalAttempts}\n` +
        `Successful: ${totalSuccess}\n` +
        `Failed: ${totalFailed}\n` +
        `Success Rate: ${totalAttempts > 0 ? Math.round((totalSuccess / totalAttempts) * 100) : 0}%`
      );
    } else if (subCmd === "giveaway" && parts.length >= 2) {
      const amount = parseInt(parts[1]);
      if (isNaN(amount) || amount <= 0) {
        await bot!.sendMessage(chatId, "Invalid amount. Must be a positive number.");
        return;
      }
      const users = await storage.getAllTelegramUsers();
      let count = 0;
      for (const u of users) {
        await storage.addTokens(u.telegramId, amount);
        count++;
        try {
          await bot!.sendMessage(parseInt(u.telegramId), `Giveaway! You received ${amount} tokens from admin!`);
        } catch {}
      }
      await bot!.sendMessage(chatId, `Giveaway complete! ${amount} tokens sent to ${count} users.`);
    } else {
      await bot!.sendMessage(chatId, "Unknown admin command. Use /admin for help.");
    }
  });

  bot.on("polling_error", (error) => {
    console.error("[Telegram] Polling error:", error.message);
  });

  bot.on("error", (error) => {
    console.error("[Telegram] Bot error:", error.message);
  });

  process.on("unhandledRejection", (reason: any) => {
    if (reason?.message?.includes("telegram") || reason?.message?.includes("ETELEGRAM")) {
      console.error("[Telegram] Unhandled rejection:", reason.message);
    }
  });
}
