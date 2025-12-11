import crypto from "crypto";
import argon2 from "argon2";
import { Op } from "sequelize";
import sequelize from "../utils/databaseService";
import { PasswordResetToken } from "../models/PasswordResetToken";
import { User } from "../models/User";
import { ApiError } from "../utils/ApiError";

const INVITE_TTL_HOURS = parseInt(process.env.PASSWORD_RESET_INVITE_HOURS ?? "24", 10);
const TOKEN_LENGTH_BYTES = 32;

class PasswordReset {
  private readonly ttlMs = INVITE_TTL_HOURS * 60 * 60 * 1000;

  async createInviteTokenForUser(user: User): Promise<string> {
    const tokenRaw = crypto.randomBytes(TOKEN_LENGTH_BYTES).toString("hex");
    const tokenHash = await argon2.hash(tokenRaw);
    const expiresAt = new Date(Date.now() + this.ttlMs);

    await sequelize.transaction(async (transaction) => {
      await PasswordResetToken.update(
        { isUsed: true },
        { where: { userId: user.id, isUsed: false }, transaction }
      );

      await PasswordResetToken.create(
        {
          userId: user.id,
          token: tokenHash,
          expiresAt,
          isUsed: false,
        },
        { transaction }
      );
    });

    return tokenRaw;
  }

  async verifyAndConsumeToken(tokenRaw: string): Promise<User> {
    const token = await this.findMatchingActiveToken(tokenRaw);
    if (!token || !token.user) {
      throw new ApiError("Token inválido o expirado", 400);
    }

    await sequelize.transaction(async (transaction) => {
      await token.update({ isUsed: true }, { transaction });
      await PasswordResetToken.update(
        { isUsed: true },
        {
          where: {
            userId: token.userId,
            isUsed: false,
            id: { [Op.ne]: token.id },
          },
          transaction,
        }
      );
    });

    return token.user!;
  }

  async isTokenValid(tokenRaw: string): Promise<boolean> {
    const match = await this.findMatchingActiveToken(tokenRaw);
    return Boolean(match);
  }

  private async findMatchingActiveToken(tokenRaw: string): Promise<PasswordResetToken | null> {
    if (!tokenRaw) return null;

    const tokens = await PasswordResetToken.findAll({
      where: {
        isUsed: false,
        expiresAt: { [Op.gt]: new Date() },
      },
      include: [{ model: User, as: "user" }],
      order: [["createdAt", "DESC"]],
    });

    for (const token of tokens) {
      const matches = await this.safeVerify(token.token, tokenRaw);
      if (matches) {
        return token;
      }
    }

    return null;
  }

  private async safeVerify(hash: string, tokenRaw: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, tokenRaw);
    } catch {
      return false;
    }
  }
}

export const passwordReset = new PasswordReset();
